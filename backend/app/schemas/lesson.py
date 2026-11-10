
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LessonCreate(BaseModel):
    topic_id: int
    title: str = Field(min_length=1, max_length=150)
    video_url: str = Field(min_length=1, max_length=500)
    lesson_script: str | None = None
    is_premium: bool = False


class LessonUpdate(BaseModel):
    topic_id: int | None = None
    title: str | None = Field(default=None, min_length=1, max_length=150)
    video_url: str | None = Field(default=None, min_length=1, max_length=500)
    lesson_script: str | None = None
    is_premium: bool | None = None


class LessonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lesson_id: int
    topic_id: int
    title: str
    video_url: str
    lesson_script: str | None
    is_premium: bool
    generation_status: str
    created_at: datetime
