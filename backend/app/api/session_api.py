from datetime import date, datetime, time
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, constr
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User
from app.services import auth_service, session_service

router = APIRouter()


class SessionCreate(BaseModel):
    title: constr(min_length=3)
    description: constr(min_length=10)
    date: date
    time: time
    location: constr(min_length=2)


class SessionOut(BaseModel):
    id: int
    title: str
    description: str
    date: date
    time: time
    location: str
    created_by: int
    recording_url: Optional[str]
    start_time: datetime

    class Config:
        orm_mode = True
        from_attributes = True


class AttendanceOut(BaseModel):
    session_id: int
    user_id: int
    joined_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True


class UserSessionOut(SessionOut):
    role: str


@router.post("/", response_model=SessionOut)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    auth_service.ensure_mentor(current_user)
    session = session_service.create_session(
        db,
        creator=current_user,
        title=payload.title,
        description=payload.description,
        session_date=payload.date,
        session_time=payload.time,
        location=payload.location,
    )
    return session


@router.get("/", response_model=List[SessionOut])
def list_sessions(location: Optional[str] = None, db: Session = Depends(get_db)):
    return session_service.list_sessions(db, location)


@router.get("/mine", response_model=List[UserSessionOut])
def list_my_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    sessions_map = {}
    created_sessions = session_service.list_sessions_created_by_user(db, current_user)
    for session in created_sessions:
        sessions_map[session.id] = {"session": session, "role": "host"}
    joined_sessions = session_service.list_sessions_joined_by_user(db, current_user)
    for session in joined_sessions:
        sessions_map.setdefault(session.id, {"session": session, "role": "participant"})

    result: List[UserSessionOut] = []
    for entry in sessions_map.values():
        session = entry["session"]
        result.append(
            UserSessionOut(
                id=session.id,
                title=session.title,
                description=session.description,
                date=session.date,
                time=session.time,
                location=session.location,
                created_by=session.created_by,
                recording_url=session.recording_url,
                start_time=session.start_time,
                role=entry["role"],
            )
        )
    return result


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(auth_service.get_current_user)):
    session = session_service.get_session(db, session_id)
    session_service.ensure_session_access(db, session, current_user)
    return session


@router.post("/{session_id}/join", response_model=AttendanceOut)
def join_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    session = session_service.get_session(db, session_id)
    attendance = session_service.join_session(db, session, current_user)
    return attendance
