
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Boolean,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class VideoHistory(Base):
    __tablename__ = "video_history"

    __table_args__ = (
        UniqueConstraint(
            "idempotency_key",
            name="uq_video_history_idempotency",
        ),
    )

    history_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    parent_id = Column(
        Integer,
        ForeignKey("user.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    child_id = Column(
        Integer,
        ForeignKey("child.child_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    lesson_id = Column(
        Integer,
        ForeignKey("lesson.lesson_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    subscription_id = Column(
        Integer,
        ForeignKey(
            "parent_subscriptions.subscription_id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    video_completed_at = Column(
        DateTime,
        nullable=True,
    )

    activity_completed_at = Column(
        DateTime,
        nullable=True,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
    )

    credit_deducted = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    idempotency_key = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    parent = relationship(
        "User",
        backref="video_histories",
    )

    child = relationship(
        "Child",
        backref="video_histories",
    )

    lesson = relationship(
        "Lesson",
        backref="video_histories",
    )

    subscription = relationship(
        "ParentSubscription",
        backref="video_histories",
    )
