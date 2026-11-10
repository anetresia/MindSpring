from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact_message import ContactMessage
from app.schemas.contact_message import (
    ContactMessageCreate,
    ContactMessageResponse,
)

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post(
    "/",
    response_model=ContactMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_contact_message(
    message_data: ContactMessageCreate,
    db: Session = Depends(get_db),
):
    new_message = ContactMessage(
        name=message_data.name,
        email=str(message_data.email).lower(),
        subject=message_data.subject,
        message=message_data.message,
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    return new_message