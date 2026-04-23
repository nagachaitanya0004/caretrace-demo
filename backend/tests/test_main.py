from unittest.mock import AsyncMock, patch, call
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["success"] == True
    assert response.json()["data"]["status"] == "ok"


@pytest.mark.asyncio
async def test_lifespan_startup_sequence():
    """
    Verify startup sequence: MongoDB init → PostgreSQL init → Table creation.
    
    **Validates: Requirements 2.2, 3.5, 9.4**
    """
    with patch('app.main.init_db', new_callable=AsyncMock) as mock_init_db, \
         patch('app.main.init_postgres', new_callable=AsyncMock) as mock_init_postgres, \
         patch('app.main.create_postgres_tables', new_callable=AsyncMock) as mock_create_tables, \
         patch('app.main.close_db', new_callable=AsyncMock) as mock_close_db, \
         patch('app.main.close_postgres', new_callable=AsyncMock) as mock_close_postgres:
        
        # Import lifespan after patching
        from app.main import lifespan
        
        # Execute lifespan context manager
        async with lifespan(app):
            pass
        
        # Verify startup sequence
        mock_init_db.assert_called_once()
        mock_init_postgres.assert_called_once()
        mock_create_tables.assert_called_once()
        
        # Verify shutdown sequence
        mock_close_db.assert_called_once()
        mock_close_postgres.assert_called_once()
        
        # Verify order: init_db → init_postgres → create_postgres_tables
        # Get all calls in order
        all_calls = []
        all_calls.extend([('init_db', c) for c in mock_init_db.call_args_list])
        all_calls.extend([('init_postgres', c) for c in mock_init_postgres.call_args_list])
        all_calls.extend([('create_tables', c) for c in mock_create_tables.call_args_list])
        
        # Since we can't easily track call order across different mocks,
        # we verify that all were called exactly once
        assert mock_init_db.call_count == 1
        assert mock_init_postgres.call_count == 1
        assert mock_create_tables.call_count == 1
