from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User
from app.services import auth_service, recording_service, session_service

router = APIRouter()


class RecordingResponse(BaseModel):
    session_id: int
    recording_url: Optional[str]


@router.post("/{session_id}/recordings", response_model=RecordingResponse)
async def upload_recording(
    session_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    session = session_service.get_session(db, session_id)
    session_service.ensure_session_access(db, session, current_user)

    filename, _ = recording_service.save_recording_file(file)
    public_url = f"/recordings/{filename}"
    recording_service.attach_recording(db, session, public_url)
    return RecordingResponse(session_id=session.id, recording_url=public_url)


@router.get("/{session_id}/recordings", response_model=RecordingResponse)
async def get_recording(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    session = session_service.get_session(db, session_id)
    session_service.ensure_session_access(db, session, current_user)
    if not session.recording_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No recording available")
    return RecordingResponse(session_id=session.id, recording_url=session.recording_url)
