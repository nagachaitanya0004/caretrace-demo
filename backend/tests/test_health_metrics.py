"""
Example-based unit tests for the health metrics API routes.

Uses dependency_overrides to bypass real auth/DB:
  - get_current_user  → returns a fake user dict
  - get_database      → returns a MagicMock with AsyncMock collection methods
"""
from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.auth import get_current_user
from app.db.db import get_database


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(user_id: str | None = None) -> dict:
    oid = ObjectId(user_id) if user_id else ObjectId()
    return {"_id": oid, "name": "Test User", "email": "test@example.com"}


def _make_record(user_id: ObjectId, **fields) -> dict:
    """Build a minimal health_metrics document."""
    now = datetime.utcnow()
    doc = {
        "_id": ObjectId(),
        "user_id": user_id,
        "recorded_at": now,
        "created_at": now,
    }
    doc.update(fields)
    return doc


def _serialize(doc: dict) -> dict:
    """Mirror serialize_document from responses.py."""
    result = {
        k: (str(v) if isinstance(v, ObjectId) else v)
        for k, v in doc.items()
        if k not in {"hashed_password", "password", "session_token"}
    }
    result["id"] = str(doc.get("_id", ""))
    result.pop("_id", None)
    return result


def _make_mock_db(records: list[dict] | None = None) -> MagicMock:
    """
    Return a MagicMock database whose health_metrics collection supports:
      insert_one, find_one, find(...).sort(...)
    """
    if records is None:
        records = []

    db = MagicMock()

    # insert_one returns an object with inserted_id
    insert_result = MagicMock()
    insert_result.inserted_id = ObjectId()
    db.health_metrics.insert_one = AsyncMock(return_value=insert_result)

    # find_one returns the first record (or None)
    db.health_metrics.find_one = AsyncMock(
        return_value=records[0] if records else None
    )

    # find(...).sort(...) returns an async iterable of records
    async def _aiter(self):
        for r in records:
            yield r

    cursor = MagicMock()
    cursor.__aiter__ = _aiter
    db.health_metrics.find.return_value.sort.return_value = cursor

    return db


# ---------------------------------------------------------------------------
# Test 1 — POST with empty body → 400
# ---------------------------------------------------------------------------

def test_post_empty_body_returns_400():
    """POST /api/health-metrics with {} must return 400 (all fields null)."""
    user = _make_user()
    mock_db = _make_mock_db()

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.post("/api/health-metrics", json={})

    app.dependency_overrides.clear()

    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False


# ---------------------------------------------------------------------------
# Test 2 — POST with valid single-field payload → 200, timestamps present
# ---------------------------------------------------------------------------

def test_post_valid_single_field_returns_200_with_timestamps():
    """POST with systolic_bp=120 must return 200 and include recorded_at / created_at."""
    user = _make_user()
    now = datetime.utcnow()
    saved_doc = _make_record(user["_id"], systolic_bp=120)

    mock_db = _make_mock_db()
    # find_one after insert should return the saved doc
    mock_db.health_metrics.find_one = AsyncMock(return_value=saved_doc)
    mock_db.health_metrics.insert_one.return_value.inserted_id = saved_doc["_id"]

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.post("/api/health-metrics", json={"systolic_bp": 120})

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert "recorded_at" in data
    assert "created_at" in data


# ---------------------------------------------------------------------------
# Test 3 — GET for user with no records → [] with 200
# ---------------------------------------------------------------------------

def test_get_no_records_returns_empty_list():
    """GET /api/health-metrics for a user with no records must return [] and 200."""
    user = _make_user()
    mock_db = _make_mock_db(records=[])

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=mock_db):
        client = TestClient(app)
        response = client.get("/api/health-metrics")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"] == []


# ---------------------------------------------------------------------------
# Test 4 — Two users each get only their own records
# ---------------------------------------------------------------------------

def test_two_users_get_only_their_own_records():
    """User A and User B each see only their own records."""
    user_a = _make_user()
    user_b = _make_user()

    record_a = _make_record(user_a["_id"], systolic_bp=120)
    record_b = _make_record(user_b["_id"], heart_rate_bpm=72)

    # --- User A posts a record ---
    mock_db_a_post = _make_mock_db()
    mock_db_a_post.health_metrics.find_one = AsyncMock(return_value=record_a)
    mock_db_a_post.health_metrics.insert_one.return_value.inserted_id = record_a["_id"]

    app.dependency_overrides[get_current_user] = lambda: user_a
    with patch("app.api.routes.get_database", return_value=mock_db_a_post):
        client = TestClient(app)
        r = client.post("/api/health-metrics", json={"systolic_bp": 120})
    assert r.status_code == 200

    # --- User B posts a record ---
    mock_db_b_post = _make_mock_db()
    mock_db_b_post.health_metrics.find_one = AsyncMock(return_value=record_b)
    mock_db_b_post.health_metrics.insert_one.return_value.inserted_id = record_b["_id"]

    app.dependency_overrides[get_current_user] = lambda: user_b
    with patch("app.api.routes.get_database", return_value=mock_db_b_post):
        client = TestClient(app)
        r = client.post("/api/health-metrics", json={"heart_rate_bpm": 72})
    assert r.status_code == 200

    # --- User A GETs — should only see record_a ---
    mock_db_a_get = _make_mock_db(records=[record_a])

    app.dependency_overrides[get_current_user] = lambda: user_a
    with patch("app.api.routes.get_database", return_value=mock_db_a_get):
        client = TestClient(app)
        resp_a = client.get("/api/health-metrics")

    app.dependency_overrides.clear()

    assert resp_a.status_code == 200
    data_a = resp_a.json()["data"]
    assert len(data_a) == 1
    assert data_a[0]["systolic_bp"] == 120

    # --- User B GETs — should only see record_b ---
    mock_db_b_get = _make_mock_db(records=[record_b])

    app.dependency_overrides[get_current_user] = lambda: user_b
    with patch("app.api.routes.get_database", return_value=mock_db_b_get):
        client = TestClient(app)
        resp_b = client.get("/api/health-metrics")

    app.dependency_overrides.clear()

    assert resp_b.status_code == 200
    data_b = resp_b.json()["data"]
    assert len(data_b) == 1
    assert data_b[0]["heart_rate_bpm"] == 72
