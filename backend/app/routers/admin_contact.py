
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact_message import ContactMessage
from app.models.user import User
from app.routers.auth import get_current_admin
from app.schemas.contact_message import ContactMessageResponse
from app.services import notification_service


router = APIRouter(
    prefix="/admin/contact-messages",
    tags=["Admin Contact Messages"],
)


# =========================================================
# ADMIN REPLY SCHEMA
# =========================================================

class AdminContactReply(BaseModel):
    admin_reply: str = Field(min_length=1, max_length=5000)


# =========================================================
# GET ALL CONTACT MESSAGES
# =========================================================

@router.get(
    "/",
    response_model=list[ContactMessageResponse],
)
def get_all_contact_messages(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    messages = (
        db.query(ContactMessage)
        .order_by(ContactMessage.created_at.desc())
        .all()
    )

    return messages


# =========================================================
# REPLY TO CONTACT MESSAGE
# =========================================================

@router.put("/{message_id}/reply")
def reply_to_contact_message(
    message_id: int,
    reply_data: AdminContactReply,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    contact_message = (
        db.query(ContactMessage)
        .filter(ContactMessage.id == message_id)
        .first()
    )

    if not contact_message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found.",
        )

    admin_reply = reply_data.admin_reply.strip()

    if not admin_reply:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply cannot be empty.",
        )

    try:
        # Save admin reply
        contact_message.admin_reply = admin_reply
        contact_message.replied_at = datetime.utcnow()
        contact_message.status = "Replied"

        # Find Parent account using contact email
        parent = (
            db.query(User)
            .filter(
                func.lower(User.email) == contact_message.email.lower(),
                User.role == "Parent",
            )
            .first()
        )

        notification_created = False

        # Send dashboard notification only if Parent account exists
        if parent:
            notification_service.create_notification(
                db=db,
                parent_id=parent.user_id,
                notification_type="CONTACT_REPLY",
                title="Reply to your contact message",
                message=(
                    f"Admin replied to your message "
                    f"'{contact_message.subject}': {admin_reply}"
                ),
                channel="DASHBOARD",
            )

            notification_created = True

        else:
            # No matching Parent account; save reply only
            db.commit()

        db.refresh(contact_message)

        return {
            "message": "Admin reply saved successfully.",
            "contact_message_id": contact_message.id,
            "status": contact_message.status,
            "admin_reply": contact_message.admin_reply,
            "notification_created": notification_created,
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save the reply. Please try again.",
        )
