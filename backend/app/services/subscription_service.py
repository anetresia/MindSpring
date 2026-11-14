from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.models.subscription.subscription_plan import SubscriptionPlan
from app.models.subscription.parent_subscription import ParentSubscription
from app.models.subscription.subscription_credit import SubscriptionCredit
from app.models.subscription.video_history import VideoHistory
from app.models.subscription.subscription_payment import SubscriptionPayment


# ==========================================
# SUBSCRIPTION PLAN DETAILS
# ==========================================

SUBSCRIPTION_PLANS = [
    {
        "plan_code": "FREE",
        "plan_name": "Free",
        "plan_type": "FREE",
        "video_credits": 3,
        "max_children": 1,
        "price_lkr": 0.00,
        "billing_type": "FREE",
        "validity_days": None,
    },
    {
        "plan_code": "INDIVIDUAL_10",
        "plan_name": "Individual 10 Video Bundle",
        "plan_type": "INDIVIDUAL",
        "video_credits": 10,
        "max_children": 1,
        "price_lkr": 750.00,
        "billing_type": "ONE_TIME",
        "validity_days": None,
    },
    {
        "plan_code": "INDIVIDUAL_30",
        "plan_name": "Individual 30 Video Bundle",
        "plan_type": "INDIVIDUAL",
        "video_credits": 30,
        "max_children": 1,
        "price_lkr": 2100.00,
        "billing_type": "ONE_TIME",
        "validity_days": None,
    },
    {
        "plan_code": "FAMILY_25",
        "plan_name": "Family 25",
        "plan_type": "FAMILY",
        "video_credits": 25,
        "max_children": 2,
        "price_lkr": 2000.00,
        "billing_type": "MONTHLY",
        "validity_days": 30,
    },
    {
        "plan_code": "FAMILY_50",
        "plan_name": "Family 50",
        "plan_type": "FAMILY",
        "video_credits": 50,
        "max_children": 2,
        "price_lkr": 3699.00,
        "billing_type": "MONTHLY",
        "validity_days": 30,
    },
]


# ==========================================
# CURRENT DATABASE TIME
# ==========================================

