
from sqlalchemy.orm import Session

from app.models.child_selected_topic import ChildSelectedTopic
from app.models.child import Child
from app.schemas.child_selected_topic import ChildSelectedTopicCreate


def get_child_selected_topics(db: Session, child_id: int):
    return (
        db.query(ChildSelectedTopic)
        .filter(ChildSelectedTopic.child_id == child_id)
        .all()
    )


def add_child_selected_topic(
    db: Session,
    child: Child,
    topic_data: ChildSelectedTopicCreate,
):
    existing = (
        db.query(ChildSelectedTopic)
        .filter(
            ChildSelectedTopic.child_id == child.child_id,
            ChildSelectedTopic.topic_id == topic_data.topic_id,
        )
        .first()
    )

    if existing:
        return existing

    selected_topic = ChildSelectedTopic(
        child_id=child.child_id,
        topic_id=topic_data.topic_id,
    )

    db.add(selected_topic)
    db.commit()
    db.refresh(selected_topic)

    return selected_topic


def remove_child_selected_topic(
    db: Session,
    child: Child,
    topic_id: int,
):
    selected_topic = (
        db.query(ChildSelectedTopic)
        .filter(
            ChildSelectedTopic.child_id == child.child_id,
            ChildSelectedTopic.topic_id == topic_id,
        )
        .first()
    )

    if not selected_topic:
        return False

    db.delete(selected_topic)
    db.commit()

    return True
