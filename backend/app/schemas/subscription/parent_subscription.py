
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# PARENT SUBSCRIPTION BASE SCHEMA
# ==========================================

class ParentSubscriptionBase(BaseModel):

    plan_id: int = Field(
        ...,
        gt=0
    )


# ==========================================
# CREATE PARENT SUBSCRIPTION SCHEMA
# ==========================================

class ParentSubscriptionCreate(ParentSubscriptionBase):
    pass


# ==========================================
# UPDATE SUBSCRIPTION STATUS SCHEMA
# ==========================================

class ParentSubscriptionStatusUpdate(BaseModel):

    status: Literal[
        "ACTIVE",
        "EXPIRED",
        "CANCELLED",
        "PENDING"
    ]


# ==========================================
# PARENT SUBSCRIPTION RESPONSE SCHEMA
# ==========================================

class ParentSubscriptionResponse(BaseModel):

    subscription_id: int
    parent_id: int
    plan_id: int

    status: Literal[
        "ACTIVE",
        "EXPIRED",
        "CANCELLED",
        "PENDING"
    ]

    starts_at: datetime
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# PARENT SUBSCRIPTION DETAILS RESPONSE
# ==========================================

class ParentSubscriptionDetailsResponse(
    ParentSubscriptionResponse
):

    plan: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)
