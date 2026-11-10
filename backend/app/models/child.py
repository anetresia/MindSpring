
from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.sql import func

from app.database import Base


class Child(Base):
    __tablename__ = "child"

    child_id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    parent_id = Column(
        Integer,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    child_name = Column(
        String(100),
        nullable=False,
    )

    date_of_birth = Column(
        Date,
        nullable=False,
    )

    communication_method = Column(
        String(100),
        nullable=True,
    )

    preferred_learning_mode = Column(
        String(100),
        nullable=True,
    )

    daily_learning_limit = Column(
        Integer,
        nullable=False,
        default=30,
        server_default="30",
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
