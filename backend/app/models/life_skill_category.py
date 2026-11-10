
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.sql import func

from app.database import Base


class LifeSkillCategory(Base):
    __tablename__ = "life_skill_category"

    category_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    category_name = Column(
        String(150),
        nullable=False,
        unique=True,
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

