
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# SUBSCRIPTION PLAN BASE SCHEMA
# ==========================================

class SubscriptionPlanBase(BaseModel):

    plan_code: str = Field(
        ...,
        min_length=1,
        max_length=50
    )

    plan_name: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    plan_type: Literal[
        "FREE",
        "INDIVIDUAL",
        "FAMILY"
    ]

    video_credits: int = Field(
        ...,
        ge=0
    )

    max_children: int = Field(
        ...,
        ge=1
    )

    price_lkr: Decimal = Field(
        ...,
        ge=0
    )

    billing_type: Literal[
        "FREE",
        "ONE_TIME",
        "MONTHLY"
    ]

    validity_days: Optional[int] = Field(
        default=None,
        gt=0
    )


# ==========================================
# CREATE SUBSCRIPTION PLAN SCHEMA
# ==========================================

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


# ==========================================
# RESPONSE SUBSCRIPTION PLAN SCHEMA
# ==========================================

class SubscriptionPlanResponse(SubscriptionPlanBase):

    plan_id: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SUBSCRIPTION PLAN LIST RESPONSE
# ==========================================

class SubscriptionPlanListResponse(BaseModel):

    total: int
    plans: list[SubscriptionPlanResponse]

    model_config = ConfigDict(from_attributes=True)
