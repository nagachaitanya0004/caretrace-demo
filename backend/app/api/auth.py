from __future__ import annotations
from datetime import datetime
from typing import Any
import re
import uuid

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError
import jwt

from app.db.db import get_database
from app.db.postgres import get_session_maker
from app.models.postgres_user import PostgresUser
from app.core.responses import success_response
from app.core.config import ALGORITHM, SECRET_KEY
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.core.logger import logger
from app.schemas.schemas import UserCreate
from app.core.responses import serialize_document
from app.utils.user_identity import (
    email_is_registered,
    find_user_by_email,
    normalize_email,
    normalize_gender,
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE,
)


def _is_uuid(value: str) -> bool:
    return bool(_UUID_RE.match(value))


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    db = get_database()

    if _is_uuid(sub):
        logger.debug("JWT resolved using UUID: %s", sub)
        user = await db.users.find_one({"user_id": sub})
    else:
        logger.debug("JWT fallback to ObjectId: %s", sub)
        try:
            oid = ObjectId(sub)
        except Exception:
            raise credentials_exception
        user = await db.users.find_one({"_id": oid})

    if user is None:
        raise credentials_exception
    return user


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate):
    logger.info("═══ Signup started for email=%s ═══", payload.email)
    db = get_database()

    email_norm = normalize_email(payload.email)
    if not email_norm:
        logger.warning("Signup rejected — invalid email: %s", payload.email)
        raise HTTPException(status_code=400, detail="Invalid email address")

    # ── Pre-check: email uniqueness in MongoDB ──────────────────────
    logger.info("Step 0: Checking if email is already registered: %s", email_norm)
    if await email_is_registered(db, email_norm):
        logger.warning("Signup rejected — email already registered in MongoDB: %s", email_norm)
        raise HTTPException(status_code=400, detail="Email already registered")

    # ── Pre-check: session maker availability ───────────────────────
    session_maker = get_session_maker()
    if session_maker is None:
        logger.error("PostgreSQL not initialized — get_session_maker() returned None")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration service unavailable — please try again later",
        )

    # ── Prepare payload ─────────────────────────────────────────────
    payload_data = payload.model_dump(exclude_none=True)
    password = payload_data.pop("password")
    payload_data["email"] = email_norm
    if "gender" in payload_data:
        payload_data["gender"] = normalize_gender(payload_data["gender"])
    hashed_pw = get_password_hash(password)
    payload_data["hashed_password"] = hashed_pw
    payload_data["created_at"] = datetime.utcnow()
    payload_data["updated_at"] = datetime.utcnow()
    payload_data["is_onboarded"] = False
    logger.info("Step 0: Payload prepared — keys=%s", list(payload_data.keys()))

    # ── Pre-check: email uniqueness in PostgreSQL ───────────────────
    pg_session = session_maker()
    try:
        from sqlalchemy import select
        stmt = select(PostgresUser).where(PostgresUser.email == email_norm)
        existing = (await pg_session.execute(stmt)).scalars().first()
        if existing:
            await pg_session.close()
            logger.warning("Signup rejected — email already exists in PostgreSQL: %s", email_norm)
            raise HTTPException(status_code=400, detail="User already exists")
        logger.info("Step 0: Email not found in PostgreSQL — proceeding")
    except HTTPException:
        raise  # re-raise the 400 above
    except Exception as exc:
        logger.error("PostgreSQL pre-check failed: %s — %r", type(exc).__name__, exc)
        await pg_session.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration pre-check failed — {type(exc).__name__}: {exc}",
        )

    # ── Step 1: Create user in PostgreSQL ───────────────────────────
    pg_user_id = str(uuid.uuid4())
    logger.info("Step 1: Creating PostgreSQL user (id=%s, email=%s)", pg_user_id, email_norm)

    try:
        pg_user = PostgresUser(
            id=pg_user_id,
            email=email_norm,
            hashed_password=hashed_pw,
            name=payload_data.get("name"),
            age=payload_data.get("age"),
            gender=payload_data.get("gender"),
            is_onboarded=False,
        )
        pg_session.add(pg_user)
        await pg_session.flush()  # assign PK, but don't commit yet
        logger.info("Step 1 SUCCESS: PostgreSQL insert+flush complete (id=%s)", pg_user_id)
    except Exception as exc:
        logger.error("Step 1 FAILED: PostgreSQL user creation error: %s — %r", type(exc).__name__, exc)
        await pg_session.rollback()
        await pg_session.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User registration failed at PostgreSQL step — {type(exc).__name__}: {exc}",
        )

    # ── Step 2: Create user in MongoDB ──────────────────────────────
    #   Build a clean document with ONLY fields the MongoDB validator accepts.
    MONGO_USER_FIELDS = {
        "name", "email", "hashed_password", "age", "gender", "lifestyle",
        "created_at", "updated_at", "meta", "is_onboarded", "user_id",
        "height_cm", "weight_kg", "blood_group", "bmi", "health_goal",
    }
    mongo_doc = {k: v for k, v in payload_data.items() if k in MONGO_USER_FIELDS}
    mongo_doc["user_id"] = pg_user_id
    # Ensure all required fields are present
    mongo_doc.setdefault("name", payload_data.get("name", ""))
    mongo_doc.setdefault("email", email_norm)
    mongo_doc.setdefault("hashed_password", hashed_pw)
    mongo_doc.setdefault("created_at", datetime.utcnow())
    mongo_doc.setdefault("updated_at", datetime.utcnow())

    logger.info("Step 2: Inserting user into MongoDB (user_id=%s, keys=%s)", pg_user_id, list(mongo_doc.keys()))

    try:
        result = await db.users.insert_one(mongo_doc)
        logger.info("Step 2 SUCCESS: MongoDB insert complete (_id=%s)", result.inserted_id)
    except DuplicateKeyError:
        await pg_session.rollback()
        await pg_session.close()
        logger.warning("Step 2 FAILED: DuplicateKeyError — rolling back PostgreSQL")
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as exc:
        await pg_session.rollback()
        await pg_session.close()
        logger.error("Step 2 FAILED: MongoDB insert error: %s — %r", type(exc).__name__, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User registration failed at MongoDB step — {type(exc).__name__}: {exc}",
        )

    # ── Step 3: Commit PostgreSQL ───────────────────────────────────
    logger.info("Step 3: Committing PostgreSQL transaction for user %s", pg_user_id)
    try:
        await pg_session.commit()
        logger.info("Step 3 SUCCESS: PostgreSQL commit complete for user %s", pg_user_id)
    except Exception as exc:
        logger.error("Step 3 FAILED: PostgreSQL commit error: %s — %r — compensating MongoDB delete", type(exc).__name__, exc)
        
        # Robust compensating delete with retries
        import asyncio
        cleanup_success = False
        for attempt in range(1, 4):
            try:
                await db.users.delete_one({"_id": result.inserted_id})
                cleanup_success = True
                logger.info("Mongo cleanup SUCCESS: deleted orphan user document (_id=%s) on attempt %d", result.inserted_id, attempt)
                break
            except Exception as cleanup_exc:
                logger.error("Mongo cleanup FAILED on attempt %d: %s — %r", attempt, type(cleanup_exc).__name__, cleanup_exc)
                await asyncio.sleep(0.5)
                
        if not cleanup_success:
            logger.critical("CRITICAL: Failed to clean up ghost MongoDB document (_id=%s) after 3 attempts!", result.inserted_id)

        await pg_session.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User registration failed at commit step — {type(exc).__name__}: {exc}",
        )
    finally:
        await pg_session.close()

    user = await db.users.find_one({"_id": result.inserted_id})
    logger.info("═══ Signup completed successfully for %s (pg_id=%s) ═══", email_norm, pg_user_id)
    return success_response(serialize_document(user), message="User created successfully")


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    user = await find_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.get("hashed_password")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Prefer UUID (new dual-DB users); fall back to ObjectId for legacy users.
    subject = user.get("user_id") or str(user["_id"])
    access_token = create_access_token(subject=subject, email=user.get("email"))
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return success_response(serialize_document(current_user), message="Current user retrieved")


