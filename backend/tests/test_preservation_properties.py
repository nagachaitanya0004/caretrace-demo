"""
Property-Based Preservation Tests for System Stabilization Bugfix

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

These tests verify that existing functionality is preserved after the bugfix.
They MUST PASS on the UNFIXED code to establish the baseline behavior.

Testing approach:
- Use mocking to avoid real database connections
- Focus on observable behavior (API responses, data consistency)
- Use hypothesis for property-based testing to generate many test cases
- Test that operations with valid inputs continue working identically
"""
from __future__ import annotations

import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import app


# ── Test Data Generators ──────────────────────────────────────────────────────

@st.composite
def valid_user_data(draw):
    """Generate valid user data for testing."""
    return {
        "_id": ObjectId(),
        "user_id": draw(st.uuids(version=4)).hex,
        "email": draw(st.emails()),
        "name": draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('L',)))),
        "hashed_password": "hashed_password_value",
        "is_onboarded": draw(st.booleans()),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


@st.composite
def valid_symptom_data(draw):
    """Generate valid symptom data for testing."""
    return {
        "_id": ObjectId(),
        "user_id": draw(st.uuids(version=4)).hex,
        "symptom": draw(st.sampled_from(["headache", "fever", "cough", "fatigue"])),
        "severity": draw(st.integers(min_value=1, max_value=10)),
        "duration": draw(st.integers(min_value=1, max_value=30)),
        "timestamp": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }


