"""
Standalone PostgreSQL connection test script.

This script tests the PostgreSQL connection independently without affecting
the running MongoDB-based application.

Usage:
    python -m app.db.test_postgres

Requirements:
    - PostgreSQL server running
    - POSTGRES_URL configured in .env file
    - Required packages installed (sqlalchemy, asyncpg)
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.db.postgres import init_postgres, close_postgres, test_postgres_connection
from app.core.logger import logger


async def main():
    """Run PostgreSQL connection tests."""
    print("=" * 70)
    print("PostgreSQL Connection Test")
    print("=" * 70)
    print()
    
    # Test 1: Initialize connection
    print("Test 1: Initializing PostgreSQL connection...")
    try:
        await init_postgres()
        print("✓ PostgreSQL initialization completed")
    except Exception as exc:
        print(f"✗ PostgreSQL initialization failed: {exc}")
        return
    
    print()
    
    # Test 2: Test connection
    print("Test 2: Testing PostgreSQL connection...")
    connection_ok = await test_postgres_connection()
    
    if connection_ok:
        print("✓ PostgreSQL connection test PASSED")
    else:
        print("✗ PostgreSQL connection test FAILED")
    
    print()
    
    # Test 3: Close connection
    print("Test 3: Closing PostgreSQL connection...")
    try:
        await close_postgres()
        print("✓ PostgreSQL connection closed successfully")
    except Exception as exc:
        print(f"✗ Failed to close PostgreSQL connection: {exc}")
    
    print()
    print("=" * 70)
    print("Test Summary")
    print("=" * 70)
    
    if connection_ok:
        print("✓ All tests PASSED")
        print()
        print("PostgreSQL is ready for integration!")
        print("The existing MongoDB application is NOT affected.")
    else:
        print("✗ Some tests FAILED")
        print()
        print("Please check:")
        print("  1. PostgreSQL server is running")
        print("  2. POSTGRES_URL is correctly configured in .env")
        print("  3. Database credentials are correct")
        print("  4. Network connectivity to PostgreSQL server")
        print()
        print("The existing MongoDB application continues to work normally.")
    
    print("=" * 70)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as exc:
        print(f"\n\nUnexpected error: {exc}")
        import traceback
        traceback.print_exc()
