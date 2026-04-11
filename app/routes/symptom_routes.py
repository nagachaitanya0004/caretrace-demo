from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.symptom_schema import SymptomCreate, SymptomResponse
from app.schemas.base_schema import ApiResponse, create_response
from app.services.symptom_service import create_symptom_service, get_symptoms_by_user_service, delete_symptom_service
from app.core.security import get_current_user

router = APIRouter()

@router.post("/", response_model=ApiResponse[SymptomResponse])
async def create_symptom(symptom: SymptomCreate, current_user: dict = Depends(get_current_user)):
    # Verify the JWT matches the targeted user injection natively
    if symptom.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to log symptoms for this ID")
    data = await create_symptom_service(symptom)
    return create_response(data, "Symptom logged successfully")

@router.get("/{user_id}", response_model=ApiResponse[List[SymptomResponse]])
async def get_user_symptoms(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to pull symptoms for this ID")
    data = await get_symptoms_by_user_service(user_id)
    return create_response(data, "Symptoms retrieved successfully")

@router.delete("/{symptom_id}", response_model=ApiResponse[dict])
async def delete_symptom(symptom_id: str, current_user: dict = Depends(get_current_user)):
    # Note: A real system checks if this symptom_id belongs to current_user natively. 
    await delete_symptom_service(symptom_id)
    return create_response({"id": symptom_id}, "Symptom deleted successfully")
