
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.child import Child
from app.models.learning_session import LearningSession
from app.models.subscription.notification import Notification


TIMEZONE = ZoneInfo("Asia/Colombo")

HEARTBEAT_INTERVAL_SECONDS = 10
MAX_HEARTBEAT_GAP_SECONDS = 30

REMINDER_THRESHOLDS = {
    300: (
        "LEARNING_TIME_5_MIN",
        "5 minutes remaining",
        "Your child's daily learning time has 5 minutes remaining.",
    ),
    60: (
        "LEARNING_TIME_1_MIN",
        "1 minute remaining",
        "Your child's daily learning time has 1 minute remaining.",
    ),
    0: (
        "LEARNING_TIME_LIMIT",
        "Daily learning limit reached",
        "Your child's daily learning time limit has been reached.",
    ),
}


def get_current_time():
    return datetime.now(TIMEZONE).replace(tzinfo=None)


def get_current_date():
    return datetime.now(TIMEZONE).date()


def get_or_create_daily_session(
    db: Session,
    child: Child,
):
    today = get_current_date()

    session = (
        db.query(LearningSession)
        .filter(
            LearningSession.child_id == child.child_id,
            LearningSession.learning_date == today,
        )
        .with_for_update()
        .first()
    )

    if session:
        return session

    session = LearningSession(
        child_id=child.child_id,
        parent_id=child.parent_id,
        learning_date=today,
        total_seconds=0,
        is_active=False,
        limit_reached=False,
    )

    db.add(session)
    db.flush()

    return session


def create_learning_notification(
    db: Session,
    session: LearningSession,
    notification_type: str,
    title: str,
    message: str,
):
    existing = (
        db.query(Notification)
        .filter(
            Notification.parent_id == session.parent_id,
            Notification.child_id == session.child_id,
            Notification.notification_type == notification_type,
            Notification.sent_at >= datetime.combine(
                session.learning_date,
                datetime.min.time(),
            ),
        )
        .first()
    )

    if existing:
        return

    notification = Notification(
        parent_id=session.parent_id,
        child_id=session.child_id,
        notification_type=notification_type,
        channel="DASHBOARD",
        title=title,
        message=message,
        is_read=False,
    )

    db.add(notification)


def update_learning_notifications(
    db: Session,
    session: LearningSession,
    daily_limit: int,
):
    limit_seconds = daily_limit * 60
    elapsed = session.total_seconds

    for remaining, notification_data in REMINDER_THRESHOLDS.items():
        threshold = limit_seconds - remaining

        if elapsed >= threshold:
            notification_type, title, message = notification_data

            create_learning_notification(
                db=db,
                session=session,
                notification_type=notification_type,
                title=title,
                message=message,
            )

    if elapsed >= limit_seconds:
        session.total_seconds = limit_seconds
        session.is_active = False
        session.limit_reached = True


def add_elapsed_time(
    db: Session,
    session: LearningSession,
    child: Child,
    now: datetime,
):
    if not session.is_active or not session.last_heartbeat_at:
        return

    elapsed = int(
        (now - session.last_heartbeat_at).total_seconds()
    )

    if elapsed <= 0:
        return

    # Prevent a closed or disconnected browser from
    # accumulating unlimited learning time.
    if elapsed > MAX_HEARTBEAT_GAP_SECONDS:
        elapsed = MAX_HEARTBEAT_GAP_SECONDS
        session.is_active = False

    limit_seconds = child.daily_learning_limit * 60
    remaining = max(
        0,
        limit_seconds - session.total_seconds,
    )

    session.total_seconds += min(elapsed, remaining)
    session.last_heartbeat_at = now

    update_learning_notifications(
        db,
        session,
        child.daily_learning_limit,
    )


def start_learning_session(
    db: Session,
    child: Child,
):
    now = get_current_time()

    session = get_or_create_daily_session(db, child)

    if session.limit_reached:
        return session

    if session.total_seconds >= child.daily_learning_limit * 60:
        session.limit_reached = True
        session.is_active = False

        update_learning_notifications(
            db,
            session,
            child.daily_learning_limit,
        )

        return session

    if not session.is_active:
        session.is_active = True
        session.started_at = now
        session.last_heartbeat_at = now

    return session


def heartbeat_learning_session(
    db: Session,
    child: Child,
):
    now = get_current_time()

    session = get_or_create_daily_session(db, child)

    if session.is_active:
        add_elapsed_time(
            db,
            session,
            child,
            now,
        )

    return session


def stop_learning_session(
    db: Session,
    child: Child,
):
    now = get_current_time()

    session = get_or_create_daily_session(db, child)

    if session.is_active:
        add_elapsed_time(
            db,
            session,
            child,
            now,
        )

        session.is_active = False

    return session


def get_learning_session_status(
    db: Session,
    child: Child,
):
    session = get_or_create_daily_session(db, child)

    limit_seconds = child.daily_learning_limit * 60

    remaining = max(
        0,
        limit_seconds - session.total_seconds,
    )

    return {
        "child_id": child.child_id,
        "daily_learning_limit": child.daily_learning_limit,
        "total_seconds": session.total_seconds,
        "remaining_seconds": remaining,
        "is_active": session.is_active,
        "limit_reached": session.limit_reached,
    }
