from app.database.connection import get_database
from app.schemas.symptom_schema import SymptomCreate
from app.utils.helpers import serialize_mongo_doc, to_object_id
from datetime import datetime
from fastapi import HTTPException

async def create_symptom_service(symptom_in: SymptomCreate) -> dict:
    db = get_database()
    
    # Verify user exists first
    try:
        user_obj_id = to_object_id(symptom_in.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    user_doc = await db["users"].find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    doc = symptom_in.dict()
    doc["timestamp"] = datetime.utcnow()
    
    result = await db["symptoms"].insert_one(doc)
    symptom_doc = await db["symptoms"].find_one({"_id": result.inserted_id})
    return serialize_mongo_doc(symptom_doc)

async def get_symptoms_by_user_service(user_id: str) -> list[dict]:
    db = get_database()
    
    # Validate user formatting
    try:
        to_object_id(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    cursor = db["symptoms"].find({"user_id": user_id}).sort("timestamp", -1)
    symptoms = await cursor.to_list(length=200)
    
    return [serialize_mongo_doc(s) for s in symptoms]

async def delete_symptom_service(symptom_id: str):
    db = get_database()
    try:
        obj_id = to_object_id(symptom_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid symptom ID format")
        
    result = await db["symptoms"].delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Symptom not found")
