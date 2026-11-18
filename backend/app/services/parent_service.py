
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from fastapi import HTTPException, status

from app.models.child import Child
from app.models.user import User
from app.models.lesson_attempt import LessonAttempt

from app.models.subscription.parent_subscription import ParentSubscription
from app.models.subscription.subscription_plan import SubscriptionPlan
from app.models.subscription.notification import Notification

from app.schemas.child import ChildCreate, ChildUpdate


# ==========================================
# GET ALL CHILDREN BELONGING TO THE PARENT
# ==========================================

def get_parent_children(
    db: Session,
    parent: User,
):
    return (
        db.query(Child)
        .filter(Child.parent_id == parent.user_id)
        .order_by(Child.created_at.desc())
        .all()
    )


# ==========================================
# GET A SPECIFIC CHILD
# ==========================================

def get_parent_child(
    db: Session,
    parent: User,
    child_id: int,
):
    return (
        db.query(Child)
        .filter(
            Child.child_id == child_id,
            Child.parent_id == parent.user_id,
        )
        .first()
    )


# ==========================================
# GET ACTIVE SUBSCRIPTION
# ==========================================

def get_parent_active_subscription(
    db: Session,
    parent: User,
):
    current_time = datetime.now(timezone.utc).replace(tzinfo=None)

    subscription = (
        db.query(ParentSubscription)
        .join(
            SubscriptionPlan,
            ParentSubscription.plan_id == SubscriptionPlan.plan_id,
        )
        .filter(
            ParentSubscription.parent_id == parent.user_id,
            ParentSubscription.status == "ACTIVE",
            SubscriptionPlan.is_active == True,
        )
        .order_by(
            ParentSubscription.subscription_id.desc()
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have an active subscription. "
                "Please subscribe to a plan."
            ),
        )

    # Check subscription expiry
    if (
        subscription.expires_at is not None
        and subscription.expires_at <= current_time
    ):
        subscription.status = "EXPIRED"
        db.flush()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Your subscription has expired. "
                "Please purchase a new plan."
            ),
        )

    return subscription


# ==========================================
# GET PARENT CHILD LIMIT
# ==========================================

def get_parent_child_limit(
    db: Session,
    parent: User,
):
    subscription = get_parent_active_subscription(
        db=db,
        parent=parent,
    )

    return subscription.plan.max_children


# ==========================================
# CHECK PENDING PAID SUBSCRIPTION
# ==========================================

def check_pending_subscription(
    db: Session,
    parent: User,
):
    """
    Check whether the parent has a pending paid subscription.

    Child count must not change while Stripe checkout
    is waiting for payment confirmation.
    """

    pending_subscription = (
        db.query(ParentSubscription)
        .join(
            SubscriptionPlan,
            ParentSubscription.plan_id == SubscriptionPlan.plan_id,
        )
        .filter(
            ParentSubscription.parent_id == parent.user_id,
            ParentSubscription.status == "PENDING",
            SubscriptionPlan.plan_type != "FREE",
        )
        .order_by(
            ParentSubscription.subscription_id.desc()
        )
        .first()
    )

    return pending_subscription


# ==========================================
# CREATE A NEW CHILD PROFILE
# SUBSCRIPTION-BASED CHILD LIMIT
# ==========================================

def create_child(
    db: Session,
    parent: User,
    child_data: ChildCreate,
):
    try:
        # Lock parent row to reduce concurrent child creation.
        locked_parent = (
            db.query(User)
            .filter(User.user_id == parent.user_id)
            .with_for_update()
            .first()
        )

        if not locked_parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent account not found.",
            )

        # Check pending Stripe checkout.
        pending_subscription = check_pending_subscription(
            db=db,
            parent=parent,
        )

        if pending_subscription:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Your subscription payment is currently pending. "
                    "Please complete or cancel the payment before "
                    "changing your child profiles."
                ),
            )

        # Get current active subscription.
        subscription = get_parent_active_subscription(
            db=db,
            parent=parent,
        )

        max_children = subscription.plan.max_children

        # Count existing children.
        child_count = (
            db.query(Child)
            .filter(
                Child.parent_id == parent.user_id
            )
            .count()
        )

        # Global maximum: 2 children per parent.
        if child_count >= 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "A parent account can have a maximum "
                    "of 2 child profiles."
                ),
            )

        # Subscription-based child limit.
        if child_count >= max_children:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Your current {subscription.plan.plan_name} plan "
                    f"allows a maximum of {max_children} child profile(s). "
                    "Please upgrade your subscription to add more children."
                ),
            )

        new_child = Child(
            parent_id=parent.user_id,
            child_name=child_data.child_name,
            date_of_birth=child_data.date_of_birth,
            communication_method=child_data.communication_method,
            preferred_learning_mode=child_data.preferred_learning_mode,
            daily_learning_limit=child_data.daily_learning_limit,
        )

        db.add(new_child)
        db.commit()
        db.refresh(new_child)

        return new_child

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError:
        db.rollback()
        raise


# ==========================================
# UPDATE AN EXISTING CHILD PROFILE
# CREATE PARENT DASHBOARD NOTIFICATION
# ==========================================

def update_child(
    db: Session,
    parent: User,
    child_id: int,
    child_data: ChildUpdate,
):
    child = get_parent_child(
        db=db,
        parent=parent,
        child_id=child_id,
    )

    if not child:
        return None

    update_data = child_data.model_dump(
        exclude_unset=True
    )

    try:
        # Update child profile fields.
        for field, value in update_data.items():
            setattr(child, field, value)

        # Create notification only when profile data is updated.
        if update_data:
            notification = Notification(
                parent_id=parent.user_id,
                child_id=child.child_id,
                notification_type="CHILD_PROFILE_UPDATED",
                channel="DASHBOARD",
                title="Child Profile Updated",
                message=(
                    f"{child.child_name}'s profile has been "
                    "successfully updated."
                ),
                is_read=False,
            )

            db.add(notification)

        # Save profile update and notification together.
        db.commit()
        db.refresh(child)

        return child

    except SQLAlchemyError:
        db.rollback()
        raise


# ==========================================
# DELETE A CHILD PROFILE AND RELATED RECORDS
# ==========================================

def delete_child(
    db: Session,
    parent: User,
    child_id: int,
):
    child = get_parent_child(
        db=db,
        parent=parent,
        child_id=child_id,
    )

    if not child:
        return False

    try:
        # 1. Delete activity responses.
        db.execute(
            text(
                """
                DELETE FROM activity_response
                WHERE child_id = :child_id
                """
            ),
            {"child_id": child_id},
        )

        # 2. Delete lesson attempts.
        db.query(LessonAttempt).filter(
            LessonAttempt.child_id == child_id
        ).delete(synchronize_session=False)

        # 3. Delete child profile.
        db.delete(child)

        # 4. Commit all deletions together.
        db.commit()

        return True

    except SQLAlchemyError:
        db.rollback()
        raise
