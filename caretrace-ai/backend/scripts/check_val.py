import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["caretrace_ai"]
    # get collection info
    collections = await db.list_collections().to_list(100)
    for c in collections:
        if c['name'] == 'users':
            print("Users options:", c.get('options'))

asyncio.run(check())
