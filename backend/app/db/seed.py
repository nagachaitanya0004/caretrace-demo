from datetime import datetime, timedelta
import uuid

from app.db.db import get_database
from app.core.security import get_password_hash
from app.core.logger import logger
from app.models.models import (
    build_symptom_document,
    build_analysis_document,
    build_alert_document,
    build_report_document,
)

async def ensure_demo_account() -> None:
    """
    Ensure a fresh demo account exists in MongoDB on every server restart.
    PostgreSQL is not used for core demo data.
    """
    db = get_database()
    email = "rahul@demo.com"

    # ── Step 0: Reset existing demo accounts ────────────────────────
    # Collect all IDs associated with this email to ensure full cleanup
    demo_users = await db.users.find({"email": email}).to_list(length=10)
    if demo_users:
        logger.info("Seed: Cleaning up %d existing demo account(s)", len(demo_users))
        
        user_oids = [u["_id"] for u in demo_users]
        user_uuids = [u.get("user_id") for u in demo_users if u.get("user_id")]
        
        # Primary identifiers for related data cleanup
        refs = user_uuids + [str(oid) for oid in user_oids]
        
        # Cleanup core profile
        await db.users.delete_many({"_id": {"$in": user_oids}})
        
        # Cleanup related collections
        for coll in [db.symptoms, db.analysis, db.alerts, db.reports, db.lab_results, db.medication_tracking]:
            await coll.delete_many({"user_id": {"$in": refs}})
            
        logger.info("Seed: Cleanup complete")

    user_uuid = str(uuid.uuid4())
    hashed_pw = get_password_hash("demo1234")
    now = datetime.utcnow()

    # ── Step 1: Insert into MongoDB ─────────────────────────────────
    mongo_doc = {
        "user_id": user_uuid,
        "name": "Rahul Sharma",
        "email": email,
        "hashed_password": hashed_pw,
        "age": 34,
        "gender": "male",
        "lifestyle": "sedentary",
        "height_cm": 175.0,
        "weight_kg": 72.0,
        "blood_group": "O+",
        "bmi": 23.5,
        "is_onboarded": True,
        "meta": {},
        "created_at": now,
        "updated_at": now,
    }
    
    try:
        result = await db.users.insert_one(mongo_doc)
        logger.info("Seed: MongoDB demo user created (user_id=%s)", user_uuid)
    except Exception as exc:
        logger.error("Seed: MongoDB insert failed: %r", exc)
        return

    # Use user_uuid as the reference for all related data
    user_ref = user_uuid

    # ── Step 2: Seed related demo data ──────────────────────────────
    now_delta = now
    
    # 1. Symptoms Timeline
    symptoms = []
    for day in range(15, -1, -1):
        date_mark = now_delta - timedelta(days=day)
        if day > 10:
            symptoms.append(build_symptom_document(user_ref, "Fatigue", 3, 2, date_mark, notes="Mild tiredness in the evening"))
        elif day > 5:
            symptoms.append(build_symptom_document(user_ref, "Fatigue", 5, 4, date_mark, notes="Waking up tired"))
            symptoms.append(build_symptom_document(user_ref, "Blurry vision", 2, 3, date_mark, notes="Slight screen strain"))
        elif day > 1:
            symptoms.append(build_symptom_document(user_ref, "Fatigue", 7, 5, date_mark, notes="Exhausted throughout the day"))
            symptoms.append(build_symptom_document(user_ref, "Frequent head tension", 4, 5, date_mark, notes="Afternoon headaches"))
            symptoms.append(build_symptom_document(user_ref, "Blurry vision", 5, 4, date_mark, notes="Difficulty reading screens"))
        else:
            symptoms.append(build_symptom_document(user_ref, "Fatigue", 4, 6, date_mark, notes="Feeling slightly better after rest"))
            symptoms.append(build_symptom_document(user_ref, "Frequent head tension", 2, 5, date_mark, notes="Subsided mostly"))
            
    await db.symptoms.insert_many(symptoms)

    # 2. AI Analysis
    analyses = [
        build_analysis_document(user_ref, "low", "Baseline health is stable with minor fatigue.", "Maintain current sleep habits.", {"symptom_count": 5}),
        build_analysis_document(user_ref, "medium", "Increasing pattern of fatigue paired with mild ocular strain.", "Consider reducing screen time and taking frequent breaks.", {"symptom_count": 12}),
        build_analysis_document(user_ref, "high", "Significant cluster of head tension, blurry vision, and severe fatigue.", "Highly recommend an ergonomic assessment and optometrist visit.", {"symptom_count": 19}),
    ]
    analyses[0]["created_at"] = now_delta - timedelta(days=14)
    analyses[1]["created_at"] = now_delta - timedelta(days=7)
    analyses[2]["created_at"] = now_delta - timedelta(days=1)
    await db.analysis.insert_many(analyses)

    # 3. Alerts System
    alerts = [
        build_alert_document(user_ref, "Hydration levels appear adequate. Baseline established.", "info", True),
        build_alert_document(user_ref, "Consistent elevated fatigue reported over 5 days. Monitor sleep patterns closely.", "warning", False),
        build_alert_document(user_ref, "Symptom cluster detected: Head tension and blurry vision. Action recommended.", "critical", False),
    ]
    alerts[0]["created_at"] = now_delta - timedelta(days=12)
    alerts[1]["created_at"] = now_delta - timedelta(days=5)
    alerts[2]["created_at"] = now_delta - timedelta(days=2)
    await db.alerts.insert_many(alerts)

    # 4. Reports
    reports = [
        build_report_document(user_ref, "Initial Onboarding Baseline: Patient reports sedentary lifestyle. Vitals within normal limits. Occasional fatigue noted."),
        build_report_document(user_ref, "Mid-Month Review: Emergence of digital eye strain indicators. Patient advised on 20-20-20 rule for screen time."),
        build_report_document(user_ref, "Urgent Assessment: Correlation found between consecutive days of high stress/fatigue and severe afternoon head tension."),
    ]
    reports[0]["created_at"] = now_delta - timedelta(days=14)
    reports[1]["created_at"] = now_delta - timedelta(days=7)
    reports[2]["created_at"] = now_delta - timedelta(days=1)
    await db.reports.insert_many(reports)

    # 5. Lab Results
    labs = [
        {
            "user_id": user_ref,
            "test_name": "Complete Blood Count (CBC)",
            "value": "Normal",
            "reference_range": "Standard",
            "status": "completed",
            "recorded_at": now_delta - timedelta(days=15),
            "created_at": now_delta - timedelta(days=15),
        },
        {
            "user_id": user_ref,
            "test_name": "Vitamin D, 25-Hydroxy",
            "value": "22 ng/mL",
            "reference_range": "30-100 ng/mL",
            "status": "completed",
            "recorded_at": now_delta - timedelta(days=8),
            "created_at": now_delta - timedelta(days=8),
        },
        {
            "user_id": user_ref,
            "test_name": "Comprehensive Metabolic Panel",
            "value": "Pending",
            "reference_range": "Standard",
            "status": "pending",
            "recorded_at": now_delta - timedelta(days=1),
            "created_at": now_delta - timedelta(days=1),
        }
    ]
    await db.lab_results.insert_many(labs)

    # 6. Medications
    meds = [
        {
            "user_id": user_ref,
            "medication_name": "Vitamin D3",
            "dosage": "2000 IU",
            "frequency": "Daily",
            "adherence": "High",
            "created_at": now_delta - timedelta(days=15),
        },
        {
            "user_id": user_ref,
            "medication_name": "Ibuprofen",
            "dosage": "400 mg",
            "frequency": "As needed for head tension",
            "adherence": "Medium",
            "created_at": now_delta - timedelta(days=5),
        },
        {
            "user_id": user_ref,
            "medication_name": "Artificial Tears",
            "dosage": "1 drop per eye",
            "frequency": "Twice daily",
            "adherence": "Low",
            "created_at": now_delta - timedelta(days=2),
        }
    ]
    await db.medication_tracking.insert_many(meds)

    logger.info("Seed: Demo account fully initialised (user_id=%s)", user_ref)
