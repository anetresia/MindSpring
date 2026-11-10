
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.life_skill_category import (
    LifeSkillCategoryCreate,
    LifeSkillCategoryUpdate,
    LifeSkillCategoryResponse,
)
from app.routers.auth import get_current_admin
from app.services import life_skill_category_service


router = APIRouter(
    prefix="/admin/life-skill-categories",
    tags=["Admin - Life Skill Categories"],
    dependencies=[Depends(get_current_admin)],
)


@router.post(
    "/",
    response_model=LifeSkillCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category_data: LifeSkillCategoryCreate,
    db: Session = Depends(get_db),
):
    try:
        return life_skill_category_service.create_category(
            db, category_data
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


@router.get(
    "/",
    response_model=list[LifeSkillCategoryResponse],
)
def get_all_categories(
    db: Session = Depends(get_db),
):
    return life_skill_category_service.get_all_categories(db)


@router.get(
    "/{category_id}",
    response_model=LifeSkillCategoryResponse,
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    category = life_skill_category_service.get_category_by_id(
        db, category_id
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    return category


@router.put(
    "/{category_id}",
    response_model=LifeSkillCategoryResponse,
)
def update_category(
    category_id: int,
    category_data: LifeSkillCategoryUpdate,
    db: Session = Depends(get_db),
):
    try:
        category = life_skill_category_service.update_category(
            db, category_id, category_data
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )

    return category
