
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.quiz import ActivityResponse
from app.models.reward_transaction import RewardTransaction
from app.models.lesson_attempt import LessonAttempt

from app.routers.auth import get_current_admin
from app.routers.parent import get_current_parent

from app.schemas.quiz import QuestionCreate, QuestionUpdate

from app.services import quiz_service
from app.services import parent_service
from app.services import child_selected_topic_service
from app.services import lesson_service


# ==========================================
# QUESTION ORDER VALIDATION
# ==========================================

MIN_QUESTION_ORDER = 1
MAX_QUESTION_ORDER = 5


def validate_question_order(question_order):
    if (
        not isinstance(question_order, int)
        or isinstance(question_order, bool)
        or question_order < MIN_QUESTION_ORDER
        or question_order > MAX_QUESTION_ORDER
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question Order must be between 1 and 5",
        )


def get_sorted_questions(db: Session, lesson_id: int):
    questions = quiz_service.get_lesson_questions(
        db,
        lesson_id,
    )

    return sorted(
        questions,
        key=lambda question: question.question_order or 0,
    )


# ==========================================
# CHILD ACCESS VALIDATION
# ==========================================

def verify_child_lesson_access(
    db: Session,
    current_parent: User,
    child_id: int,
    lesson_id: int,
):
    child = parent_service.get_parent_child(
        db,
        current_parent,
        child_id,
    )

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found",
        )

    lesson = lesson_service.get_lesson_by_id(
        db,
        lesson_id,
    )

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    selected_topics = (
        child_selected_topic_service.get_child_selected_topics(
            db,
            child_id,
        )
    )

    lesson_is_allowed = False

    for selected_topic in selected_topics:
        lessons = lesson_service.get_lessons_by_topic(
            db,
            selected_topic.topic_id,
        )

        if any(
            item.lesson_id == lesson_id
            for item in lessons
        ):
            lesson_is_allowed = True
            break

    if not lesson_is_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This lesson is not available for this child",
        )

    return child, lesson


# ==========================================
# ADMIN QUIZ ROUTER
# ==========================================

router = APIRouter(
    prefix="/admin/quizzes",
    tags=["Admin Quiz Management"],
)


# ==========================================
# ADMIN - ADD QUESTION
# ==========================================

