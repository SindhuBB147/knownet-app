from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User
from app.services import attendance_service, auth_service, session_service

router = APIRouter()


class AttendeeUser(BaseModel):
    id: int
    name: str
    email: EmailStr
    location: str

    class Config:
        from_attributes = True


class AttendanceResponse(BaseModel):
    user: AttendeeUser
    joined_at: datetime

    class Config:
        from_attributes = True


@router.get("/{session_id}", response_model=List[AttendanceResponse])
def list_attendees(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    session = session_service.get_session(db, session_id)
    session_service.ensure_session_access(db, session, current_user)
    attendees = attendance_service.list_attendees(db, session)
    return [AttendanceResponse(user=att.user, joined_at=att.joined_at) for att in attendees]
