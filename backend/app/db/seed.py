from datetime import datetime, timedelta
import asyncio
from typing import Any

from backend.app.db.db import get_database
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    build_user_document,
    build_symptom_document,
    build_analysis_document,
    build_alert_document,
    build_report_document
)

async def ensure_demo_account() -> None:
    db = get_database()
    email = "rahul@demo.com"
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        return  # Demo account already exists

    # Create root user
    user_doc = build_user_document(
        name="Rahul Sharma",
        email=email,
        hashed_password=get_password_hash("demo1234"),
        age=34,
        gender="male",
        lifestyle="sedentary"
    )
    result = await db.users.insert_one(user_doc)
    user_id = result.inserted_id

    now = datetime.utcnow()

    # Create dummy symptoms
    symptoms = [
        build_symptom_document(user_id, "Frequent head tension", 3, 5, now - timedelta(days=5), notes="Mostly in the afternoon"),
        build_symptom_document(user_id, "Blurry vision", 1, 4, now - timedelta(days=2), notes="Occurred after staring at screen"),
        build_symptom_document(user_id, "Fatigue", 5, 6, now - timedelta(days=1), notes="Waking up tired"),
    ]
    await db.symptoms.insert_many(symptoms)

    # Create analysis
    analysis_doc = build_analysis_document(
        user_id,
        "medium",
        "Recent pattern of headaches and blurry vision paired with fatigue could indicate digital eye strain or migraines.",
        "Consider an eye exam or screen-time reduction.",
        {"symptom_count": 3}
    )
    await db.analysis.insert_one(analysis_doc)

    # Create alert
    alert_doc = build_alert_document(
        user_id,
        "Consistent elevated fatigue reported over 5 days. Monitor sleep patterns.",
        "warning",
        False
    )
    await db.alerts.insert_one(alert_doc)
    
    # Create report
    report_doc = build_report_document(
        user_id,
        "Patient shows persistent fatigue and mild ocular symptoms. Lifestyle is marked as sedentary, indicating possible ergonomic strain.",
    )
    await db.reports.insert_one(report_doc)
