from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# Create Life Skill Category
class LifeSkillCategoryCreate(BaseModel):
    category_name: str = Field(
        ...,
        min_length=1,
        max_length=150
    )
    description: str | None = None


# Update Life Skill Category
class LifeSkillCategoryUpdate(BaseModel):
    category_name: str | None = Field(
        None,
        min_length=1,
        max_length=150
    )
    description: str | None = None
    is_active: bool | None = None


# Life Skill Category Response
class LifeSkillCategoryResponse(BaseModel):
    category_id: int
    category_name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)