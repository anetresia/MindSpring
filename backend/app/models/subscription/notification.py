
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

    child_id = Column(
        Integer,
        ForeignKey("child.child_id", ondelete="SET NULL"),
        nullable=True,
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

    # VARCHAR allows adding new notification types
    # without changing the MySQL ENUM definition.
    notification_type = Column(
        String(64),
        nullable=False,
        index=True,
    )

    channel = Column(
        Enum(
            "DASHBOARD",
            "EMAIL",
            name="notification_channel",
        ),
        nullable=False,
        default="DASHBOARD",
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
        server_default="0",
        index=True,
    )

    sent_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    parent = relationship(
        "User",
        backref="subscription_notifications",
    )

    child = relationship(
        "Child",
        backref="notifications",
    )

    subscription = relationship(
        "ParentSubscription",
        backref="notifications",
    )
