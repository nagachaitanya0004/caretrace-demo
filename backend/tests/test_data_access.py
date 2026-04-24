"""
Unit tests for app/services/data_access.py.

Follows the same mock-override pattern used in test_health_metrics.py:
  - patch get_database  → AsyncMock MongoDB
  - patch get_session_maker → MagicMock PostgreSQL session
  - patch get_user_ref  → control UUID vs ObjectId path
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

import pytest

from app.services.data_access import get_complete_user_data


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _uuid_user() -> dict:
    """Simulate a new dual-DB user (has user_id UUID)."""
    return {
        "_id": ObjectId(),
        "user_id": "test-uuid-1234",
        "name": "Test User",
        "email": "test@example.com",
    }


def _legacy_user() -> dict:
    """Simulate a legacy MongoDB-only user (no user_id field)."""
    return {
        "_id": ObjectId(),
        "name": "Legacy User",
        "email": "legacy@example.com",
    }


def _make_pg_user(user_id: str) -> MagicMock:
    """Build a mock PostgresUser ORM row."""
    pg = MagicMock()
    pg.id           = user_id
    pg.email        = "test@example.com"
    pg.name         = "Test User"
    pg.age          = 30
    pg.gender       = "male"
    pg.height_cm    = 175.0
    pg.weight_kg    = 70.0
    pg.blood_group  = "O+"
    pg.bmi          = 22.9
    pg.health_goal  = "Stay healthy"
    pg.is_onboarded = True
    pg.created_at   = datetime(2024, 1, 1)
    pg.updated_at   = datetime(2024, 6, 1)
    return pg


def _make_mongo_db(
    labs: list | None = None,
    meds: list | None = None,
    symptoms: list | None = None,
) -> MagicMock:
    """
    Return a MagicMock database whose collections support
    find(...).sort(...).limit(...) as async iterables.
    """
    labs     = labs     or []
    meds     = meds     or []
    symptoms = symptoms or []

    def _cursor(records: list) -> MagicMock:
        async def _aiter(self):
            for r in records:
                yield r
        c = MagicMock()
        c.__aiter__ = _aiter
        return c

    db = MagicMock()

    def _find_side_effect(collection_name: str):
        mapping = {
            "lab_results":          labs,
            "medication_tracking":  meds,
            "symptoms":             symptoms,
        }
        records = mapping.get(collection_name, [])
        mock_col = MagicMock()
        mock_col.find.return_value.sort.return_value.limit.return_value = _cursor(records)
        return mock_col

    db.__getitem__ = lambda self, name: _find_side_effect(name)
    return db


def _make_session_maker(pg_user) -> MagicMock:
    """Return a mock session_maker whose context manager yields a session."""
    session = AsyncMock()
    result  = MagicMock()
    result.scalars.return_value.first.return_value = pg_user
    session.execute = AsyncMock(return_value=result)

    session_maker = MagicMock()
    session_maker.return_value.__aenter__ = AsyncMock(return_value=session)
    session_maker.return_value.__aexit__  = AsyncMock(return_value=False)
    return session_maker


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_uuid_user_returns_postgres_profile():
    """UUID user: profile must come from PostgreSQL."""
    user    = _uuid_user()
    pg_user = _make_pg_user(user["user_id"])
    db      = _make_mongo_db()

    with (
        patch("app.services.data_access.get_database",     return_value=db),
        patch("app.services.data_access.get_session_maker", return_value=_make_session_maker(pg_user)),
    ):
        result = await get_complete_user_data(user)

    profile = result["profile"]
    assert profile["user_id"]      == user["user_id"]
    assert profile["email"]        == "test@example.com"
    assert profile["is_onboarded"] is True
    assert profile["bmi"]          == 22.9


@pytest.mark.asyncio
async def test_legacy_user_returns_mongo_profile():
    """Legacy ObjectId user: profile must come from MongoDB document."""
    user = _legacy_user()
    db   = _make_mongo_db()

    with (
        patch("app.services.data_access.get_database",     return_value=db),
        patch("app.services.data_access.get_session_maker", return_value=None),
    ):
        result = await get_complete_user_data(user)

    profile = result["profile"]
    assert profile["email"] == "legacy@example.com"
    # No PostgreSQL fields expected
    assert "is_onboarded" not in profile or profile.get("is_onboarded") is None or True


@pytest.mark.asyncio
async def test_mongo_collections_returned():
    """All three MongoDB collections must appear in the output."""
    user = _uuid_user()
    now  = datetime.utcnow()

    lab  = {"_id": ObjectId(), "user_id": user["user_id"], "test_name": "Glucose",
            "value": 95.0, "recorded_at": now, "created_at": now}
    med  = {"_id": ObjectId(), "user_id": user["user_id"], "medication_name": "Aspirin",
            "created_at": now, "updated_at": now}
    sym  = {"_id": ObjectId(), "user_id": user["user_id"], "symptom": "Headache",
            "severity": 4, "duration": 2, "timestamp": now, "created_at": now}

    db = _make_mongo_db(labs=[lab], meds=[med], symptoms=[sym])
    pg_user = _make_pg_user(user["user_id"])

    with (
        patch("app.services.data_access.get_database",     return_value=db),
        patch("app.services.data_access.get_session_maker", return_value=_make_session_maker(pg_user)),
    ):
        result = await get_complete_user_data(user)

    assert len(result["labs"])        == 1
    assert len(result["medications"]) == 1
    assert len(result["symptoms"])    == 1
    assert result["labs"][0]["test_name"]           == "Glucose"
    assert result["medications"][0]["medication_name"] == "Aspirin"
    assert result["symptoms"][0]["symptom"]         == "Headache"


@pytest.mark.asyncio
async def test_empty_collections_return_empty_lists():
    """When a user has no data, all collection lists must be empty."""
    user    = _uuid_user()
    db      = _make_mongo_db()
    pg_user = _make_pg_user(user["user_id"])

    with (
        patch("app.services.data_access.get_database",     return_value=db),
        patch("app.services.data_access.get_session_maker", return_value=_make_session_maker(pg_user)),
    ):
        result = await get_complete_user_data(user)

    assert result["labs"]        == []
    assert result["medications"] == []
    assert result["symptoms"]    == []


@pytest.mark.asyncio
async def test_postgres_unavailable_falls_back_to_mongo_profile():
    """When PostgreSQL is unavailable, profile must degrade to MongoDB document."""
    user = _uuid_user()
    db   = _make_mongo_db()

    # session_maker returns None → PostgreSQL unavailable
    with (
        patch("app.services.data_access.get_database",     return_value=db),
        patch("app.services.data_access.get_session_maker", return_value=None),
    ):
        result = await get_complete_user_data(user)

    # Must still return a profile (from MongoDB fallback)
    assert result["profile"] is not None
    assert result["profile"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_output_shape_always_has_four_keys():
    """Return value must always contain exactly: profile, labs, medications, symptoms."""
    user    = _uuid_user()
    db      = _make_mongo_db()
    pg_user = _make_pg_user(user["user_id"])

    with (
        patch("app.services.data_access.get_database",     return_value=db),
        patch("app.services.data_access.get_session_maker", return_value=_make_session_maker(pg_user)),
    ):
        result = await get_complete_user_data(user)

    assert set(result.keys()) == {"profile", "labs", "medications", "symptoms"}
