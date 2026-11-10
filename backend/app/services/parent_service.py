
from sqlalchemy.orm import Session

from app.models.child import Child
from app.models.user import User
from app.schemas.child import ChildCreate, ChildUpdate


# Get all children belonging to the logged-in parent
def get_parent_children(
    db: Session,
    parent: User,
):
    return (
        db.query(Child)
        .filter(Child.parent_id == parent.user_id)
        .order_by(Child.created_at.desc())
        .all()
    )


# Get a specific child belonging to the logged-in parent
def get_parent_child(
    db: Session,
    parent: User,
    child_id: int,
):
    return (
        db.query(Child)
        .filter(
            Child.child_id == child_id,
            Child.parent_id == parent.user_id,
        )
        .first()
    )


# Create a new child profile
def create_child(
    db: Session,
    parent: User,
    child_data: ChildCreate,
):
    new_child = Child(
        parent_id=parent.user_id,
        child_name=child_data.child_name,
        date_of_birth=child_data.date_of_birth,
        communication_method=child_data.communication_method,
        preferred_learning_mode=child_data.preferred_learning_mode,
        daily_learning_limit=child_data.daily_learning_limit,
    )

    db.add(new_child)
    db.commit()
    db.refresh(new_child)

    return new_child


# Update an existing child profile
def update_child(
    db: Session,
    parent: User,
    child_id: int,
    child_data: ChildUpdate,
):
    child = get_parent_child(db, parent, child_id)

    if not child:
        return None

    update_data = child_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(child, field, value)

    db.commit()
    db.refresh(child)

    return child


# Delete a child profile
def delete_child(
    db: Session,
    parent: User,
    child_id: int,
):
    child = get_parent_child(db, parent, child_id)

    if not child:
        return False

    db.delete(child)
    db.commit()

    return True
