from __future__ import annotations

import os
from pathlib import Path
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

from app.core.config import POSTGRES_URL
from app.core.logger import logger

# SQLAlchemy Base for ORM models
Base = declarative_base()

# Global engine and session maker
_engine: Optional[AsyncEngine] = None
_async_session_maker: Optional[async_sessionmaker[AsyncSession]] = None


def _sqlite_url() -> str:
    """Return an async SQLite URL pointing to a file next to the backend dir."""
    db_dir = Path(__file__).resolve().parent.parent.parent  # backend/
    db_path = db_dir / "caretrace_local.db"
    return f"sqlite+aiosqlite:///{db_path}"


async def init_postgres() -> None:
    """
    Initialize SQL database connection pool.

    Tries PostgreSQL first.  If the connection fails (e.g. server not
    installed / not running), falls back to a local SQLite file so the
    application always starts with a working ``_async_session_maker``.
    """
    global _engine, _async_session_maker

    # ── Attempt 1: PostgreSQL ────────────────────────────────────────
    logger.info('Initializing PostgreSQL connection')

    try:
        _engine = create_async_engine(
            POSTGRES_URL,
            echo=False,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )

        _async_session_maker = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

        # Test connection
        async with _engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            test_value = result.scalar()
            if test_value == 1:
                logger.info('PostgreSQL connected successfully')
            else:
                logger.warning('PostgreSQL connection test returned unexpected value: %s', test_value)

        logger.info('PostgreSQL initialization complete')
        return  # success — done

    except Exception as exc:
        logger.warning('PostgreSQL connection failed: %s', exc)
        # Clean up the failed engine
        if _engine:
            try:
                await _engine.dispose()
            except Exception:
                pass
        _engine = None
        _async_session_maker = None

    # ── Attempt 2: SQLite fallback ───────────────────────────────────
    fallback_url = _sqlite_url()
    logger.info('Falling back to local SQLite: %s', fallback_url)

    try:
        _engine = create_async_engine(
            fallback_url,
            echo=False,
        )

        _async_session_maker = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

        # Test connection
        async with _engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            test_value = result.scalar()
            if test_value == 1:
                logger.info('SQLite fallback connected successfully')

        logger.info('SQLite initialization complete (local development mode)')

    except Exception as exc:
        logger.error('SQLite fallback also failed: %s', exc)
        _engine = None
        _async_session_maker = None


async def close_postgres() -> None:
    """
    Close PostgreSQL connection pool.
    
    This function disposes the SQLAlchemy engine.
    It does NOT interfere with MongoDB shutdown.
    """
    global _engine
    
    if _engine:
        logger.info('Closing PostgreSQL connection')
        await _engine.dispose()
        _engine = None
        logger.info('PostgreSQL connection closed')


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency to get async database session.
    
    Usage:
        @router.get('/example')
        async def example_route(db: AsyncSession = Depends(get_db)):
            # Use db session here
            pass
    
    Yields:
        AsyncSession: SQLAlchemy async session
    
    Raises:
        RuntimeError: If PostgreSQL is not initialized
    """
    if _async_session_maker is None:
        raise RuntimeError('PostgreSQL is not initialized. Call init_postgres() first.')
    
    async with _async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_engine() -> Optional[AsyncEngine]:
    """
    Get the SQLAlchemy async engine.
    
    Returns:
        Optional[AsyncEngine]: The engine instance, or None if not initialized
    """
    return _engine


async def test_postgres_connection() -> bool:
    """
    Test PostgreSQL connection without raising exceptions.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        if _engine is None:
            logger.warning('PostgreSQL engine is not initialized')
            return False
        
        async with _engine.begin() as conn:
            result = await conn.execute(text("SELECT 1 as test"))
            test_value = result.scalar()
            
            if test_value == 1:
                logger.info('PostgreSQL connection test: SUCCESS')
                return True
            else:
                logger.warning('PostgreSQL connection test: UNEXPECTED RESULT (%s)', test_value)
                return False
                
    except Exception as exc:
        logger.error('PostgreSQL connection test: FAILED - %s', exc)
        return False
