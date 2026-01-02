from pathlib import Path
from typing import List

from pydantic import Field, validator
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "KnowNet API"
    secret_key: str = "CHANGE_ME"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    
    database_url: str = "mysql+pymysql://root:@localhost/knownet"
    
    # Allow overriding via env var. Parsing logic handled by validator if needed, 
    # but BaseSettings handles JSON lists automatically.
    # To support simple comma-separated strings, we can add a validator:
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]

    @validator("allowed_origins", pre=True)
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    recordings_dir: str = str(BASE_DIR / "recordings")
    resources_dir: str = str(BASE_DIR / "resources")
    videos_dir: str = str(BASE_DIR / "videos")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
