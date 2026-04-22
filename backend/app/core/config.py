import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (3 levels up from this file)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017')
MONGO_DB = os.getenv('DB_NAME', os.getenv('MONGO_DB', 'caretrace_ai'))
APP_NAME = os.getenv('APP_NAME', 'CareTrace AI Backend')
APP_VERSION = os.getenv('APP_VERSION', '1.0.0')

# Security — must be set via environment variable in production
_secret = os.getenv('SECRET_KEY', '')
if not _secret:
    import sys
    if 'pytest' in sys.modules or os.getenv('TESTING'):
        _secret = 'test-secret-key-not-for-production'
    else:
        # Generate a temporary key and warn loudly — operator must set SECRET_KEY
        _secret = secrets.token_hex(32)
        import logging
        logging.getLogger('caretrace_ai').warning(
            'SECRET_KEY is not set. A temporary key has been generated. '
            'Set SECRET_KEY in your environment for production use.'
        )

SECRET_KEY: str = _secret
ALGORITHM: str = os.getenv('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '10080'))  # 7 days

CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
    if o.strip()
]

# PostgreSQL Configuration (NEW - for future dual database support)
POSTGRES_URL: str = os.getenv(
    'POSTGRES_URL',
    'postgresql+asyncpg://postgres:postgres@localhost:5432/caretrace_ai'
)
