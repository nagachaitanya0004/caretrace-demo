from app.database.connection import get_database
from app.utils.helpers import serialize_mongo_doc, to_object_id
from datetime import datetime
from fastapi import HTTPException

async def create_alert_service(user_id: str, message: str) -> dict:
    db = get_database()
    doc = {
        "user_id": user_id,
        "message": message,
        "is_read": False,
        "timestamp": datetime.utcnow()
    }
    result = await db["alerts"].insert_one(doc)
    alert_doc = await db["alerts"].find_one({"_id": result.inserted_id})
    return serialize_mongo_doc(alert_doc)

async def get_alerts_by_user_service(user_id: str) -> list[dict]:
    db = get_database()
    cursor = db["alerts"].find({"user_id": user_id}).sort("timestamp", -1)
    alerts = await cursor.to_list(length=100)
    return [serialize_mongo_doc(a) for a in alerts]
