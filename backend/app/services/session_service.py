from datetime import date, time
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.session import Session as SessionModel
from app.models.user import User


def _validate_session_payload(title: str, description: str, location: str) -> None:
    if len(title.strip()) < 3:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Title must be at least 3 chars")
    if len(description.strip()) < 10:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Description must be at least 10 chars")
    if len(location.strip()) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Location must be at least 2 chars")


def create_session(
    db: Session,
    *,
    creator: User,
    title: str,
    description: str,
    session_date: date,
    session_time: time,
    location: str,
) -> SessionModel:
    _validate_session_payload(title, description, location)
    if session_date < date.today():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Session date cannot be in the past")

    session = SessionModel(
        created_by=creator.id,
        title=title.strip(),
        description=description.strip(),
        date=session_date,
        time=session_time,
        location=location.strip(),
    )
    try:
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create session") from exc


def list_sessions(db: Session, location: Optional[str] = None) -> List[SessionModel]:
    query = db.query(SessionModel)
    if location:
        query = query.filter(func.lower(SessionModel.location) == location.lower())
    return query.order_by(SessionModel.date.asc(), SessionModel.time.asc()).all()


def list_sessions_created_by_user(db: Session, user: User) -> List[SessionModel]:
    return (
        db.query(SessionModel)
        .filter(SessionModel.created_by == user.id)
        .order_by(SessionModel.date.asc(), SessionModel.time.asc())
        .all()
    )


def list_sessions_joined_by_user(db: Session, user: User) -> List[SessionModel]:
    return (
        db.query(SessionModel)
        .join(Attendance, Attendance.session_id == SessionModel.id)
        .filter(Attendance.user_id == user.id)
        .order_by(SessionModel.date.asc(), SessionModel.time.asc())
        .all()
    )


def get_session(db: Session, session_id: int) -> SessionModel:
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


def join_session(db: Session, session: SessionModel, user: User) -> Attendance:
    existing = (
        db.query(Attendance)
        .filter(Attendance.session_id == session.id, Attendance.user_id == user.id)
        .first()
    )
    if existing:
        return existing

    attendance = Attendance(session_id=session.id, user_id=user.id)
    try:
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        return attendance
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to join session") from exc


def get_attendance(db: Session, session: SessionModel) -> List[Attendance]:
    return (
        db.query(Attendance)
        .filter(Attendance.session_id == session.id)
        .order_by(Attendance.joined_at.asc())
        .all()
    )


def user_is_attendee(db: Session, session: SessionModel, user: User) -> bool:
    if session.created_by == user.id:
        return True
    return (
        db.query(Attendance)
        .filter(Attendance.session_id == session.id, Attendance.user_id == user.id)
        .first()
        is not None
    )


def ensure_session_access(db: Session, session: SessionModel, user: User) -> None:
    if not user_is_attendee(db, session, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not part of this session")
