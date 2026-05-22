from datetime import datetime, timedelta
from app.db.db import get_database
from app.core.logger import logger
from app.models.models import (
    build_symptom_document,
    build_analysis_document,
    build_alert_document,
    build_report_document,
)

# Fixed demo account identifiers — must match the DB dump
DEMO_USER_UUID = "5668c898-bef9-46ad-9812-282e1ebf226d"
DEMO_HASHED_PASSWORD = "$2b$12$sqBAkKMqn9VdEhfgG6Rz6e4Cve.Jnq4AXbiPdXG.9Ncj6Y4uLxjoi"

async def ensure_demo_account() -> None:
    """
    Ensure the demo account exists in MongoDB.
    If the demo user already exists with the correct user_id, skip re-seeding
    to preserve existing data. Only seeds from scratch if the user is missing.
    """
    db = get_database()
    email = "rahul@demo.com"

    # ── Check if demo user already exists with correct user_id ──────
    existing = await db.users.find_one({"email": email, "user_id": DEMO_USER_UUID})
    if existing:
        if existing.get("hashed_password") != DEMO_HASHED_PASSWORD:
            logger.info("Seed: Demo account exists but password hash is outdated/incorrect — updating")
            await db.users.update_one({"_id": existing["_id"]}, {"$set": {"hashed_password": DEMO_HASHED_PASSWORD}})
        logger.info("Seed: Demo account already exists (user_id=%s) — skipping re-seed", DEMO_USER_UUID)
        return

    # ── Clean up any stale demo accounts with wrong user_id ─────────
    stale_users = await db.users.find({"email": email}).to_list(length=10)
    stale_oids = [u["_id"] for u in stale_users]
    stale_uuids = [u.get("user_id") for u in stale_users if u.get("user_id")]
    refs = stale_uuids + [str(oid) for oid in stale_oids] + [DEMO_USER_UUID]

    if stale_oids:
        logger.info("Seed: Removing %d stale demo account(s)", len(stale_oids))
        await db.users.delete_many({"_id": {"$in": stale_oids}})
        
    for coll in [db.symptoms, db.analysis, db.alerts, db.reports, db.lab_results, db.medications, db.health_metrics, db.medical_history, db.lifestyle_data, db.family_history]:
        await coll.delete_many({"user_id": {"$in": refs}})

    user_uuid = DEMO_USER_UUID
    hashed_pw = DEMO_HASHED_PASSWORD
    now = datetime.utcnow()

    # ── Step 1: Insert into MongoDB ─────────────────────────────────
    mongo_doc = {
        "user_id": user_uuid,
        "name": "Rahul",
        "email": email,
        "hashed_password": hashed_pw,
        "age": 33,
        "gender": "male",
        "lifestyle": "sedentary",
        "height_cm": 175.0,
        "weight_kg": 72.0,
        "blood_group": "O+",
        "bmi": 23.51,
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
            "name": "Vitamin D3",
            "dose": "2000 IU",
            "schedule": "Daily",
            "created_at": now_delta - timedelta(days=15),
        },
        {
            "user_id": user_ref,
            "name": "Ibuprofen",
            "dose": "400 mg",
            "schedule": "As needed for head tension",
            "created_at": now_delta - timedelta(days=5),
        },
        {
            "user_id": user_ref,
            "name": "Artificial Tears",
            "dose": "1 drop per eye",
            "schedule": "Twice daily",
            "created_at": now_delta - timedelta(days=2),
        }
    ]
    await db.medications.insert_many(meds)

    # 7. Health Metrics
    health_metrics = []
    for day in range(14, -1, -1):
        date_mark = now - timedelta(days=day)
        health_metrics.append({
            "user_id": user_ref,
            "systolic_bp": 118 + (day % 5),
            "diastolic_bp": 76 + (day % 4),
            "heart_rate_bpm": 72 + (day % 6),
            "blood_sugar_mg_dl": 95.0 + (day % 8),
            "oxygen_saturation": 98 - (day % 2),
            "recorded_at": date_mark,
            "created_at": date_mark,
        })
    await db.health_metrics.insert_many(health_metrics)

    # 8. Medical History
    await db.medical_history.insert_one({
        "user_id": user_ref,
        "conditions": ["Mild hypertension", "Vitamin D deficiency"],
        "medications": ["Vitamin D3 2000 IU"],
        "allergies": ["Dust"],
        "surgeries": [],
        "created_at": now,
        "updated_at": now,
    })

    # 9. Lifestyle Data
    await db.lifestyle_data.insert_one({
        "user_id": user_ref,
        "sleep_hours": 6.5,
        "sleep_quality": "average",
        "diet_type": "mixed",
        "exercise_frequency": "weekly",
        "water_intake_liters": 1.8,
        "smoking": False,
        "alcohol": False,
        "stress_level": 6,
        "created_at": now,
        "updated_at": now,
    })

    logger.info("Seed: Demo account fully initialised (user_id=%s)", user_ref)
