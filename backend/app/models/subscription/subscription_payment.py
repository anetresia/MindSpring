
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Numeric,
    Enum,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"

    payment_id = Column(
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

    subscription_id = Column(
        Integer,
        ForeignKey("parent_subscriptions.subscription_id"),
        nullable=True,
        index=True,
    )

    provider = Column(
        String(50),
        nullable=False,
    )

    provider_payment_id = Column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )

    idempotency_key = Column(
        String(255),
        unique=True,
        nullable=False,
    )

    amount_lkr = Column(
        Numeric(10, 2),
        nullable=False,
    )

    currency = Column(
        String(3),
        nullable=False,
        default="LKR",
    )

    status = Column(
        Enum(
            "PENDING",
            "SUCCESS",
            "FAILED",
            "CANCELLED",
            name="subscription_payment_status",
        ),
        nullable=False,
        default="PENDING",
        index=True,
    )

    verified_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    parent = relationship(
        "User",
        backref="subscription_payments",
    )

    subscription = relationship(
        "ParentSubscription",
        backref="payments",
    )
