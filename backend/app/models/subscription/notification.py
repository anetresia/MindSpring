
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Enum,
    Boolean,
    Text,
    DateTime,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(
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
        ForeignKey(
            "parent_subscriptions.subscription_id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    notification_type = Column(
        Enum(
            "CREDITS_5_REMAINING",
            "CREDITS_1_REMAINING",
            "CREDITS_EXHAUSTED",
            "SUBSCRIPTION_EXPIRING",
            "SUBSCRIPTION_EXPIRED",
            name="subscription_notification_type",
        ),
        nullable=False,
    )

    channel = Column(
        Enum(
            "DASHBOARD",
            "EMAIL",
            name="notification_channel",
        ),
        nullable=False,
    )

    title = Column(
        String(255),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=False,
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    sent_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    parent = relationship(
        "User",
        backref="subscription_notifications",
    )

    subscription = relationship(
        "ParentSubscription",
        backref="notifications",
    )
