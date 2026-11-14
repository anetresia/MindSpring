
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.parent import get_current_parent
from app.models.user import User
from app.models.subscription.subscription_credit import SubscriptionCredit

from app.services.subscription_service import (
    get_active_subscription,
)


router = APIRouter(
    prefix="/subscriptions",
    tags=["Parent Subscription"],
)


# ==========================================
# GET CURRENT PARENT SUBSCRIPTION
# ==========================================

@router.get("/my-subscription/")
def get_my_subscription(
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    """
    Return the current parent's active subscription,
    plan details and video credit balance.
    """

    subscription = get_active_subscription(
        db=db,
        parent_id=current_parent.user_id,
    )

    if not subscription:
        return {
            "success": True,
            "has_subscription": False,
            "message": "No active subscription found.",
            "subscription": None,
        }

    # Get subscription plan details.
    plan = subscription.plan

    # Get credit balance.
    credit = (
        db.query(SubscriptionCredit)
        .filter(
            SubscriptionCredit.subscription_id
            == subscription.subscription_id
        )
        .first()
    )

    if not credit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription credit record not found.",
        )

    return {
        "success": True,
        "has_subscription": True,

        "subscription": {
            "subscription_id": subscription.subscription_id,
            "parent_id": subscription.parent_id,
            "plan_id": subscription.plan_id,
            "status": subscription.status,
            "starts_at": subscription.starts_at,
            "expires_at": subscription.expires_at,
            "created_at": subscription.created_at,

            "plan": {
                "plan_id": plan.plan_id,
                "plan_code": plan.plan_code,
                "plan_name": plan.plan_name,
                "plan_type": plan.plan_type,
                "video_credits": plan.video_credits,
                "max_children": plan.max_children,
                "price_lkr": str(plan.price_lkr),
                "billing_type": plan.billing_type,
                "validity_days": plan.validity_days,
            },

            "credits": {
                "total_credits": credit.total_credits,
                "used_credits": credit.used_credits,
                "remaining_credits": credit.remaining_credits,
            },
        },
    }
