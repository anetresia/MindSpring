from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.subscription.subscription_plan import (
    SubscriptionPlanListResponse,
)
from app.services.subscription_service import get_subscription_plans


router = APIRouter(
    prefix="/subscriptions/plans",
    tags=["Subscription Plans"],
)


# ==========================================
# GET ALL ACTIVE SUBSCRIPTION PLANS
# ==========================================

@router.get(
    "/",
    response_model=SubscriptionPlanListResponse,
)
def list_subscription_plans(
    db: Session = Depends(get_db),
):
    plans = get_subscription_plans(db)

    return {
        "total": len(plans),
        "plans": plans,
    }