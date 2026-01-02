from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app import Base


class ConnectionStatus(str, PyEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"


class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(ConnectionStatus), default=ConnectionStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    sender = relationship("User", foreign_keys=[sender_id], backref="connections_sent")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="connections_received")
    recordings = relationship("MeetingRecording", back_populates="connection", cascade="all,delete-orphan")
    documents = relationship("MeetingDocument", back_populates="connection", cascade="all,delete-orphan")


