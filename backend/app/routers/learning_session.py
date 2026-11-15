
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.child import Child
from app.models.user import User
from app.routers.parent import get_current_parent
from app.schemas.learning_session import LearningSessionResponse, LearningSessionStart, LearningSessionStatus
from app.services import learning_session_service


router = APIRouter(
    prefix="/learning-session",
    tags=["Learning Session"],
)


def get_parent_child(
    child_id: int,
    current_parent: User,
    db: Session,
):
    child = (
        db.query(Child)
        .filter(
            Child.child_id == child_id,
            Child.parent_id == current_parent.user_id,
        )
        .first()
    )

    if not child:
        raise HTTPException(
            status_code=404,
            detail="Child not found",
        )

    return child


@router.post("/start", response_model=LearningSessionResponse)
def start_learning_session(
    data: LearningSessionStart,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = get_parent_child(data.child_id, current_parent, db)

    try:
        session = learning_session_service.start_learning_session(
            db,
            child,
        )
        db.commit()
        db.refresh(session)
        return session
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to start learning session",
        )


@router.post("/heartbeat", response_model=LearningSessionResponse)
def heartbeat_learning_session(
    data: LearningSessionStart,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = get_parent_child(data.child_id, current_parent, db)

    try:
        session = learning_session_service.heartbeat_learning_session(
            db,
            child,
        )
        db.commit()
        db.refresh(session)
        return session
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update learning session",
        )


@router.post("/stop", response_model=LearningSessionResponse)
def stop_learning_session(
    data: LearningSessionStart,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = get_parent_child(data.child_id, current_parent, db)

    try:
        session = learning_session_service.stop_learning_session(
            db,
            child,
        )
        db.commit()
        db.refresh(session)
        return session
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to stop learning session",
        )


@router.get("/status/{child_id}", response_model=LearningSessionStatus)
def get_learning_session_status(
    child_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    child = get_parent_child(child_id, current_parent, db)

    try:
        status = learning_session_service.get_learning_session_status(
            db,
            child,
        )
        db.commit()
        return status
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to get learning session status",
        )
