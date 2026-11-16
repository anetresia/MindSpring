
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Body,
    Header,
    UploadFile,
    File,
)
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
from app.services.subscription_service import record_activity_completion
from app.services.groq_service import transcribe_child_voice

import difflib
import re


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
# CHILD - VOICE ANSWER CHECKING
# ==========================================

@child_router.post(
    "/{child_id}/{lesson_id}/voice-answer"
)
async def check_child_voice_answer(
    child_id: int,
    lesson_id: int,
    question_id: int,
    audio: UploadFile = File(...),
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

        # 2. Validate audio file

        allowed_types = [
            "audio/webm",
            "audio/wav",
            "audio/mpeg",
            "audio/mp4",
            "audio/ogg",
            "audio/x-wav",
            "audio/aac",
            "audio/flac",
        ]

        audio_content_type = (
            audio.content_type or ""
        ).split(";")[0].strip().lower()

        print(
            "Received audio content type:",
            audio.content_type,
        )

        print(
            "Normalized audio content type:",
            audio_content_type,
        )

        if audio_content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported audio format: {audio.content_type}",
            )

        # 3. Validate audio size

        await audio.seek(0)
        audio_data = await audio.read()

        if not audio_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio recording is empty. Please try again.",
            )

        print(
            "Received audio size:",
            len(audio_data),
            "bytes",
        )

        # 4. Find the requested question

        questions = get_sorted_questions(
            db,
            lesson_id,
        )

        question = next(
            (
                item for item in questions
                if item.question_id == question_id
            ),
            None,
        )

        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found",
            )

        # 5. Convert voice to text using Groq Whisper

        filename = audio.filename or "child-answer.webm"

        import io

        audio_file = io.BytesIO(audio_data)

        transcript = transcribe_child_voice(
            audio_file=audio_file,
            filename=filename,
            content_type=audio_content_type,
        )

        if not transcript or not transcript.strip():
            return {
                "question_id": question.question_id,
                "transcript": "",
                "is_correct": False,
                "selected_answer": None,
                "message": "No speech detected. Please try again.",
            }

        # 6. Normalize spoken answer and expected answers

        def normalize_answer(value):
            value = value.lower().strip()
            value = re.sub(r"[^\w\s]", "", value)
            value = re.sub(r"\s+", " ", value)
            return value

        spoken_answer = normalize_answer(transcript)

        # 7. Find the correct option's answer text

        correct_option = next(
            (
                option
                for option in question.answer_options
                if option.get("id") == question.correct_answer
            ),
            None,
        )

        if not correct_option:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Correct answer configuration is missing",
            )

        expected_answer = correct_option.get("answer_text")

        if not expected_answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Answer text is not configured for this question",
            )

        expected_normalized = normalize_answer(
            expected_answer
        )

        # 8. Compare spoken answer with expected answer

        similarity = difflib.SequenceMatcher(
            None,
            spoken_answer,
            expected_normalized,
        ).ratio()

        is_correct = (
            spoken_answer == expected_normalized
            or similarity >= 0.85
        )

        # 9. Return result

        return {
            "question_id": question.question_id,
            "transcript": transcript,
            "is_correct": is_correct,
            "selected_answer": (
                question.correct_answer if is_correct else None
            ),
            "message": (
                "Correct answer!"
                if is_correct
                else "Incorrect answer. Please try again."
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        print(
            "Voice answer checking error:",
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to check voice answer. Please try again.",
        )

    finally:
        await audio.close()


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
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
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

        # 9. Save quiz records and register activity completion

        db.add_all(response_rows)
        db.add(lesson_attempt)

        activity_completion = record_activity_completion(
            db=db,
            parent_id=current_parent.user_id,
            child_id=child_id,
            lesson_id=lesson_id,
            idempotency_key=idempotency_key,
        )

        # Commit quiz, reward, lesson attempt and credit update together

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
            "activity_completion": activity_completion,
            "results": results,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()

        print(
            "Quiz answer checking error:",
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to check answers and save rewards",
        )
