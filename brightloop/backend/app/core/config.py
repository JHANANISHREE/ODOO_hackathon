from pathlib import Path
from typing import List
from urllib.parse import quote_plus
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Brightloop Software"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "brightloop-hackathon-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "brightloop"
    DB_PASSWORD: str = "Naresh@8346"
    DB_NAME: str = "brightloop_db"
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "no-reply@brightloop.com"
    EMAILS_FROM_NAME: str = "Brightloop Software"
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    @property
    def sync_database_url(self) -> str:
        encoded_password = quote_plus(self.DB_PASSWORD)
        return f"mysql+pymysql://{self.DB_USER}:{encoded_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"

settings = Settings()
