import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.services import notification_service


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# =========================================================
# VERIFY LOGGED-IN USER IS A PARENT
# =========================================================

def get_current_parent(
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "Parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Parent account required.",
        )

    return current_user


# =========================================================
# GET PARENT NOTIFICATIONS
# =========================================================

@router.get("/")
def get_notifications(
    skip: int = 0,
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    notifications = notification_service.get_parent_notifications(
        db=db,
        parent_id=current_parent.user_id,
        skip=skip,
        limit=limit,
        unread_only=unread_only,
    )

    return [
        {
            "notification_id": item.notification_id,
            "child_id": item.child_id,
            "subscription_id": item.subscription_id,
            "notification_type": item.notification_type,
            "channel": item.channel,
            "title": item.title,
            "message": item.message,
            "is_read": item.is_read,
            "sent_at": item.sent_at,
        }
        for item in notifications
    ]


# =========================================================
# GET UNREAD NOTIFICATION COUNT
# =========================================================

@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    count = notification_service.get_unread_count(
        db=db,
        parent_id=current_parent.user_id,
    )

    return {
        "unread_count": count
    }


# =========================================================
# MARK SINGLE NOTIFICATION AS READ
# =========================================================

@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    notification = notification_service.mark_notification_read(
        db=db,
        parent_id=current_parent.user_id,
        notification_id=notification_id,
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    return {
        "message": "Notification marked as read.",
        "notification_id": notification.notification_id,
        "is_read": notification.is_read,
    }


# =========================================================
# MARK ALL NOTIFICATIONS AS READ
# =========================================================

@router.put("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_parent: User = Depends(get_current_parent),
):
    updated_count = notification_service.mark_all_notifications_read(
        db=db,
        parent_id=current_parent.user_id,
    )

    return {
        "message": "All notifications marked as read.",
        "updated_count": updated_count,
    }