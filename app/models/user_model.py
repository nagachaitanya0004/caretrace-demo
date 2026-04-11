from typing import Optional
from typing_extensions import TypedDict

# User dict structural representation aligned with MongoDB
class UserModel(TypedDict, total=False):
    _id: str
    id: str
    name: str
    email: str
    hashed_password: str
    age: Optional[int]
    gender: Optional[str]
    lifestyle: Optional[str]
    is_active: bool
    created_at: str
