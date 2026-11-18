
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.child import Child
from app.models.subscription.subscription_plan import SubscriptionPlan
from app.models.subscription.parent_subscription import ParentSubscription
from app.models.subscription.subscription_credit import SubscriptionCredit
from app.models.subscription.video_history import VideoHistory
from app.models.subscription.subscription_payment import SubscriptionPayment
from app.models.subscription.notification import Notification


# ==========================================
# SUBSCRIPTION PLAN DETAILS
# ==========================================

SUBSCRIPTION_PLANS = [
    {
        "plan_code": "FREE",
        "plan_name": "Free",
        "plan_type": "FREE",
        "video_credits": 3,
        "max_children": 2,
        "price_lkr": 0.00,
        "billing_type": "FREE",
        "validity_days": None,
    },
    {
        "plan_code": "INDIVIDUAL_10",
        "plan_name": "Plus",
        "plan_type": "INDIVIDUAL",
        "video_credits": 10,
        "max_children": 1,
        "price_lkr": 750.00,
        "billing_type": "ONE_TIME",
        "validity_days": None,
    },
    {
        "plan_code": "INDIVIDUAL_30",
        "plan_name": "Pro",
        "plan_type": "INDIVIDUAL",
        "video_credits": 30,
        "max_children": 1,
        "price_lkr": 2100.00,
        "billing_type": "ONE_TIME",
        "validity_days": None,
    },
    {
        "plan_code": "FAMILY_25",
        "plan_name": "Family Pack Plus",
        "plan_type": "FAMILY",
        "video_credits": 25,
        "max_children": 2,
        "price_lkr": 2000.00,
        "billing_type": "ONE_TIME",
        "validity_days": None,
    },
    {
        "plan_code": "FAMILY_50",
        "plan_name": "Family Pack Pro",
        "plan_type": "FAMILY",
        "video_credits": 50,
        "max_children": 2,
        "price_lkr": 3699.00,
        "billing_type": "ONE_TIME",
        "validity_days": None,
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
    """
    Insert missing plans and update existing plan details.
    Existing plan IDs and subscription history are preserved.
    """

    inserted_count = 0
    updated_count = 0

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
                for key, value in plan_data.items():
                    setattr(existing_plan, key, value)

                updated_count += 1
            else:
                db.add(SubscriptionPlan(**plan_data))
                inserted_count += 1

        db.commit()

        return {
            "success": True,
            "inserted": inserted_count,
            "updated": updated_count,
            "message": (
                f"{inserted_count} plans inserted and "
                f"{updated_count} plans updated successfully."
            ),
        }

    except Exception:
        db.rollback()
        raise


# ==========================================
# GET ACTIVE SUBSCRIPTION PLANS
# ==========================================

def get_subscription_plans(
    db: Session,
    parent_id: int = None,
    include_free: bool = False,
):
    """
    Return active subscription plans.

    Free is excluded by default.

    Parent eligibility:
    - 1 child: Individual plans only (Plus and Pro).
    - 2 children: Family plans only.
    - 0 children: No paid plans.
    - More than 2 children: No paid plans.

    If parent_id is not provided, all active paid plans
    are returned. This keeps existing admin usage compatible.
    """

    query = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.is_active == True
    )

    if not include_free:
        query = query.filter(
            SubscriptionPlan.plan_code != "FREE"
        )

    # Filter plans based on the parent's registered child count.
    if parent_id is not None:

        child_count = (
            db.query(Child)
            .filter(Child.parent_id == parent_id)
            .count()
        )

        if child_count == 1:
            query = query.filter(
                SubscriptionPlan.plan_type == "INDIVIDUAL"
            )

        elif child_count == 2:
            query = query.filter(
                SubscriptionPlan.plan_type == "FAMILY"
            )

        else:
            return []

    return (
        query
        .order_by(SubscriptionPlan.plan_id.asc())
        .all()
    )


# ==========================================
# ASSIGN FREE SUBSCRIPTION TO NEW PARENT
# ==========================================

def assign_free_subscription(db: Session, parent_id: int):
    """
    Assign the Free plan and 3 shared video credits
    to a newly registered parent.

    Free can only be assigned once per parent account.

    This function does not commit.
    The caller must commit the registration transaction.
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

    # Check whether the parent already has an active subscription.
    existing_active = (
        db.query(ParentSubscription)
        .filter(
            ParentSubscription.parent_id == parent_id,
            ParentSubscription.status == "ACTIVE",
        )
        .order_by(ParentSubscription.subscription_id.desc())
        .first()
    )

    if existing_active:
        # Do not create another Free subscription.
        return existing_active

    # Check all historical Free subscriptions, regardless of status.
    # A cancelled or expired Free subscription must not be assigned again.
    previous_free_subscription = (
        db.query(ParentSubscription)
        .join(
            SubscriptionPlan,
            ParentSubscription.plan_id == SubscriptionPlan.plan_id,
        )
        .filter(
            ParentSubscription.parent_id == parent_id,
            SubscriptionPlan.plan_code == "FREE",
        )
        .first()
    )

    if previous_free_subscription:
        raise ValueError(
            "Free plan has already been assigned to this parent account."
        )

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

            notification = Notification(
                parent_id=parent_id,
                child_id=child_id,
                subscription_id=subscription.subscription_id,
                notification_type="ACTIVITY_COMPLETED",
                channel="DASHBOARD",
                title="Activity Completed!",
                message=(
                    "Your child has successfully completed "
                    "a learning activity."
                ),
                is_read=False,
            )

            db.add(notification)

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
# VALIDATE CHILD COUNT FOR PAID PLAN
# ==========================================

def validate_plan_child_count(
    db: Session,
    parent_id: int,
    plan: SubscriptionPlan,
):
    """
    Validate the number of children for the selected paid plan.

    Individual plans require exactly 1 child.
    Family plans require exactly 2 children.
    """

    child_count = (
        db.query(Child)
        .filter(Child.parent_id == parent_id)
        .count()
    )

    if child_count > 2:
        raise ValueError(
            "A parent account can have a maximum of 2 children."
        )

    if plan.plan_type == "INDIVIDUAL":
        if child_count != 1:
            raise ValueError(
                "Plus and Pro plans require exactly 1 registered child."
            )

    elif plan.plan_type == "FAMILY":
        if child_count != 2:
            raise ValueError(
                "Family plans require exactly 2 registered children."
            )

    else:
        raise ValueError("Invalid paid subscription plan type.")

    return child_count


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

    No credits are allocated here.
    Credits are allocated only after a verified Stripe webhook.
    """

    if not idempotency_key or not idempotency_key.strip():
        raise ValueError("Idempotency key is required.")

    existing_payment = (
        db.query(SubscriptionPayment)
        .filter(
            SubscriptionPayment.idempotency_key == idempotency_key
        )
        .with_for_update()
        .first()
    )

    if existing_payment:
        if existing_payment.parent_id != parent_id:
            raise ValueError(
                "This idempotency key belongs to another parent."
            )

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

    # Validate the parent's child count before creating checkout.
    validate_plan_child_count(
        db=db,
        parent_id=parent_id,
        plan=plan,
    )

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
    Activate a subscription only after the router has verified
    the Stripe webhook signature and supplied payment details.

    Amount and currency are checked against the local payment row.
    The webhook router must commit the transaction.
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
                SubscriptionCredit.subscription_id
                == payment.subscription_id
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
        raise ValueError("Stripe has not confirmed that the payment is paid.")

    expected_amount = int(round(float(payment.amount_lkr) * 100))

    if int(amount_total) != expected_amount:
        raise ValueError(
            "Stripe payment amount does not match the subscription price."
        )

    if (currency or "").upper() != payment.currency.upper():
        raise ValueError(
            "Stripe payment currency does not match the subscription currency."
        )

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

    # Revalidate child count at webhook time.
    # This prevents activating a plan if the parent's child count
    # changed after Stripe Checkout was created.
    validate_plan_child_count(
        db=db,
        parent_id=payment.parent_id,
        plan=plan,
    )

    # Replace the parent's current active subscription only after payment
    # is verified and the child count is validated.
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
        raise ValueError(
            "Credits have already been allocated for this subscription."
        )

    new_credit = SubscriptionCredit(
        subscription_id=subscription.subscription_id,
        total_credits=plan.video_credits,
        used_credits=0,
        remaining_credits=plan.video_credits,
    )

    db.add(new_credit)

    payment.status = "SUCCESS"
    payment.verified_at = current_time

    notification = Notification(
        parent_id=payment.parent_id,
        child_id=None,
        subscription_id=subscription.subscription_id,
        notification_type="SUBSCRIPTION_ACTIVATED",
        channel="DASHBOARD",
        title="Subscription Activated!",
        message=(
            f"Your {plan.plan_name} subscription plan "
            "has been successfully activated."
        ),
        is_read=False,
    )

    db.add(notification)

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
    """
    Mark an expired or failed Stripe Checkout Session
    without allocating credits.
    """

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
        "message": (
            "Stripe payment failed or expired. No credits were allocated."
        ),
    }
