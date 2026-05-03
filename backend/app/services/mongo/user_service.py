from datetime import datetime
from typing import Any, Dict, Optional
from bson import ObjectId
from app.db.db import get_database
from app.core.responses import serialize_document

class UserService:
    """
    PRIMARY DATA SERVICE: Manages core user identity and profiles in MongoDB.
    """
    @staticmethod
    async def get_user_by_id(user_oid: ObjectId) -> Optional[Dict[str, Any]]:
        db = get_database()
        user = await db.users.find_one({"_id": user_oid})
        return serialize_document(user) if user else None

    @staticmethod
    async def update_profile(user_oid: ObjectId, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        db = get_database()
        updates["updated_at"] = datetime.utcnow()
        await db.users.update_one({"_id": user_oid}, {"$set": updates})
        return await UserService.get_user_by_id(user_oid)

    @staticmethod
    async def complete_onboarding(user_oid: ObjectId) -> bool:
        db = get_database()
        result = await db.users.update_one(
            {"_id": user_oid}, 
            {"$set": {"is_onboarded": True, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
