from typing import TypedDict

class AlertModel(TypedDict, total=False):
    _id: str
    id: str
    user_id: str
    message: str
    is_read: bool
    timestamp: str
