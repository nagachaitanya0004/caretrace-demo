from pydantic import BaseModel, ConfigDict
from datetime import datetime

class AlertBase(BaseModel):
    user_id: str
    message: str

class AlertResponse(AlertBase):
    id: str
    timestamp: datetime
    is_read: bool

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=lambda x: "_id" if x == "id" else x
    )
