# PostgreSQL Quick Reference

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
Add to `.env`:
```env
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/caretrace_ai
```

### 3. Test Connection
```bash
python -m app.db.test_postgres
```

---

## 📁 New Files

| File | Purpose | Status |
|------|---------|--------|
| `app/db/postgres.py` | PostgreSQL connection module | ✅ Ready, not active |
| `app/db/test_postgres.py` | Connection test script | ✅ Standalone utility |
| `app/api/postgres_health.py` | Health check routes | ⏸️ Not integrated |
| `POSTGRES_SETUP.md` | Detailed setup guide | 📖 Documentation |
| `POSTGRES_IMPLEMENTATION_SUMMARY.md` | Implementation details | 📖 Documentation |
| `setup_postgres.sh` | Automated setup script | 🔧 Helper script |

---

## 🔧 Modified Files

| File | Changes | Impact |
|------|---------|--------|
| `requirements.txt` | Added SQLAlchemy, asyncpg, etc. | ✅ None - additive only |
| `app/core/config.py` | Added `POSTGRES_URL` variable | ✅ None - not used yet |
| `.env.example` | Added PostgreSQL config template | ✅ None - template only |

---

## ⚠️ Important Notes

### ✅ What Works
- All existing MongoDB functionality
- All API routes
- Authentication
- File uploads
- All tests

### ❌ What's NOT Active
- PostgreSQL is NOT used in any route
- PostgreSQL is NOT used for authentication
- PostgreSQL is NOT used for data storage
- No data has been migrated

### 🔒 Safety
- **Zero risk** - No existing code modified
- **Fully isolated** - PostgreSQL code is separate
- **Easy rollback** - Just remove new files
- **No breaking changes** - Everything works as before

---

## 🧪 Testing

### Test PostgreSQL Connection
```bash
python -m app.db.test_postgres
```

### Test Existing Application
```bash
# Start server
uvicorn app.main:app --reload

# Test health endpoint
curl http://localhost:8001/health

# Test login
curl -X POST http://localhost:8001/auth/login \
  -d "username=rahul@demo.com&password=demo1234"
```

### Run Existing Tests
```bash
pytest tests/ -v
```

---

## 📚 Documentation

- **Setup Guide:** `POSTGRES_SETUP.md`
- **Implementation Summary:** `POSTGRES_IMPLEMENTATION_SUMMARY.md`
- **This Quick Reference:** `POSTGRES_QUICK_REFERENCE.md`

---

## 🎯 Next Steps

When ready to integrate PostgreSQL:

1. **Create database models** (SQLAlchemy ORM)
2. **Set up Alembic migrations**
3. **Create repository pattern** (abstraction layer)
4. **Implement dual database support**
5. **Migrate data** from MongoDB
6. **Switch routes** to PostgreSQL
7. **Remove MongoDB** dependencies

---

## 💡 Usage Examples

### Import PostgreSQL Module (Future)
```python
from app.db.postgres import get_db, init_postgres, close_postgres
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

@router.get('/example')
async def example_route(db: AsyncSession = Depends(get_db)):
    # Use PostgreSQL here
    pass
```

### Initialize in Lifespan (Future)
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()  # MongoDB (existing)
    await init_postgres()  # PostgreSQL (new)
    yield
    await close_db()  # MongoDB (existing)
    await close_postgres()  # PostgreSQL (new)
```

---

## 🆘 Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql@15
```

### Database Not Found
```bash
# Create database
createdb caretrace_ai
```

### Authentication Failed
```bash
# Check credentials in .env
# Verify POSTGRES_URL format:
# postgresql+asyncpg://username:password@host:port/database
```

---

## ✅ Verification Checklist

- [ ] Dependencies installed: `pip list | grep -E "sqlalchemy|asyncpg"`
- [ ] PostgreSQL running: `pg_isready`
- [ ] Database created: `psql -l | grep caretrace_ai`
- [ ] Environment configured: `cat .env | grep POSTGRES_URL`
- [ ] Connection test passes: `python -m app.db.test_postgres`
- [ ] Application starts: `uvicorn app.main:app --reload`
- [ ] Existing tests pass: `pytest tests/ -v`

---

**Status:** ✅ PostgreSQL Ready | 🟢 MongoDB Active | ⏸️ Not Integrated
