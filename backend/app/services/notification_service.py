from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import desc

from app.models.subscription.notification import Notification


# =========================================================
# CREATE NOTIFICATION
# =========================================================

def create_notification(
    db: Session,
    parent_id: int,
    notification_type: str,
    title: str,
    message: str,
    child_id: int | None = None,
    subscription_id: int | None = None,
    channel: str = "DASHBOARD",
):
    try:
        notification = Notification(
            parent_id=parent_id,
            child_id=child_id,
            subscription_id=subscription_id,
            notification_type=notification_type,
            channel=channel,
            title=title,
            message=message,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        return notification

    except SQLAlchemyError:
        db.rollback()
        raise


# =========================================================
# GET PARENT NOTIFICATIONS
# =========================================================

def get_parent_notifications(
    db: Session,
    parent_id: int,
    skip: int = 0,
    limit: int = 20,
    unread_only: bool = False,
):
    query = db.query(Notification).filter(
        Notification.parent_id == parent_id
    )

    if unread_only:
        query = query.filter(
            Notification.is_read == False
        )

    return (
        query
        .order_by(desc(Notification.sent_at))
        .offset(skip)
        .limit(limit)
        .all()
    )


# =========================================================
# GET UNREAD NOTIFICATION COUNT
# =========================================================

def get_unread_count(
    db: Session,
    parent_id: int,
):
    return (
        db.query(Notification)
        .filter(
            Notification.parent_id == parent_id,
            Notification.is_read == False,
        )
        .count()
    )


# =========================================================
# MARK SINGLE NOTIFICATION AS READ
# =========================================================

def mark_notification_read(
    db: Session,
    parent_id: int,
    notification_id: int,
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id,
            Notification.parent_id == parent_id,
        )
        .first()
    )

    if not notification:
        return None

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return notification


# =========================================================
# MARK ALL NOTIFICATIONS AS READ
# =========================================================

def mark_all_notifications_read(
    db: Session,
    parent_id: int,
):
    try:
        updated_count = (
            db.query(Notification)
            .filter(
                Notification.parent_id == parent_id,
                Notification.is_read == False,
            )
            .update(
                {"is_read": True},
                synchronize_session=False,
            )
        )

        db.commit()

        return updated_count

    except SQLAlchemyError:
        db.rollback()
        raise