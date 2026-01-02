from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config.config import settings

import ssl

BASE_PATH = Path(__file__).resolve().parent.parent

# Fix for Aiven/Render SSL issues
db_url = settings.database_url
connect_args = {}

if "ssl-mode=REQUIRED" in db_url or "ssl-mode=required" in db_url:
    db_url = db_url.replace("?ssl-mode=REQUIRED", "").replace("&ssl-mode=REQUIRED", "") \
                   .replace("?ssl-mode=required", "").replace("&ssl-mode=required", "")
    
    # Create a safe SSL context that ensures encryption but is lenient on verification
    # (Fixes "unexpected keyword argument 'ssl-mode'" and avoids missing CA errors)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    connect_args["ssl"] = ssl_context

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True, future=True)
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

