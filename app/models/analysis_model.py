from typing import TypedDict

class AnalysisModel(TypedDict, total=False):
    _id: str
    id: str
    user_id: str
    risk_level: str
    reason: str
    timestamp: str
