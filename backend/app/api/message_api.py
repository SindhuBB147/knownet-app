from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, constr
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User
from app.services import auth_service, message_service, session_service

router = APIRouter()


class MessageCreate(BaseModel):
    content: constr(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: int
    session_id: Optional[int]
    connection_id: Optional[int]
    sender_id: int
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True


@router.get("/{session_id}/messages", response_model=List[MessageOut])
def list_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    session = session_service.get_session(db, session_id)
    session_service.ensure_session_access(db, session, current_user)
    return message_service.list_messages(db, session_id=session_id)


@router.post("/{session_id}/messages", response_model=MessageOut)
def send_message(
    session_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    session = session_service.get_session(db, session_id)
    session_service.ensure_session_access(db, session, current_user)
    return message_service.create_message(
        db,
        session_id=session.id,
        sender_id=current_user.id,
        content=payload.content,
    )


@router.get("/connection/{connection_id}", response_model=List[MessageOut])
def list_connection_messages(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    from app.services import connection_service
    connection_service.ensure_participant(db, connection_id=connection_id, user=current_user)
    return message_service.list_messages(db, connection_id=connection_id)


@router.post("/connection/{connection_id}", response_model=MessageOut)
def send_connection_message(
    connection_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    from app.services import connection_service
    connection_service.ensure_participant(db, connection_id=connection_id, user=current_user)
    return message_service.create_message(
        db,
        connection_id=connection_id,
        sender_id=current_user.id,
        content=payload.content,
    )


@router.delete("/{message_id}", status_code=204)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    message_service.delete_message(db, message_id=message_id, user_id=current_user.id)
