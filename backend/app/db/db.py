from __future__ import annotations

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

from app.core.config import MONGO_DB, MONGO_URI
from app.core.logger import logger
from app.models.setup import get_collection_configuration

from typing import Optional

client: Optional[AsyncIOMotorClient] = None
database = None
_gridfs_bucket: Optional[AsyncIOMotorGridFSBucket] = None


def normalize_index_fields(fields: list[tuple[str, str]]) -> list[tuple[str, int]]:
    return [(name, 1 if direction == 'asc' else -1) for name, direction in fields]


async def init_db() -> None:
    """
    Initialize MongoDB client with retry logic and connection validation.
    
    Raises RuntimeError if the connection cannot be established after retries.
    The application must not start without a working MongoDB connection.
    """
    global client, database
    logger.info('Initializing MongoDB client')
    
    max_retries = 2
    retry_delay = 0.5  # Initial delay in seconds
    
    for attempt in range(1, max_retries + 1):
        try:
            client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=3000)
            database = client[MONGO_DB]
            
            # Test the connection immediately with timeout
            await database.command('ping')
            logger.info('MongoDB connection test successful')
            break  # Success - exit the retry loop
            
        except Exception as exc:
            # Clean up on failure
            if client:
                client.close()
                client = None
            database = None
            
            # Log the attempt failure
            if attempt < max_retries:
                logger.warning(
                    'MongoDB connection attempt %d/%d failed: %s. Retrying in %.1f seconds...',
                    attempt, max_retries, exc, retry_delay
                )
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                # Final attempt failed - log detailed error and raise
                logger.error(
                    'MongoDB connection failed after %d attempts — application cannot start without database. '
                    'Error details: %s. '
                    'Please verify: (1) MONGO_URI is correct, (2) MongoDB server is running, '
                    '(3) network connectivity is available, (4) authentication credentials are valid.',
                    max_retries, exc
                )
                raise RuntimeError(f'MongoDB connection failed — application cannot start without database: {exc}') from exc

    # Connection successful - proceed with collection setup
    try:
        config = get_collection_configuration()
        collection_names = await database.list_collection_names()

        for collection_name, cfg in config.items():
            if collection_name not in collection_names:
                logger.info('Creating collection %s', collection_name)
                await database.create_collection(collection_name, validator=cfg['validator'])
            else:
                logger.info('Updating validator for collection %s', collection_name)
                try:
                    await database.command(
                        {
                            'collMod': collection_name,
                            'validator': cfg['validator'],
                            'validationLevel': 'moderate',
                        }
                    )
                except Exception as exc:
                    logger.warning('Could not update collection validator %s: %s', collection_name, exc)

            for index in cfg.get('indexes', []):
                field_spec = normalize_index_fields(index['fields'])
                logger.info('Creating index %s on %s', index['name'], collection_name)
                await database[collection_name].create_index(
                    field_spec,
                    name=index['name'],
                    unique=index.get('unique', False),
                )

        logger.info('MongoDB initialization complete')
        
        # Ensure demo account exists
        from app.db.seed import ensure_demo_account
        await ensure_demo_account()
        
    except Exception as exc:
        # Collection/index setup failed - clean up and raise
        if client:
            client.close()
            client = None
        database = None
        logger.error(
            'MongoDB collection setup failed — application cannot start. Error details: %s',
            exc
        )
        raise RuntimeError(f'MongoDB collection setup failed — application cannot start: {exc}') from exc


async def close_db() -> None:
    global client
    if client:
        logger.info('Closing MongoDB client')
        client.close()


def get_database():
    if database is None:
        raise RuntimeError(
            'MongoDB database not initialized. '
            'Ensure init_db() was called successfully during application startup.'
        )
    return database


def get_gridfs_bucket() -> AsyncIOMotorGridFSBucket:
    """Get GridFS bucket for file storage."""
    global _gridfs_bucket
    if _gridfs_bucket is None:
        db = get_database()
        _gridfs_bucket = AsyncIOMotorGridFSBucket(db)
    return _gridfs_bucket


async def test_mongodb_connection() -> bool:
    """
    Test MongoDB connection with detailed diagnostics.
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        if client is None or database is None:
            logger.warning('MongoDB client is not initialized')
            return False
        
        # Perform a real database command with timeout
        result = await database.command('ping')
        
        if result.get('ok') == 1:
            logger.info('MongoDB connection test: SUCCESS')
            return True
        else:
            logger.warning('MongoDB connection test: UNEXPECTED RESULT (%s)', result)
            return False
            
    except asyncio.TimeoutError:
        logger.error('MongoDB connection test: TIMEOUT - database is not responding')
        return False
    except Exception as exc:
        logger.error('MongoDB connection test: FAILED - %s (type: %s)', exc, type(exc).__name__)
        return False
