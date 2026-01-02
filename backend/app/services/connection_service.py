from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.connection import Connection, ConnectionStatus
from app.models.user import User
from app.models.user_notification import NotificationType
from app.services import notification_service


def _get_connection_or_404(db: Session, connection_id: int) -> Connection:
    connection = db.get(Connection, connection_id)
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return connection


from sqlalchemy import or_

def check_connection_status(db: Session, user_id: int, target_id: int) -> Optional[Connection]:
    return (
        db.query(Connection)
        .filter(
            or_(
                (Connection.sender_id == user_id) & (Connection.receiver_id == target_id),
                (Connection.sender_id == target_id) & (Connection.receiver_id == user_id),
            )
        )
        .first()
    )


def create_request(db: Session, *, sender: User, receiver_id: int) -> Connection:
    if sender.id == receiver_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot connect with yourself")

    receiver = db.get(User, receiver_id)
    if not receiver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receiver not found")

    existing = (
        db.query(Connection)
        .filter(Connection.sender_id == sender.id, Connection.receiver_id == receiver_id)
        .order_by(Connection.created_at.desc())
        .first()
    )
    if existing and existing.status == ConnectionStatus.ACCEPTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Connection already accepted")

    connection = Connection(sender_id=sender.id, receiver_id=receiver_id, status=ConnectionStatus.PENDING)
    try:
        db.add(connection)
        db.commit()
        db.refresh(connection)

        # Notify Receiver
        import json
        notification_service.create_notification(
            db,
            user_id=receiver_id,
            title="New Connection Request",
            body=f"{sender.name} wants to connect with you.",
            type=NotificationType.GENERAL,
            extra_data=json.dumps({"connection_id": connection.id, "action": "connection_request"}),
        )

        return connection
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create connection") from exc


def accept_request(db: Session, *, connection_id: int, receiver: User) -> Connection:
    connection = _get_connection_or_404(db, connection_id)
    if connection.receiver_id != receiver.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot accept this connection")
    if connection.status == ConnectionStatus.ACCEPTED:
        return connection

    connection.status = ConnectionStatus.ACCEPTED
    try:
        db.commit()
        db.refresh(connection)

        # Notify Sender
        notification_service.create_notification(
            db,
            user_id=connection.sender_id,
            title="Connection Accepted",
            body=f"{receiver.name} accepted your connection request.",
            type=NotificationType.GENERAL,
        )

        return connection
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to accept connection") from exc


def reject_request(db: Session, *, connection_id: int, receiver: User) -> None:
    connection = _get_connection_or_404(db, connection_id)
    if connection.receiver_id != receiver.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot reject this connection")
    if connection.status != ConnectionStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reject processed connection")

    try:
        db.delete(connection)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to reject connection") from exc


def list_pending_requests(db: Session, *, receiver: User) -> List[Connection]:
    return (
        db.query(Connection)
        .filter(Connection.receiver_id == receiver.id, Connection.status == ConnectionStatus.PENDING)
        .order_by(Connection.created_at.asc())
        .all()
    )


def list_accepted_connections(db: Session, *, user: User) -> List[Connection]:
    return (
        db.query(Connection)
        .filter(
            (Connection.sender_id == user.id) | (Connection.receiver_id == user.id),
            Connection.status == ConnectionStatus.ACCEPTED,
        )
        .order_by(Connection.updated_at.desc())
        .all()
    )


def get_sender_redirect(db: Session, *, sender: User) -> Optional[Connection]:
    return (
        db.query(Connection)
        .filter(Connection.sender_id == sender.id, Connection.status == ConnectionStatus.ACCEPTED)
        .order_by(Connection.updated_at.desc())
        .first()
    )


def ensure_participant(db: Session, *, connection_id: int, user: User) -> Connection:
    connection = _get_connection_or_404(db, connection_id)
    if user.id not in (connection.sender_id, connection.receiver_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed on this connection")
    if connection.status != ConnectionStatus.ACCEPTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Connection not yet accepted")
    return connection


