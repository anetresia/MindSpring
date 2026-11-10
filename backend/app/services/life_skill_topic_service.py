from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.life_skill_category import LifeSkillCategory
from app.models.life_skill_topic import LifeSkillTopic
from app.schemas.life_skill_topic import (
    LifeSkillTopicCreate,
    LifeSkillTopicUpdate,
)


def create_topic(
    db: Session,
    topic_data: LifeSkillTopicCreate,
):
    category = (
        db.query(LifeSkillCategory)
        .filter(
            LifeSkillCategory.category_id == topic_data.category_id,
            LifeSkillCategory.is_active == True,
        )
        .first()
    )

    if not category:
        raise ValueError("Active category not found.")

    topic = LifeSkillTopic(
        category_id=topic_data.category_id,
        topic_name=topic_data.topic_name.strip(),
        description=topic_data.description,
    )

    db.add(topic)

    try:
        db.commit()
        db.refresh(topic)
    except IntegrityError:
        db.rollback()
        raise ValueError(
            "This topic already exists in this category."
        )

    return topic


def get_all_topics(
    db: Session,
    category_id: int | None = None,
):
    query = db.query(LifeSkillTopic)

    if category_id is not None:
        query = query.filter(
            LifeSkillTopic.category_id == category_id
        )

    return query.order_by(LifeSkillTopic.topic_id).all()


def get_topic_by_id(
    db: Session,
    topic_id: int,
):
    return (
        db.query(LifeSkillTopic)
        .filter(LifeSkillTopic.topic_id == topic_id)
        .first()
    )


def update_topic(
    db: Session,
    topic_id: int,
    topic_data: LifeSkillTopicUpdate,
):
    topic = get_topic_by_id(db, topic_id)

    if not topic:
        return None

    update_data = topic_data.model_dump(exclude_unset=True)

    if "topic_name" in update_data:
        if update_data["topic_name"] is None:
            raise ValueError("Topic name cannot be empty.")

        update_data["topic_name"] = update_data["topic_name"].strip()

        if not update_data["topic_name"]:
            raise ValueError("Topic name cannot be empty.")

    if "category_id" in update_data:
        category_id = update_data["category_id"]

        if category_id is None:
            raise ValueError("Category ID cannot be empty.")

        category = (
            db.query(LifeSkillCategory)
            .filter(
                LifeSkillCategory.category_id == category_id,
                LifeSkillCategory.is_active == True,
            )
            .first()
        )

        if not category:
            raise ValueError("Active category not found.")

    for field, value in update_data.items():
        setattr(topic, field, value)

    try:
        db.commit()
        db.refresh(topic)
    except IntegrityError:
        db.rollback()
        raise ValueError(
            "This topic already exists in this category."
        )

    return topic