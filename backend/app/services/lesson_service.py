
from sqlalchemy.orm import Session

from app.models.lesson import Lesson
from app.schemas.lesson import LessonCreate, LessonUpdate


def get_all_lessons(db: Session):
    return (
        db.query(Lesson)
        .order_by(Lesson.created_at.desc())
        .all()
    )


def get_lesson_by_id(db: Session, lesson_id: int):
    return (
        db.query(Lesson)
        .filter(Lesson.lesson_id == lesson_id)
        .first()
    )


def get_lessons_by_topic(db: Session, topic_id: int):
    return (
        db.query(Lesson)
        .filter(Lesson.topic_id == topic_id)
        .order_by(Lesson.created_at.asc())
        .all()
    )


def create_lesson(db: Session, lesson_data: LessonCreate):
    new_lesson = Lesson(
        topic_id=lesson_data.topic_id,
        title=lesson_data.title,
        video_url=lesson_data.video_url,
        lesson_script=lesson_data.lesson_script,
        is_premium=lesson_data.is_premium,
    )

    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)

    return new_lesson


def update_lesson(
    db: Session,
    lesson_id: int,
    lesson_data: LessonUpdate,
):
    lesson = get_lesson_by_id(db, lesson_id)

    if not lesson:
        return None

    update_data = lesson_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(lesson, field, value)

    db.commit()
    db.refresh(lesson)

    return lesson


def delete_lesson(db: Session, lesson_id: int):
    lesson = get_lesson_by_id(db, lesson_id)

    if not lesson:
        return False

    db.delete(lesson)
    db.commit()

    return True
