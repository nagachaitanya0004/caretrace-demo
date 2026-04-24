from __future__ import annotations

import asyncio
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


async def init_postgres() -> None:
    """
    Initialize PostgreSQL connection pool with retry logic.

    Raises RuntimeError if the connection cannot be established after retries.
    The application must not start without a working PostgreSQL connection.
    """
    global _engine, _async_session_maker

    logger.info('Initializing PostgreSQL connection')

    max_retries = 2
    retry_delay = 0.5  # Initial delay in seconds
    
    for attempt in range(1, max_retries + 1):
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

            # Test the connection with detailed validation
            async with _engine.begin() as conn:
                result = await conn.execute(text('SELECT 1'))
                if result.scalar() != 1:
                    raise RuntimeError('PostgreSQL connection test returned unexpected value')

            logger.info('PostgreSQL initialization complete')
            return  # Success - exit the function

        except Exception as exc:
            # Clean up on failure
            if _engine:
                try:
                    await _engine.dispose()
                except Exception:
                    pass
            _engine = None
            _async_session_maker = None
            
            # Log the attempt failure
            if attempt < max_retries:
                logger.warning(
                    'PostgreSQL connection attempt %d/%d failed: %s. Retrying in %.1f seconds...',
                    attempt, max_retries, exc, retry_delay
                )
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                # Final attempt failed - log detailed error and raise
                logger.error(
                    'PostgreSQL connection failed after %d attempts — application cannot start without database. '
                    'Error details: %s. '
                    'Please verify: (1) POSTGRES_URL is correct, (2) PostgreSQL server is running, '
                    '(3) network connectivity is available, (4) credentials are valid.',
                    max_retries, exc
                )
                raise RuntimeError(
                    f'PostgreSQL connection failed — application cannot start without database: {exc}'
                ) from exc


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


def get_session_maker() -> Optional[async_sessionmaker[AsyncSession]]:
    """
    Get the async session maker.

    Returns the *current* runtime value — safe to call after ``init_postgres()``.
    Always use this function instead of importing ``_async_session_maker`` directly,
    because a direct import captures the initial ``None`` value at module-load time.
    """
    return _async_session_maker


async def test_postgres_connection() -> bool:
    """
    Test PostgreSQL connection with detailed diagnostics.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        if _engine is None:
            logger.warning('PostgreSQL engine is not initialized')
            return False
        
        # Perform a real database query with timeout
        async with _engine.begin() as conn:
            result = await conn.execute(text("SELECT 1 as test"))
            test_value = result.scalar()
            
            if test_value == 1:
                logger.info('PostgreSQL connection test: SUCCESS')
                return True
            else:
                logger.warning('PostgreSQL connection test: UNEXPECTED RESULT (%s)', test_value)
                return False
                
    except asyncio.TimeoutError:
        logger.error('PostgreSQL connection test: TIMEOUT - database is not responding')
        return False
    except Exception as exc:
        logger.error('PostgreSQL connection test: FAILED - %s (type: %s)', exc, type(exc).__name__)
        return False
