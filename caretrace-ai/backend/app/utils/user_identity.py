"""Normalize user identity fields for API + MongoDB schema validators."""

import re
from typing import Any, Dict, Optional


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def normalize_gender(gender: str) -> str:
    g = (gender or "").strip().lower()
    if g in ("male", "m", "man"):
        return "male"
    if g in ("female", "f", "woman"):
        return "female"
    if g in ("other", "o", "non-binary", "nonbinary"):
        return "other"
    return "other"


async def find_user_by_email(db: Any, email: str) -> Optional[Dict[str, Any]]:
    """Match stored users whether email was saved lowercased or in mixed case."""
    norm = normalize_email(email)
    if not norm:
        return None
    user = await db.users.find_one({"email": norm})
    if user:
        return user
    return await db.users.find_one(
        {"email": {"$regex": f"^{re.escape(norm)}$", "$options": "i"}}
    )


async def email_is_registered(db: Any, email: str) -> bool:
    return await find_user_by_email(db, email) is not None
