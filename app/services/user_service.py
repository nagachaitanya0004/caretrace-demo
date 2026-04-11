from app.database.connection import get_database
from app.schemas.user_schema import UserCreate
from app.utils.helpers import serialize_mongo_doc, to_object_id
from app.core.security import get_password_hash
from fastapi import HTTPException
from datetime import datetime

async def create_user_service(user_in: UserCreate) -> dict:
    db = get_database()
    
    existing = await db["users"].find_one({"email": user_in.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_dict = user_in.dict(exclude={"password"})
    user_dict["hashed_password"] = get_password_hash(user_in.password)
    user_dict["is_active"] = True
    user_dict["created_at"] = datetime.utcnow().isoformat()
    
    result = await db["users"].insert_one(user_dict)
    user_doc = await db["users"].find_one({"_id": result.inserted_id})
    return serialize_mongo_doc(user_doc)

async def get_all_users_service() -> list[dict]:
    db = get_database()
    users_cursor = db["users"].find()
    users = await users_cursor.to_list(length=100)
    return [serialize_mongo_doc(u) for u in users]

async def get_user_by_id_service(user_id: str) -> dict:
    db = get_database()
    try:
        obj_id = to_object_id(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user_doc = await db["users"].find_one({"_id": obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    return serialize_mongo_doc(user_doc)

async def update_user_service(user_id: str, user_in: UserCreate) -> dict:
    db = get_database()
    try:
        obj_id = to_object_id(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    result = await db["users"].update_one(
        {"_id": obj_id},
        {"$set": user_in.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    updated_doc = await db["users"].find_one({"_id": obj_id})
    return serialize_mongo_doc(updated_doc)

async def delete_user_service(user_id: str):
    db = get_database()
    try:
        obj_id = to_object_id(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    result = await db["users"].delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also clean up symptoms explicitly connecting payload
    await db["symptoms"].delete_many({"user_id": user_id})
