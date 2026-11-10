from typing import List, Literal, Optional
from pydantic import BaseModel, Field, validator


# ==========================================
# IMAGE OPTION SCHEMA
# ==========================================

class ImageOption(BaseModel):

    id: Literal["A", "B", "C"]

    image_url: str = Field(..., min_length=1)


# ==========================================
# CREATE QUESTION SCHEMA
# ==========================================

class QuestionCreate(BaseModel):

    lesson_id: int

    question_text: str = Field(..., min_length=1)

    answer_options: List[ImageOption]

    correct_answer: Literal["A", "B", "C"]

    question_type: str = "Image"

    question_order: int = 1

    @validator("answer_options")
    def validate_answer_options(cls, options):

        if len(options) != 3:
            raise ValueError("Exactly 3 image options are required")

        option_ids = [option.id for option in options]

        if len(set(option_ids)) != 3:
            raise ValueError("Option IDs must be unique")

        if set(option_ids) != {"A", "B", "C"}:
            raise ValueError("Options must contain A, B and C")

        return options


# ==========================================
# UPDATE QUESTION SCHEMA
# ==========================================

class QuestionUpdate(BaseModel):

    question_text: Optional[str] = Field(None, min_length=1)

    answer_options: Optional[List[ImageOption]] = None

    correct_answer: Optional[Literal["A", "B", "C"]] = None

    question_type: Optional[str] = None

    question_order: Optional[int] = None

    @validator("answer_options")
    def validate_answer_options(cls, options):

        if options is None:
            return options

        if len(options) != 3:
            raise ValueError("Exactly 3 image options are required")

        option_ids = [option.id for option in options]

        if len(set(option_ids)) != 3:
            raise ValueError("Option IDs must be unique")

        if set(option_ids) != {"A", "B", "C"}:
            raise ValueError("Options must contain A, B and C")

        return options


# ==========================================
# CHILD QUESTION RESPONSE SCHEMA
# ==========================================

class ChildQuestionResponse(BaseModel):

    question_id: int

    lesson_id: int

    question_text: str

    answer_options: List[ImageOption]

    question_order: int


# ==========================================
# CHILD ANSWER SUBMISSION SCHEMA
# ==========================================

class AnswerSubmission(BaseModel):

    question_id: int

    selected_answer: Literal["A", "B", "C"]


# ==========================================
# QUIZ RESULT RESPONSE SCHEMA
# ==========================================

class QuizAnswerResult(BaseModel):

    question_id: int

    selected_answer: Literal["A", "B", "C"]

    is_correct: bool

    score: int