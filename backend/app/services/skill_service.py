from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_skill import UserSkill


def list_skills(db: Session, *, user: User) -> List[UserSkill]:
    return (
        db.query(UserSkill)
        .filter(UserSkill.user_id == user.id)
        .order_by(UserSkill.created_at.asc())
        .all()
    )


def add_skill(db: Session, *, user: User, name: str, level: Optional[str] = None) -> UserSkill:
    clean_name = name.strip()
    if len(clean_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Skill name must be at least 2 characters",
        )

    level = level.strip() if level else None

    existing = (
        db.query(UserSkill)
        .filter(UserSkill.user_id == user.id, UserSkill.name.ilike(clean_name))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Skill already added",
        )

    skill = UserSkill(user_id=user.id, name=clean_name, level=level)
    try:
        db.add(skill)
        db.commit()
        db.refresh(skill)
        return skill
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to save skill"
        ) from exc


def remove_skill(db: Session, *, user: User, skill_id: int) -> None:
    skill = (
        db.query(UserSkill)
        .filter(UserSkill.id == skill_id, UserSkill.user_id == user.id)
        .first()
    )
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    try:
        db.delete(skill)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to delete skill"
        ) from exc

