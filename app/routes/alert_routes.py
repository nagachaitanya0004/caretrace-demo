from fastapi import APIRouter, Depends, HTTPException
from app.schemas.base_schema import ApiResponse, create_response
from app.schemas.alert_schema import AlertResponse
from app.services.alert_service import get_alerts_by_user_service
from app.core.security import get_current_user
from typing import List

router = APIRouter()

@router.get("/{user_id}", response_model=ApiResponse[List[AlertResponse]])
async def get_alerts(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    data = await get_alerts_by_user_service(user_id)
    return create_response(data, "Alerts retrieved successfully")
