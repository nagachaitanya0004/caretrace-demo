from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pymongo.errors import DuplicateKeyError
import jwt

from backend.app.db.db import get_database
from backend.app.core.responses import error_response, success_response
from backend.app.core.security import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_password_hash,
    verify_password,
)
from backend.app.schemas.schemas import UserCreate
from backend.app.core.responses import serialize_document
from backend.app.utils.user_identity import (
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

    payload_data = payload.model_dump()
    password = payload_data.pop("password")
    payload_data["email"] = email_norm
    payload_data["gender"] = normalize_gender(payload_data.get("gender", ""))
    payload_data["hashed_password"] = get_password_hash(password)
    payload_data["created_at"] = datetime.utcnow()
    payload_data["updated_at"] = datetime.utcnow()

    try:
        result = await db.users.insert_one(payload_data)
        user = await db.users.find_one({"_id": result.inserted_id})
        return success_response(serialize_document(user), message="User created successfully")
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")


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
