from bson import ObjectId

def serialize_mongo_doc(doc: dict) -> dict:
    """Safely converts MongoDB _id to string id"""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

def to_object_id(id_str: str) -> ObjectId:
    """Converts string back to ObjectId securely"""
    try:
        return ObjectId(id_str)
    except Exception:
        raise ValueError("Invalid ID format")
