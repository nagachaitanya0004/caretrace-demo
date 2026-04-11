from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

DataT = TypeVar('DataT')

class ApiResponse(BaseModel, Generic[DataT]):
    success: bool
    data: Optional[DataT] = None
    message: str = ""
    error: Optional[Any] = None

def create_response(data: Any, message: str = "Success", success: bool = True, error: Any = None) -> dict:
    """Helper formatting function for standardized API responses"""
    return {
        "success": success,
        "data": data,
        "message": message,
        "error": error
    }
