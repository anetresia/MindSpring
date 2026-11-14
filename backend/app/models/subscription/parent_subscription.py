
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Enum,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ParentSubscription(Base):
    __tablename__ = "parent_subscriptions"

    subscription_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    parent_id = Column(
        Integer,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    plan_id = Column(
        Integer,
        ForeignKey("subscription_plans.plan_id"),
        nullable=False,
        index=True,
    )

    status = Column(
        Enum(
            "ACTIVE",
            "EXPIRED",
            "CANCELLED",
            "PENDING",
            name="subscription_status",
        ),
        nullable=False,
        default="ACTIVE",
        index=True,
    )

    starts_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    expires_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    parent = relationship(
        "User",
        backref="subscriptions",
    )

    plan = relationship(
        "SubscriptionPlan",
        backref="parent_subscriptions",
    )
