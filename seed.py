from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import bcrypt
import os
from pathlib import Path
from dotenv import load_dotenv

# Same root resolution as app.core.config so seed hits the API database
_ROOT = Path(__file__).resolve().parent
load_dotenv(_ROOT / ".env")

def seed_db():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
    db_name = os.getenv("DB_NAME", "caretrace_ai")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    # 0. Drop schema validation across all collections
    cols = ["users", "symptoms", "analysis", "alerts", "reports"]
    for col in cols:
        try:
            db.command("collMod", col, validator={}, validationLevel="off")
        except Exception:
            pass

    # 1. Clean existing records for a fresh demo state
    for col in cols:
        db[col].delete_many({})

    print("Cleaning collections and dropping constraints... Done.")

    # 2. Add Rahul Sharma User Profile
    hashed_password = bcrypt.hashpw(b"demo1234", bcrypt.gensalt()).decode("utf-8")
    
    # Needs to be exactly 24 hex characters for ObjectId conversion via APIs
    user_id = "60d5ecb8b392d7001f3e3a41"
    now = datetime.utcnow()
    
    user_doc = {
        "_id": ObjectId(user_id),
        "name": "Rahul Sharma",
        "email": "rahul@demo.com",
        "hashed_password": hashed_password,
        "age": 45,
        "gender": "Male",
        "lifestyle": "Smoker",
        "is_active": True,
        "created_at": now - timedelta(days=20)
    }
    db["users"].insert_one(user_doc)
    print("Injected user profile (rahul@demo.com:demo1234)")

    # 3. Inject Historical Symptoms Data
    symptoms_data = [
        # Day 1
        {"_id": ObjectId("60d5ecb8b392d7001f3e3a42"), "user_id": user_id, "symptom": "cough", "severity": 4, "duration": 4, "timestamp": now - timedelta(days=15)},
        # Day 3
        {"_id": ObjectId("60d5ecb8b392d7001f3e3a43"), "user_id": user_id, "symptom": "fever", "severity": 5, "duration": 2, "timestamp": now - timedelta(days=13)},
        # Day 6
        {"_id": ObjectId("60d5ecb8b392d7001f3e3a44"), "user_id": user_id, "symptom": "fatigue", "severity": 6, "duration": 3, "timestamp": now - timedelta(days=10)},
        # Day 10
        {"_id": ObjectId("60d5ecb8b392d7001f3e3a45"), "user_id": user_id, "symptom": "cough", "severity": 7, "duration": 10, "timestamp": now - timedelta(days=6)},
        # Day 15
        {"_id": ObjectId("60d5ecb8b392d7001f3e3a46"), "user_id": user_id, "symptom": "chest pain", "severity": 6, "duration": 3, "timestamp": now - timedelta(days=1)}
    ]
    db["symptoms"].insert_many(symptoms_data)
    print("Injected 5 symptom timeline logs")

    # 4. Inject Analysis Report (risk_level matches frontend: Low / Medium / High)
    analysis_data = {
        "_id": ObjectId("60d5ecb8b392d7001f3e3a47"),
        "user_id": user_id,
        "risk_level": "High",
        "reason": "Persistent cough for more than 14 days along with multiple symptoms. The repeated severity escalation and appearance of chest pain coupled with a smoker lifestyle places you in a high-risk trajectory.",
        "recommendation": "Consult a doctor immediately. Recommended clinical screening required regarding persistent pulmonary stress variants.",
        "timestamp": now
    }
    db["analysis"].insert_one(analysis_data)
    print("Injected analysis insight")

    # 5. Inject Intelligent Alerts
    alerts_data = [
        {"_id": ObjectId("60d5ecb8b392d7001f3e3a48"), "user_id": user_id, "message": "Symptoms have persisted for a long time. Screening is recommended.", "timestamp": now - timedelta(hours=24), "is_read": False},
        {"_id": ObjectId("60d5ecb8b392d7001f3e3a49"), "user_id": user_id, "message": "Multiple secondary symptoms detected. Further clinical evaluation needed immediately.", "timestamp": now - timedelta(hours=2), "is_read": False}
    ]
    db["alerts"].insert_many(alerts_data)
    print("Injected system alerts")

    print(f"\nSeed Complete! You can login with:\nEmail: rahul@demo.com\nPassword: demo1234")

if __name__ == "__main__":
    seed_db()
