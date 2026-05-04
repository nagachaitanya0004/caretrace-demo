import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.postgres.audit_service import AuditService

@pytest.mark.asyncio
async def test_audit_log_pg_inactive():
    with patch("app.services.postgres.audit_service.get_pg_session", return_value=None):
        with patch("app.services.postgres.audit_service.logger") as mock_logger:
            await AuditService.log_action("user1", "test_action")
            mock_logger.debug.assert_called()

@pytest.mark.asyncio
async def test_audit_log_pg_failure_fallback():
    # Mock PostgreSQL session
    mock_session = MagicMock()
    mock_session.__aenter__.return_value = mock_session
    mock_session.__aexit__.return_value = None
    mock_session.commit = AsyncMock(side_effect=Exception("PG Down"))
    
    # Mock MongoDB fallback
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_collection.insert_one = AsyncMock()
    mock_db.audit_fallback = mock_collection
    
    # Patch where get_pg_session is imported in audit_service
    with patch("app.services.postgres.audit_service.get_pg_session", return_value=mock_session):
        # Patch where get_database is imported in audit_service
        with patch("app.services.postgres.audit_service.get_database", return_value=mock_db):
            await AuditService.log_action("user1", "test_action")
            mock_collection.insert_one.assert_called()
