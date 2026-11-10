
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.life_skill_topic import (
    LifeSkillTopicCreate,
    LifeSkillTopicUpdate,
    LifeSkillTopicResponse,
)
from app.routers.auth import get_current_admin
from app.services import life_skill_topic_service


router = APIRouter(
    prefix="/admin/life-skill-topics",
    tags=["Admin - Life Skill Topics"],
    dependencies=[Depends(get_current_admin)],
)


@router.post(
    "/",
    response_model=LifeSkillTopicResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_topic(
    topic_data: LifeSkillTopicCreate,
    db: Session = Depends(get_db),
):
    try:
        return life_skill_topic_service.create_topic(
            db, topic_data
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


@router.get(
    "/",
    response_model=list[LifeSkillTopicResponse],
)
def get_all_topics(
    category_id: int | None = None,
    db: Session = Depends(get_db),
):
    return life_skill_topic_service.get_all_topics(
        db, category_id
    )


@router.get(
    "/{topic_id}",
    response_model=LifeSkillTopicResponse,
)
def get_topic(
    topic_id: int,
    db: Session = Depends(get_db),
):
    topic = life_skill_topic_service.get_topic_by_id(
        db, topic_id
    )

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found.",
        )

    return topic


@router.put(
    "/{topic_id}",
    response_model=LifeSkillTopicResponse,
)
def update_topic(
    topic_id: int,
    topic_data: LifeSkillTopicUpdate,
    db: Session = Depends(get_db),
):
    try:
        topic = life_skill_topic_service.update_topic(
            db, topic_id, topic_data
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found.",
        )

    return topic
