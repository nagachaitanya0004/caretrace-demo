import os
import sys
import pytest
import mongomock

# Make the backend package root importable as 'app' regardless of
# which directory pytest is invoked from.
sys.path.insert(0, os.path.dirname(__file__))

# Provide required env vars so config._require() doesn't raise during
# test collection. Real values are not needed — tests mock all I/O.
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("POSTGRES_URL", "postgresql+asyncpg://test:test@localhost:5432/test")

@pytest.fixture(autouse=True)
def mock_mongo(monkeypatch):
    """
    Auto-applied fixture that patches all MongoDB connections to use mongomock.
    Ensures tests don't require a real MongoDB instance.
    """
    with mongomock.patch(servers=(('localhost', 27017),)):
        yield
