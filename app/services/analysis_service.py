from app.database.connection import get_database
from app.utils.helpers import serialize_mongo_doc, to_object_id
from app.services.alert_service import create_alert_service
from datetime import datetime
from fastapi import HTTPException
from collections import Counter

async def analyze_symptoms_service(user_id: str) -> dict:
    db = get_database()
    
    # Verify user exists
    try:
        user_obj_id = to_object_id(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    user_doc = await db["users"].find_one({"_id": user_obj_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    cursor = db["symptoms"].find({"user_id": user_id})
    symptoms = await cursor.to_list(length=300)
    
    if not symptoms:
        raise HTTPException(status_code=400, detail="No symptoms found to analyze")

    max_duration = max([s.get("duration", 0) for s in symptoms])
    
    # Check for repeated symptoms
    symptom_names = [s.get("symptom").lower().strip() for s in symptoms if s.get("symptom")]
    counts = Counter(symptom_names)
    repeated = any(count > 1 for count in counts.values())
    
    risk_level = "Low"
    reason = "Symptoms appear isolated and temporary."
    recommendation = "Monitor symptoms closely. Maintain hydration and rest."
    
    if max_duration > 14:
        risk_level = "Medium"
        reason = "Symptom duration exceeds 14 days. Monitored watch advised."
        recommendation = "Recommended screening required if symptoms do not improve within 48 hours."
    elif repeated:
        risk_level = "High"
        reason = "Repeated symptoms detected over short interval. Urgent screening required."
        recommendation = "Consult a doctor immediately to prevent further systemic degradation."
        
    # Generate automatic alert if necessary
    if risk_level in ["Medium", "High"]:
        await create_alert_service(user_id, f"Risk Alert ({risk_level}): {reason} Screening recommended.")
        
    analysis_doc = {
        "user_id": user_id,
        "risk_level": risk_level,
        "reason": reason,
        "recommendation": recommendation,
        "timestamp": datetime.utcnow()
    }
    
    result = await db["analysis"].insert_one(analysis_doc)
    saved_doc = await db["analysis"].find_one({"_id": result.inserted_id})
    
    return serialize_mongo_doc(saved_doc)

async def get_latest_analysis_service(user_id: str) -> dict:
    db = get_database()
    cursor = db["analysis"].find({"user_id": user_id}).sort("timestamp", -1).limit(1)
    results = await cursor.to_list(length=1)
    if not results:
        raise HTTPException(status_code=404, detail="No analysis found")
    return serialize_mongo_doc(results[0])
