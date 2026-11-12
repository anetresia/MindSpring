
from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
    func,
)

from app.database import Base


class LessonAttempt(Base):
    __tablename__ = "lesson_attempt"

    attempt_id = Column(
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

    total_questions = Column(
        Integer,
        nullable=False,
        default=0,
    )

    correct_answers = Column(
        Integer,
        nullable=False,
        default=0,
    )

    completed_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
