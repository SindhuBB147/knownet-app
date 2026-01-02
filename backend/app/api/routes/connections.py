from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import get_db
from app.models.connection import ConnectionStatus
from app.models.user import User
from app.services import auth_service, connection_service

router = APIRouter(prefix="/connect", tags=["Connections"])


class UserPreview(BaseModel):
    id: int
    name: Optional[str]
    email: Optional[str]
    avatar_url: Optional[str]

    class Config:
        orm_mode = True


class ConnectionOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    status: ConnectionStatus
    created_at: datetime
    updated_at: datetime
    sender: UserPreview
    receiver: UserPreview

    class Config:
        orm_mode = True


class ConnectionAcceptedResponse(BaseModel):
    connection_id: int


class ConnectionCheckResponse(BaseModel):
    redirect_to_chat: bool
    connection_id: Optional[int] = None


@router.post("/request/{receiver_id}", response_model=ConnectionOut, status_code=201)
def create_connection_request(
    receiver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    return connection_service.create_request(db, sender=current_user, receiver_id=receiver_id)


@router.post("/accept/{connection_id}", response_model=ConnectionAcceptedResponse)
def accept_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    connection = connection_service.accept_request(db, connection_id=connection_id, receiver=current_user)
    return ConnectionAcceptedResponse(connection_id=connection.id)


@router.delete("/reject/{connection_id}", status_code=204)
def reject_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    connection_service.reject_request(db, connection_id=connection_id, receiver=current_user)
    return None


@router.get("/check", response_model=ConnectionCheckResponse)
def check_connection_redirect(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    connection = connection_service.get_sender_redirect(db, sender=current_user)
    if connection:
        return ConnectionCheckResponse(redirect_to_chat=True, connection_id=connection.id)
    return ConnectionCheckResponse(redirect_to_chat=False)


class ConnectionStatusResponse(BaseModel):
    status: Optional[ConnectionStatus] = None
    connection_id: Optional[int] = None
    is_sender: bool = False


@router.get("/status/{target_id}", response_model=ConnectionStatusResponse)
def check_connection_status_endpoint(
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    connection = connection_service.check_connection_status(db, current_user.id, target_id)
    if not connection:
        return ConnectionStatusResponse(status=None)
    
    return ConnectionStatusResponse(
        status=connection.status,
        connection_id=connection.id,
        is_sender=(connection.sender_id == current_user.id)
    )


@router.get("/requests", response_model=List[ConnectionOut])
def list_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    return connection_service.list_pending_requests(db, receiver=current_user)


@router.get("/", response_model=List[ConnectionOut])
def list_active_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    return connection_service.list_accepted_connections(db, user=current_user)


