"""Normalize user identity fields for API + MongoDB schema validators."""

import re
from typing import Any, Dict, Optional, Union

from bson import ObjectId

from app.core.logger import logger


def get_user_ref(current_user: Dict[str, Any]) -> Union[str, ObjectId]:
    """Return the best identifier for cross-collection user queries.

    New users (dual-DB) have a ``user_id`` field (UUID string from PostgreSQL).
    Old users (MongoDB-only) only have ``_id`` (ObjectId).

    Returns ``user_id`` when present, otherwise falls back to ``_id``.
    """
    uid = current_user.get("user_id")
    if uid:
        logger.debug("Using UUID user_id=%s for query", uid)
        return uid
    logger.debug("Falling back to ObjectId _id=%s for query", current_user["_id"])
    return current_user["_id"]


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
