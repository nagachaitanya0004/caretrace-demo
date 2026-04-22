"""
PostgreSQL database connection module using SQLAlchemy (async).

This module provides PostgreSQL support alongside the existing MongoDB implementation.
It does NOT replace or modify any MongoDB functionality.

Usage:
    - Use get_db() as a FastAPI dependency to get async database sessions
    - Call init_postgres() during app startup
    - Call close_postgres() during app shutdown
"""

from __future__ import annotations

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
    Initialize PostgreSQL connection pool.
    
    This function creates an async SQLAlchemy engine and session maker.
    It does NOT interfere with MongoDB initialization.
    """
    global _engine, _async_session_maker
    
    logger.info('Initializing PostgreSQL connection')
    
    try:
        # Create async engine with connection pooling
        _engine = create_async_engine(
            POSTGRES_URL,
            echo=False,  # Set to True for SQL query logging
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,  # Verify connections before using
            pool_recycle=3600,  # Recycle connections after 1 hour
        )
        
        # Create async session maker
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
                logger.info('PostgreSQL connection test successful')
            else:
                logger.warning('PostgreSQL connection test returned unexpected value: %s', test_value)
        
        logger.info('PostgreSQL initialization complete')
        
    except Exception as exc:
        logger.error('Failed to initialize PostgreSQL: %s', exc)
        logger.warning('Application will continue with MongoDB only')
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
