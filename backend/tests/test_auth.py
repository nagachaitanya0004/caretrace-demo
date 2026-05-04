import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.fixture
def mock_db_layer():
    # We patch the functions where they are USED
    mock_db = MagicMock()
    mock_db.users = MagicMock()
    mock_db.users.find_one = AsyncMock(return_value=None)
    mock_db.users.insert_one = AsyncMock(return_value=MagicMock(inserted_id="mock_id"))
    
    with patch("app.api.auth.get_database", return_value=mock_db):
        with patch("app.db.seed.ensure_demo_account", AsyncMock()):
            with patch("app.db.db.init_db", AsyncMock()):
                yield mock_db

@pytest.mark.asyncio
async def test_signup_success(mock_db_layer):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/auth/signup", json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "password123"
        })
    assert response.status_code == 200
    assert response.json()["success"] is True

@pytest.mark.asyncio
async def test_signup_duplicate_email(mock_db_layer):
    mock_db_layer.users.find_one.return_value = {"email": "dup@example.com"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/auth/signup", json={
            "name": "Test User",
            "email": "dup@example.com",
            "password": "password123"
        })
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_login_success(mock_db_layer):
    from bcrypt import hashpw, gensalt
    hpw = hashpw(b"password123", gensalt()).decode()
    mock_db_layer.users.find_one.return_value = {
        "email": "login@example.com",
        "hashed_password": hpw,
        "user_id": "user123"
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/auth/login", data={
            "username": "login@example.com",
            "password": "password123"
        })
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_login_wrong_password(mock_db_layer):
    mock_db_layer.users.find_one.return_value = {
        "email": "wrong@example.com",
        "hashed_password": "wrong_hash"
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/auth/login", data={
            "username": "wrong@example.com",
            "password": "password123"
        })
    assert response.status_code == 401
