from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_notification import NotificationType, UserNotification


def list_notifications(db: Session, *, user: User, limit: int = 10) -> List[UserNotification]:
    notifications = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == user.id)
        .order_by(UserNotification.created_at.desc())
        .limit(limit)
        .all()
    )
    return notifications



def mark_all_read(db: Session, *, user: User) -> None:
    try:
        (
            db.query(UserNotification)
            .filter(UserNotification.user_id == user.id, UserNotification.read_at.is_(None))
            .update({"read_at": datetime.utcnow()}, synchronize_session=False)
        )
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to update notifications"
        ) from exc


def mark_notification_read(db: Session, *, user: User, notification_id: int) -> None:
    notification = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == user.id, UserNotification.id == notification_id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.read_at = datetime.utcnow()
    try:
        db.add(notification)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to update notification"
        ) from exc


def create_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    body: str,
    type: NotificationType = NotificationType.GENERAL,
    extra_data: Optional[str] = None,
) -> UserNotification:
    notification = UserNotification(
        user_id=user_id,
        title=title,
        body=body,
        type=type,
        extra_data=extra_data,
    )
    try:
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
    except SQLAlchemyError as exc:
        db.rollback()
        # Log error but don't crash the caller just for a notification failure?
        # For now, let's log and proceed, or raise. 
        # Raising ensures generic error handling catches it.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create notification"
        ) from exc


