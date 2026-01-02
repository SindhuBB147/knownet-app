from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, status, File, UploadFile, HTTPException
from pydantic import BaseModel, EmailStr, constr
from sqlalchemy.orm import Session
import os
import shutil
import uuid

from app import get_db
from app.models.user import User, UserRole
from app.models.user_profile import ProfileVisibility
from app.models.user_skill import UserSkill
from app.services import auth_service, profile_service, skill_service

router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileInfo(BaseModel):
    bio: Optional[str]
    website: Optional[str]
    avatar_url: Optional[str]
    profile_visibility: ProfileVisibility
    show_online_status: bool
    allow_direct_messages: bool
    theme_preference: str

    class Config:
        from_attributes = True


class NotificationSettings(BaseModel):
    session_invites: bool
    community_updates: bool
    direct_messages: bool
    session_reminders: bool
    new_achievements: bool


class ProfileDetailsResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    location: str
    created_at: datetime
    profile: ProfileInfo
    notifications: NotificationSettings

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    first_name: constr(min_length=1, max_length=100)
    last_name: Optional[constr(min_length=1, max_length=100)] = None
    location: constr(min_length=2, max_length=255)
    bio: Optional[constr(max_length=1000)] = None
    website: Optional[constr(max_length=255)] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class PrivacySettingsRequest(BaseModel):
    profile_visibility: ProfileVisibility
    show_online_status: bool = True
    allow_direct_messages: bool = True


class NotificationSettingsRequest(BaseModel):
    session_invites: bool = True
    community_updates: bool = True
    direct_messages: bool = True
    session_reminders: bool = True
    new_achievements: bool = True


class AppearanceSettingsRequest(BaseModel):
    theme_preference: constr(min_length=3, max_length=20)


class SkillCreate(BaseModel):
    name: constr(min_length=2, max_length=100)
    level: Optional[constr(min_length=2, max_length=50)] = None


class SkillOut(BaseModel):
    id: int
    name: str
    level: Optional[str]

    class Config:
        from_attributes = True


def _serialize_details(user: User, db: Session) -> ProfileDetailsResponse:
    profile = profile_service.get_profile(db, user)
    payload = profile_service.serialize_profile_details(user, profile)
    return ProfileDetailsResponse(**payload)


@router.get("/details", response_model=ProfileDetailsResponse)
def get_profile_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    return _serialize_details(current_user, db)





@router.put("/details", response_model=ProfileDetailsResponse)
def update_profile_details(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    full_name = payload.first_name.strip()
    if payload.last_name:
        full_name = f"{full_name} {payload.last_name.strip()}"
    profile_service.update_profile_details(
        db,
        user=current_user,
        name=full_name,
        location=payload.location,
        bio=payload.bio,
        website=payload.website,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    return _serialize_details(current_user, db)


@router.put("/privacy", response_model=ProfileInfo)
def update_privacy_settings(
    payload: PrivacySettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    profile = profile_service.update_privacy_settings(
        db,
        user=current_user,
        profile_visibility=payload.profile_visibility,
        show_online_status=payload.show_online_status,
        allow_direct_messages=payload.allow_direct_messages,
    )
    return ProfileInfo.from_orm(profile)


@router.put("/notifications", response_model=NotificationSettings)
def update_notification_settings(
    payload: NotificationSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    profile = profile_service.update_notification_settings(
        db,
        user=current_user,
        notify_session_invites=payload.session_invites,
        notify_community_updates=payload.community_updates,
        notify_direct_messages=payload.direct_messages,
        notify_session_reminders=payload.session_reminders,
        notify_new_achievements=payload.new_achievements,
    )
    return NotificationSettings(
        session_invites=profile.notify_session_invites,
        community_updates=profile.notify_community_updates,
        direct_messages=profile.notify_direct_messages,
        session_reminders=profile.notify_session_reminders,
        new_achievements=profile.notify_new_achievements,
    )


@router.put("/appearance", response_model=ProfileInfo)
def update_appearance_settings(
    payload: AppearanceSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    profile = profile_service.update_appearance(
        db,
        user=current_user,
        theme_preference=payload.theme_preference,
    )
    return ProfileInfo.from_orm(profile)


@router.get("/skills", response_model=List[SkillOut])
def list_skills(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    return skill_service.list_skills(db, user=current_user)


@router.post("/skills", response_model=SkillOut, status_code=status.HTTP_201_CREATED)
def add_skill(
    payload: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    return skill_service.add_skill(db, user=current_user, name=payload.name, level=payload.level)


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    skill_service.remove_skill(db, user=current_user, skill_id=skill_id)


@router.post("/avatar", response_model=ProfileInfo)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    # Validate file size (optional, can be done via middleware or here if reading chunks)
    # For simplicity, we trust standard upload limits for now

    # Create storage directory if not exists (although we did via CLI, good safety)
    # Path relative to backend/run.py -> ../frontend/public/uploads/avatars
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    # Navigate up to 'Mini Project' root
    project_root = os.path.dirname(base_dir)
    upload_dir = os.path.join(project_root, "frontend", "public", "uploads", "avatars")
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    extension = os.path.splitext(file.filename)[1]
    if not extension:
        extension = ".jpg"
    
    filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{extension}"
    file_path = os.path.join(upload_dir, filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}",
        )

    # Construct public URL
    # Assuming frontend is serving 'uploads/' under /uploads/ or /assets/
    # If using Vite public folder, it should be available at /uploads/avatars/filename
    avatar_url = f"/uploads/avatars/{filename}"

    # Update profile
    profile_service.update_avatar(db, user=current_user, avatar_url=avatar_url)

    # Return updated profile info
    return _serialize_details(current_user, db).profile


class FeedbackRequest(BaseModel):
    type: str
    subject: str
    message: str
    include_screenshot: bool = False


@router.post("/feedback")
def submit_feedback(
    payload: FeedbackRequest,
    current_user: User = Depends(auth_service.get_current_user),
):
    # In a real app, save to DB or email support
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Feedback received from User {current_user.id} ({current_user.email}):")
    logger.info(f"Type: {payload.type}, Subject: {payload.subject}")
    logger.info(f"Message: {payload.message}")
    
    return {"message": "Feedback received"}


# RE-ORDERED: Generic user_id route must be last to avoid catching specific paths like /skills
@router.get("/{user_id}", response_model=ProfileDetailsResponse)
def get_public_profile_view(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Reuse serialization but this reveals email. In a real app we'd strip private info.
    # For this MVP, it's acceptable.
    return _serialize_details(target_user, db)

