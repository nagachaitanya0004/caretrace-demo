from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.schemas.user_schema import UserResponse
from app.schemas.symptom_schema import SymptomResponse

class ReportSummary(BaseModel):
    user: UserResponse
    latest_risk_level: str
    total_symptoms_logged: int
    symptoms: List[SymptomResponse]

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: "_id" if x == "id" else x
    )
