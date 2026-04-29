from datetime import datetime, timedelta
import uuid

from sqlalchemy import select

from app.db.db import get_database
from app.db.postgres import get_session_maker
from app.models.postgres_user import PostgresUser
from app.core.security import get_password_hash
from app.core.logger import logger
from app.models.models import (
    build_symptom_document,
    build_analysis_document,
    build_alert_document,
    build_report_document,
)


async def ensure_demo_account() -> None:
    db = get_database()
    email = "rahul@demo.com"

    session_maker = get_session_maker()
    if session_maker is None:
        logger.error("Seed skipped — PostgreSQL not initialized")
        return

    # ── Step 0: Reset existing demo account ─────────────────────────
    # Ensure demo account is safely wiped and fresh on every server restart
    existing_mongo = await db.users.find_one({"email": email})
    if existing_mongo:
        mongo_user_id = existing_mongo["_id"]
        pg_user_id_ref = existing_mongo.get("user_id")
        
        await db.users.delete_one({"_id": mongo_user_id})
        
        refs = [mongo_user_id]
        if pg_user_id_ref:
            refs.append(pg_user_id_ref)
            
        for coll in [db.symptoms, db.analysis, db.alerts, db.reports, db.lab_results, db.medication_tracking]:
            await coll.delete_many({"user_id": {"$in": refs}})
            
    pg_session = session_maker()
    try:
        pg_user_to_delete = (
            await pg_session.execute(select(PostgresUser).where(PostgresUser.email == email))
        ).scalars().first()
        if pg_user_to_delete:
            await pg_session.delete(pg_user_to_delete)
            await pg_session.commit()
    except Exception:
        await pg_session.rollback()
    finally:
        await pg_session.close()

    pg_user_id = str(uuid.uuid4())
    hashed_pw = get_password_hash("demo1234")
    now = datetime.utcnow()

    # ── Step 1: Insert into PostgreSQL ──────────────────────────────
    pg_session = session_maker()
    try:
        existing = (
            await pg_session.execute(select(PostgresUser).where(PostgresUser.email == email))
        ).scalars().first()

        if not existing:
            pg_user = PostgresUser(
                id=pg_user_id,
                email=email,
                hashed_password=hashed_pw,
                name="Rahul Sharma",
                age=34,
                gender="male",
                height_cm=175,
                weight_kg=72,
                blood_group="O+",
                bmi=23.5,
                is_onboarded=True,
            )
            pg_session.add(pg_user)
            await pg_session.flush()

        await pg_session.commit()
        logger.info("Seed: PostgreSQL demo user created (id=%s)", pg_user_id)
    except Exception as exc:
        await pg_session.rollback()
        await pg_session.close()
        logger.error("Seed: PostgreSQL insert failed — %r", exc)
        return
    finally:
        await pg_session.close()

    # ── Step 2: Insert into MongoDB ─────────────────────────────────
    mongo_doc = {
        "user_id": pg_user_id,
        "name": "Rahul Sharma",
        "email": email,
        "hashed_password": hashed_pw,
        "age": 34,
        "gender": "male",
        "lifestyle": "sedentary",
        "height_cm": 175,
        "weight_kg": 72,
        "blood_group": "O+",
        "bmi": 23.5,
        "is_onboarded": True,
        "meta": {},
        "is_demo": True,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await db.users.insert_one(mongo_doc)
        logger.info("Seed: MongoDB demo user created (_id=%s)", result.inserted_id)
    except Exception as exc:
        logger.error("Seed: MongoDB insert failed — compensating PostgreSQL delete: %r", exc)
        pg_session = session_maker()
        try:
            pg_user_to_delete = (
                await pg_session.execute(select(PostgresUser).where(PostgresUser.id == pg_user_id))
            ).scalars().first()
            if pg_user_to_delete:
                await pg_session.delete(pg_user_to_delete)
                await pg_session.commit()
        except Exception as cleanup_exc:
            logger.warning("Seed: PostgreSQL compensation failed — %r", cleanup_exc)
            await pg_session.rollback()
        finally:
            await pg_session.close()
        return

    # Dual-DB applications track related records using the pg_user_id
    user_ref = pg_user_id

    # ── Step 3: Seed related demo data ──────────────────────────────
    now_delta = now
    
    # 1. Symptoms Timeline (15 days of progressive data)
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

    # 2. AI Analysis (Evolving risk over time)
    analyses = [
        build_analysis_document(user_ref, "low", "Baseline health is stable with minor fatigue.", "Maintain current sleep habits.", {"symptom_count": 5}),
        build_analysis_document(user_ref, "medium", "Increasing pattern of fatigue paired with mild ocular strain.", "Consider reducing screen time and taking frequent breaks.", {"symptom_count": 12}),
        build_analysis_document(user_ref, "high", "Significant cluster of head tension, blurry vision, and severe fatigue.", "Highly recommend an ergonomic assessment and optometrist visit.", {"symptom_count": 19}),
    ]
    analyses[0]["created_at"] = now_delta - timedelta(days=14)
    analyses[1]["created_at"] = now_delta - timedelta(days=7)
    analyses[2]["created_at"] = now_delta - timedelta(days=1)
    await db.analysis.insert_many(analyses)

    # 3. Alerts System (Critical, warning, resolved)
    alerts = [
        build_alert_document(user_ref, "Hydration levels appear adequate. Baseline established.", "info", True),
        build_alert_document(user_ref, "Consistent elevated fatigue reported over 5 days. Monitor sleep patterns closely.", "warning", False),
        build_alert_document(user_ref, "Symptom cluster detected: Head tension and blurry vision. Action recommended.", "critical", False),
    ]
    alerts[0]["created_at"] = now_delta - timedelta(days=12)
    alerts[1]["created_at"] = now_delta - timedelta(days=5)
    alerts[2]["created_at"] = now_delta - timedelta(days=2)
    await db.alerts.insert_many(alerts)

    # 4. Reports (Structured milestones)
    reports = [
        build_report_document(user_ref, "Initial Onboarding Baseline: Patient reports sedentary lifestyle. Vitals within normal limits. Occasional fatigue noted."),
        build_report_document(user_ref, "Mid-Month Review: Emergence of digital eye strain indicators. Patient advised on 20-20-20 rule for screen time."),
        build_report_document(user_ref, "Urgent Assessment: Correlation found between consecutive days of high stress/fatigue and severe afternoon head tension."),
    ]
    reports[0]["created_at"] = now_delta - timedelta(days=14)
    reports[1]["created_at"] = now_delta - timedelta(days=7)
    reports[2]["created_at"] = now_delta - timedelta(days=1)
    await db.reports.insert_many(reports)

    # 5. Lab Results (Time-series variation)
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

    # 6. Medications (Active and historical)
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

    logger.info("Seed: Demo account fully initialised (pg_id=%s)", pg_user_id)
