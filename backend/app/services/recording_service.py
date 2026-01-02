import secrets
import shutil
from pathlib import Path
from typing import Tuple

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from config.config import settings

ALLOWED_RECORDING_TYPES = {"video/webm": ".webm", "video/mp4": ".mp4"}


def save_recording_file(upload: UploadFile) -> Tuple[str, str]:
    extension = ALLOWED_RECORDING_TYPES.get(upload.content_type or "")
    if not extension:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported recording format")

    filename = f"rec_{secrets.token_hex(8)}{extension}"
    destination = Path(settings.recordings_dir) / filename
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        upload.file.seek(0)
        with destination.open("wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)
    except OSError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to store recording") from exc

    return filename, str(destination)


def attach_recording(db: Session, session, public_path: str) -> None:
    session.recording_url = public_path
    try:
        db.commit()
        db.refresh(session)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to attach recording") from exc
