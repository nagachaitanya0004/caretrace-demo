from fastapi import APIRouter, Depends, HTTPException
from app.schemas.base_schema import ApiResponse, create_response
from app.schemas.report_schema import ReportSummary
from app.services.report_service import get_user_report_service
from app.core.security import get_current_user

router = APIRouter()

@router.get("/{user_id}", response_model=ApiResponse[ReportSummary])
async def get_user_report(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    data = await get_user_report_service(user_id)
    return create_response(data, "Report generated successfully")
