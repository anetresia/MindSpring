
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.parent import get_current_parent
from app.schemas.subscription.subscription_plan import (
    SubscriptionPlanListResponse,
)
from app.services.subscription_service import get_subscription_plans


router = APIRouter(
    prefix="/subscriptions/plans",
    tags=["Subscription Plans"],
)


# ==========================================
# GET SUBSCRIPTION PLANS FOR LOGGED-IN PARENT
# ==========================================

@router.get(
    "/",
    response_model=SubscriptionPlanListResponse,
)
def list_subscription_plans(
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    """
    Return paid subscription plans based on
    the number of children registered by the parent.

    1 child  -> Plus and Pro
    2 children -> Family Pack Plus and Family Pack Pro

    Free plan is excluded.
    """

    plans = get_subscription_plans(
        db=db,
        parent_id=current_parent.user_id,
        include_free=False,
    )

    return {
        "total": len(plans),
        "plans": plans,
    }
