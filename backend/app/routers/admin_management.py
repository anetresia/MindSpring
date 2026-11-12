
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.child import Child
from app.routers.auth import get_current_admin


# ==========================================
# ROUTER CONFIGURATION
# ==========================================

router = APIRouter(
    prefix="/admin/management",
    tags=["Admin - Parent & Child Management"],
)


# ==========================================
# REQUEST SCHEMAS
# ==========================================

class ParentUpdate(BaseModel):
    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    email: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    phone: Optional[str] = Field(
        default=None,
        max_length=20,
    )


class ChildUpdate(BaseModel):
    child_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    date_of_birth: Optional[date] = None

    communication_method: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    preferred_learning_mode: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    daily_learning_limit: Optional[int] = Field(
        default=None,
        gt=0,
    )


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def get_parent_or_404(db: Session, parent_id: int):

    parent = (
        db.query(User)
        .filter(
            User.user_id == parent_id,
            User.role == "Parent",
        )
        .first()
    )

    if not parent:
        raise HTTPException(
            status_code=404,
            detail="Parent not found",
        )

    return parent


def get_child_or_404(db: Session, child_id: int):

    child = (
        db.query(Child)
        .filter(
            Child.child_id == child_id
        )
        .first()
    )

    if not child:
        raise HTTPException(
            status_code=404,
            detail="Child not found",
        )

    return child


def parent_data(parent: User):

    return {
        "parent_id": parent.user_id,
        "name": parent.name,
        "email": parent.email,
        "phone": parent.phone,
        "profile_image": parent.profile_image,
        "role": parent.role,
        "created_at": parent.created_at,
    }


def child_data(child: Child, parent: User):

    return {
        "child_id": child.child_id,
        "child_name": child.child_name,
        "date_of_birth": child.date_of_birth,
        "communication_method": child.communication_method,
        "preferred_learning_mode": child.preferred_learning_mode,
        "daily_learning_limit": child.daily_learning_limit,
        "created_at": child.created_at,
        "updated_at": child.updated_at,

        "parent": {
            "parent_id": parent.user_id,
            "name": parent.name,
            "email": parent.email,
            "phone": parent.phone,
        },
    }


# ==========================================
# ADMIN DASHBOARD STATISTICS
# ==========================================

@router.get("/stats")
def get_admin_management_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):

    total_parents = (
        db.query(User)
        .filter(User.role == "Parent")
        .count()
    )

    total_children = (
        db.query(Child)
        .count()
    )

    return {
        "success": True,
        "total_parents": total_parents,
        "total_children": total_children,
    }


# ==========================================
# PARENT MANAGEMENT
# ==========================================

# GET ALL PARENTS + SEARCH

@router.get("/parents")
def get_all_parents(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):

    query = (
        db.query(
            User,
            func.count(Child.child_id).label("children_count"),
        )
        .outerjoin(
            Child,
            Child.parent_id == User.user_id,
        )
        .filter(User.role == "Parent")
    )

    if search:

        search_term = f"%{search.strip()}%"

        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term),
                User.phone.ilike(search_term),
            )
        )

    results = (
        query
        .group_by(User.user_id)
        .order_by(User.created_at.desc())
        .all()
    )

    parents = []

    for parent, children_count in results:

        data = parent_data(parent)

        data["children_count"] = children_count

        parents.append(data)

    return {
        "success": True,
        "total": len(parents),
        "parents": parents,
    }


# GET SINGLE PARENT DETAILS

@router.get("/parents/{parent_id}")
def get_parent_details(
    parent_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):

    parent = get_parent_or_404(
        db,
        parent_id,
    )

    children = (
        db.query(Child)
        .filter(Child.parent_id == parent_id)
        .order_by(Child.created_at.desc())
        .all()
    )

    data = parent_data(parent)

    data["children"] = [
        {
            "child_id": child.child_id,
            "child_name": child.child_name,
            "date_of_birth": child.date_of_birth,
            "preferred_learning_mode": child.preferred_learning_mode,
        }
        for child in children
    ]

    data["children_count"] = len(children)

    return {
        "success": True,
        "parent": data,
    }


# UPDATE PARENT DETAILS

@router.put("/parents/{parent_id}")
def update_parent(
    parent_id: int,
    payload: ParentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):

    parent = get_parent_or_404(
        db,
        parent_id,
    )

    update_data = payload.dict(
        exclude_unset=True
    )

    if not update_data:

        raise HTTPException(
            status_code=400,
            detail="No fields provided for update",
        )

    for field in ("name", "email"):

        if field in update_data:

            value = update_data[field]

            if value is None or not value.strip():

                raise HTTPException(
                    status_code=400,
                    detail=f"{field} cannot be empty",
                )

            update_data[field] = value.strip()

    if "email" in update_data:

        existing_user = (
            db.query(User)
            .filter(
                User.email == update_data["email"],
                User.user_id != parent_id,
            )
            .first()
        )

        if existing_user:

            raise HTTPException(
                status_code=409,
                detail="Email address is already registered",
            )

    for field, value in update_data.items():

        setattr(
            parent,
            field,
            value,
        )

    db.commit()
    db.refresh(parent)

    return {
        "success": True,
        "message": "Parent details updated successfully",
        "parent": parent_data(parent),
    }


# ==========================================
# CHILD MANAGEMENT
# ==========================================

# GET ALL CHILDREN + SEARCH

@router.get("/children")
def get_all_children(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):

    query = (
        db.query(Child, User)
        .join(
            User,
            Child.parent_id == User.user_id,
        )
        .filter(User.role == "Parent")
    )

    if search:

        search_term = f"%{search.strip()}%"

        query = query.filter(
            or_(
                Child.child_name.ilike(search_term),
                User.name.ilike(search_term),
                User.email.ilike(search_term),
            )
        )

    results = (
        query
        .order_by(Child.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "total": len(results),
        "children": [
            child_data(child, parent)
            for child, parent in results
        ],
    }


# GET SINGLE CHILD DETAILS

@router.get("/children/{child_id}")
def get_child_details(
    child_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):

    child = get_child_or_404(
        db,
        child_id,
    )

    parent = get_parent_or_404(
        db,
        child.parent_id,
    )

    return {
        "success": True,
        "child": child_data(child, parent),
    }


# UPDATE CHILD DETAILS

@router.put("/children/{child_id}")
def update_child(
    child_id: int,
    payload: ChildUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):

    child = get_child_or_404(
        db,
        child_id,
    )

    update_data = payload.dict(
        exclude_unset=True
    )

    if not update_data:

        raise HTTPException(
            status_code=400,
            detail="No fields provided for update",
        )

    if "child_name" in update_data:

        value = update_data["child_name"]

        if value is None or not value.strip():

            raise HTTPException(
                status_code=400,
                detail="Child name cannot be empty",
            )

        update_data["child_name"] = value.strip()

    if "date_of_birth" in update_data:

        dob = update_data["date_of_birth"]

        if dob is None:

            raise HTTPException(
                status_code=400,
                detail="Date of birth cannot be empty",
            )

        if dob > date.today():

            raise HTTPException(
                status_code=400,
                detail="Date of birth cannot be in the future",
            )

    for field, value in update_data.items():

        setattr(
            child,
            field,
            value,
        )

    db.commit()
    db.refresh(child)

    parent = get_parent_or_404(
        db,
        child.parent_id,
    )

    return {
        "success": True,
        "message": "Child details updated successfully",
        "child": child_data(child, parent),
    }
