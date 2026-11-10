
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.database import Base


class LifeSkillTopic(Base):
    __tablename__ = "life_skill_topic"

    __table_args__ = (
        UniqueConstraint(
            "category_id",
            "topic_name",
            name="uq_category_topic_name",
        ),
    )

    topic_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    category_id = Column(
        Integer,
        ForeignKey("life_skill_category.category_id"),
        nullable=False,
        index=True,
    )

    topic_name = Column(
        String(150),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
