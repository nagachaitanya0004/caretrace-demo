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

    if await db.users.find_one({"email": email}):
        return  # Demo account already exists

    session_maker = get_session_maker()
    if session_maker is None:
        logger.error("Seed skipped — PostgreSQL not initialized")
        return

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
                is_onboarded=False,
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
        "is_onboarded": False,
        "meta": {},
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

    user_id = result.inserted_id

    # ── Step 3: Seed related demo data ──────────────────────────────
    now_delta = now
    symptoms = [
        build_symptom_document(user_id, "Frequent head tension", 3, 5, now_delta - timedelta(days=5), notes="Mostly in the afternoon"),
        build_symptom_document(user_id, "Blurry vision", 1, 4, now_delta - timedelta(days=2), notes="Occurred after staring at screen"),
        build_symptom_document(user_id, "Fatigue", 5, 6, now_delta - timedelta(days=1), notes="Waking up tired"),
    ]
    await db.symptoms.insert_many(symptoms)

    await db.analysis.insert_one(build_analysis_document(
        user_id,
        "medium",
        "Recent pattern of headaches and blurry vision paired with fatigue could indicate digital eye strain or migraines.",
        "Consider an eye exam or screen-time reduction.",
        {"symptom_count": 3},
    ))

    await db.alerts.insert_one(build_alert_document(
        user_id,
        "Consistent elevated fatigue reported over 5 days. Monitor sleep patterns.",
        "warning",
        False,
    ))

    await db.reports.insert_one(build_report_document(
        user_id,
        "Patient shows persistent fatigue and mild ocular symptoms. Lifestyle is marked as sedentary, indicating possible ergonomic strain.",
    ))

    logger.info("Seed: Demo account fully initialised (pg_id=%s)", pg_user_id)
