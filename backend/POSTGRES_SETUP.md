# PostgreSQL Integration Guide

## Overview

PostgreSQL support has been added to CareTrace AI backend in an **isolated and non-intrusive** way. The existing MongoDB functionality remains **completely unchanged** and is still the active database.

## Current Status

✅ **Completed:**
- PostgreSQL dependencies installed (SQLAlchemy, asyncpg, psycopg2-binary, alembic)
- Async database connection module created (`app/db/postgres.py`)
- Configuration added to `app/core/config.py`
- Environment variable `POSTGRES_URL` added to `.env.example`
- Standalone test script created (`app/db/test_postgres.py`)

❌ **NOT Done (Intentionally):**
- PostgreSQL is NOT integrated into any API routes
- PostgreSQL is NOT used in authentication
- PostgreSQL is NOT used for data storage
- No database models/tables created yet
- No data migration performed

## Architecture

```
CareTrace AI Backend
│
├── MongoDB (ACTIVE)
│   ├── app/db/db.py          ← Current database (unchanged)
│   ├── app/models/models.py  ← MongoDB collections (unchanged)
│   └── All API routes        ← Using MongoDB (unchanged)
│
└── PostgreSQL (READY, NOT ACTIVE)
    ├── app/db/postgres.py    ← New PostgreSQL module (isolated)
    └── app/db/test_postgres.py ← Test script (standalone)
```

## Installation

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `sqlalchemy==2.0.27` - ORM and async database toolkit
- `asyncpg==0.29.0` - Fast async PostgreSQL driver
- `psycopg2-binary==2.9.9` - Fallback PostgreSQL driver
- `alembic==1.13.1` - Database migration tool
- `greenlet==3.0.3` - Required for SQLAlchemy async

### 2. Setup PostgreSQL Database

#### Option A: Local PostgreSQL (Development)

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb caretrace_ai

# Create user (optional)
psql postgres
CREATE USER caretrace_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE caretrace_ai TO caretrace_user;
\q
```

#### Option B: Docker PostgreSQL

```bash
docker run --name caretrace-postgres \
  -e POSTGRES_DB=caretrace_ai \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```

#### Option C: Cloud PostgreSQL (Production)

Use managed PostgreSQL services:
- **AWS RDS** - Amazon Relational Database Service
- **Google Cloud SQL** - Google Cloud PostgreSQL
- **Azure Database** - Azure Database for PostgreSQL
- **Supabase** - Open source Firebase alternative
- **Neon** - Serverless PostgreSQL

### 3. Configure Environment

Add to your `.env` file:

```env
# PostgreSQL Configuration (Optional - Not currently used)
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/caretrace_ai
```

**Format:** `postgresql+asyncpg://username:password@host:port/database`

**Examples:**
```env
# Local development
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/caretrace_ai

# Docker
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/caretrace_ai

# Cloud (AWS RDS example)
POSTGRES_URL=postgresql+asyncpg://user:pass@mydb.abc123.us-east-1.rds.amazonaws.com:5432/caretrace_ai

# Cloud (Supabase example)
POSTGRES_URL=postgresql+asyncpg://postgres:pass@db.abc123.supabase.co:5432/postgres
```

## Testing PostgreSQL Connection

Run the standalone test script:

```bash
cd backend
python -m app.db.test_postgres
```

**Expected Output (Success):**
```
======================================================================
PostgreSQL Connection Test
======================================================================

Test 1: Initializing PostgreSQL connection...
✓ PostgreSQL initialization completed

Test 2: Testing PostgreSQL connection...
✓ PostgreSQL connection test PASSED

Test 3: Closing PostgreSQL connection...
✓ PostgreSQL connection closed successfully

======================================================================
Test Summary
======================================================================
✓ All tests PASSED

PostgreSQL is ready for integration!
The existing MongoDB application is NOT affected.
======================================================================
```

**If Tests Fail:**
1. Verify PostgreSQL server is running: `pg_isready`
2. Check connection string in `.env`
3. Verify database exists: `psql -l`
4. Check credentials and permissions
5. Ensure port 5432 is not blocked

## API Usage (Future)

The PostgreSQL module is ready but NOT integrated. Here's how it will be used:

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db

@router.get('/example')
async def example_route(db: AsyncSession = Depends(get_db)):
    """Example route using PostgreSQL (NOT ACTIVE YET)"""
    # This is how PostgreSQL will be used in the future
    result = await db.execute(text("SELECT * FROM users"))
    return result.fetchall()
```

## Next Steps (Future Work)

### Phase 1: Create Database Models
- [ ] Create SQLAlchemy ORM models for all collections
- [ ] Define relationships and constraints
- [ ] Create Alembic migration scripts
- [ ] Generate initial schema

### Phase 2: Repository Pattern
- [ ] Create repository abstraction layer
- [ ] Implement dual database support
- [ ] Add database selection logic
- [ ] Test with both databases

### Phase 3: Data Migration
- [ ] Export MongoDB data
- [ ] Transform ObjectIds to UUIDs
- [ ] Import into PostgreSQL
- [ ] Verify data integrity

### Phase 4: Cutover
- [ ] Switch routes to PostgreSQL
- [ ] Update authentication
- [ ] Migrate file storage
- [ ] Remove MongoDB dependencies

## Important Notes

⚠️ **DO NOT:**
- Modify any existing MongoDB code
- Change API routes to use PostgreSQL yet
- Remove MongoDB dependencies
- Alter authentication system

✅ **SAFE TO DO:**
- Test PostgreSQL connection
- Create database models (in separate files)
- Experiment with SQLAlchemy queries
- Set up Alembic migrations

## Troubleshooting

### Connection Refused
```
Error: connection refused
```
**Solution:** Start PostgreSQL server
```bash
brew services start postgresql@15
# or
docker start caretrace-postgres
```

### Authentication Failed
```
Error: password authentication failed
```
**Solution:** Check username/password in `POSTGRES_URL`

### Database Does Not Exist
```
Error: database "caretrace_ai" does not exist
```
**Solution:** Create database
```bash
createdb caretrace_ai
```

### Port Already in Use
```
Error: port 5432 already in use
```
**Solution:** Stop other PostgreSQL instances or use different port

## Support

For questions or issues:
1. Check PostgreSQL logs: `tail -f /usr/local/var/log/postgresql@15.log`
2. Verify configuration: `python -m app.db.test_postgres`
3. Review SQLAlchemy docs: https://docs.sqlalchemy.org/
4. Check asyncpg docs: https://magicstack.github.io/asyncpg/

## License

Same as CareTrace AI - MIT License
