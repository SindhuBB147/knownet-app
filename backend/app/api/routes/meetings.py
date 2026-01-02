from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User
from app.services import auth_service, connection_service, meeting_service

router = APIRouter(prefix="/meeting", tags=["Meetings"])


class MeetingRecordingOut(BaseModel):
    id: int
    connection_id: int
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingDocumentOut(BaseModel):
    id: int
    connection_id: int
    uploader_id: int
    file_path: str
    file_name: str
    file_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingRecordingCreated(BaseModel):
    message: str
    file_path: str
    id: int



@router.post("/upload/{connection_id}", response_model=MeetingRecordingCreated, status_code=201)
async def upload_meeting_recording(
    connection_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    connection_service.ensure_participant(db, connection_id=connection_id, user=current_user)
    relative_path = meeting_service.save_video_file(file, connection_id=connection_id)
    record = meeting_service.create_record(db, connection_id=connection_id, file_path=relative_path)
    return MeetingRecordingCreated(message="saved", file_path=record.file_path, id=record.id)


@router.post("/documents/{connection_id}", response_model=MeetingDocumentOut, status_code=201)
async def upload_meeting_document(
    connection_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    connection_service.ensure_participant(db, connection_id=connection_id, user=current_user)
    original_name, relative_path = meeting_service.save_document_file(file, connection_id=connection_id)
    doc = meeting_service.create_document_record(
        db, 
        connection_id=connection_id, 
        uploader_id=current_user.id,
        file_path=relative_path,
        file_name=original_name,
        file_type=file.content_type or "application/octet-stream"
    )
    return doc


@router.get("/recordings/{connection_id}", response_model=List[MeetingRecordingOut])
def list_meeting_recordings(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    connection_service.ensure_participant(db, connection_id=connection_id, user=current_user)
    return meeting_service.list_recordings(db, connection_id=connection_id)


@router.get("/documents/{connection_id}", response_model=List[MeetingDocumentOut])
def list_meeting_documents(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    print(f"DEBUG: List documents for connection_id={connection_id}")
    docs = meeting_service.list_documents(db, connection_id=connection_id)
    print(f"DEBUG: Found {len(docs)} documents")
    return docs


@router.delete("/documents/{document_id}", status_code=204)
def delete_meeting_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    print(f"DEBUG: Delete request for doc_id={document_id} from user={current_user.id}")
    meeting_service.delete_document(db, document_id=document_id, user_id=current_user.id)
    print("DEBUG: Delete successful")


