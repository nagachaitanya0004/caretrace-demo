from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root (3 levels up from this file)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

_TESTING: bool = 'pytest' in sys.modules or os.getenv('TESTING') == '1'


def _require(name: str, test_default: str | None = None) -> str:
    """Return the env var value, or raise RuntimeError if it is missing.

    In test runs a *test_default* may be supplied so tests don't need a real
    .env file.  In all other environments the variable must be explicitly set.
    """
    value = os.getenv(name, '')
    if value:
        return value
    if _TESTING and test_default is not None:
        return test_default
    raise RuntimeError(
        f"Required environment variable '{name}' is not set. "
        f"Add it to your .env file or deployment environment."
    )


def validate_environment() -> dict:
    """
    Validate all required environment variables at startup.
    Raises RuntimeError with detailed message if any required variables are missing.
    """
    missing_vars = []
    
    # Check required variables
    required_vars = ['MONGO_URI', 'SECRET_KEY', 'POSTGRES_URL']
    
    for var_name in required_vars:
        try:
            _require(var_name)
        except RuntimeError:
            missing_vars.append(var_name)
    
    if missing_vars:
        error_msgs = []
        if 'POSTGRES_URL' in missing_vars:
            error_msgs.append("POSTGRES_URL is missing or invalid. Expected format: postgresql+asyncpg://user:password@host:5432/db")
        if 'MONGO_URI' in missing_vars:
            error_msgs.append("MONGO_URI is missing or invalid. Expected format: mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority")
        if 'SECRET_KEY' in missing_vars:
            error_msgs.append("SECRET_KEY is missing. Please generate a strong random key.")
            
        other_vars = [v for v in missing_vars if v not in ['POSTGRES_URL', 'MONGO_URI', 'SECRET_KEY']]
        if other_vars:
            error_msgs.append(f"Missing required environment variables: {', '.join(other_vars)}")
            
        raise RuntimeError(" | ".join(error_msgs))
    
    # Validate SECRET_KEY strength (minimum 32 characters)
    secret_key = os.getenv('SECRET_KEY', '')
    if not _TESTING:
        # Check for placeholder values
        if 'your-secret-key' in secret_key.lower() or 'replace-this' in secret_key.lower() or '<' in secret_key:
            raise RuntimeError(
                "SECRET_KEY contains placeholder text. "
                "Please generate a strong random key. "
                "Generate a strong key using: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if len(secret_key) < 32:
            raise RuntimeError(
                "SECRET_KEY must be at least 32 characters long for security. "
                "Generate a strong key using: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
    
    # Validate SECRET_KEY entropy (check for common weak patterns)
    if not _TESTING and secret_key:
        # Check for repeated characters (e.g., "aaaaaaaaaa...")
        if len(set(secret_key)) < 10:
            raise RuntimeError(
                "SECRET_KEY has insufficient entropy (too many repeated characters). "
                "Generate a strong key using: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        # Check for sequential patterns
        if any(secret_key.count(char * 5) > 0 for char in 'abcdefghijklmnopqrstuvwxyz0123456789'):
            raise RuntimeError(
                "SECRET_KEY contains sequential patterns. "
                "Generate a strong key using: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
    
    # Validate database connection string formats
    postgres_url = os.getenv('POSTGRES_URL', '')
    if postgres_url:
        # Check for placeholder values
        if '<' in postgres_url or '>' in postgres_url:
            raise RuntimeError(
                "POSTGRES_URL contains placeholder values (e.g., <username>, <password>). "
                "Please replace all placeholders with actual values. "
                "Expected format: postgresql+asyncpg://user:password@host:5432/database"
            )
        # Always validate format, even in test mode (but allow test defaults)
        # Support both standard postgresql:// and driver-specific formats like postgresql+asyncpg://
        if not postgres_url.startswith(('postgresql://', 'postgres://', 'postgresql+', 'postgres+')):
            raise RuntimeError(
                "POSTGRES_URL is missing or invalid. Expected format: postgresql+asyncpg://... "
                f"Current value starts with: '{postgres_url[:20]}...'. "
            )
        # Basic structure validation - ensure there's a :// separator
        if '://' not in postgres_url:
            raise RuntimeError(
                "POSTGRES_URL has invalid format. "
                "Expected format: postgresql://user:password@host:port/database"
            )
        # Ensure there's content after the protocol
        protocol_end = postgres_url.index('://') + 3
        if len(postgres_url) <= protocol_end + 5:
            raise RuntimeError(
                "POSTGRES_URL has invalid format. "
                "Expected format: postgresql://user:password@host:port/database"
            )
    
    mongo_uri = os.getenv('MONGO_URI', '')
    if mongo_uri:
        # Check for placeholder values
        if '<' in mongo_uri or '>' in mongo_uri:
            raise RuntimeError(
                "MONGO_URI contains placeholder values (e.g., <username>, <password>, <cluster>). "
                "Please replace all placeholders with actual values. "
                "Expected format: mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority"
            )
        # Always validate format, even in test mode (but allow test defaults)
        if not mongo_uri.startswith(('mongodb://', 'mongodb+srv://')):
            raise RuntimeError(
                "MONGO_URI is missing or invalid. Expected format: mongodb+srv://... "
                f"Current value starts with: '{mongo_uri[:20]}...'. "
            )
        # Basic structure validation
        if mongo_uri.count('://') != 1 or len(mongo_uri.split('://')[1]) < 5:
            raise RuntimeError(
                "MONGO_URI has invalid format. "
                "Expected format: mongodb://user:password@host:port/database"
            )
    
    # Validate CORS_ORIGINS format and syntax
    cors_origins_str = os.getenv('CORS_ORIGINS', '')
    if cors_origins_str:
        origins = [o.strip() for o in cors_origins_str.split(',') if o.strip()]
        for origin in origins:
            # Check for valid URL format
            if not origin.startswith(('http://', 'https://')):
                raise RuntimeError(
                    f"Invalid CORS origin '{origin}': must start with 'http://' or 'https://'. "
                    "Example: http://localhost:3000,https://example.com"
                )
            # Check for malformed regex patterns (common mistake)
            if any(char in origin for char in ['[', ']', '(', ')', '*', '?', '+', '{', '}', '^', '$']) and not origin.startswith('http'):
                raise RuntimeError(
                    f"Invalid CORS origin '{origin}': contains regex characters. "
                    "CORS_ORIGINS should be comma-separated URLs, not regex patterns. "
                    "Example: http://localhost:3000,https://example.com"
                )
    
    # Environment-specific validation rules
    environment = os.getenv('ENV', os.getenv('ENVIRONMENT', 'development')).lower()
    
    pg_host = postgres_url.split('@')[-1].split('/')[0] if '@' in postgres_url else 'unknown'
    pg_type = 'Supabase' if 'supabase' in pg_host.lower() else ('Local' if 'localhost' in pg_host.lower() or '127.0.0.1' in pg_host else 'Cloud/Other')

    mongo_host = mongo_uri.split('@')[-1].split('/')[0] if '@' in mongo_uri else 'unknown'
    mongo_type = 'Atlas' if 'mongodb.net' in mongo_host.lower() else ('Local' if 'localhost' in mongo_host.lower() or '127.0.0.1' in mongo_host else 'Cloud/Other')

    if environment == 'production':
        # Production-specific validations
        if pg_type != 'Supabase':
            raise RuntimeError(
                "In production mode, POSTGRES_URL MUST use Supabase. "
                "Local or other databases are not permitted."
            )
        if mongo_type != 'Atlas':
            raise RuntimeError(
                "In production mode, MONGO_URI MUST use MongoDB Atlas. "
                "Local or other databases are not permitted."
            )
        # Ensure CORS is properly configured for production
        if not cors_origins_str or 'localhost' in cors_origins_str:
            raise RuntimeError(
                "Production environment must configure CORS_ORIGINS with production domains. "
                "Do not use localhost in production CORS configuration."
            )

    return {
        "ENV": environment,
        "POSTGRES": {"host": pg_host, "type": pg_type},
        "MONGO": {"host": mongo_host, "type": mongo_type}
    }


# ── Required — application will not start without these ──────────────────────
MONGO_URI: str = _require('MONGO_URI')
SECRET_KEY: str = _require('SECRET_KEY', test_default='test-secret-key-not-for-production')
POSTGRES_URL: str = _require('POSTGRES_URL')

# ── Optional with safe defaults ───────────────────────────────────────────────
MONGO_DB: str = os.getenv('DB_NAME') or os.getenv('MONGO_DB') or 'caretrace_ai'
ALGORITHM: str = os.getenv('ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '10080'))
APP_NAME: str = os.getenv('APP_NAME', 'CareTrace AI Backend')
APP_VERSION: str = os.getenv('APP_VERSION', '1.0.0')
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
    if o.strip()
]
