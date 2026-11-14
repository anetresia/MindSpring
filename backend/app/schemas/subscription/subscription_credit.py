
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# SUBSCRIPTION CREDIT BASE SCHEMA
# ==========================================

class SubscriptionCreditBase(BaseModel):

    total_credits: int = Field(
        ...,
        ge=0
    )

    used_credits: int = Field(
        ...,
        ge=0
    )

    remaining_credits: int = Field(
        ...,
        ge=0
    )


# ==========================================
# SUBSCRIPTION CREDIT RESPONSE SCHEMA
# ==========================================

class SubscriptionCreditResponse(SubscriptionCreditBase):

    credit_id: int
    subscription_id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# CREDIT BALANCE RESPONSE SCHEMA
# ==========================================

class CreditBalanceResponse(BaseModel):

    total_credits: int
    used_credits: int
    remaining_credits: int

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# CREDIT DEDUCTION RESPONSE SCHEMA
# ==========================================

class CreditDeductionResponse(BaseModel):

    success: bool
    subscription_id: int
    total_credits: int
    used_credits: int
    remaining_credits: int
    deducted_credits: int

    model_config = ConfigDict(from_attributes=True)
