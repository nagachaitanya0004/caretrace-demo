from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class AnalysisResponse(BaseModel):
    id: str
    user_id: str
    risk_level: str
    reason: str
    recommendation: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: "_id" if x == "id" else x
    )
