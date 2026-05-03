from __future__ import annotations

import asyncio
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import POSTGRES_URI
from app.core.logger import logger

# ── Secondary Database Declarative Base ──────────────────────────────────────
class PostgresBase(DeclarativeBase):
    pass

class PostgresManager:
    """
    Manages the secondary PostgreSQL connection.
    Designed to be optional and non-blocking for the primary application.
    """
    def __init__(self):
        self.engine = None
        self.session_maker = None
        self.is_active = False

    async def initialize(self):
        """Attempt to initialize PostgreSQL. Failure does not block app startup."""
        if not POSTGRES_URI:
            logger.info("POSTGRES_URI not provided. Running in MongoDB-only mode.")
            return

        try:
            self.engine = create_async_engine(
                POSTGRES_URI,
                echo=False,
                pool_pre_ping=True,
                connect_args={"server_settings": {"application_name": "caretrace-secondary"}}
            )
            
            self.session_maker = async_sessionmaker(
                self.engine, 
                class_=AsyncSession, 
                expire_on_commit=False
            )
            
            # Test connection with a short timeout
            async with self.engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
                
            self.is_active = True
            logger.info("PostgreSQL secondary database initialized successfully.")
            
            # Create tables for secondary logic
            async with self.engine.begin() as conn:
                await conn.run_sync(PostgresBase.metadata.create_all)
            logger.info("PostgreSQL secondary schemas synchronized.")
            
        except Exception as exc:
            self.is_active = False
            logger.warning("PostgreSQL initialization failed (Secondary/Optional): %s", exc)
            logger.info("Proceeding with MongoDB-only primary features.")

    async def close(self):
        if self.engine:
            await self.engine.dispose()
            logger.info("PostgreSQL secondary connection closed.")

    def get_session(self) -> Optional[AsyncSession]:
        if not self.is_active or self.session_maker is None:
            return None
        return self.session_maker()

postgres_manager = PostgresManager()

async def init_postgres():
    await postgres_manager.initialize()

async def close_postgres():
    await postgres_manager.close()

def get_pg_session():
    return postgres_manager.get_session()
