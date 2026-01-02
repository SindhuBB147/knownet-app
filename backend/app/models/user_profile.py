from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app import Base


class ProfileVisibility(str, Enum):
    PUBLIC = "public"
    COMMUNITY = "community"
    PRIVATE = "private"


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    bio = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    profile_visibility = Column(
        SqlEnum(ProfileVisibility), default=ProfileVisibility.PUBLIC, nullable=False
    )
    show_online_status = Column(Boolean, default=True, nullable=False)
    allow_direct_messages = Column(Boolean, default=True, nullable=False)
    notify_session_invites = Column(Boolean, default=True, nullable=False)
    notify_community_updates = Column(Boolean, default=True, nullable=False)
    notify_direct_messages = Column(Boolean, default=True, nullable=False)
    notify_session_reminders = Column(Boolean, default=True, nullable=False)
    notify_new_achievements = Column(Boolean, default=True, nullable=False)
    theme_preference = Column(String(20), default="system", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="profile", uselist=False)

