from typing import List

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.attendance import Attendance
from app.models.session import Session


def list_attendees(db: Session, session: Session) -> List[Attendance]:
    try:
        return (
            db.query(Attendance)
            .filter(Attendance.session_id == session.id)
            .order_by(Attendance.joined_at.asc())
            .all()
        )
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to load attendance") from exc