@router.patch("/onboarding/complete")
async def complete_onboarding(current_user: dict = Depends(get_current_user)):
    """
    Complete user onboarding process.
    Updates both PostgreSQL and MongoDB atomically to maintain consistency.
    """
    from app.services.data_access import atomic_dual_database_update
    
    oid = current_user["_id"]
    pg_user_id: str | None = current_user.get('user_id')
    
    # ── Dual-database user: Use atomic transaction ───────────────────
    if pg_user_id:
        try:
            await atomic_dual_database_update(
                user_id=pg_user_id,
                postgres_update_fn=lambda pg_user: setattr(pg_user, 'is_onboarded', True),
                mongo_collection="users",
                mongo_filter={"_id": oid},
                mongo_update={
                    "$set": {
                        "is_onboarded": True,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            logger.info(
                'Atomic dual-database onboarding completed for user_id=%s, oid=%s',
                pg_user_id, oid
            )
        except Exception as exc:
            logger.error(
                'Atomic dual-database onboarding failed for user_id=%s: %r',
                pg_user_id, exc
            )
            raise HTTPException(
                status_code=500,
                detail='Onboarding update failed'
            )
    
    # ── Legacy user: MongoDB-only update ─────────────────────────────
    else:
        db = get_database()
        try:
            result = await db.users.update_one(
                {"_id": oid},
                {"$set": {"is_onboarded": True, "updated_at": datetime.utcnow()}},
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail='User not found')
            
            logger.info('MongoDB-only onboarding completed for oid=%s', oid)
            
        except HTTPException:
            raise
        except Exception as exc:
            logger.error('MongoDB onboarding failed for oid=%s: %r', oid, exc)
            raise HTTPException(status_code=500, detail='Onboarding update failed')
    
    return success_response(None, message="Onboarding complete")
