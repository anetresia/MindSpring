
import os
import stripe

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Header,
    Request,
)

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.parent import get_current_parent
from app.models.user import User

from app.models.subscription.subscription_payment import SubscriptionPayment
from app.models.subscription.parent_subscription import ParentSubscription

from app.services.subscription_service import (
    create_stripe_payment,
    complete_stripe_payment,
    mark_stripe_payment_failed,
)


router = APIRouter(
    prefix="/subscriptions",
    tags=["Stripe Subscription Payment"],
)


# ==========================================
# STRIPE CONFIGURATION
# ==========================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
).rstrip("/")


def configure_stripe():
    """
    Configure Stripe Test Mode only.
    """

    secret_key = os.getenv("STRIPE_SECRET_KEY")

    if not secret_key:
        raise HTTPException(
            status_code=500,
            detail="Stripe secret key is not configured.",
        )

    if not secret_key.startswith("sk_test_"):
        raise HTTPException(
            status_code=500,
            detail="Only Stripe Test Mode keys are allowed.",
        )

    stripe.api_key = secret_key


# ==========================================
# REQUEST SCHEMAS
# ==========================================

class StripeCheckoutRequest(BaseModel):
    plan_id: int = Field(gt=0)


class StripeCancelRequest(BaseModel):
    session_id: str = Field(
        min_length=10,
        max_length=255,
    )


# ==========================================
# CREATE STRIPE CHECKOUT SESSION
# ==========================================

