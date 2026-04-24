"""
Unit tests for the medication tracking API routes.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.auth import get_current_user
from app.db.db import get_database


def _make_user(user_id: str | None = None) -> dict:
    oid = ObjectId(user_id) if user_id else ObjectId()
    return {"_id": oid, "name": "Test User", "email": "test@example.com"}


def _make_mock_db(records: list[dict] | None = None) -> MagicMock:
    if records is None:
        records = []

    db = MagicMock()
    insert_result = MagicMock()
    insert_result.inserted_id = ObjectId()
    db.medication_tracking.insert_one = AsyncMock(return_value=insert_result)
    db.medication_tracking.find_one = AsyncMock(return_value=records[0] if records else None)

    async def _aiter(self):
        for r in records:
            yield r

    cursor = MagicMock()
    cursor.__aiter__ = _aiter
    db.medication_tracking.find.return_value.sort.return_value = cursor

    return db


def test_create_medication_minimal():
    """Test creating a medication with only required field."""
    user = _make_user()
    saved_doc = {
        "_id": ObjectId(),
        "user_id": user["_id"],
        "medication_name": "Aspirin",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    mock_db = _make_mock_db()
    mock_db.medication_tracking.find_one = AsyncMock(return_value=saved_doc)
    mock_db.medication_tracking.insert_one.return_value.inserted_id = saved_doc["_id"]

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.post(
            "/api/medications",
            json={"medication_name": "Aspirin"},
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["medication_name"] == "Aspirin"


def test_create_medication_complete():
    """Test creating a medication with all fields."""
    user = _make_user()
    saved_doc = {
        "_id": ObjectId(),
        "user_id": user["_id"],
        "medication_name": "Metformin",
        "dosage": "500mg",
        "frequency": "Twice daily",
        "start_date": datetime.now(timezone.utc),
        "adherence_rate": 0.95,
        "side_effects": ["Nausea", "Dizziness"],
        "effectiveness_rating": 4,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    mock_db = _make_mock_db()
    mock_db.medication_tracking.find_one = AsyncMock(return_value=saved_doc)
    mock_db.medication_tracking.insert_one.return_value.inserted_id = saved_doc["_id"]

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.post(
            "/api/medications",
            json={
                "medication_name": "Metformin",
                "dosage": "500mg",
                "frequency": "Twice daily",
                "adherence_rate": 0.95,
                "side_effects": ["Nausea", "Dizziness"],
                "effectiveness_rating": 4,
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["medication_name"] == "Metformin"
    assert data["adherence_rate"] == 0.95
    assert data["effectiveness_rating"] == 4


def test_list_medications():
    """Test retrieving medications."""
    user = _make_user()
    records = [
        {
            "_id": ObjectId(),
            "user_id": user["_id"],
            "medication_name": "Lisinopril",
            "dosage": "10mg",
            "frequency": "Once daily",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    ]

    mock_db = _make_mock_db(records=records)

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.get("/api/medications")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert isinstance(data, list)
    assert len(data) == 1


def test_create_medication_invalid_adherence():
    """Test validation for adherence_rate out of range."""
    user = _make_user()

    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app)
    response = client.post(
        "/api/medications",
        json={
            "medication_name": "Test Med",
            "adherence_rate": 1.5,  # Invalid: > 1
        },
    )

    app.dependency_overrides.clear()
    

    assert response.status_code == 422  # Validation error


def test_create_medication_invalid_effectiveness():
    """Test validation for effectiveness_rating out of range."""
    user = _make_user()

    app.dependency_overrides[get_current_user] = lambda: user
    client = TestClient(app)
    response = client.post(
        "/api/medications",
        json={
            "medication_name": "Test Med",
            "effectiveness_rating": 6,  # Invalid: > 5
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 422  # Validation error
