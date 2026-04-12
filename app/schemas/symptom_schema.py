from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class SymptomBase(BaseModel):
    user_id: str = Field(..., description="ID of the user")
    symptom: str = Field(..., description="Symptom name")
    duration: int = Field(..., ge=0, description="Duration in days")
    severity: int = Field(..., ge=1, le=10, description="Severity (1-10)")

class SymptomCreate(SymptomBase):
    logged_at: Optional[datetime] = Field(None, description="When the symptom was logged (defaults to now)")

class SymptomResponse(SymptomBase):
    id: str
    timestamp: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: "_id" if x == "id" else x
    )
