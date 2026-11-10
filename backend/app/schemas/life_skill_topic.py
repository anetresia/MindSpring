from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Create Life Skill Topic
class LifeSkillTopicCreate(BaseModel):
    category_id: int
    topic_name: str = Field(
        ...,
        min_length=1,
        max_length=150
    )
    description: str | None = None


# Update Life Skill Topic
class LifeSkillTopicUpdate(BaseModel):
    category_id: int | None = None
    topic_name: str | None = Field(
        None,
        min_length=1,
        max_length=150
    )
    description: str | None = None
    is_active: bool | None = None


# Life Skill Topic Response
class LifeSkillTopicResponse(BaseModel):
    topic_id: int
    category_id: int
    topic_name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)