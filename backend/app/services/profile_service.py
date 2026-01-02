from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_profile import ProfileVisibility, UserProfile


def _ensure_profile(db: Session, user: User) -> UserProfile:
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == user.id)
        .first()
    )
    if profile:
        return profile

    profile = UserProfile(user_id=user.id)
    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to initialize profile"
        ) from exc


def get_profile(db: Session, user: User) -> UserProfile:
    return _ensure_profile(db, user)


def get_public_profile(db: Session, user_id: int) -> Optional[UserProfile]:
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()


def update_profile_details(
    db: Session,
    *,
    user: User,
    name: Optional[str] = None,
    location: Optional[str] = None,
    bio: Optional[str] = None,
    website: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> tuple[User, UserProfile]:
    profile = _ensure_profile(db, user)

    if name:
        user.name = name.strip()
    if location:
        user.location = location.strip()
    if latitude is not None:
        user.latitude = latitude
    if longitude is not None:
        user.longitude = longitude

    profile.bio = bio.strip() if bio else None
    profile.website = website.strip() if website else None

    try:
        db.add(user)
        db.add(profile)
        db.commit()
        db.refresh(user)
        db.refresh(profile)
        return user, profile
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to update profile"
        ) from exc


def update_privacy_settings(
    db: Session,
    *,
    user: User,
    profile_visibility: ProfileVisibility,
    show_online_status: bool,
    allow_direct_messages: bool,
) -> UserProfile:
    profile = _ensure_profile(db, user)
    profile.profile_visibility = profile_visibility
    profile.show_online_status = show_online_status
    profile.allow_direct_messages = allow_direct_messages
    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to update privacy settings"
        ) from exc


def update_notification_settings(
    db: Session,
    *,
    user: User,
    notify_session_invites: bool,
    notify_community_updates: bool,
    notify_direct_messages: bool,
    notify_session_reminders: bool,
    notify_new_achievements: bool,
) -> UserProfile:
    profile = _ensure_profile(db, user)
    profile.notify_session_invites = notify_session_invites
    profile.notify_community_updates = notify_community_updates
    profile.notify_direct_messages = notify_direct_messages
    profile.notify_session_reminders = notify_session_reminders
    profile.notify_new_achievements = notify_new_achievements
    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update notification settings",
        ) from exc


def update_appearance(
    db: Session,
    *,
    user: User,
    theme_preference: str,
) -> UserProfile:
    profile = _ensure_profile(db, user)
    profile.theme_preference = theme_preference
    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update appearance settings",
        ) from exc


def update_avatar(
    db: Session,
    *,
    user: User,
    avatar_url: str,
) -> UserProfile:
    profile = _ensure_profile(db, user)
    profile.avatar_url = avatar_url
    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update avatar",
        ) from exc



def serialize_profile_details(user: User, profile: UserProfile) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "location": user.location,
        "created_at": user.created_at,
        "profile": {
            "bio": profile.bio,
            "website": profile.website,
            "avatar_url": profile.avatar_url,
            "profile_visibility": profile.profile_visibility,
            "show_online_status": profile.show_online_status,
            "allow_direct_messages": profile.allow_direct_messages,
            "theme_preference": profile.theme_preference,
        },
        "notifications": {
            "session_invites": profile.notify_session_invites,
            "community_updates": profile.notify_community_updates,
            "direct_messages": profile.notify_direct_messages,
            "session_reminders": profile.notify_session_reminders,
            "new_achievements": profile.notify_new_achievements,
        },
    }

