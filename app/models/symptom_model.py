from typing import Optional
from typing_extensions import TypedDict

class SymptomModel(TypedDict, total=False):
    _id: str
    id: str
    user_id: str
    symptom: str
    duration: int
    severity: int
    timestamp: str
