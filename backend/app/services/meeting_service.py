import secrets
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.meeting_document import MeetingDocument
from app.models.meeting_recording import MeetingRecording
from config.config import settings

def _build_filename(connection_id: int) -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    token = secrets.token_hex(4)
    return f"{timestamp}_{connection_id}_{token}.webm"


def save_video_file(upload: UploadFile, *, connection_id: int) -> str:
    content_type = (upload.content_type or "").lower()
    if not content_type.startswith("video/webm"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid meeting recording format")

    filename = _build_filename(connection_id)
    destination = Path(settings.videos_dir) / filename

    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        upload.file.seek(0)
        with destination.open("wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)
    except OSError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store meeting recording") from exc

    # Return relative path so it can be served via StaticFiles (e.g., /videos/<filename>)
    return f"videos/{filename}"


def create_record(db: Session, *, connection_id: int, file_path: str) -> MeetingRecording:
    record = MeetingRecording(connection_id=connection_id, file_path=file_path)
    try:
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to save meeting record") from exc



def list_recordings(db: Session, *, connection_id: int):
    return (
        db.query(MeetingRecording)
        .filter(MeetingRecording.connection_id == connection_id)
        .order_by(MeetingRecording.created_at.desc())
        .all()
    )


def save_document_file(upload: UploadFile, *, connection_id: int) -> tuple[str, str]:
    # No restriction on content type, but safer to check/sanitize if needed
    # We will just verify it's not empty
    
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    token = secrets.token_hex(4)
    # Sanitize filename (simple replacement of spaces)
    safe_filename = upload.filename.replace(" ", "_").replace("/", "_")
    storage_filename = f"{timestamp}_{connection_id}_{token}_{safe_filename}"
    
    # Save to 'resources' directory to be consistent with other static files
    # or create a new 'documents' directory. Let's use 'resources'.
    destination = Path(settings.resources_dir) / storage_filename

    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        upload.file.seek(0)
        with destination.open("wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)
    except OSError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store document") from exc

    # Relative path for serving
    return upload.filename, f"resources/{storage_filename}"


def create_document_record(
    db: Session, *, 
    connection_id: int, 
    uploader_id: int,
    file_path: str,
    file_name: str, 
    file_type: str
) -> MeetingDocument:
    doc = MeetingDocument(
        connection_id=connection_id, 
        uploader_id=uploader_id,
        file_path=file_path, 
        file_name=file_name,
        file_type=file_type
    )
    try:
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to save document record") from exc


def list_documents(db: Session, *, connection_id: int):
    return (
        db.query(MeetingDocument)
        .filter(MeetingDocument.connection_id == connection_id)
        .order_by(MeetingDocument.created_at.desc())
        .all()
    )


def delete_document(db: Session, *, document_id: int, user_id: int):
    doc = db.query(MeetingDocument).filter(MeetingDocument.id == document_id).first()
    if not doc:
        print(f"DEBUG: Document {document_id} not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    print(f"DEBUG: Doc uploader={doc.uploader_id}, Requesting user={user_id}")
    if doc.uploader_id != user_id:
        print("DEBUG: Permission denied")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this document")

    try:
        # Try to delete the file - file_path is stored as "resources/filename" in the example
        # But let's check what it actually is. In save_document_file it returns f"resources/{storage_filename}"
        # So we need to strip "resources/" to get the path relative to settings.resources_dir
        relative_name = doc.file_path.replace("resources/", "")
        file_path = Path(settings.resources_dir) / relative_name
        
        if file_path.exists():
            file_path.unlink()
        
        db.delete(doc)
        db.commit()
    except OSError:
        # Proceed with DB delete even if file delete fails (or log it)
        db.delete(doc)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete document") from exc


