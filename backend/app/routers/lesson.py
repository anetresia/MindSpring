
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_admin
from app.routers.parent import get_current_parent

from app.schemas.lesson import (
    LessonCreate,
    LessonUpdate,
    LessonResponse,
)

from app.services import lesson_service
from app.services import parent_service
from app.services import child_selected_topic_service
from app.services.subscription_service import record_video_completion


router = APIRouter(
    prefix="/admin/lessons",
    tags=["Admin Lessons"],
)


# ========================================
# ADMIN - GET ALL LESSONS
# ========================================

@router.get("/", response_model=list[LessonResponse])
def get_lessons(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    return lesson_service.get_all_lessons(db)


# ========================================
# ADMIN - GET LESSON BY ID
# ========================================

@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    lesson = lesson_service.get_lesson_by_id(db, lesson_id)

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    return lesson


# ========================================
# ADMIN - CREATE LESSON
# ========================================

@router.post(
    "/",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lesson(
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    return lesson_service.create_lesson(db, lesson_data)


# ========================================
# ADMIN - UPDATE LESSON
# ========================================

@router.put("/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    lesson_id: int,
    lesson_data: LessonUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    lesson = lesson_service.update_lesson(
        db,
        lesson_id,
        lesson_data,
    )

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    return lesson


# ========================================
# ADMIN - DELETE LESSON
# ========================================

@router.delete("/{lesson_id}")
def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    deleted = lesson_service.delete_lesson(db, lesson_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    return {
        "message": "Lesson deleted successfully"
    }


# ========================================
# PARENT / CHILD - GET SELECTED TOPIC LESSONS
# ========================================

@router.get(
    "/child/{child_id}/topics/{topic_id}",
    response_model=list[LessonResponse],
    tags=["Child Lessons"],
)
def get_child_topic_lessons(
    child_id: int,
    topic_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    # Verify child belongs to the logged-in parent
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

    # Get topics selected for this child
    selected_topics = (
        child_selected_topic_service.get_child_selected_topics(
            db,
            child_id,
        )
    )

    # Verify requested topic is selected
    is_selected = any(
        item.topic_id == topic_id
        for item in selected_topics
    )

    if not is_selected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This topic is not selected for this child",
        )

    # Get lessons for selected topic
    lessons = lesson_service.get_lessons_by_topic(
        db,
        topic_id,
    )

    return lessons


# ========================================
# CHILD - VIDEO COMPLETION
# ========================================

@router.post(
    "/child/{child_id}/lessons/{lesson_id}/video-complete",
    tags=["Child Lessons"],
)
def complete_child_video(
    child_id: int,
    lesson_id: int,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    # Verify child belongs to logged-in parent
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

    # Verify lesson exists
    lesson = lesson_service.get_lesson_by_id(
        db,
        lesson_id,
    )

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    try:
        result = record_video_completion(
            db=db,
            parent_id=current_parent.user_id,
            child_id=child_id,
            lesson_id=lesson_id,
            idempotency_key=idempotency_key,
        )

        db.commit()

        return {
            "success": True,
            "message": "Video completion recorded successfully",
            "video_completion": result,
        }

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to record video completion",
        )
