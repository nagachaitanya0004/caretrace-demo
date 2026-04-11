from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.user_schema import UserCreate, UserResponse
from app.schemas.base_schema import ApiResponse, create_response
from app.services.user_service import get_all_users_service, get_user_by_id_service, update_user_service, delete_user_service
from app.core.security import get_current_user

router = APIRouter()

# Note: Admin only typically in real API, protected here primarily ensuring JWT passes
@router.get("/", response_model=ApiResponse[List[UserResponse]])
async def list_users(current_user: dict = Depends(get_current_user)):
    data = await get_all_users_service()
    return create_response(data, "Users retrieved successfully")

@router.get("/{user_id}", response_model=ApiResponse[UserResponse])
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Cannot access outside footprint")
    data = await get_user_by_id_service(user_id)
    return create_response(data, "User retrieved successfully")

@router.put("/{user_id}", response_model=ApiResponse[UserResponse])
async def update_user(user_id: str, user: UserCreate, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    data = await update_user_service(user_id, user)
    return create_response(data, "User updated successfully")

@router.delete("/{user_id}", response_model=ApiResponse[dict])
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await delete_user_service(user_id)
    return create_response({"id": user_id}, "User deleted successfully")
