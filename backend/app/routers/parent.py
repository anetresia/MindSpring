
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.user import User
from app.models.child import Child
from app.schemas.child import (
    ChildCreate,
    ChildUpdate,
    ChildResponse,
)
from app.routers.auth import get_current_user
from app.services import parent_service


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/parent",
    tags=["Parent Dashboard"],
)


# =========================================================
# LEARNING PREFERENCES SCHEMAS
# =========================================================

class LearningPreferencesUpdate(BaseModel):
    learning_method: Literal["video"]
    communication_method: Literal["image", "voice"]


class LearningPreferencesResponse(BaseModel):
    child_id: int
    learning_method: str | None = None
    communication_method: str | None = None


# =========================================================
# VERIFY LOGGED-IN USER IS A PARENT
# =========================================================

def get_current_parent(
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Parent account required.",
        )

    return current_user


# =========================================================
# CHILD PROFILE APIs
# =========================================================

@router.get(
    "/children",
    response_model=list[ChildResponse],
)
def get_children(
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    return parent_service.get_parent_children(
        db=db,
        parent=current_parent,
    )


@router.post(
    "/children",
    response_model=ChildResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_child(
    child_data: ChildCreate,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    return parent_service.create_child(
        db=db,
        parent=current_parent,
        child_data=child_data,
    )


@router.get(
    "/children/{child_id}",
    response_model=ChildResponse,
)
def get_child(
    child_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = parent_service.get_parent_child(
        db=db,
        parent=current_parent,
        child_id=child_id,
    )

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found.",
        )

    return child


@router.put(
    "/children/{child_id}",
    response_model=ChildResponse,
)
def update_child(
    child_id: int,
    child_data: ChildUpdate,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = parent_service.update_child(
        db=db,
        parent=current_parent,
        child_id=child_id,
        child_data=child_data,
    )

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found.",
        )

    return child


@router.delete("/children/{child_id}")
def delete_child(
    child_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    deleted = parent_service.delete_child(
        db=db,
        parent=current_parent,
        child_id=child_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found.",
        )

    return {
        "message": "Child profile deleted successfully."
    }


# =========================================================
# LEARNING PREFERENCE OPTIONS
# =========================================================

@router.get("/learning-preference-options")
def get_learning_preference_options(
    current_parent: User = Depends(get_current_parent),
):
    return {
        "learning_methods": [
            "video",
        ],
        "communication_methods": [
            "image",
            "voice",
        ],
    }


# =========================================================
# LEARNING PREFERENCES APIs
# =========================================================

# GET - Retrieve saved learning preferences

@router.get(
    "/children/{child_id}/learning-preferences",
    response_model=LearningPreferencesResponse,
)
def get_learning_preferences(
    child_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = (
        db.query(Child)
        .filter(
            Child.child_id == child_id,
            Child.parent_id == current_parent.user_id,
        )
        .first()
    )

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found.",
        )

    return LearningPreferencesResponse(
        child_id=child.child_id,
        learning_method=child.preferred_learning_mode,
        communication_method=child.communication_method,
    )


# PUT - Save or update learning preferences

@router.put(
    "/children/{child_id}/learning-preferences",
    response_model=LearningPreferencesResponse,
)
def update_learning_preferences(
    child_id: int,
    preferences: LearningPreferencesUpdate,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = (
        db.query(Child)
        .filter(
            Child.child_id == child_id,
            Child.parent_id == current_parent.user_id,
        )
        .first()
    )

    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found.",
        )

    try:
        child.preferred_learning_mode = preferences.learning_method
        child.communication_method = preferences.communication_method

        db.commit()
        db.refresh(child)

        logger.info(
            "Learning preferences saved successfully for child_id=%s",
            child_id,
        )

    except SQLAlchemyError:
        db.rollback()

        logger.exception(
            "Database error while saving learning preferences. child_id=%s",
            child_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save learning preferences. Check backend terminal for details.",
        )

    except Exception:
        db.rollback()

        logger.exception(
            "Unexpected error while saving learning preferences. child_id=%s",
            child_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save learning preferences.",
        )

    return LearningPreferencesResponse(
        child_id=child.child_id,
        learning_method=child.preferred_learning_mode,
        communication_method=child.communication_method,
    )
