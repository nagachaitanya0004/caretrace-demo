from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
import uuid

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError
import jwt
from app.core.limiter import limiter

from app.db.db import get_database
from app.core.responses import success_response, serialize_document
from app.core.config import ALGORITHM, SECRET_KEY
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.core.logger import logger
from app.schemas.schemas import UserCreate, OnboardingData
from app.utils.user_identity import (
    email_is_registered,
    find_user_by_email,
    normalize_email,
    normalize_gender,
)
from app.services.mongo.user_service import UserService
from app.services.postgres.audit_service import AuditService

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        jti: str = payload.get("jti")
        if user_id is None:
            raise credentials_exception
            
        # Blocklist check
        db = get_database()
        if jti and await db.token_blocklist.find_one({"jti": jti}):
            logger.warning("Attempted use of blocklisted token: jti=%s", jti)
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    db = get_database()
    # Standardized: Primary lookup via user_id (UUID string) only.
    # No ObjectId fallback to eliminate latency and security surface.
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise credentials_exception
    return user


@router.post("/signup", status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def signup(request: Request, payload: UserCreate):
    """
    Register a new user in MongoDB.
    PostgreSQL is used only for non-blocking audit logging.
    """
    logger.info("Signup started for email=%s", payload.email)
    db = get_database()

    email_norm = normalize_email(payload.email)
    if not email_norm:
        raise HTTPException(status_code=400, detail="Invalid email address")

    if await email_is_registered(db, email_norm):
        raise HTTPException(status_code=400, detail="Email already registered")

    payload_data = payload.model_dump(exclude_none=True)
    password = payload_data.pop("password")
    
    hashed_pw = get_password_hash(password)
    user_uuid = str(uuid.uuid4())
    
    mongo_doc = {
        "user_id": user_uuid,
        "email": email_norm,
        "name": payload_data.get("name", ""),
        "hashed_password": hashed_pw,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_onboarded": False,
        "meta": {}
    }
    
    if "age" in payload_data and payload_data["age"] is not None:
        mongo_doc["age"] = payload_data["age"]
    if "gender" in payload_data and payload_data["gender"]:
        mongo_doc["gender"] = normalize_gender(payload_data["gender"])
    if "lifestyle" in payload_data and payload_data["lifestyle"]:
        mongo_doc["lifestyle"] = payload_data["lifestyle"]

    try:
        result = await db.users.insert_one(mongo_doc)
        user = await db.users.find_one({"_id": result.inserted_id})
        
        # Security Assertion: Verify user_uuid is stored correctly
        assert user["user_id"] == user_uuid, "Database UUID mismatch"
        
        # Audit Log (Secondary/Optional - Non-blocking)
        await AuditService.log_action(user_uuid, "user_signup", resource="users")
        
        logger.info("Signup completed successfully for %s (id=%s)", email_norm, user_uuid)
        return success_response(serialize_document(user), message="User created successfully")
        
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as exc:
        logger.error("Signup failed: %s", exc)
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login")
@limiter.limit("20/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_database()
    user = await find_user_by_email(db, form_data.username)
    
    # DEBUG: Authentication diagnostics
    logger.debug("Login attempt: email=%s, user_found=%s", form_data.username, user is not None)
    
    password_valid = False
    if user:
        password_valid = verify_password(form_data.password, user.get("hashed_password"))
        logger.debug("Password verification result: %s", password_valid)

    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = user.get("user_id")
    if not user_id:
        # Fallback for legacy users if any, but new ones will always have user_id
        user_id = str(user["_id"])
    
    access_token = create_access_token(subject=user_id, email=user.get("email"))
    
    # Audit Log
    await AuditService.log_action(user_id, "user_login")
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return success_response(serialize_document(current_user), message="Current user retrieved")


@router.post("/onboarding")
async def onboarding(request: Request, payload: OnboardingData, current_user: dict = Depends(get_current_user)):
    """
    Complete user onboarding.
    Updates MongoDB profile and logs action to PostgreSQL.
    """
    user_oid = ObjectId(current_user["_id"])
    user_uuid = current_user.get("user_id")
    
    updates = payload.model_dump(exclude_none=True)
    
    updated_user = await UserService.update_profile(user_oid, updates)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await UserService.complete_onboarding(user_oid)
    
    # Audit Log
    await AuditService.log_action(user_uuid or str(user_oid), "user_onboarding_complete")
    
    return success_response(updated_user, message="Onboarding complete")


@router.patch("/onboarding/complete")
async def legacy_complete_onboarding(current_user: dict = Depends(get_current_user)):
    """Legacy endpoint for compatibility."""
    user_oid = ObjectId(current_user["_id"])
    await UserService.complete_onboarding(user_oid)
    return success_response(None, message="Onboarding marked as complete")


@router.post("/logout")
async def logout(request: Request, token: str = Depends(oauth2_scheme)):
    """
    Log out the user by blocklisting the current JTI in MongoDB.
    TTL index ensures the record is removed after token expiry.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp")
        
        if jti and exp:
            db = get_database()
            # exp is a unix timestamp
            expiry_date = datetime.fromtimestamp(exp)
            await db.token_blocklist.update_one(
                {"jti": jti},
                {"$set": {"jti": jti, "expires_at": expiry_date}},
                upsert=True
            )
            logger.info("Token blocklisted: jti=%s", jti)
            
        return success_response(None, message="Successfully logged out")
    except Exception as exc:
        logger.error("Logout blocklist failure: %s", exc)
        # Still return success to the client as their local state will be cleared anyway
        return success_response(None, message="Logged out")
