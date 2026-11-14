
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Numeric,
    Enum,
    DateTime,
    CheckConstraint,
)
from sqlalchemy.sql import func

from app.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    __table_args__ = (
        CheckConstraint(
            "video_credits >= 0",
            name="check_plan_video_credits_non_negative",
        ),
        CheckConstraint(
            "max_children >= 1",
            name="check_plan_max_children_positive",
        ),
        CheckConstraint(
            "price_lkr >= 0",
            name="check_plan_price_non_negative",
        ),
        CheckConstraint(
            "validity_days IS NULL OR validity_days > 0",
            name="check_plan_validity_positive",
        ),
    )

    plan_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    plan_code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    plan_name = Column(
        String(100),
        nullable=False,
    )

    plan_type = Column(
        Enum(
            "FREE",
            "INDIVIDUAL",
            "FAMILY",
            name="subscription_plan_type",
        ),
        nullable=False,
    )

    video_credits = Column(
        Integer,
        nullable=False,
    )

    max_children = Column(
        Integer,
        nullable=False,
    )

    price_lkr = Column(
        Numeric(10, 2),
        nullable=False,
        default=0.00,
    )

    billing_type = Column(
        Enum(
            "FREE",
            "ONE_TIME",
            "MONTHLY",
            name="subscription_billing_type",
        ),
        nullable=False,
    )

    validity_days = Column(
        Integer,
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
