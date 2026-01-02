from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config.config import settings

BASE_PATH = Path(__file__).resolve().parent.parent

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
Base = declarative_base()


def _ensure_directories() -> None:
    Path(settings.recordings_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.resources_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.videos_dir).mkdir(parents=True, exist_ok=True)


_ensure_directories()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


__all__ = ["Base", "engine", "SessionLocal", "get_db"]

