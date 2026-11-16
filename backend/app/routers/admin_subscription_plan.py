
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.subscription.subscription_plan import SubscriptionPlan
from app.schemas.subscription.subscription_plan import (
    SubscriptionPlanCreate,
    SubscriptionPlanResponse,
    SubscriptionPlanListResponse,
)
from app.routers.auth import get_current_admin


router = APIRouter(
    prefix="/admin/subscriptions/plans",
    tags=["Admin - Subscription Plans"],
)


# ==========================================
# UPDATE SCHEMA
# ==========================================

class SubscriptionPlanUpdate(BaseModel):
    plan_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    video_credits: Optional[int] = Field(default=None, ge=0)
    max_children: Optional[int] = Field(default=None, ge=1)
    price_lkr: Optional[Decimal] = Field(default=None, ge=0)
    validity_days: Optional[int] = Field(default=None, gt=0)


class SubscriptionPlanStatusUpdate(BaseModel):
    is_active: bool


# ==========================================
# GET ALL PLANS - ADMIN
# Includes active and inactive plans
# ==========================================

@router.get(
    "/",
    response_model=SubscriptionPlanListResponse,
)
def admin_get_all_subscription_plans(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    plans = (
        db.query(SubscriptionPlan)
        .order_by(SubscriptionPlan.plan_id.asc())
        .all()
    )

    return {
        "total": len(plans),
        "plans": plans,
    }


# ==========================================
# CREATE NEW PLAN
# ==========================================

@router.post(
    "/",
    response_model=SubscriptionPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_subscription_plan(
    payload: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    plan_code = payload.plan_code.strip().upper()

    existing_plan = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.plan_code == plan_code)
        .first()
    )

    if existing_plan:
        raise HTTPException(
            status_code=409,
            detail="This plan code already exists.",
        )

    # Only one Free plan is allowed
    if payload.plan_type == "FREE":
        free_plan = (
            db.query(SubscriptionPlan)
            .filter(SubscriptionPlan.plan_type == "FREE")
            .first()
        )

        if free_plan:
            raise HTTPException(
                status_code=400,
                detail="A Free plan already exists.",
            )

        if payload.billing_type != "FREE" or payload.price_lkr != 0:
            raise HTTPException(
                status_code=400,
                detail="Free plan must have FREE billing and zero price.",
            )

        if payload.validity_days is not None:
            raise HTTPException(
                status_code=400,
                detail="Free plan must have no expiry.",
            )

    else:
        if payload.billing_type == "FREE" or payload.price_lkr <= 0:
            raise HTTPException(
                status_code=400,
                detail="Paid plans must have a valid price and billing type.",
            )

        if payload.billing_type == "MONTHLY" and not payload.validity_days:
            raise HTTPException(
                status_code=400,
                detail="Monthly plans must have validity days.",
            )

        if payload.billing_type == "ONE_TIME" and payload.validity_days is not None:
            raise HTTPException(
                status_code=400,
                detail="One-time plans must have no expiry.",
            )

    new_plan = SubscriptionPlan(
        plan_code=plan_code,
        plan_name=payload.plan_name.strip(),
        plan_type=payload.plan_type,
        video_credits=payload.video_credits,
        max_children=payload.max_children,
        price_lkr=payload.price_lkr,
        billing_type=payload.billing_type,
        validity_days=payload.validity_days,
        is_active=True,
    )

    try:
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to create plan. Check whether the plan code already exists.",
        )

    return new_plan


# ==========================================
# UPDATE EXISTING PLAN
# Editable fields:
# name, credits, children, price, validity
# ==========================================

@router.patch(
    "/{plan_id}",
    response_model=SubscriptionPlanResponse,
)
def admin_update_subscription_plan(
    plan_id: int,
    payload: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    plan = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.plan_id == plan_id)
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)

    if "plan_name" in update_data:
        if update_data["plan_name"] is None:
            raise HTTPException(status_code=400, detail="Plan name cannot be empty.")
        update_data["plan_name"] = update_data["plan_name"].strip()

    if "price_lkr" in update_data and update_data["price_lkr"] is None:
        raise HTTPException(status_code=400, detail="Price cannot be empty.")

    if "video_credits" in update_data and update_data["video_credits"] is None:
        raise HTTPException(status_code=400, detail="Credits cannot be empty.")

    if "max_children" in update_data and update_data["max_children"] is None:
        raise HTTPException(status_code=400, detail="Maximum children cannot be empty.")

    if plan.plan_type == "FREE":
        new_price = update_data.get("price_lkr", plan.price_lkr)

        if new_price != 0:
            raise HTTPException(
                status_code=400,
                detail="Free plan price must remain zero.",
            )

        if update_data.get("validity_days", plan.validity_days) is not None:
            raise HTTPException(
                status_code=400,
                detail="Free plan must have no expiry.",
            )

    elif plan.billing_type == "MONTHLY":
        new_validity = update_data.get("validity_days", plan.validity_days)

        if new_validity is None:
            raise HTTPException(
                status_code=400,
                detail="Monthly plans must have validity days.",
            )

    elif plan.billing_type == "ONE_TIME":
        new_validity = update_data.get("validity_days", plan.validity_days)

        if new_validity is not None:
            raise HTTPException(
                status_code=400,
                detail="One-time plans must have no expiry.",
            )

    for field, value in update_data.items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)

    return plan


# ==========================================
# ACTIVATE / DEACTIVATE PLAN
# ==========================================

@router.patch(
    "/{plan_id}/status",
    response_model=SubscriptionPlanResponse,
)
def admin_update_subscription_plan_status(
    plan_id: int,
    payload: SubscriptionPlanStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    plan = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.plan_id == plan_id)
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found.",
        )

    # Free plan must always remain active
    if plan.plan_type == "FREE" and payload.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="The Free plan cannot be deactivated.",
        )

    plan.is_active = payload.is_active

    db.commit()
    db.refresh(plan)

    return plan
