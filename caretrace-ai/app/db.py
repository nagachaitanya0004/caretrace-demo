from datetime import timedelta

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import MONGO_DB, MONGO_URI
from app.logger import logger
from backend.setup import get_collection_configuration

client: AsyncIOMotorClient | None = None
database = None


def normalize_index_fields(fields: list[tuple[str, str]]) -> list[tuple[str, int]]:
    return [(name, 1 if direction == 'asc' else -1) for name, direction in fields]


async def init_db() -> None:
    global client, database
    logger.info('Initializing MongoDB client')
    client = AsyncIOMotorClient(MONGO_URI)
    database = client[MONGO_DB]

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


async def close_db() -> None:
    global client
    if client:
        logger.info('Closing MongoDB client')
        client.close()


def get_database():
    if database is None:
        raise RuntimeError('Database not initialized')
    return database