@router.post("/stripe-checkout/")
def create_stripe_checkout(
    request: StripeCheckoutRequest,
    idempotency_key: str = Header(
        ...,
        alias="Idempotency-Key",
        min_length=8,
        max_length=255,
    ),
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    configure_stripe()

    try:
        # Create pending payment and subscription.
        payment = create_stripe_payment(
            db=db,
            parent_id=current_parent.user_id,
            plan_id=request.plan_id,
            idempotency_key=idempotency_key,
        )

        print("\n========== STRIPE CHECKOUT CREATED ==========")
        print("Payment ID:", payment.payment_id)
        print("Subscription ID:", payment.subscription_id)
        print("Parent ID:", payment.parent_id)
        print("Payment Status:", payment.status)
        print("==============================================\n")

        # Reuse an existing Stripe Checkout Session if available.
        if payment.provider_payment_id:

            existing_session = stripe.checkout.Session.retrieve(
                payment.provider_payment_id
            )

            if (
                existing_session.url
                and existing_session.status == "open"
            ):
                return {
                    "success": True,
                    "test_mode": True,
                    "checkout_url": existing_session.url,
                    "payment_id": payment.payment_id,
                    "subscription_id": payment.subscription_id,
                    "message": "Existing Stripe Checkout Session returned.",
                }

            raise HTTPException(
                status_code=400,
                detail="This Stripe Checkout Session is no longer available.",
            )

        # Create Stripe Checkout Session.
        checkout_session = stripe.checkout.Session.create(
            mode="payment",

            line_items=[
                {
                    "price_data": {
                        "currency": "lkr",
                        "unit_amount": int(
                            round(float(payment.amount_lkr) * 100)
                        ),
                        "product_data": {
                            "name": "MindSpring Subscription",
                            "description": (
                                "MindSpring video credit subscription"
                            ),
                        },
                    },
                    "quantity": 1,
                }
            ],

            client_reference_id=str(payment.payment_id),

            metadata={
                "payment_id": str(payment.payment_id),
                "parent_id": str(payment.parent_id),
                "subscription_id": str(payment.subscription_id),
                "provider": "STRIPE",
            },

            success_url=(
                f"{FRONTEND_URL}/parent-home"
                "?stripe=success"
                "&session_id={CHECKOUT_SESSION_ID}"
            ),

            # Pass the Checkout Session ID to the frontend
            # when the parent clicks Cancel.
            cancel_url=(
                f"{FRONTEND_URL}/parent-home"
                "?stripe=cancelled"
                "&session_id={CHECKOUT_SESSION_ID}"
            ),

            idempotency_key=(
                f"mindspring-payment-{payment.payment_id}"
            ),
        )

        # Save Stripe Checkout Session ID.
        payment.provider_payment_id = checkout_session.id

        db.commit()
        db.refresh(payment)

        print("\n========== STRIPE SESSION SAVED ==========")
        print("Payment ID:", payment.payment_id)
        print("Stripe Session ID:", checkout_session.id)
        print("==========================================\n")

        return {
            "success": True,
            "test_mode": True,
            "checkout_url": checkout_session.url,
            "payment_id": payment.payment_id,
            "subscription_id": payment.subscription_id,
            "message": (
                "Stripe Test Checkout Session created successfully."
            ),
        }

    except ValueError as error:
        db.rollback()

        print("\n========== PAYMENT VALIDATION ERROR ==========")
        print("Error:", str(error))
        print("===============================================\n")

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except stripe.StripeError as error:
        db.rollback()

        print("\n========== STRIPE CHECKOUT ERROR ==========")
        print("Error Type:", type(error).__name__)
        print("Error Message:", str(error))
        print("Error Code:", getattr(error, "code", None))
        print("Error Param:", getattr(error, "param", None))
        print("===========================================\n")

        raise HTTPException(
            status_code=502,
            detail=f"Stripe Error: {str(error)}",
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        print("\n========== CHECKOUT UNEXPECTED ERROR ==========")
        print("Error Type:", type(error).__name__)
        print("Error Message:", str(error))
        print("===============================================\n")

        raise HTTPException(
            status_code=500,
            detail="Unable to create Stripe Checkout.",
        )


# ==========================================
# CANCEL STRIPE CHECKOUT SESSION
# ==========================================

@router.post("/stripe-cancel/")
def cancel_stripe_checkout(
    request: StripeCancelRequest,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    """
    Cancel an open Stripe Checkout Session immediately.

    Security:
    - Requires an authenticated parent.
    - Verifies that the Checkout Session belongs to that parent.
    - Does not allow successful payments to be cancelled.
    - Does not allocate credits.
    """

    configure_stripe()

    checkout_session_id = request.session_id.strip()

    try:
        # Find the payment belonging to the logged-in parent.
        payment = (
            db.query(SubscriptionPayment)
            .filter(
                SubscriptionPayment.provider == "STRIPE",
                SubscriptionPayment.provider_payment_id
                == checkout_session_id,
                SubscriptionPayment.parent_id
                == current_parent.user_id,
            )
            .with_for_update()
            .first()
        )

        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Stripe payment session was not found.",
            )

        # Never cancel a successful payment.
        if payment.status == "SUCCESS":
            raise HTTPException(
                status_code=409,
                detail="This payment was already successful and cannot be cancelled.",
            )

        if payment.status in ("FAILED", "CANCELLED"):
            return {
                "success": True,
                "payment_status": payment.status,
                "message": "This payment has already been cancelled or failed.",
            }

        # Retrieve the actual Checkout Session from Stripe.
        stripe_session = stripe.checkout.Session.retrieve(
            checkout_session_id
        )

        # Verify that this Stripe Session belongs to this parent
        # and matches the local payment record.
        metadata = (
    stripe_session.metadata.to_dict()
    if stripe_session.metadata
    else {}
)

        if (
            metadata.get("provider") != "STRIPE"
            or metadata.get("parent_id") != str(current_parent.user_id)
            or metadata.get("payment_id") != str(payment.payment_id)
            or metadata.get("subscription_id")
            != str(payment.subscription_id)
        ):
            raise HTTPException(
                status_code=403,
                detail="This Stripe Checkout Session does not belong to your account.",
            )

        # If Stripe already confirms payment, do not cancel.
        if stripe_session.payment_status == "paid":
            raise HTTPException(
                status_code=409,
                detail="Stripe has already confirmed this payment. Cancellation is not allowed.",
            )

        # Expire the Checkout Session immediately if it is still open.
        if stripe_session.status == "open":

            stripe_session = stripe.checkout.Session.expire(
                checkout_session_id
            )

        # A completed session cannot be expired.
        # Let the verified webhook handle its final payment status.
        elif stripe_session.status == "complete":
            raise HTTPException(
                status_code=409,
                detail=(
                    "This Checkout Session has already been completed. "
                    "Please wait for payment verification."
                ),
            )

        # Only an expired session can be marked as failed locally.
        if stripe_session.status != "expired":
            raise HTTPException(
                status_code=409,
                detail=(
                    "Stripe Checkout Session could not be confirmed as expired. "
                    "Please try again."
                ),
            )

        # Update local payment and pending subscription.
        result = mark_stripe_payment_failed(
            db=db,
            checkout_session_id=checkout_session_id,
        )

        db.commit()

        print("\n========== STRIPE CHECKOUT CANCELLED ==========")
        print("Parent ID:", current_parent.user_id)
        print("Payment ID:", payment.payment_id)
        print("Session ID:", checkout_session_id)
        print("Payment Status:", result.get("payment_status"))
        print("================================================\n")

        return {
            "success": True,
            "payment_status": result.get("payment_status"),
            "message": (
                "Stripe Checkout Session cancelled successfully. "
                "No credits were allocated."
            ),
        }

    except HTTPException:
        db.rollback()
        raise

    except stripe.StripeError as error:
        db.rollback()

        print("\n========== STRIPE CANCELLATION ERROR ==========")
        print("Error Type:", type(error).__name__)
        print("Error Message:", str(error))
        print("===============================================\n")

        raise HTTPException(
            status_code=502,
            detail="Unable to cancel the Stripe Checkout Session.",
        )

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        db.rollback()

        print("\n========== CANCELLATION UNEXPECTED ERROR ==========")
        print("Error Type:", type(error).__name__)
        print("Error Message:", str(error))
        print("====================================================\n")

        raise HTTPException(
            status_code=500,
            detail="Unable to process Stripe cancellation.",
        )


# ==========================================
# STRIPE WEBHOOK
# ==========================================

@router.post("/stripe-webhook/")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receive and verify Stripe webhook events.

    Subscription activation and credit allocation
    happen only after verified payment success.
    """

    print("\n========== STRIPE WEBHOOK REQUEST ==========")

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not webhook_secret:
        print("ERROR: STRIPE_WEBHOOK_SECRET is missing.")

        raise HTTPException(
            status_code=500,
            detail="Stripe webhook secret is not configured.",
        )

    signature = request.headers.get("Stripe-Signature")

    if not signature:
        print("ERROR: Stripe signature is missing.")

        raise HTTPException(
            status_code=400,
            detail="Missing Stripe signature.",
        )

    payload = await request.body()

    # Verify webhook signature.
    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=webhook_secret,
        )

    except ValueError:
        print("ERROR: Invalid webhook payload.")

        raise HTTPException(
            status_code=400,
            detail="Invalid webhook payload.",
        )

    except stripe.SignatureVerificationError:
        print("ERROR: Invalid Stripe signature.")

        raise HTTPException(
            status_code=400,
            detail="Invalid Stripe webhook signature.",
        )

    event_type = event["type"]

    # Convert Stripe Session object into a Python dictionary.
    session = event["data"]["object"].to_dict()

    checkout_session_id = session.get("id")

    # Diagnostic information.
    print("Event Type:", event_type)
    print("Session ID:", checkout_session_id)
    print("Payment Status:", session.get("payment_status"))
    print("Session Mode:", session.get("mode"))
    print("Live Mode:", session.get("livemode"))
    print("Metadata:", session.get("metadata"))
    print("Amount Total:", session.get("amount_total"))
    print("Currency:", session.get("currency"))

    print("============================================\n")

    if not checkout_session_id:
        print("WARNING: No Checkout Session ID found.")

        return {
            "success": True,
            "message": "No Checkout Session ID found.",
        }

    metadata = session.get("metadata") or {}

    # Only process MindSpring Stripe payments.
    if metadata.get("provider") != "STRIPE":
        print("INFO: Unrelated Stripe event ignored.")

        return {
            "success": True,
            "message": "Unrelated Stripe event ignored.",
        }

    # Reject live-mode events.
    if session.get("livemode") is True:
        print("ERROR: Live-mode payment rejected.")

        raise HTTPException(
            status_code=400,
            detail="Live-mode payments are not accepted.",
        )

    try:

        # ======================================
        # PAYMENT SUCCESS
        # ======================================

        if event_type in (
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
        ):

            payment_id = metadata.get("payment_id")
            parent_id = metadata.get("parent_id")
            subscription_id = metadata.get("subscription_id")

            print("\n========== PAYMENT METADATA CHECK ==========")
            print("Payment ID:", payment_id)
            print("Parent ID:", parent_id)
            print("Subscription ID:", subscription_id)
            print("=============================================\n")

            if not all([
                payment_id,
                parent_id,
                subscription_id,
            ]):
                raise HTTPException(
                    status_code=400,
                    detail="Missing MindSpring payment metadata.",
                )

            if session.get("mode") != "payment":
                raise HTTPException(
                    status_code=400,
                    detail="Invalid Stripe Checkout mode.",
                )

            # Find matching local payment.
            payment = (
                db.query(SubscriptionPayment)
                .filter(
                    SubscriptionPayment.payment_id == int(payment_id),
                    SubscriptionPayment.parent_id == int(parent_id),
                    SubscriptionPayment.subscription_id == int(subscription_id),
                    SubscriptionPayment.provider == "STRIPE",
                    SubscriptionPayment.provider_payment_id
                    == checkout_session_id,
                )
                .with_for_update()
                .first()
            )

            if not payment:
                print("ERROR: Matching MindSpring payment not found.")

                raise HTTPException(
                    status_code=400,
                    detail="Matching MindSpring payment was not found.",
                )

            print("\n========== LOCAL PAYMENT FOUND ==========")
            print("Payment ID:", payment.payment_id)
            print("Payment Status:", payment.status)
            print("Subscription ID:", payment.subscription_id)
            print("Stripe Session ID:", payment.provider_payment_id)
            print("==========================================\n")

            # Verify pending subscription exists.
            subscription = (
                db.query(ParentSubscription)
                .filter(
                    ParentSubscription.subscription_id
                    == payment.subscription_id,
                    ParentSubscription.parent_id
                    == payment.parent_id,
                )
                .with_for_update()
                .first()
            )

            if not subscription:
                print("ERROR: Matching subscription not found.")

                raise HTTPException(
                    status_code=400,
                    detail="Matching subscription was not found.",
                )

            print("Subscription Status:", subscription.status)

            # Do not activate before payment confirmation.
            if session.get("payment_status") != "paid":
                print(
                    "WARNING: Stripe payment is not paid yet. "
                    "Subscription remains pending."
                )

                return {
                    "success": True,
                    "payment_status": "PENDING",
                    "message": (
                        "Checkout completed but payment is not yet confirmed."
                    ),
                }

            # Activate only after verified Stripe payment.
            print("\n========== ACTIVATING SUBSCRIPTION ==========")

            result = complete_stripe_payment(
                db=db,
                checkout_session_id=checkout_session_id,
                amount_total=session.get("amount_total"),
                currency=session.get("currency"),
                payment_status=session.get("payment_status"),
            )

            db.commit()

            print("PAYMENT ACTIVATION RESULT:", result)
            print("SUCCESS: Subscription payment processed.")
            print("==============================================\n")

            return {
                **result,
                "test_mode": True,
                "event": event_type,
            }

        # ======================================
        # PAYMENT FAILED / SESSION EXPIRED
        # ======================================

        elif event_type in (
            "checkout.session.async_payment_failed",
            "checkout.session.expired",
        ):

            print("\n========== PAYMENT FAILED / EXPIRED ==========")
            print("Session ID:", checkout_session_id)

            result = mark_stripe_payment_failed(
                db=db,
                checkout_session_id=checkout_session_id,
            )

            db.commit()

            print("FAILURE RESULT:", result)
            print("==============================================\n")

            return {
                **result,
                "event": event_type,
            }

        # ======================================
        # OTHER EVENTS
        # ======================================

        print("INFO: No action required for event:", event_type)

        return {
            "success": True,
            "message": "Stripe event received. No action required.",
            "event": event_type,
        }

    except HTTPException as error:
        db.rollback()

        print("\n========== STRIPE WEBHOOK VALIDATION ERROR ==========")
        print("Status Code:", error.status_code)
        print("Error Detail:", error.detail)
        print("=====================================================\n")

        raise

    except ValueError as error:
        db.rollback()

        print("\n========== STRIPE WEBHOOK VALUE ERROR ==========")
        print("Error:", str(error))
        print("================================================\n")

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        db.rollback()

        print("\n========== STRIPE WEBHOOK ERROR ==========")
        print("Error Type:", type(error).__name__)
        print("Error Message:", str(error))
        print("==========================================\n")

        raise HTTPException(
            status_code=500,
            detail="Unable to process Stripe webhook.",
        )
