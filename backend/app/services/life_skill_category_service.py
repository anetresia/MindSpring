from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.life_skill_category import LifeSkillCategory
from app.schemas.life_skill_category import (
    LifeSkillCategoryCreate,
    LifeSkillCategoryUpdate,
)


def create_category(
    db: Session,
    category_data: LifeSkillCategoryCreate,
):
    category = LifeSkillCategory(
        category_name=category_data.category_name.strip(),
        description=category_data.description,
    )

    db.add(category)

    try:
        db.commit()
        db.refresh(category)
    except IntegrityError:
        db.rollback()
        raise ValueError("This category name already exists.")

    return category


def get_all_categories(db: Session):
    return (
        db.query(LifeSkillCategory)
        .order_by(LifeSkillCategory.category_id)
        .all()
    )


def get_category_by_id(
    db: Session,
    category_id: int,
):
    return (
        db.query(LifeSkillCategory)
        .filter(LifeSkillCategory.category_id == category_id)
        .first()
    )


def update_category(
    db: Session,
    category_id: int,
    category_data: LifeSkillCategoryUpdate,
):
    category = get_category_by_id(db, category_id)

    if not category:
        return None

    update_data = category_data.model_dump(exclude_unset=True)

    if "category_name" in update_data:
        if update_data["category_name"] is None:
            raise ValueError("Category name cannot be empty.")

        update_data["category_name"] = update_data["category_name"].strip()

        if not update_data["category_name"]:
            raise ValueError("Category name cannot be empty.")

    for field, value in update_data.items():
        setattr(category, field, value)

    try:
        db.commit()
        db.refresh(category)
    except IntegrityError:
        db.rollback()
        raise ValueError("This category name already exists.")

    return category