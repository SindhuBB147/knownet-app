from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User
from app.services import auth_service, resource_service, session_service

router = APIRouter()


class ResourceOut(BaseModel):
    id: int
    session_id: int
    uploader_id: int
    file_name: str
    file_url: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


@router.post("/{session_id}/resources", response_model=ResourceOut)
async def upload_resource(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    session = session_service.get_session(db, session_id)
    auth_service.ensure_mentor(current_user)
    if session.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the session mentor can upload resources")
    filename, _ = resource_service.save_resource_file(file)
    public_url = f"/resources/{filename}"
    resource = resource_service.create_resource(
        db,
        session_id=session.id,
        uploader_id=current_user.id,
        file_name=file.filename,
        file_url=public_url,
    )
    return resource


@router.get("/{session_id}/resources", response_model=List[ResourceOut])
async def list_resources(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    session = session_service.get_session(db, session_id)
    session_service.ensure_session_access(db, session, current_user)
    return resource_service.list_resources(db, session.id)
