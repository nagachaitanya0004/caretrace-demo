from __future__ import annotations
from datetime import datetime
from typing import Any
import uuid

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError
import jwt

from app.db.db import get_database
from app.db.postgres import _async_session_maker
from app.models.postgres_user import PostgresUser
from app.core.responses import error_response, success_response
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

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    db = get_database()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise credentials_exception

    user = await db.users.find_one({"_id": oid})
    if user is None:
        raise credentials_exception
    return user


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate):
    db = get_database()

    email_norm = normalize_email(payload.email)
    if not email_norm:
        raise HTTPException(status_code=400, detail="Invalid email address")

    if await email_is_registered(db, email_norm):
        raise HTTPException(status_code=400, detail="Email already registered")

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

    # ── Step 1: Create user in PostgreSQL (REQUIRED) ───────────────
    if _async_session_maker is None:
        logger.error("PostgreSQL not initialized — cannot create user")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration service unavailable — please try again later",
        )

    pg_user_id = str(uuid.uuid4())
    pg_session = _async_session_maker()

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
        logger.info("User created in PostgreSQL (id=%s, email=%s)", pg_user_id, email_norm)
    except Exception as exc:
        logger.error("PostgreSQL user creation failed: %s", exc)
        await pg_session.rollback()
        await pg_session.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User registration failed — please try again",
        )

    # ── Step 2: Create user in MongoDB ───────────────────────────────
    payload_data["user_id"] = pg_user_id

    try:
        result = await db.users.insert_one(payload_data)
        logger.info("User created in MongoDB (_id=%s, email=%s)", result.inserted_id, email_norm)
    except DuplicateKeyError:
        await pg_session.rollback()
        await pg_session.close()
        logger.warning("Rollback triggered — duplicate email in MongoDB")
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as exc:
        await pg_session.rollback()
        await pg_session.close()
        logger.warning("Rollback triggered — MongoDB insert failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User registration failed — please try again",
        )

    # ── Step 3: Commit PostgreSQL ────────────────────────────────────
    try:
        await pg_session.commit()
        logger.info("PostgreSQL commit successful for user %s", pg_user_id)
    except Exception as exc:
        logger.error("PostgreSQL commit failed: %s — compensating MongoDB delete", exc)
        # Compensating delete: remove the MongoDB document we just created
        await db.users.delete_one({"_id": result.inserted_id})
        await pg_session.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User registration failed — please try again",
        )
    finally:
        await pg_session.close()

    user = await db.users.find_one({"_id": result.inserted_id})
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
    
    access_token = create_access_token(subject=str(user["_id"]), email=user.get("email"))
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return success_response(serialize_document(current_user), message="Current user retrieved")


@router.patch("/onboarding/complete")
async def complete_onboarding(current_user: dict = Depends(get_current_user)):
    db = get_database()
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"is_onboarded": True, "updated_at": datetime.utcnow()}},
    )
    return success_response(None, message="Onboarding complete")
