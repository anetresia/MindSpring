
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Create Child Request
class ChildCreate(BaseModel):
    child_name: str = Field(min_length=1, max_length=100)
    date_of_birth: date

    communication_method: str | None = Field(
        default=None,
        max_length=100,
    )

    preferred_learning_mode: str | None = Field(
        default=None,
        max_length=100,
    )

    daily_learning_limit: int = Field(
        default=30,
        ge=1,
        le=30,
    )

    @field_validator("child_name")
    @classmethod
    def validate_child_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Child name is required")

        return value


# Update Child Request
class ChildUpdate(BaseModel):
    child_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    date_of_birth: date | None = None

    communication_method: str | None = Field(
        default=None,
        max_length=100,
    )

    preferred_learning_mode: str | None = Field(
        default=None,
        max_length=100,
    )

    daily_learning_limit: int | None = Field(
        default=None,
        ge=1,
        le=30,
    )

    @field_validator("child_name")
    @classmethod
    def validate_child_name(cls, value: str | None) -> str | None:
        if value is None:
            return value

        value = value.strip()

        if not value:
            raise ValueError("Child name cannot be empty")

        return value


# Child Response
class ChildResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    child_id: int
    parent_id: int
    child_name: str
    date_of_birth: date
    communication_method: str | None
    preferred_learning_mode: str | None
    daily_learning_limit: int
    created_at: datetime
    updated_at: datetime
