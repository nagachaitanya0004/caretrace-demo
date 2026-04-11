from app.database.connection import get_database
from app.utils.helpers import serialize_mongo_doc, to_object_id
from app.schemas.report_schema import ReportSummary
from fastapi import HTTPException

async def get_user_report_service(user_id: str) -> dict:
    db = get_database()
    
    try:
        user_obj_id = to_object_id(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    user_doc = await db["users"].find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Fetch symptoms subset
    symptoms_cursor = db["symptoms"].find({"user_id": user_id}).sort("timestamp", -1)
    symptoms = await symptoms_cursor.to_list(length=100)
    
    # Fetch latest analysis
    analysis_cursor = db["analysis"].find({"user_id": user_id}).sort("timestamp", -1).limit(1)
    analysis_logs = await analysis_cursor.to_list(length=1)
    risk_level = analysis_logs[0].get("risk_level", "Unknown") if analysis_logs else "Pending Analysis"
    
    report = {
        "user": serialize_mongo_doc(user_doc),
        "latest_risk_level": risk_level,
        "total_symptoms_logged": len(symptoms),
        "symptoms": [serialize_mongo_doc(s) for s in symptoms]
    }
    
    return report