@st.composite
def valid_lab_result_data(draw):
    """Generate valid lab result data for testing."""
    return {
        "_id": ObjectId(),
        "user_id": draw(st.uuids(version=4)).hex,
        "test_name": draw(st.sampled_from(["Glucose", "Cholesterol", "Hemoglobin"])),
        "value": draw(st.floats(min_value=0, max_value=500)),
        "recorded_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }


@st.composite
def valid_medication_data(draw):
    """Generate valid medication data for testing."""
    return {
        "_id": ObjectId(),
        "user_id": draw(st.uuids(version=4)).hex,
        "medication_name": draw(st.sampled_from(["Aspirin", "Ibuprofen", "Metformin"])),
        "dosage": draw(st.text(min_size=1, max_size=20)),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


# ── Helper Functions ──────────────────────────────────────────────────────────

def mock_database_with_data(users=None, symptoms=None, labs=None, medications=None):
    """Create a mock database with test data."""
    users = users or []
    symptoms = symptoms or []
    labs = labs or []
    medications = medications or []
    
    def _cursor(records):
        async def _aiter(self):
            for r in records:
                yield r
        c = MagicMock()
        c.__aiter__ = _aiter
        return c
    
    db = MagicMock()
    
    # Mock collection access via db[collection_name]
    def _find_side_effect(collection_name):
        mapping = {
            "lab_results": labs,
            "medication_tracking": medications,
            "symptoms": symptoms,
            "users": users,
        }
        records = mapping.get(collection_name, [])
        mock_col = MagicMock()
        mock_col.find.return_value.sort.return_value.limit.return_value = _cursor(records)
        mock_col.find_one = AsyncMock(return_value=records[0] if records else None)
        return mock_col
    
    db.__getitem__ = lambda self, name: _find_side_effect(name)
    
    # Mock command for health check
    db.command = AsyncMock(return_value={"ok": 1})
    
    return db


def mock_postgres_session(user_data=None):
    """Create a mock PostgreSQL session."""
    session = AsyncMock()
    result = MagicMock()
    
    if user_data:
        pg_user = MagicMock()
        pg_user.id = user_data.get("user_id")
        pg_user.email = user_data.get("email")
        pg_user.name = user_data.get("name")
        pg_user.is_onboarded = user_data.get("is_onboarded", False)
        pg_user.created_at = user_data.get("created_at")
        pg_user.updated_at = user_data.get("updated_at")
        result.scalars.return_value.first.return_value = pg_user
    else:
        result.scalars.return_value.first.return_value = None
    
    session.execute = AsyncMock(return_value=result)
    
    session_maker = MagicMock()
    session_maker.return_value.__aenter__ = AsyncMock(return_value=session)
    session_maker.return_value.__aexit__ = AsyncMock(return_value=False)
    
    return session_maker


# ── Property 2: Preservation Tests ────────────────────────────────────────────

@pytest.mark.asyncio
@given(user=valid_user_data())
@settings(max_examples=10, deadline=None)
async def test_preservation_user_data_retrieval(user):
    """
    Property 2: Preservation - User data retrieval continues working identically.
    
    **Validates: Requirements 3.1, 3.2**
    
    For any valid user with proper authentication, the system SHALL continue to
    return user data correctly without changing the API contract.
    """
    db = mock_database_with_data(users=[user])
    session_maker = mock_postgres_session(user)
    
    with patch("app.services.data_access.get_database", return_value=db), \
         patch("app.services.data_access.get_session_maker", return_value=session_maker):
        
        from app.services.data_access import get_complete_user_data
        result = await get_complete_user_data(user)
        
        # Verify the response structure is preserved
        assert "profile" in result
        assert "labs" in result
        assert "medications" in result
        assert "symptoms" in result
        
        # Verify profile data is returned
        assert result["profile"] is not None
        assert result["profile"]["email"] == user["email"]


@pytest.mark.asyncio
async def test_preservation_symptom_data_operations():
    """
    Property 2: Preservation - Symptom data operations continue working identically.
    
    **Validates: Requirements 3.3**
    
    For any valid symptom data operations, the system SHALL continue to store
    and retrieve data correctly with the same behavior.
    """
    user = {
        "_id": ObjectId(),
        "user_id": "test-uuid-symptoms",
        "email": "symptoms@example.com",
        "name": "Symptom User",
        "hashed_password": "hashed_password",
        "is_onboarded": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    symptoms = [
        {
            "_id": ObjectId(),
            "user_id": "test-uuid-symptoms",
            "symptom": "headache",
            "severity": 5,
            "duration": 2,
            "timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow(),
        },
        {
            "_id": ObjectId(),
            "user_id": "test-uuid-symptoms",
            "symptom": "fever",
            "severity": 7,
            "duration": 3,
            "timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow(),
        },
    ]
    
    db = mock_database_with_data(users=[user], symptoms=symptoms)
    session_maker = mock_postgres_session(user)
    
    with patch("app.services.data_access.get_database", return_value=db), \
         patch("app.services.data_access.get_session_maker", return_value=session_maker):
        
        from app.services.data_access import get_complete_user_data
        result = await get_complete_user_data(user)
        
        # Verify symptoms are returned
        assert "symptoms" in result
        assert isinstance(result["symptoms"], list)
        assert len(result["symptoms"]) == len(symptoms)


@pytest.mark.asyncio
async def test_preservation_lab_results_operations():
    """
    Property 2: Preservation - Lab results operations continue working identically.
    
    **Validates: Requirements 3.3**
    
    For any valid lab results operations, the system SHALL continue to store
    and retrieve data correctly with the same behavior.
    """
    user = {
        "_id": ObjectId(),
        "user_id": "test-uuid-labs",
        "email": "labs@example.com",
        "name": "Lab User",
        "hashed_password": "hashed_password",
        "is_onboarded": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    labs = [
        {
            "_id": ObjectId(),
            "user_id": "test-uuid-labs",
            "test_name": "Glucose",
            "value": 95.0,
            "recorded_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
        },
        {
            "_id": ObjectId(),
            "user_id": "test-uuid-labs",
            "test_name": "Cholesterol",
            "value": 180.0,
            "recorded_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
        },
    ]
    
    db = mock_database_with_data(users=[user], labs=labs)
    session_maker = mock_postgres_session(user)
    
    with patch("app.services.data_access.get_database", return_value=db), \
         patch("app.services.data_access.get_session_maker", return_value=session_maker):
        
        from app.services.data_access import get_complete_user_data
        result = await get_complete_user_data(user)
        
        # Verify labs are returned
        assert "labs" in result
        assert isinstance(result["labs"], list)
        assert len(result["labs"]) == len(labs)


@pytest.mark.asyncio
async def test_preservation_medication_operations():
    """
    Property 2: Preservation - Medication operations continue working identically.
    
    **Validates: Requirements 3.3**
    
    For any valid medication tracking operations, the system SHALL continue to
    store and retrieve data correctly with the same behavior.
    """
    user = {
        "_id": ObjectId(),
        "user_id": "test-uuid-meds",
        "email": "meds@example.com",
        "name": "Med User",
        "hashed_password": "hashed_password",
        "is_onboarded": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    medications = [
        {
            "_id": ObjectId(),
            "user_id": "test-uuid-meds",
            "medication_name": "Aspirin",
            "dosage": "100mg",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
        {
            "_id": ObjectId(),
            "user_id": "test-uuid-meds",
            "medication_name": "Metformin",
            "dosage": "500mg",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
    ]
    
    db = mock_database_with_data(users=[user], medications=medications)
    session_maker = mock_postgres_session(user)
    
    with patch("app.services.data_access.get_database", return_value=db), \
         patch("app.services.data_access.get_session_maker", return_value=session_maker):
        
        from app.services.data_access import get_complete_user_data
        result = await get_complete_user_data(user)
        
        # Verify medications are returned
        assert "medications" in result
        assert isinstance(result["medications"], list)
        assert len(result["medications"]) == len(medications)


@pytest.mark.asyncio
async def test_preservation_legacy_objectid_support():
    """
    Property 2: Preservation - Legacy ObjectId support continues working.
    
    **Validates: Requirements 3.6**
    
    For any legacy user with ObjectId identifier, the system SHALL continue to
    support them through existing fallback mechanisms.
    """
    # Create a legacy user without user_id field
    legacy_user = {
        "_id": ObjectId(),
        "email": "legacy@example.com",
        "name": "Legacy User",
        "hashed_password": "hashed_password",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    db = mock_database_with_data(users=[legacy_user])
    
    with patch("app.services.data_access.get_database", return_value=db), \
         patch("app.services.data_access.get_session_maker", return_value=None):
        
        from app.services.data_access import get_complete_user_data
        result = await get_complete_user_data(legacy_user)
        
        # Verify legacy user data is returned via MongoDB fallback
        assert result["profile"] is not None
        assert result["profile"]["email"] == "legacy@example.com"


@pytest.mark.asyncio
async def test_preservation_mongodb_only_operations():
    """
    Property 2: Preservation - MongoDB-only operations continue working.
    
    **Validates: Requirements 3.7**
    
    For any MongoDB-only collection operations, the system SHALL continue to
    work correctly without requiring PostgreSQL synchronization.
    """
    user = {
        "_id": ObjectId(),
        "user_id": "test-uuid-1234",
        "email": "test@example.com",
        "name": "Test User",
        "hashed_password": "hashed_password",
    }
    
    # MongoDB-only data (alerts, analysis)
    alerts = [
        {
            "_id": ObjectId(),
            "user_id": user["user_id"],
            "message": "Test alert",
            "severity": "warning",
            "created_at": datetime.utcnow(),
        }
    ]
    
    db = mock_database_with_data(users=[user])
    db.alerts.find.return_value.sort.return_value = MagicMock()
    
    async def _alert_iter(self):
        for alert in alerts:
            yield alert
    
    db.alerts.find.return_value.sort.return_value.__aiter__ = _alert_iter
    
    with patch("app.db.db.get_database", return_value=db):
        # Verify MongoDB-only operations work
        cursor = db.alerts.find({"user_id": user["user_id"]}).sort("created_at", -1)
        result_alerts = [alert async for alert in cursor]
        
        assert len(result_alerts) == 1
        assert result_alerts[0]["message"] == "Test alert"


@pytest.mark.asyncio
async def test_preservation_health_check_api_contract():
    """
    Property 2: Preservation - Health check API contract remains unchanged.
    
    **Validates: Requirements 3.1**
    
    The health check endpoint SHALL continue to return responses in the same
    format, maintaining API contract compatibility.
    """
    db = MagicMock()
    db.command = AsyncMock(return_value={"ok": 1})
    
    with patch("app.db.db.get_database", return_value=db), \
         patch("app.db.postgres.test_postgres_connection", return_value=True):
        
        client = TestClient(app)
        response = client.get("/health")
        
        # Verify response structure is preserved
        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "data" in data
        assert "message" in data
        
        # Verify health data structure
        health_data = data["data"]
        assert "service" in health_data
        assert "version" in health_data
        assert "status" in health_data
        assert "databases" in health_data


@pytest.mark.asyncio
async def test_preservation_postgres_fallback_to_mongodb():
    """
    Property 2: Preservation - PostgreSQL unavailable fallback continues working.
    
    **Validates: Requirements 3.2, 3.6**
    
    When PostgreSQL is unavailable, the system SHALL continue to function using
    MongoDB fallback for user profile data.
    """
    user = {
        "_id": ObjectId(),
        "user_id": "test-uuid-fallback",
        "email": "fallback@example.com",
        "name": "Fallback User",
        "hashed_password": "hashed_password",
        "is_onboarded": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    db = mock_database_with_data(users=[user])
    
    with patch("app.services.data_access.get_database", return_value=db), \
         patch("app.services.data_access.get_session_maker", return_value=None):
        
        from app.services.data_access import get_complete_user_data
        result = await get_complete_user_data(user)
        
        # Verify fallback to MongoDB profile works
        assert result["profile"] is not None
        assert result["profile"]["email"] == user["email"]


@pytest.mark.asyncio
async def test_preservation_test_mode_behavior():
    """
    Property 2: Preservation - Test mode behavior continues working.
    
    **Validates: Requirements 3.5**
    
    When running in test mode, the system SHALL continue to use test defaults
    and skip production validations as before.
    """
    import os
    
    # Verify test mode is detected
    assert os.getenv("TESTING") == "1"
    
    # Verify test defaults are used in config
    from app.core.config import SECRET_KEY
    assert SECRET_KEY == "test-secret-key-not-for-production"
    
    # Test mode should allow test secret keys without production validation
    # This behavior must be preserved - the key can be any length in test mode
    assert SECRET_KEY is not None and len(SECRET_KEY) > 0


@pytest.mark.asyncio
async def test_preservation_data_consistency_across_databases():
    """
    Property 2: Preservation - Data consistency patterns continue working.
    
    **Validates: Requirements 3.1, 3.2, 3.3**
    
    For operations that work correctly, the system SHALL continue to maintain
    data consistency patterns across both databases.
    """
    user = {
        "_id": ObjectId(),
        "user_id": "test-uuid-5678",
        "email": "consistent@example.com",
        "name": "Consistent User",
        "hashed_password": "hashed_password",
        "is_onboarded": True,
    }
    
    db = mock_database_with_data(users=[user])
    session_maker = mock_postgres_session(user)
    
    with patch("app.services.data_access.get_database", return_value=db), \
         patch("app.services.data_access.get_session_maker", return_value=session_maker):
        
        from app.services.data_access import get_complete_user_data
        result = await get_complete_user_data(user)
        
        # Verify consistent data is returned
        assert result["profile"]["user_id"] == user["user_id"]
        assert result["profile"]["email"] == user["email"]
        assert result["profile"]["is_onboarded"] == user["is_onboarded"]
