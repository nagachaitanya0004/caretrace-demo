import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add the current directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def run_diagnostics():
    load_dotenv()
    
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB", "caretrace")
    
    if not mongo_uri:
        print("ERROR: MONGO_URI environment variable not set")
        sys.exit(1)
        
    print(f"Connecting to MongoDB: {mongo_uri.split('@')[-1]}")
    client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
    
    try:
        # 1. Ping
        await client.admin.command('ping')
        print("✅ MongoDB connection test successful")
        
        db = client[db_name]
        
        # 2. Get Collections and Counts
        collections = ['users', 'symptoms', 'alerts', 'analysis', 'health_metrics', 'medications']
        print(f"\nDatabase: {db_name}")
        print("-" * 40)
        
        for coll_name in collections:
            try:
                count = await db[coll_name].count_documents({})
                print(f"Collection: {coll_name:15} | Documents: {count}")
            except Exception as e:
                print(f"Collection: {coll_name:15} | Error: {e}")
                
        print("-" * 40)
        print("Diagnostics complete.")
        
    except Exception as exc:
        print(f"❌ MongoDB diagnostics failed: {exc}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
