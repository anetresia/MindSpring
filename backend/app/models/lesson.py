
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.sql import func

from app.database import Base


class Lesson(Base):
    __tablename__ = "lesson"

    lesson_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    topic_id = Column(
        Integer,
        ForeignKey("life_skill_topic.topic_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(
        String(150),
        nullable=False,
    )

    video_url = Column(
        String(500),
        nullable=False,
    )

    lesson_script = Column(
        Text,
        nullable=True,
    )

    is_premium = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    generation_status = Column(
        String(30),
        nullable=False,
        default="completed",
        server_default="completed",
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
