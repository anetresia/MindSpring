
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.life_skill_topic import LifeSkillTopicResponse
from app.routers.auth import get_current_parent
from app.services import life_skill_topic_service


router = APIRouter(
    prefix="/parent/life-skill-topics",
    tags=["Parent - Life Skill Topics"],
)


@router.get(
    "/",
    response_model=list[LifeSkillTopicResponse],
)
def get_parent_life_skill_topics(
    category_id: int | None = None,
    db: Session = Depends(get_db),
    current_parent=Depends(get_current_parent),
):
    return life_skill_topic_service.get_all_topics(
        db, category_id
    )
