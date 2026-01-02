from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User
from app.models.user_notification import NotificationType, UserNotification
from app.services import auth_service, notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    type: NotificationType
    extra_data: Optional[str] = None
    created_at: datetime
    read: bool

    class Config:
        orm_mode = True


@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    notifications = notification_service.list_notifications(db, user=current_user, limit=20)
    return [
        NotificationOut(
            id=notification.id,
            title=notification.title,
            body=notification.body,
            type=notification.type,
            extra_data=notification.extra_data,
            created_at=notification.created_at,
            read=notification.read_at is not None,
        )
        for notification in notifications
    ]


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    notification_service.mark_all_read(db, user=current_user)
    return {"status": "ok"}

