
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# NOTIFICATION BASE SCHEMA
# ==========================================

class NotificationBase(BaseModel):

    notification_type: Literal[
        "CREDITS_5_REMAINING",
        "CREDITS_1_REMAINING",
        "CREDITS_EXHAUSTED",
        "SUBSCRIPTION_EXPIRING",
        "SUBSCRIPTION_EXPIRED",
    ]

    channel: Literal[
        "DASHBOARD",
        "EMAIL",
    ]

    title: str = Field(
        ...,
        min_length=1,
        max_length=255
    )

    message: str = Field(
        ...,
        min_length=1
    )


# ==========================================
# CREATE NOTIFICATION SCHEMA
# ==========================================

class NotificationCreate(NotificationBase):

    subscription_id: Optional[int] = Field(
        default=None,
        gt=0
    )


# ==========================================
# NOTIFICATION RESPONSE SCHEMA
# ==========================================

class NotificationResponse(NotificationBase):

    notification_id: int
    parent_id: int
    subscription_id: Optional[int] = None
    is_read: bool
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# MARK NOTIFICATION AS READ SCHEMA
# ==========================================

class NotificationReadUpdate(BaseModel):

    is_read: bool


# ==========================================
# NOTIFICATION LIST RESPONSE SCHEMA
# ==========================================

class NotificationListResponse(BaseModel):

    total: int
    notifications: list[NotificationResponse]

    model_config = ConfigDict(from_attributes=True)
