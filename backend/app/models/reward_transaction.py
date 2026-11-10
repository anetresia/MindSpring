
from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.database import Base


class RewardTransaction(Base):
    __tablename__ = "reward_transaction"

    __table_args__ = (
        UniqueConstraint(
            "child_id",
            "lesson_id",
            name="uq_child_lesson_reward",
        ),
    )

    reward_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    child_id = Column(
        Integer,
        ForeignKey("child.child_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    lesson_id = Column(
        Integer,
        ForeignKey("lesson.lesson_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    stars_earned = Column(
        Integer,
        nullable=False,
        default=0,
    )

    total_questions = Column(
        Integer,
        nullable=False,
        default=0,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
