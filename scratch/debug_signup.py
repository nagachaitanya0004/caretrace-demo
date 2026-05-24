import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the project directories to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

load_dotenv()

from app.db.db import init_db, get_database
from app.schemas.schemas import UserCreate
from app.api.auth import signup
from fastapi import Request

async def main():
    await init_db()
    db = get_database()
    print("Database connection test passed.")
    
    # Create request and payload objects
    # We can pass dummy Request or mock it.
    scope = {"type": "http", "path": "/auth/signup"}
    request = Request(scope)
    
    payload = UserCreate(
        name="Debug User",
        email="debug_user@example.com",
        password="password123"
    )
    
    try:
        print("Calling signup endpoint logic...")
        # Since it calls AuditService, let's see if that fails
        # Let's inspect what happens inside:
        from app.db.postgres import init_postgres
        await init_postgres()
        
        # Clear existing test user if present
        await db.users.delete_one({"email": "debug_user@example.com"})
        
        result = await signup(request, payload)
        print("Signup succeeded:", result)
    except Exception as e:
        import traceback
        print("Signup failed with exception:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
