
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

        # Reuse an existing Stripe Checkout Session if available.
        if payment.provider_payment_id:

            existing_session = stripe.checkout.Session.retrieve(
                payment.provider_payment_id
            )

            if existing_session.url and existing_session.status == "open":
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
        # Payment methods are managed through Stripe Dashboard settings.
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

            cancel_url=(
                f"{FRONTEND_URL}/parent-home"
                "?stripe=cancelled"
            ),

            idempotency_key=(
                f"mindspring-payment-{payment.payment_id}"
            ),
        )

        # Save Stripe Checkout Session ID.
        payment.provider_payment_id = checkout_session.id

        db.commit()
        db.refresh(payment)

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

        print("========== PAYMENT VALIDATION ERROR ==========")
        print("Error:", str(error))
        print("===============================================")

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

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not webhook_secret:
        raise HTTPException(
            status_code=500,
            detail="Stripe webhook secret is not configured.",
        )

    signature = request.headers.get("Stripe-Signature")

    if not signature:
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
        raise HTTPException(
            status_code=400,
            detail="Invalid webhook payload.",
        )

    except stripe.SignatureVerificationError:
        raise HTTPException(
            status_code=400,
            detail="Invalid Stripe webhook signature.",
        )

    event_type = event["type"]
    session = event["data"]["object"]

    checkout_session_id = session.get("id")

    if not checkout_session_id:
        return {
            "success": True,
            "message": "No Checkout Session ID found.",
        }

    metadata = session.get("metadata") or {}

    # Only process MindSpring Stripe payments.
    if metadata.get("provider") != "STRIPE":
        return {
            "success": True,
            "message": "Unrelated Stripe event ignored.",
        }

    # Reject live-mode events.
    if session.get("livemode") is True:
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
                raise HTTPException(
                    status_code=400,
                    detail="Matching MindSpring payment was not found.",
                )

            # Verify pending subscription exists.
            subscription = (
                db.query(ParentSubscription)
                .filter(
                    ParentSubscription.subscription_id
                    == payment.subscription_id,
                    ParentSubscription.parent_id
                    == payment.parent_id,
                )
                .first()
            )

            if not subscription:
                raise HTTPException(
                    status_code=400,
                    detail="Matching subscription was not found.",
                )

            # Do not activate before payment confirmation.
            if session.get("payment_status") != "paid":
                return {
                    "success": True,
                    "payment_status": "PENDING",
                    "message": (
                        "Checkout completed but payment is not yet confirmed."
                    ),
                }

            # Activate only after verified Stripe payment.
            result = complete_stripe_payment(
                db=db,
                checkout_session_id=checkout_session_id,
                amount_total=session.get("amount_total"),
                currency=session.get("currency"),
                payment_status=session.get("payment_status"),
            )

            db.commit()

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

            result = mark_stripe_payment_failed(
                db=db,
                checkout_session_id=checkout_session_id,
            )

            db.commit()

            return {
                **result,
                "event": event_type,
            }

        # ======================================
        # OTHER EVENTS
        # ======================================

        return {
            "success": True,
            "message": "Stripe event received. No action required.",
            "event": event_type,
        }

    except HTTPException:
        db.rollback()
        raise

    except ValueError as error:
        db.rollback()

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