def get_current_time():
    """
    Return current UTC time without timezone information.
    This matches MySQL DateTime columns configured without timezone.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ==========================================
# SEED SUBSCRIPTION PLANS
# ==========================================

def seed_subscription_plans(db: Session):
    """Insert missing subscription plans without creating duplicates."""

    inserted_count = 0

    try:
        for plan_data in SUBSCRIPTION_PLANS:
            existing_plan = (
                db.query(SubscriptionPlan)
                .filter(
                    SubscriptionPlan.plan_code == plan_data["plan_code"]
                )
                .first()
            )

            if existing_plan:
                continue

            db.add(SubscriptionPlan(**plan_data))
            inserted_count += 1

        db.commit()

        return {
            "success": True,
            "inserted": inserted_count,
            "message": (
                f"{inserted_count} subscription plans inserted successfully."
            ),
        }

    except Exception:
        db.rollback()
        raise


# ==========================================
# GET ACTIVE SUBSCRIPTION PLANS
# ==========================================

def get_subscription_plans(db: Session):
    """Return all active subscription plans."""

    return (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.is_active == True)
        .order_by(SubscriptionPlan.plan_id.asc())
        .all()
    )


# ==========================================
# ASSIGN FREE SUBSCRIPTION TO NEW PARENT
# ==========================================

def assign_free_subscription(db: Session, parent_id: int):
    """
    Assign the Free plan and 3 video credits
    to a newly registered parent.

    This function does not commit.
    The caller must commit the complete registration transaction.
    """

    free_plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.plan_code == "FREE",
            SubscriptionPlan.is_active == True,
        )
        .first()
    )

    if not free_plan:
        raise ValueError("Active Free subscription plan not found.")

    existing_subscription = (
        db.query(ParentSubscription)
        .filter(
            ParentSubscription.parent_id == parent_id,
            ParentSubscription.status == "ACTIVE",
        )
        .first()
    )

    if existing_subscription:
        return existing_subscription

    new_subscription = ParentSubscription(
        parent_id=parent_id,
        plan_id=free_plan.plan_id,
        status="ACTIVE",
        expires_at=None,
    )

    db.add(new_subscription)
    db.flush()

    new_credit = SubscriptionCredit(
        subscription_id=new_subscription.subscription_id,
        total_credits=free_plan.video_credits,
        used_credits=0,
        remaining_credits=free_plan.video_credits,
    )

    db.add(new_credit)
    db.flush()

    return new_subscription


# ==========================================
# GET PARENT'S ACTIVE SUBSCRIPTION
# ==========================================

def get_active_subscription(
    db: Session,
    parent_id: int,
    lock: bool = False,
):
    """
    Return the parent's active, non-expired subscription.
    """

    query = (
        db.query(ParentSubscription)
        .filter(
            ParentSubscription.parent_id == parent_id,
            ParentSubscription.status == "ACTIVE",
        )
        .order_by(ParentSubscription.subscription_id.desc())
    )

    if lock:
        query = query.with_for_update()

    subscription = query.first()

    if not subscription:
        return None

    if (
        subscription.expires_at is not None
        and subscription.expires_at <= get_current_time()
    ):
        subscription.status = "EXPIRED"
        db.flush()
        return None

    return subscription


# ==========================================
# GET PARENT'S REMAINING VIDEO CREDITS
# ==========================================

def get_remaining_credits(db: Session, parent_id: int):
    """
    Return remaining credits of the active subscription.
    """

    subscription = get_active_subscription(
        db=db,
        parent_id=parent_id,
    )

    if not subscription:
        return 0

    credit = (
        db.query(SubscriptionCredit)
        .filter(
            SubscriptionCredit.subscription_id
            == subscription.subscription_id
        )
        .first()
    )

    if not credit:
        return 0

    return credit.remaining_credits


# ==========================================
# DEDUCT VIDEO CREDIT
# ==========================================

def deduct_video_credit(
    db: Session,
    parent_id: int,
    amount: int = 1,
):
    """
    Deduct credits from the active subscription.

    Call only after BOTH video and activity completion
    have been verified.

    This function does not commit.
    """

    if amount <= 0:
        raise ValueError("Credit deduction amount must be positive.")

    subscription = get_active_subscription(
        db=db,
        parent_id=parent_id,
        lock=True,
    )

    if not subscription:
        raise ValueError(
            "No active subscription found. Please renew or purchase a plan."
        )

    credit = (
        db.query(SubscriptionCredit)
        .filter(
            SubscriptionCredit.subscription_id
            == subscription.subscription_id
        )
        .with_for_update()
        .first()
    )

    if not credit:
        raise ValueError("Subscription credit record not found.")

    if credit.remaining_credits < amount:
        raise ValueError(
            "Insufficient video credits. Please purchase a new plan."
        )

    credit.used_credits += amount
    credit.remaining_credits -= amount

    db.flush()

    return {
        "success": True,
        "subscription_id": subscription.subscription_id,
        "total_credits": credit.total_credits,
        "used_credits": credit.used_credits,
        "remaining_credits": credit.remaining_credits,
        "deducted_credits": amount,
    }


# ==========================================
# RECORD VIDEO / ACTIVITY COMPLETION
# ==========================================

def _record_lesson_completion(
    db: Session,
    parent_id: int,
    child_id: int,
    lesson_id: int,
    idempotency_key: str,
    completion_type: str,
):
    """
    Record video or activity completion.

    Deduct exactly one credit only when BOTH
    video and activity are completed.

    Caller must commit the transaction.
    """

    if not idempotency_key or not idempotency_key.strip():
        raise ValueError("Idempotency key is required.")

    if completion_type not in ("VIDEO", "ACTIVITY"):
        raise ValueError("Invalid completion type.")

    # Check existing completion record first.
    # This allows safe retries even if the subscription has expired.
    history = (
        db.query(VideoHistory)
        .filter(
            VideoHistory.idempotency_key == idempotency_key
        )
        .with_for_update()
        .first()
    )

    if history:
        if (
            history.parent_id != parent_id
            or history.child_id != child_id
            or history.lesson_id != lesson_id
        ):
            raise ValueError(
                "Idempotency key is already used for another completion."
            )

        if history.credit_deducted:
            credit = (
                db.query(SubscriptionCredit)
                .filter(
                    SubscriptionCredit.subscription_id
                    == history.subscription_id
                )
                .first()
            )

            return {
                "success": True,
                "history_id": history.history_id,
                "subscription_id": history.subscription_id,
                "video_completed": True,
                "activity_completed": True,
                "credit_deducted": True,
                "remaining_credits": (
                    credit.remaining_credits if credit else None
                ),
                "message": "This completion was already processed.",
            }

    # Lock the parent's active subscription.
    subscription = get_active_subscription(
        db=db,
        parent_id=parent_id,
        lock=True,
    )

    if not subscription:
        raise ValueError("No active subscription found.")

    if history:
        if history.subscription_id != subscription.subscription_id:
            raise ValueError(
                "Completion belongs to a different subscription."
            )
    else:
        history = VideoHistory(
            parent_id=parent_id,
            child_id=child_id,
            lesson_id=lesson_id,
            subscription_id=subscription.subscription_id,
            idempotency_key=idempotency_key,
            credit_deducted=False,
        )

        db.add(history)
        db.flush()

    current_time = get_current_time()

    if completion_type == "VIDEO":
        if history.video_completed_at is None:
            history.video_completed_at = current_time

    elif completion_type == "ACTIVITY":
        if history.activity_completed_at is None:
            history.activity_completed_at = current_time

    credit = None

    # Both completions are required.
    if (
        history.video_completed_at is not None
        and history.activity_completed_at is not None
        and not history.credit_deducted
    ):

        if history.subscription_id != subscription.subscription_id:
            raise ValueError(
                "Completion belongs to a different subscription."
            )

        credit = (
            db.query(SubscriptionCredit)
            .filter(
                SubscriptionCredit.subscription_id
                == subscription.subscription_id
            )
            .with_for_update()
            .first()
        )

        if not credit:
            raise ValueError("Subscription credit record not found.")

        if credit.remaining_credits < 1:
            raise ValueError(
                "Insufficient video credits. Please purchase a new plan."
            )

        credit.used_credits += 1
        credit.remaining_credits -= 1

        history.credit_deducted = True
        history.completed_at = current_time

    db.flush()

    return {
        "success": True,
        "history_id": history.history_id,
        "subscription_id": history.subscription_id,
        "video_completed": history.video_completed_at is not None,
        "activity_completed": history.activity_completed_at is not None,
        "credit_deducted": history.credit_deducted,
        "remaining_credits": (
            credit.remaining_credits if credit else None
        ),
        "message": (
            "Lesson completed and one credit deducted."
            if history.credit_deducted
            else "Completion recorded. Waiting for the other activity."
        ),
    }


# ==========================================
# RECORD VIDEO COMPLETION
# ==========================================

def record_video_completion(
    db: Session,
    parent_id: int,
    child_id: int,
    lesson_id: int,
    idempotency_key: str,
):
    return _record_lesson_completion(
        db=db,
        parent_id=parent_id,
        child_id=child_id,
        lesson_id=lesson_id,
        idempotency_key=idempotency_key,
        completion_type="VIDEO",
    )


# ==========================================
# RECORD ACTIVITY COMPLETION
# ==========================================

def record_activity_completion(
    db: Session,
    parent_id: int,
    child_id: int,
    lesson_id: int,
    idempotency_key: str,
):
    return _record_lesson_completion(
        db=db,
        parent_id=parent_id,
        child_id=child_id,
        lesson_id=lesson_id,
        idempotency_key=idempotency_key,
        completion_type="ACTIVITY",
    )


# ==========================================
# STRIPE PAYMENT - CREATE PENDING CHECKOUT
# ==========================================

def create_stripe_payment(
    db: Session,
    parent_id: int,
    plan_id: int,
    idempotency_key: str,
):
    """
    Create a pending subscription and payment record for Stripe Checkout.

    This function does not commit; the router must commit.
    No credits are allocated here. Credits are allocated only after a
    verified Stripe webhook confirms that the Checkout Session is paid.
    """

    if not idempotency_key or not idempotency_key.strip():
        raise ValueError("Idempotency key is required.")

    existing_payment = (
        db.query(SubscriptionPayment)
        .filter(SubscriptionPayment.idempotency_key == idempotency_key)
        .with_for_update()
        .first()
    )

    if existing_payment:
        if existing_payment.parent_id != parent_id:
            raise ValueError("This idempotency key belongs to another parent.")

        existing_subscription = (
            db.query(ParentSubscription)
            .filter(
                ParentSubscription.subscription_id
                == existing_payment.subscription_id
            )
            .first()
        )

        if (
            not existing_subscription
            or existing_subscription.plan_id != plan_id
        ):
            raise ValueError(
                "This idempotency key was already used for another plan."
            )

        if existing_payment.provider != "STRIPE":
            raise ValueError(
                "This idempotency key belongs to a different payment provider."
            )

        return existing_payment

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.plan_id == plan_id,
            SubscriptionPlan.is_active == True,
        )
        .first()
    )

    if not plan:
        raise ValueError("Selected subscription plan was not found.")

    if plan.plan_type == "FREE" or plan.price_lkr <= 0:
        raise ValueError("The Free plan does not require payment.")

    pending_subscription = ParentSubscription(
        parent_id=parent_id,
        plan_id=plan.plan_id,
        status="PENDING",
        expires_at=None,
    )
    db.add(pending_subscription)
    db.flush()

    payment = SubscriptionPayment(
        parent_id=parent_id,
        subscription_id=pending_subscription.subscription_id,
        provider="STRIPE",
        idempotency_key=idempotency_key,
        amount_lkr=plan.price_lkr,
        currency="LKR",
        status="PENDING",
    )
    db.add(payment)
    db.flush()

    return payment


# ==========================================
# STRIPE PAYMENT - ACTIVATE VERIFIED CHECKOUT
# ==========================================

def complete_stripe_payment(
    db: Session,
    checkout_session_id: str,
    amount_total: int,
    currency: str,
    payment_status: str,
):
    """
    Activate a subscription only after the router has verified the Stripe
    webhook signature and supplied the Checkout Session payment details.

    The amount and currency are checked again against the local payment row.
    This function does not commit; the webhook router must commit.
    """

    if not checkout_session_id:
        raise ValueError("Stripe Checkout Session ID is required.")

    payment = (
        db.query(SubscriptionPayment)
        .filter(
            SubscriptionPayment.provider == "STRIPE",
            SubscriptionPayment.provider_payment_id == checkout_session_id,
        )
        .with_for_update()
        .first()
    )

    if not payment:
        raise ValueError("Stripe payment record was not found.")

    if payment.status == "SUCCESS":
        credit = (
            db.query(SubscriptionCredit)
            .filter(
                SubscriptionCredit.subscription_id == payment.subscription_id
            )
            .first()
        )
        return {
            "success": True,
            "already_processed": True,
            "payment_id": payment.payment_id,
            "payment_status": "SUCCESS",
            "subscription_id": payment.subscription_id,
            "remaining_credits": credit.remaining_credits if credit else 0,
            "message": "Stripe payment was already processed.",
        }

    if payment.status != "PENDING":
        raise ValueError("This Stripe payment is no longer pending.")

    if (payment_status or "").lower() != "paid":
        raise ValueError("Stripe has not confirmed that this payment is paid.")

    expected_amount = int(round(float(payment.amount_lkr) * 100))
    if int(amount_total) != expected_amount:
        raise ValueError("Stripe payment amount does not match the subscription price.")

    if (currency or "").upper() != payment.currency.upper():
        raise ValueError("Stripe payment currency does not match the subscription currency.")

    subscription = (
        db.query(ParentSubscription)
        .filter(
            ParentSubscription.subscription_id == payment.subscription_id,
            ParentSubscription.parent_id == payment.parent_id,
            ParentSubscription.status == "PENDING",
        )
        .with_for_update()
        .first()
    )

    if not subscription:
        raise ValueError("Pending subscription was not found.")

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.plan_id == subscription.plan_id,
            SubscriptionPlan.is_active == True,
        )
        .first()
    )

    if not plan:
        raise ValueError("Subscription plan was not found or is inactive.")

    # Replace the parent's current active subscription only after payment is verified.
    previous_subscriptions = (
        db.query(ParentSubscription)
        .filter(
            ParentSubscription.parent_id == payment.parent_id,
            ParentSubscription.status == "ACTIVE",
        )
        .with_for_update()
        .all()
    )

    for old_subscription in previous_subscriptions:
        old_subscription.status = "CANCELLED"

    current_time = get_current_time()
    subscription.status = "ACTIVE"
    subscription.starts_at = current_time

    if plan.validity_days is not None:
        subscription.expires_at = current_time + timedelta(days=plan.validity_days)
    else:
        subscription.expires_at = None

    existing_credit = (
        db.query(SubscriptionCredit)
        .filter(
            SubscriptionCredit.subscription_id == subscription.subscription_id
        )
        .with_for_update()
        .first()
    )

    if existing_credit:
        raise ValueError("Credits have already been allocated for this subscription.")

    new_credit = SubscriptionCredit(
        subscription_id=subscription.subscription_id,
        total_credits=plan.video_credits,
        used_credits=0,
        remaining_credits=plan.video_credits,
    )
    db.add(new_credit)

    payment.status = "SUCCESS"
    payment.verified_at = current_time

    db.flush()

    return {
        "success": True,
        "already_processed": False,
        "payment_id": payment.payment_id,
        "payment_status": "SUCCESS",
        "subscription_id": subscription.subscription_id,
        "plan_name": plan.plan_name,
        "total_credits": new_credit.total_credits,
        "used_credits": new_credit.used_credits,
        "remaining_credits": new_credit.remaining_credits,
        "expires_at": subscription.expires_at,
        "message": "Stripe payment verified. Subscription activated.",
    }


# ==========================================
# STRIPE PAYMENT - MARK FAILED
# ==========================================

def mark_stripe_payment_failed(
    db: Session,
    checkout_session_id: str,
):
    """Mark an expired or failed Stripe Checkout Session without allocating credits."""

    payment = (
        db.query(SubscriptionPayment)
        .filter(
            SubscriptionPayment.provider == "STRIPE",
            SubscriptionPayment.provider_payment_id == checkout_session_id,
        )
        .with_for_update()
        .first()
    )

    if not payment:
        raise ValueError("Stripe payment record was not found.")

    if payment.status == "SUCCESS":
        return {
            "success": True,
            "already_processed": True,
            "payment_id": payment.payment_id,
            "payment_status": "SUCCESS",
            "message": "A successful payment cannot be changed to failed.",
        }

    if payment.status == "PENDING":
        payment.status = "FAILED"

        subscription = (
            db.query(ParentSubscription)
            .filter(
                ParentSubscription.subscription_id == payment.subscription_id,
                ParentSubscription.status == "PENDING",
            )
            .with_for_update()
            .first()
        )

        if subscription:
            subscription.status = "CANCELLED"

    db.flush()

    return {
        "success": False,
        "payment_id": payment.payment_id,
        "payment_status": payment.status,
        "message": "Stripe payment failed or expired. No credits were allocated.",
    }