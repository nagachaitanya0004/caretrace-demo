from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from bson import ObjectId
from app.db.db import get_database
from app.core.responses import serialize_document

class HealthService:
    """
    PRIMARY DATA SERVICE: Manages clinical health data (symptoms, metrics) in MongoDB.
    """
    @staticmethod
    async def create_symptom(user_ref: str, data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_database()
        data.update({
            "user_id": user_ref,
            "created_at": datetime.utcnow(),
            "recorded_at": datetime.utcnow()
        })
        result = await db.symptoms.insert_one(data)
        doc = await db.symptoms.find_one({"_id": result.inserted_id})
        return serialize_document(doc)

    @staticmethod
    async def create_health_metrics(user_ref: str, payload: Any) -> Dict[str, Any]:
        db = get_database()
        doc = payload.model_dump(exclude_none=True)
        if 'blood_sugar_mg_dl' in doc and doc['blood_sugar_mg_dl'] is not None:
            doc['blood_sugar_mg_dl'] = float(doc['blood_sugar_mg_dl'])
        now = datetime.utcnow()
        doc.update({'user_id': user_ref, 'recorded_at': now, 'created_at': now})
        result = await db.health_metrics.insert_one(doc)
        saved = await db.health_metrics.find_one({'_id': result.inserted_id})
        return serialize_document(saved)

    @staticmethod
    async def get_paginated_history(
        collection: str, 
        user_ref: str, 
        cursor: Optional[str] = None, 
        limit: int = 20
    ) -> Tuple[List[Dict[str, Any]], Optional[str], bool]:
        db = get_database()
        query = {"user_id": user_ref}
        if cursor:
            query["_id"] = {"$lt": ObjectId(cursor)}
            
        cursor_obj = db[collection].find(query).sort("_id", -1).limit(limit + 1)
        items = [serialize_document(item) async for item in cursor_obj]
        
        has_more = len(items) > limit
        next_cursor = None
        if has_more:
            items = items[:limit]
            next_cursor = str(items[-1]["id"])
            
        return items, next_cursor, has_more
