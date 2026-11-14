
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    DateTime,
    CheckConstraint,
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func

from app.database import Base


class SubscriptionCredit(Base):
    __tablename__ = "subscription_credits"

    __table_args__ = (
        CheckConstraint(
            "total_credits >= 0",
            name="check_total_credits_non_negative",
        ),
        CheckConstraint(
            "used_credits >= 0",
            name="check_used_credits_non_negative",
        ),
        CheckConstraint(
            "remaining_credits >= 0",
            name="check_remaining_credits_non_negative",
        ),
        CheckConstraint(
            "used_credits + remaining_credits = total_credits",
            name="check_credit_balance",
        ),
    )

    credit_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    subscription_id = Column(
        Integer,
        ForeignKey(
            "parent_subscriptions.subscription_id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    total_credits = Column(
        Integer,
        nullable=False,
    )

    used_credits = Column(
        Integer,
        nullable=False,
        default=0,
    )

    remaining_credits = Column(
        Integer,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    subscription = relationship(
        "ParentSubscription",
        backref=backref(
            "subscription_credit",
            uselist=False,
        ),
    )
