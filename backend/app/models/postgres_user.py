"""
PostgreSQL User Model using SQLAlchemy ORM.

This module defines the PostgresUser model that mirrors the MongoDB user schema
while maintaining complete isolation from existing MongoDB functionality.

The model uses async SQLAlchemy patterns compatible with FastAPI.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.postgres import Base
from app.core.logger import logger


class PostgresUser(Base):
    """
    PostgreSQL User model mirroring MongoDB USER_VALIDATOR schema.
    
    This model represents the users table in PostgreSQL with fields that
    correspond to the MongoDB user document structure.
    
    Key differences from MongoDB:
    - Uses UUID (as string) instead of ObjectId for primary key
    - Explicit string length constraints for all text fields
    - Nullable fields explicitly marked with nullable=True
    - Automatic timestamp management via SQLAlchemy
    """
    
    __tablename__ = "users"
    
    # Primary Key - UUID stored as string for compatibility
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    
    # Required Authentication Fields
    email: Mapped[str] = mapped_column(
        String(255), 
        unique=True, 
        index=True, 
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Optional Profile Fields
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Health Profile Fields
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    bmi: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    health_goal: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Status Fields
    is_onboarded: Mapped[bool] = mapped_column(
        Boolean, 
        default=False, 
        nullable=False
    )
    
    # Timestamp Fields - Automatically Managed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=func.now(), 
        onupdate=func.now()
    )
    
    def __repr__(self) -> str:
        """String representation of PostgresUser instance."""
        return f"<PostgresUser(id={self.id}, email={self.email}, name={self.name})>"


async def create_postgres_tables() -> None:
    """
    Create all PostgreSQL tables defined by SQLAlchemy models.
    
    This function:
    - Uses CREATE TABLE IF NOT EXISTS semantics
    - Logs successful table creation
    - Raises RuntimeError on critical errors (application cannot start without PostgreSQL tables)
    - Does NOT interfere with MongoDB initialization
    
    The function is called during application startup after PostgreSQL
    connection initialization.
    
    Raises:
        RuntimeError: If engine is not initialized or table creation fails
    """
    from app.db.postgres import get_engine
    
    engine = get_engine()
    
    if engine is None:
        error_msg = (
            "PostgreSQL engine not initialized - cannot create tables. "
            "Ensure init_postgres() was called successfully before table creation."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    
    try:
        logger.info("Creating PostgreSQL tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("PostgreSQL tables created successfully")
    except Exception as exc:
        error_msg = (
            f"PostgreSQL table creation failed: {exc}. "
            f"Error type: {type(exc).__name__}. "
            "Please verify: (1) database user has CREATE TABLE privileges, "
            "(2) schema exists and is accessible, (3) no conflicting table definitions exist."
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg) from exc
