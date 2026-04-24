"""
Unit tests for the lab results API routes.
"""
from __future__ import annotations

from datetime import datetime
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
    db.lab_results.insert_one = AsyncMock(return_value=insert_result)
    db.lab_results.find_one = AsyncMock(return_value=records[0] if records else None)

    async def _aiter(self):
        for r in records:
            yield r

    cursor = MagicMock()
    cursor.__aiter__ = _aiter
    db.lab_results.find.return_value.sort.return_value = cursor

    return db


def test_create_lab_result_normal():
    """Test creating a lab result with normal status."""
    user = _make_user()
    saved_doc = {
        "_id": ObjectId(),
        "user_id": user["_id"],
        "test_name": "Blood Glucose",
        "value": 95.5,
        "unit": "mg/dL",
        "reference_range": {"min": 70, "max": 100},
        "status": "normal",
        "recorded_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }

    mock_db = _make_mock_db()
    mock_db.lab_results.find_one = AsyncMock(return_value=saved_doc)
    mock_db.lab_results.insert_one.return_value.inserted_id = saved_doc["_id"]

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.post(
            "/api/lab-results",
            json={
                "test_name": "Blood Glucose",
                "value": 95.5,
                "unit": "mg/dL",
                "reference_range": {"min": 70, "max": 100},
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["test_name"] == "Blood Glucose"
    assert data["value"] == 95.5
    assert data["status"] == "normal"


def test_create_lab_result_abnormal():
    """Test creating a lab result with abnormal status."""
    user = _make_user()
    saved_doc = {
        "_id": ObjectId(),
        "user_id": user["_id"],
        "test_name": "Cholesterol",
        "value": 250,
        "unit": "mg/dL",
        "reference_range": {"min": 0, "max": 200},
        "status": "abnormal",
        "recorded_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }

    mock_db = _make_mock_db()
    mock_db.lab_results.find_one = AsyncMock(return_value=saved_doc)
    mock_db.lab_results.insert_one.return_value.inserted_id = saved_doc["_id"]

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.post(
            "/api/lab-results",
            json={
                "test_name": "Cholesterol",
                "value": 250,
                "unit": "mg/dL",
                "reference_range": {"min": 0, "max": 200},
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "abnormal"


def test_list_lab_results():
    """Test retrieving lab results."""
    user = _make_user()
    records = [
        {
            "_id": ObjectId(),
            "user_id": user["_id"],
            "test_name": "Hemoglobin",
            "value": 14.5,
            "unit": "g/dL",
            "recorded_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
        }
    ]

    mock_db = _make_mock_db(records=records)

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.get("/api/lab-results")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert isinstance(data, list)
    assert len(data) == 1


def test_create_lab_result_minimal():
    """Test creating a lab result with minimal fields."""
    user = _make_user()
    saved_doc = {
        "_id": ObjectId(),
        "user_id": user["_id"],
        "test_name": "Temperature",
        "value": 98.6,
        "recorded_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }

    mock_db = _make_mock_db()
    mock_db.lab_results.find_one = AsyncMock(return_value=saved_doc)
    mock_db.lab_results.insert_one.return_value.inserted_id = saved_doc["_id"]

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.post(
            "/api/lab-results", json={"test_name": "Temperature", "value": 98.6}
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["test_name"] == "Temperature"
    assert data["value"] == 98.6
