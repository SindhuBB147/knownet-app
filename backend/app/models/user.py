from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SqlEnum, Float, Integer, String
from sqlalchemy.orm import relationship

from app import Base


class UserRole(str, Enum):
    STUDENT = "student"
    MENTOR = "mentor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(SqlEnum(UserRole), nullable=False, default=UserRole.STUDENT)
    location = Column(String(255), nullable=False)
    city = Column(String(128), nullable=True)
    state = Column(String(128), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    sessions_created = relationship(
        "Session", back_populates="creator", cascade="all,delete-orphan", passive_deletes=True
    )
    attendances = relationship("Attendance", back_populates="user", cascade="all,delete-orphan")
    messages_sent = relationship("Message", back_populates="sender", cascade="all,delete-orphan")
    resources_uploaded = relationship("Resource", back_populates="uploader", cascade="all,delete-orphan")
    skills = relationship("UserSkill", back_populates="user", cascade="all,delete-orphan")
    profile = relationship(
        "UserProfile",
        back_populates="user",
        cascade="all,delete-orphan",
        uselist=False,
    )
    notifications = relationship(
        "UserNotification",
        back_populates="user",
        cascade="all,delete-orphan",
        passive_deletes=True,
    )

    def is_mentor(self) -> bool:
        return self.role == UserRole.MENTOR

    @property
    def avatar_url(self) -> str | None:
        if self.profile:
            return self.profile.avatar_url
        return None
