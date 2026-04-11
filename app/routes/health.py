from fastapi import APIRouter
from app.schemas.base_schema import ApiResponse, create_response

router = APIRouter()

@router.get("/health", response_model=ApiResponse[dict])
async def health_check():
    return create_response({
        "status": "ok",
        "message": "CareTrace AI backend running"
    }, "System Health OK")
