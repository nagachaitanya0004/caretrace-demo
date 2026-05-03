import motor.motor_asyncio
import asyncio
import sys

async def ping_mongo():
    uri = "mongodb+srv://caretrace_user:caretrace@caretrace-ai.hvtbghx.mongodb.net/?appName=caretrace-ai"
    client = motor.motor_asyncio.AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command('ping')
        print("SUCCESS: Connected to MongoDB Atlas")
    except Exception as e:
        print(f"FAIL: Could not connect to MongoDB Atlas. Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(ping_mongo())