@router.post(
    "/questions",
    status_code=status.HTTP_201_CREATED,
)
def create_question(
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    validate_question_order(
        question_data.question_order
    )

    question_dict = question_data.dict()

    question_dict["answer_options"] = [
        option.dict()
        for option in question_data.answer_options
    ]

    question = quiz_service.create_question(
        db,
        question_dict,
    )

    return {
        "message": "Question created successfully",
        "question_id": question.question_id,
    }


# ==========================================
# ADMIN - GET LESSON QUESTIONS
# ==========================================

@router.get("/lessons/{lesson_id}/questions")
def get_lesson_questions(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    questions = get_sorted_questions(
        db,
        lesson_id,
    )

    return [
        {
            "question_id": question.question_id,
            "lesson_id": question.lesson_id,
            "question_text": question.question_text,
            "answer_options": question.answer_options,
            "correct_answer": question.correct_answer,
            "question_type": question.question_type,
            "question_order": question.question_order,
        }
        for question in questions
    ]


# ==========================================
# ADMIN - UPDATE QUESTION
# ==========================================

@router.put("/questions/{question_id}")
def update_question(
    question_id: int,
    question_data: QuestionUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    update_dict = question_data.dict(
        exclude_unset=True
    )

    if "question_order" in update_dict:
        validate_question_order(
            update_dict["question_order"]
        )

    if "answer_options" in update_dict:
        update_dict["answer_options"] = [
            option.dict()
            for option in question_data.answer_options
        ]

    question = quiz_service.update_question(
        db,
        question_id,
        update_dict,
    )

    return {
        "message": "Question updated successfully",
        "question_id": question.question_id,
    }


# ==========================================
# ADMIN - ARCHIVE QUESTION
# ==========================================

@router.delete("/questions/{question_id}")
def archive_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    quiz_service.archive_question(
        db,
        question_id,
    )

    return {
        "message": "Question archived successfully"
    }


# ==========================================
# CHILD QUIZ ROUTER
# ==========================================

child_router = APIRouter(
    prefix="/child/lessons",
    tags=["Child Quiz"],
)


# ==========================================
# PARENT / CHILD - GET LESSON QUESTIONS
# ==========================================

@child_router.get(
    "/{child_id}/{lesson_id}/questions"
)
def get_child_lesson_questions(
    child_id: int,
    lesson_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    verify_child_lesson_access(
        db,
        current_parent,
        child_id,
        lesson_id,
    )

    questions = get_sorted_questions(
        db,
        lesson_id,
    )

    return [
        {
            "question_id": question.question_id,
            "lesson_id": question.lesson_id,
            "question_text": question.question_text,
            "answer_options": question.answer_options,
            "question_type": question.question_type,
            "question_order": question.question_order,
        }
        for question in questions
    ]


# ==========================================
# CHILD - AUTOMATIC ANSWER CHECKING
# ==========================================

@child_router.post(
    "/{child_id}/{lesson_id}/check-answers"
)
def check_child_answers(
    child_id: int,
    lesson_id: int,
    answers: list[dict] = Body(...),
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    try:

        # 1. Verify child and lesson access

        verify_child_lesson_access(
            db,
            current_parent,
            child_id,
            lesson_id,
        )

        # 2. Get questions for this lesson

        questions = get_sorted_questions(
            db,
            lesson_id,
        )

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No questions available for this lesson",
            )

        # 3. Validate submitted answers

        if not isinstance(answers, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Answers must be a list",
            )

        submitted_answers = {}

        for answer in answers:

            if not isinstance(answer, dict):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid answer format",
                )

            raw_question_id = answer.get("question_id")
            selected_answer = answer.get("selected_answer")

            if raw_question_id is None or selected_answer is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Question ID and selected answer are required",
                )

            # Validate question ID

            if isinstance(raw_question_id, bool):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid question ID",
                )

            try:
                question_id = int(raw_question_id)

            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid question ID",
                )

            if (
                isinstance(raw_question_id, float)
                and not raw_question_id.is_integer()
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid question ID",
                )

            # Validate selected answer

            if (
                not isinstance(selected_answer, str)
                or selected_answer not in ("A", "B", "C")
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid answer option",
                )

            # Prevent duplicate answers

            if question_id in submitted_answers:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Duplicate question answer submitted",
                )

            submitted_answers[question_id] = selected_answer

        # 4. Require an answer for every question

        question_ids = {
            question.question_id
            for question in questions
        }

        if set(submitted_answers.keys()) != question_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please answer all questions before checking",
            )

        # 5. Check answers on the backend

        results = []
        response_rows = []
        score = 0

        for question in questions:

            selected_answer = submitted_answers[
                question.question_id
            ]

            correct_answer = question.correct_answer

            is_correct = (
                selected_answer == correct_answer
            )

            if is_correct:
                score += 1

            results.append({
                "question_id": question.question_id,
                "selected_answer": selected_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
            })

            # Save individual question response

            response_rows.append(
                ActivityResponse(
                    child_id=child_id,
                    question_id=question.question_id,
                    selected_answer=selected_answer,
                    score=1 if is_correct else 0,
                    is_correct=is_correct,
                )
            )

        # 6. Find existing reward for this child and lesson

        reward = db.query(RewardTransaction).filter(
            RewardTransaction.child_id == child_id,
            RewardTransaction.lesson_id == lesson_id,
        ).first()

        # 7. Create or update reward
        # One correct answer = one star

        if reward:

            reward.stars_earned = score
            reward.total_questions = len(questions)

        else:

            reward = RewardTransaction(
                child_id=child_id,
                lesson_id=lesson_id,
                stars_earned=score,
                total_questions=len(questions),
            )

            db.add(reward)

        # 8. Create one record for this lesson attempt

        lesson_attempt = LessonAttempt(
            child_id=child_id,
            lesson_id=lesson_id,
            total_questions=len(questions),
            correct_answers=score,
        )

        # 9. Save all records together

        db.add_all(response_rows)
        db.add(lesson_attempt)

        db.commit()

        db.refresh(reward)
        db.refresh(lesson_attempt)

        # 10. Return checking results and rewards

        return {
            "message": "Answers checked successfully",
            "score": score,
            "correct_answers": score,
            "total_questions": len(questions),
            "stars_earned": reward.stars_earned,
            "reward_id": reward.reward_id,
            "attempt_id": lesson_attempt.attempt_id,
            "results": results,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to check answers and save rewards",
        )
