
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChildSelectedTopicCreate(BaseModel):
    topic_id: int


class ChildSelectedTopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    child_id: int
    topic_id: int
    created_at: datetime
