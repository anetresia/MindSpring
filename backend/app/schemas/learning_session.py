
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class LearningSessionStart(BaseModel):
    child_id: int


class LearningSessionHeartbeat(BaseModel):
    child_id: int


class LearningSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: int
    child_id: int
    parent_id: int
    learning_date: date
    total_seconds: int
    is_active: bool
    started_at: datetime | None
    last_heartbeat_at: datetime | None
    limit_reached: bool


class LearningSessionStatus(BaseModel):
    child_id: int
    daily_learning_limit: int
    total_seconds: int
    remaining_seconds: int
    is_active: bool
    limit_reached: bool
