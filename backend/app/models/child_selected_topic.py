
from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class ChildSelectedTopic(Base):
    __tablename__ = "child_selected_topic"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    child_id = Column(
        Integer,
        ForeignKey("child.child_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    topic_id = Column(
        Integer,
        ForeignKey("life_skill_topic.topic_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "child_id",
            "topic_id",
            name="uq_child_selected_topic",
        ),
    )
