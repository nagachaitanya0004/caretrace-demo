from datetime import datetime, timedelta
from typing import Any, Optional, Union

import bcrypt
import jwt

from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
    *,
    email: Optional[str] = None,
) -> str:
    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode: dict = {'exp': expire, 'sub': str(subject)}
    if email:
        to_encode['email'] = email
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
