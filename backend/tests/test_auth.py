import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from unittest.mock import patch, AsyncMock, MagicMock

@pytest.fixture
def mock_db_layer():
    mock_db = MagicMock()
    mock_db.users = MagicMock()
    
    stored_user = {}
    
    async def mock_insert_one(doc, *args, **kwargs):
        stored_user.clear()
        stored_user.update(doc)
        stored_user["_id"] = "mock_id"
        return MagicMock(inserted_id="mock_id")
        
    async def mock_find_one(query, *args, **kwargs):
        if query and "email" in query:
            return mock_db.users.find_one.return_value
        return stored_user if stored_user else mock_db.users.find_one.return_value
        
    mock_db.users.find_one = AsyncMock(side_effect=mock_find_one)
    mock_db.users.find_one.return_value = None
    mock_db.users.insert_one = AsyncMock(side_effect=mock_insert_one)
    
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
    assert response.status_code == 201
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
