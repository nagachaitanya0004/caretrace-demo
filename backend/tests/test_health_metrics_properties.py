"""
Hypothesis property-based tests for the health metrics module.

Properties tested:
  1. Any non-empty subset of valid fields is accepted by HealthMetricsCreate
  2. N sequential POSTs produce exactly N insert_one calls (append-only)
  3. Inserted document's user_id equals the authenticated user's _id
  4. Out-of-range values raise ValidationError from HealthMetricsCreate
  5. GET returns records sorted by recorded_at descending, scoped to user

**Validates: Requirements 1.3, 1.4, 2.1, 2.4, 2.5, 3.1, 3.3, 6.3, 6.4**
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from hypothesis import given, settings, strategies as st
from pydantic import ValidationError

from app.main import app
from app.api.auth import get_current_user
from app.schemas.schemas import HealthMetricsCreate


# ---------------------------------------------------------------------------
# Shared strategies
# ---------------------------------------------------------------------------

# Valid ranges per field
_FIELD_RANGES = {
    "systolic_bp":       st.integers(min_value=50,  max_value=300),
    "diastolic_bp":      st.integers(min_value=30,  max_value=200),
    "blood_sugar_mg_dl": st.floats(min_value=0.0, max_value=1000.0, allow_nan=False, allow_infinity=False),
    "heart_rate_bpm":    st.integers(min_value=20,  max_value=300),
    "oxygen_saturation": st.integers(min_value=50,  max_value=100),
}

_ALL_FIELDS = list(_FIELD_RANGES.keys())


@st.composite
def non_empty_valid_payload(draw) -> dict:
    """Draw a dict with at least one field set to a valid value."""
    # Choose which fields to include (at least 1)
    fields = draw(st.lists(st.sampled_from(_ALL_FIELDS), min_size=1, unique=True))
    payload = {}
    for field in fields:
        payload[field] = draw(_FIELD_RANGES[field])
    return payload


@st.composite
def out_of_range_payload(draw) -> dict:
    """Draw a dict with exactly one field set to an out-of-range value."""
    field = draw(st.sampled_from(_ALL_FIELDS))
    if field == "systolic_bp":
        value = draw(st.one_of(
            st.integers(max_value=49),
            st.integers(min_value=301),
        ))
    elif field == "diastolic_bp":
        value = draw(st.one_of(
            st.integers(max_value=29),
            st.integers(min_value=201),
        ))
    elif field == "blood_sugar_mg_dl":
        value = draw(st.floats(max_value=-0.001, allow_nan=False, allow_infinity=False))
    elif field == "heart_rate_bpm":
        value = draw(st.one_of(
            st.integers(max_value=19),
            st.integers(min_value=301),
        ))
    else:  # oxygen_saturation
        value = draw(st.one_of(
            st.integers(max_value=49),
            st.integers(min_value=101),
        ))
    return {field: value}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user() -> dict:
    return {"_id": ObjectId(), "name": "Prop User", "email": "prop@example.com"}


def _make_record(user_id: ObjectId, recorded_at: datetime, **fields) -> dict:
    doc = {
        "_id": ObjectId(),
        "user_id": user_id,
        "recorded_at": recorded_at,
        "created_at": recorded_at,
    }
    doc.update(fields)
    return doc


def _make_mock_db_for_post(saved_doc: dict) -> MagicMock:
    """Mock DB that supports a single insert_one + find_one."""
    db = MagicMock()
    insert_result = MagicMock()
    insert_result.inserted_id = saved_doc["_id"]
    db.health_metrics.insert_one = AsyncMock(return_value=insert_result)
    db.health_metrics.find_one = AsyncMock(return_value=saved_doc)
    return db


def _make_mock_db_for_get(records: list[dict]) -> MagicMock:
    """Mock DB whose find().sort() returns the given records as an async iterable."""
    db = MagicMock()

    async def _aiter(self):
        for r in records:
            yield r

    cursor = MagicMock()
    cursor.__aiter__ = _aiter
    db.health_metrics.find.return_value.sort.return_value = cursor
    return db


# ---------------------------------------------------------------------------
# Property 1 — Any non-empty subset of valid fields is accepted by schema
# **Validates: Requirements 1.3, 6.3**
# ---------------------------------------------------------------------------

@given(non_empty_valid_payload())
@settings(max_examples=100)
def test_property1_any_valid_subset_accepted_by_schema(payload: dict):
    """
    **Validates: Requirements 1.3, 6.3**

    For any non-empty subset of valid vital fields within their valid ranges,
    HealthMetricsCreate must NOT raise a ValidationError.
    """
    # Should not raise
    model = HealthMetricsCreate(**payload)
    # At least one field is set
    values = model.model_dump(exclude_none=True)
    assert len(values) >= 1


# ---------------------------------------------------------------------------
# Property 2 — N sequential POSTs produce exactly N insert_one calls
# **Validates: Requirements 1.4, 2.5**
# ---------------------------------------------------------------------------

@given(st.integers(min_value=1, max_value=10))
@settings(max_examples=50)
def test_property2_n_posts_produce_n_inserts(n: int):
    """
    **Validates: Requirements 1.4, 2.5**

    N sequential valid POST requests must result in exactly N insert_one calls.
    """
    user = _make_user()
    now = datetime.utcnow()

    # We need a fresh mock for each run; track insert_one calls
    db = MagicMock()
    insert_result = MagicMock()
    insert_result.inserted_id = ObjectId()
    db.health_metrics.insert_one = AsyncMock(return_value=insert_result)

    # find_one returns a minimal saved doc each time
    saved_doc = _make_record(user["_id"], now, systolic_bp=120)
    db.health_metrics.find_one = AsyncMock(return_value=saved_doc)

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=db):
        client = TestClient(app)
        for _ in range(n):
            r = client.post("/api/health-metrics", json={"systolic_bp": 120})
            assert r.status_code == 200

    app.dependency_overrides.clear()

    assert db.health_metrics.insert_one.call_count == n


# ---------------------------------------------------------------------------
# Property 3 — Inserted document's user_id equals the authenticated user's _id
# **Validates: Requirements 2.1**
# ---------------------------------------------------------------------------

@given(non_empty_valid_payload())
@settings(max_examples=100)
def test_property3_inserted_record_has_correct_user_id(payload: dict):
    """
    **Validates: Requirements 2.1**

    The document passed to insert_one must have user_id == current_user['_id'].
    """
    user = _make_user()
    now = datetime.utcnow()
    saved_doc = _make_record(user["_id"], now, **payload)

    db = MagicMock()
    insert_result = MagicMock()
    insert_result.inserted_id = saved_doc["_id"]
    db.health_metrics.insert_one = AsyncMock(return_value=insert_result)
    db.health_metrics.find_one = AsyncMock(return_value=saved_doc)

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=db):
        client = TestClient(app)
        r = client.post("/api/health-metrics", json=payload)

    app.dependency_overrides.clear()

    assert r.status_code == 200

    # Inspect the document that was passed to insert_one
    call_args = db.health_metrics.insert_one.call_args
    inserted_doc = call_args[0][0]  # first positional argument
    assert inserted_doc["user_id"] == user["_id"]


# ---------------------------------------------------------------------------
# Property 4 — Out-of-range values raise ValidationError from schema
# **Validates: Requirements 2.4, 6.3, 6.4**
# ---------------------------------------------------------------------------

@given(out_of_range_payload())
@settings(max_examples=100)
def test_property4_out_of_range_raises_validation_error(payload: dict):
    """
    **Validates: Requirements 2.4, 6.3, 6.4**

    Any vital field value outside its valid range must cause HealthMetricsCreate
    to raise a ValidationError.
    """
    with pytest.raises(ValidationError):
        HealthMetricsCreate(**payload)


# ---------------------------------------------------------------------------
# Property 5 — GET returns records sorted by recorded_at descending, scoped to user
# **Validates: Requirements 3.1, 3.3**
# ---------------------------------------------------------------------------

@given(
    st.lists(
        st.integers(min_value=0, max_value=1000),
        min_size=1,
        max_size=20,
    )
)
@settings(max_examples=100)
def test_property5_get_returns_sorted_descending_scoped_to_user(offsets: list[int]):
    """
    **Validates: Requirements 3.1, 3.3**

    GET /api/health-metrics must return records sorted by recorded_at descending.
    The mock cursor already returns records in the order we provide; we verify
    the route passes sort('recorded_at', -1) and the response preserves that order.
    """
    user = _make_user()
    other_user = _make_user()
    base_time = datetime(2024, 1, 1)

    # Build records for the authenticated user, sorted descending by recorded_at
    # (the mock cursor returns them in the order given — simulating DB sort)
    sorted_offsets = sorted(offsets, reverse=True)
    records = [
        _make_record(user["_id"], base_time + timedelta(seconds=off), systolic_bp=120)
        for off in sorted_offsets
    ]

    # Add a record for another user — it must NOT appear in the response
    other_record = _make_record(other_user["_id"], base_time + timedelta(seconds=9999), systolic_bp=200)

    # The mock cursor only returns the user's records (DB scoping is tested via
    # the find() call argument; the route passes {'user_id': current_user['_id']})
    db = _make_mock_db_for_get(records)

    app.dependency_overrides[get_current_user] = lambda: user
    with patch("app.api.routes.get_database", return_value=db):
        client = TestClient(app)
        response = client.get("/api/health-metrics")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]

    # Verify count matches
    assert len(data) == len(records)

    # Verify the find() was called with the correct user_id filter
    find_call_args = db.health_metrics.find.call_args
    query_filter = find_call_args[0][0]
    assert query_filter["user_id"] == user["_id"]

    # Verify sort was called with recorded_at descending (-1)
    sort_call_args = db.health_metrics.find.return_value.sort.call_args
    assert sort_call_args[0] == ("recorded_at", -1)

    # Verify the response timestamps are in descending order
    if len(data) > 1:
        timestamps = [r["recorded_at"] for r in data]
        assert timestamps == sorted(timestamps, reverse=True)
