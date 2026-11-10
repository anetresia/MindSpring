from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import quiz_repository


MAX_QUESTIONS_PER_LESSON = 5


# ==========================================
# VALIDATE ANSWER OPTIONS
# ==========================================

def validate_answer_options(options, correct_answer):

    if not isinstance(options, list) or len(options) != 3:
        raise HTTPException(
            status_code=400,
            detail="Exactly 3 image options are required"
        )

    option_ids = [option["id"] for option in options]

    if len(set(option_ids)) != 3:
        raise HTTPException(
            status_code=400,
            detail="Exactly 3 unique image options are required"
        )

    if set(option_ids) != {"A", "B", "C"}:
        raise HTTPException(
            status_code=400,
            detail="Options must contain A, B and C"
        )

    if correct_answer not in option_ids:
        raise HTTPException(
            status_code=400,
            detail="Correct answer must match one of the image options"
        )


# ==========================================
# CREATE QUESTION
# ==========================================

def create_question(db: Session, question_data: dict):

    lesson_id = question_data["lesson_id"]

    existing_questions = quiz_repository.get_questions_by_lesson(
        db,
        lesson_id
    )

    if len(existing_questions) >= MAX_QUESTIONS_PER_LESSON:
        raise HTTPException(
            status_code=400,
            detail="A lesson can have only 5 active questions"
        )

    validate_answer_options(
        question_data["answer_options"],
        question_data["correct_answer"]
    )

    return quiz_repository.create_question(
        db,
        question_data
    )


# ==========================================
# GET LESSON QUESTIONS
# ==========================================

def get_lesson_questions(db: Session, lesson_id: int):

    return quiz_repository.get_questions_by_lesson(
        db,
        lesson_id
    )


# ==========================================
# UPDATE QUESTION
# ==========================================

def update_question(
    db: Session,
    question_id: int,
    update_data: dict
):

    question = quiz_repository.get_question_by_id(
        db,
        question_id
    )

    if not question or not question.is_active:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    # Use existing values when fields are not provided
    options = update_data.get(
        "answer_options",
        question.answer_options
    )

    correct_answer = update_data.get(
        "correct_answer",
        question.correct_answer
    )

    validate_answer_options(
        options,
        correct_answer
    )

    return quiz_repository.update_question(
        db,
        question,
        update_data
    )


# ==========================================
# ARCHIVE QUESTION
# ==========================================

def archive_question(db: Session, question_id: int):

    question = quiz_repository.get_question_by_id(
        db,
        question_id
    )

    if not question or not question.is_active:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    return quiz_repository.archive_question(
        db,
        question
    )