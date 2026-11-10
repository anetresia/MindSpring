
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    func
)

from app.database import Base


# ==========================================
# QUESTION MODEL
# ==========================================

class Question(Base):
    __tablename__ = "question"

    question_id = Column(Integer, primary_key=True, index=True)

    lesson_id = Column(
        Integer,
        ForeignKey("lesson.lesson_id"),
        nullable=False
    )

    question_text = Column(Text, nullable=False)

    # Four answer options stored as JSON
    answer_options = Column(JSON, nullable=False)

    # Correct answer (admin/backend only)
    correct_answer = Column(String(255), nullable=False)

    # Image-based or Voice-based
    question_type = Column(
        String(20),
        nullable=False,
        default="Image"
    )

    # Controls question display order
    question_order = Column(
        Integer,
        nullable=False,
        default=1
    )

    # Soft delete: False means archived
    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )


# ==========================================
# ACTIVITY RESPONSE MODEL
# ==========================================

class ActivityResponse(Base):
    __tablename__ = "activity_response"

    response_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    child_id = Column(
        Integer,
        ForeignKey("child.child_id"),
        nullable=False
    )

    question_id = Column(
        Integer,
        ForeignKey("question.question_id"),
        nullable=False
    )

    selected_answer = Column(
        String(255),
        nullable=False
    )

    score = Column(
        Integer,
        nullable=False,
        default=0
    )

    is_correct = Column(
        Boolean,
        nullable=False,
        default=False
    )

    response_time = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )
