import secrets
import shutil
from pathlib import Path
from typing import List, Tuple

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.resource import Resource
from config.config import settings

ALLOWED_RESOURCE_EXTENSIONS = {".pdf", ".ppt", ".pptx", ".png", ".jpg", ".jpeg"}


def save_resource_file(upload: UploadFile) -> Tuple[str, str]:
    extension = Path(upload.filename or "").suffix.lower()
    if extension not in ALLOWED_RESOURCE_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported resource format")

    filename = f"res_{secrets.token_hex(8)}{extension}"
    destination = Path(settings.resources_dir) / filename
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        upload.file.seek(0)
        with destination.open("wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)
    except OSError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store resource") from exc

    return filename, str(destination)


def create_resource(db: Session, *, session_id: int, uploader_id: int, file_name: str, file_url: str) -> Resource:
    resource = Resource(
        session_id=session_id,
        uploader_id=uploader_id,
        file_name=file_name,
        file_url=file_url,
    )
    try:
        db.add(resource)
        db.commit()
        db.refresh(resource)
        return resource
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to record resource") from exc


def list_resources(db: Session, session_id: int) -> List[Resource]:
    try:
        return (
            db.query(Resource)
            .filter(Resource.session_id == session_id)
            .order_by(Resource.uploaded_at.desc())
            .all()
        )
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to load resources") from exc
