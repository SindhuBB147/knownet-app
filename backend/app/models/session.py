from datetime import date, datetime, time

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import relationship

from app import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    location = Column(String(255), nullable=False)
    recording_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    creator = relationship("User", back_populates="sessions_created")
    attendees = relationship("Attendance", back_populates="session", cascade="all,delete-orphan")
    messages = relationship("Message", back_populates="session", cascade="all,delete-orphan")
    resources = relationship("Resource", back_populates="session", cascade="all,delete-orphan")

    @property
    def start_time(self) -> datetime:
        return datetime.combine(self.date, self.time)

    @start_time.setter
    def start_time(self, value: datetime) -> None:
        if not isinstance(value, datetime):
            raise ValueError("start_time must be a datetime instance")
        self.date = value.date()
        self.time = value.time()
