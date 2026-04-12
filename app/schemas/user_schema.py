from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str = Field(..., min_length=1, description="Full Name")
    email: EmailStr = Field(..., description="Unique Email Mapping")
    age: Optional[int] = Field(None, gt=0, description="Age")
    gender: Optional[str] = Field(None, description="Gender")
    lifestyle: Optional[str] = Field(None, description="Lifestyle type")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Raw Password Payload")

class UserProfileUpdate(BaseModel):
    """Partial profile update from settings UI (no password required)."""
    name: Optional[str] = Field(None, min_length=1)
    email: Optional[EmailStr] = None
    age: Optional[int] = Field(None, gt=0)
    gender: Optional[str] = None
    lifestyle: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6, description="Set only to change password")

class UserResponse(UserBase):
    id: str
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: "_id" if x == "id" else x
    )
