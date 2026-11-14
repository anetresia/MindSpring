
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# SUBSCRIPTION PAYMENT BASE SCHEMA
# ==========================================

class SubscriptionPaymentBase(BaseModel):

    subscription_id: int = Field(
        ...,
        gt=0
    )

    amount: Decimal = Field(
        ...,
        gt=0
    )

    payment_method: Optional[str] = Field(
        default=None,
        max_length=50
    )


# ==========================================
# CREATE PAYMENT REQUEST SCHEMA
# ==========================================

class SubscriptionPaymentCreate(SubscriptionPaymentBase):
    pass


# ==========================================
# PAYMENT STATUS UPDATE SCHEMA
# ==========================================

class SubscriptionPaymentStatusUpdate(BaseModel):

    payment_status: Literal[
        "PENDING",
        "SUCCESS",
        "FAILED"
    ]

    transaction_reference: Optional[str] = Field(
        default=None,
        max_length=255
    )


# ==========================================
# SUBSCRIPTION PAYMENT RESPONSE SCHEMA
# ==========================================

class SubscriptionPaymentResponse(BaseModel):

    payment_id: int
    subscription_id: int
    amount: Decimal

    payment_status: str

    payment_method: Optional[str] = None

    transaction_reference: Optional[str] = None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# PAYMENT LIST RESPONSE SCHEMA
# ==========================================

class SubscriptionPaymentListResponse(BaseModel):

    total: int
    payments: list[SubscriptionPaymentResponse]

    model_config = ConfigDict(from_attributes=True)
