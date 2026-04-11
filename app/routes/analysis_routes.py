from fastapi import APIRouter, Depends, HTTPException
from app.schemas.base_schema import ApiResponse, create_response
from app.schemas.analysis_schema import AnalysisResponse
from app.services.analysis_service import analyze_symptoms_service, get_latest_analysis_service
from app.core.security import get_current_user

router = APIRouter()

@router.post("/{user_id}", response_model=ApiResponse[AnalysisResponse])
async def trigger_analysis(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to run analysis for this ID")
    data = await analyze_symptoms_service(user_id)
    return create_response(data, "Analysis generated successfully")

@router.get("/{user_id}", response_model=ApiResponse[AnalysisResponse])
async def get_latest_analysis(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    data = await get_latest_analysis_service(user_id)
    return create_response(data, "Latest analysis fetched successfully")
