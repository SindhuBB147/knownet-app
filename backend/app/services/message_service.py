from typing import List

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.message import Message


def create_message(
    db: Session, *, session_id: int = None, connection_id: int = None, sender_id: int, content: str
) -> Message:
    if not content.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message content cannot be empty")
    
    if not session_id and not connection_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Must specify session or connection")

    message = Message(
        session_id=session_id, 
        connection_id=connection_id,
        sender_id=sender_id, 
        content=content.strip()
    )
    try:
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save message") from exc


def list_messages(db: Session, session_id: int = None, connection_id: int = None) -> List[Message]:
    try:
        query = db.query(Message)
        if session_id:
            query = query.filter(Message.session_id == session_id)
        elif connection_id:
            query = query.filter(Message.connection_id == connection_id)
        else:
            return []
            
        return query.order_by(Message.timestamp.asc()).all()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to load messages") from exc


def delete_message(db: Session, *, message_id: int, user_id: int):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    if message.sender_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this message")
    
    try:
        db.delete(message)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete message") from exc
