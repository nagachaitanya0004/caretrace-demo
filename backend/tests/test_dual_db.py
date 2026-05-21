import pytest
from unittest.mock import patch, AsyncMock
from app.main import lifespan
from fastapi import FastAPI

@pytest.mark.asyncio
async def test_lifespan_mongo_failure():
    app = FastAPI()
    # Path init_db where it is used in app.main
    with patch("app.main.init_db", AsyncMock(side_effect=Exception("Connection Failed"))):
        with patch("app.main.validate_environment", return_value={"ENV": "development"}):
            with pytest.raises(RuntimeError) as exc:
                async with lifespan(app):
                    pass
            assert "Primary Database (MongoDB) connection failed" in str(exc.value)

@pytest.mark.asyncio
async def test_lifespan_postgres_failure_non_blocking(caplog):
    app = FastAPI()
    # Patch all initialization functions where they are used in app.main
    with patch("app.main.init_db", AsyncMock()):
        with patch("app.db.seed.ensure_demo_account", AsyncMock()):
            with patch("app.main.init_postgres", AsyncMock(side_effect=Exception("PG Down"))):
                with patch("app.main.validate_environment", return_value={"ENV": "development"}):
                    async with lifespan(app):
                        pass
                    # Check caplog for the warning
                    assert any("PG Down" in record.message for record in caplog.records)
