from unittest.mock import AsyncMock, patch, call
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@patch("app.main.get_database")
@patch("app.main.postgres_manager")
def test_read_main(mock_pg_manager, mock_mongo):
    # Mock Postgres manager is_active status to True
    mock_pg_manager.is_active = True
    
    # Mock MongoDB connection and ping
    mock_db = AsyncMock()
    mock_db.command = AsyncMock()
    mock_mongo.return_value = mock_db

    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["success"] == True
    assert response.json()["data"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_lifespan_startup_sequence():
    """
    Verify startup sequence: MongoDB init → PostgreSQL init.
    
    **Validates: Requirements 2.2, 3.5, 9.4**
    """
    with patch('app.main.init_db', new_callable=AsyncMock) as mock_init_db, \
         patch('app.main.init_postgres', new_callable=AsyncMock) as mock_init_postgres, \
         patch('app.db.seed.ensure_demo_account', new_callable=AsyncMock) as mock_ensure_demo, \
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
        mock_ensure_demo.assert_called_once()
        
        # Verify shutdown sequence
        mock_close_db.assert_called_once()
        mock_close_postgres.assert_called_once()
