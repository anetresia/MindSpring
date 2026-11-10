
from sqlalchemy.orm import Session

from app.models.quiz import Question


# ==========================================
# CREATE QUESTION
# ==========================================

def create_question(db: Session, question_data: dict):

    question = Question(**question_data)

    try:
        db.add(question)
        db.commit()
        db.refresh(question)
        return question

    except Exception:
        db.rollback()
        raise


# ==========================================
# GET QUESTIONS BY LESSON
# ==========================================

def get_questions_by_lesson(
    db: Session,
    lesson_id: int,
    include_inactive: bool = False
):

    query = db.query(Question).filter(
        Question.lesson_id == lesson_id
    )

    if not include_inactive:
        query = query.filter(
            Question.is_active.is_(True)
        )

    return query.order_by(
        Question.question_order.asc()
    ).all()


# ==========================================
# GET QUESTION BY ID
# ==========================================

def get_question_by_id(
    db: Session,
    question_id: int
):

    return db.query(Question).filter(
        Question.question_id == question_id
    ).first()


# ==========================================
# UPDATE QUESTION
# ==========================================

def update_question(
    db: Session,
    question: Question,
    update_data: dict
):

    try:
        for key, value in update_data.items():
            setattr(question, key, value)

        db.commit()
        db.refresh(question)

        return question

    except Exception:
        db.rollback()
        raise


# ==========================================
# ARCHIVE QUESTION
# ==========================================

def archive_question(
    db: Session,
    question: Question
):

    try:
        question.is_active = False

        db.commit()
        db.refresh(question)

        return question

    except Exception:
        db.rollback()
        raise
