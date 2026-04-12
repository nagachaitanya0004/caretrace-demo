import os
from pathlib import Path
from dotenv import load_dotenv

# Load repo-root .env regardless of cwd (e.g. uvicorn run from a subfolder)
_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_ROOT / ".env")

class Settings:
    PROJECT_NAME: str = "CareTrace AI"
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    # Must match seed.py default so demo user exists after seeding
    DB_NAME: str = os.getenv("DB_NAME", "caretrace_ai")
    
    # JWT Secrets
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # CORS Validation
    cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
    CORS_ORIGINS: list = [origin.strip() for origin in cors_origins_raw.split(",")]

settings = Settings()
