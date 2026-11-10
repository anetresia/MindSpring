
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.parent import get_current_parent
from app.services import child_selected_topic_service
from app.schemas.child_selected_topic import (
    ChildSelectedTopicCreate,
    ChildSelectedTopicResponse,
)
from app.services import parent_service


router = APIRouter(
    prefix="/parent/children/{child_id}/selected-topics",
    tags=["Child Selected Topics"],
)


def get_owned_child(
    child_id: int,
    db: Session,
    current_parent: User,
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

    return child


@router.get("/", response_model=list[ChildSelectedTopicResponse])
def get_selected_topics(
    child_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = get_owned_child(child_id, db, current_parent)

    return child_selected_topic_service.get_child_selected_topics(
        db,
        child.child_id,
    )


@router.post(
    "/",
    response_model=ChildSelectedTopicResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_selected_topic(
    child_id: int,
    topic_data: ChildSelectedTopicCreate,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = get_owned_child(child_id, db, current_parent)

    return child_selected_topic_service.add_child_selected_topic(
        db,
        child,
        topic_data,
    )


@router.delete("/{topic_id}")
def remove_selected_topic(
    child_id: int,
    topic_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = get_owned_child(child_id, db, current_parent)

    deleted = child_selected_topic_service.remove_child_selected_topic(
        db,
        child,
        topic_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected topic not found",
        )

    return {"message": "Topic removed successfully"}
