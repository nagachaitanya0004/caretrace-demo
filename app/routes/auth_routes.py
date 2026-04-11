from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.user_schema import UserCreate, UserResponse
from app.schemas.base_schema import ApiResponse, create_response
from app.services.user_service import create_user_service
from app.database.connection import get_database
from app.core.security import verify_password, create_access_token

router = APIRouter()

@router.post("/signup", response_model=ApiResponse[UserResponse])
async def signup(user_in: UserCreate):
    """Register a new active CareTrace Account"""
    data = await create_user_service(user_in)
    return create_response(data, "Account established successfully", True)

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate and Generate JWT (OAuth2 Compliance natively skips generic wrapper)"""
    db = get_database()
    
    # Authenticate User by Email via MongoDB lookup
    user_doc = await db["users"].find_one({"email": form_data.username})
    if not user_doc:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    if not verify_password(form_data.password, user_doc["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user account")
        
    # Generate Token
    access_token = create_access_token(
        data={"sub": str(user_doc["_id"]), "email": user_doc["email"]}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
