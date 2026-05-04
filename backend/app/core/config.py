from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

_TESTING: bool = 'pytest' in sys.modules or os.getenv('TESTING') == '1'

def _require(name: str, test_default: str | None = None) -> str:
    value = os.getenv(name, '')
    if value:
        return value
    if _TESTING and test_default is not None:
        return test_default
    raise RuntimeError(f"Required environment variable '{name}' is not set.")

# ── Primary Config (Required) ────────────────────────────────────────────────
MONGO_URI: str = _require('MONGO_URI')
SECRET_KEY: str = _require('SECRET_KEY', test_default='test-secret-key-not-for-production')

# ── Secondary Config (Optional) ──────────────────────────────────────────────
# PostgreSQL is secondary (Audit/Config only) and does not block startup.
POSTGRES_URI: str = os.getenv('POSTGRES_URI') or os.getenv('POSTGRES_URL') or ''

# ── Optional with safe defaults ───────────────────────────────────────────────
MONGO_DB: str = os.getenv('DB_NAME') or os.getenv('MONGO_DB') or 'caretrace_ai'
ALGORITHM: str = os.getenv('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '10080'))
APP_NAME: str = os.getenv('APP_NAME', 'CareTrace AI Backend')
APP_VERSION: str = os.getenv('APP_VERSION', '1.1.0')
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
    if o.strip()
]

SENTRY_DSN: str | None = os.getenv('SENTRY_DSN')

if SENTRY_DSN and not _TESTING:
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)
    except ImportError:
        pass

def validate_environment() -> dict:
    """
    Validate all required environment variables at startup.
    MongoDB is REQUIRED. PostgreSQL is OPTIONAL.
    """
    # 1. Validate Primary Secrets
    environment = os.getenv('ENV', 'development').lower()
    if environment == 'production' and SECRET_KEY == 'test-secret-key-not-for-production':
        raise RuntimeError("CRITICAL: Cannot use default test SECRET_KEY in production mode.")

    if not _TESTING:
        if len(SECRET_KEY) < 32:
            raise RuntimeError("SECRET_KEY must be at least 32 characters long.")
    
    # 2. Database Metadata Analysis
    mongo_host = MONGO_URI.split('@')[-1].split('/')[0] if '@' in MONGO_URI else 'unknown'
    mongo_type = 'Atlas' if 'mongodb.net' in mongo_host.lower() else 'Local/Other'

    pg_host = POSTGRES_URI.split('@')[-1].split('/')[0] if '@' in POSTGRES_URI else 'none'
    pg_type = 'Supabase' if 'supabase' in pg_host.lower() else 'Local/Other'

    environment = os.getenv('ENV', 'development').lower()

    if environment == 'production' and mongo_type != 'Atlas':
        raise RuntimeError("Production requires MongoDB Atlas.")

    return {
        "ENV": environment,
        "MONGO": {"host": mongo_host, "type": mongo_type},
        "POSTGRES": {"host": pg_host, "type": pg_type, "active": bool(POSTGRES_URI)}
    }
