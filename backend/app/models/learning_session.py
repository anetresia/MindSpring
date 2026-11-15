
from sqlalchemy import (
    Column,
    Integer,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    __table_args__ = (
        UniqueConstraint(
            "child_id",
            "learning_date",
            name="uq_child_learning_date",
        ),
    )

    session_id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    child_id = Column(
        Integer,
        ForeignKey("child.child_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    parent_id = Column(
        Integer,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    learning_date = Column(Date, nullable=False, index=True)

    total_seconds = Column(Integer, nullable=False, default=0, server_default="0")

    is_active = Column(Boolean, nullable=False, default=False, server_default="0")

    started_at = Column(DateTime, nullable=True)

    last_heartbeat_at = Column(DateTime, nullable=True)

    limit_reached = Column(Boolean, nullable=False, default=False, server_default="0")

    created_at = Column(DateTime, nullable=False, server_default=func.now())

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    child = relationship("Child", backref="learning_sessions")
    parent = relationship("User", backref="learning_sessions")
