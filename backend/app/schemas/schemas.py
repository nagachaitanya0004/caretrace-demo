from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field  # type: ignore[import]

from app.models.types import MongoModel, PyObjectId

GENDERS = ['male', 'female', 'other']
ALERT_SEVERITIES = ['info', 'warning', 'critical']
RISK_LEVELS = ['low', 'medium', 'high']
REPORT_TYPES = ['health_summary', 'risk_review', 'care_plan']


class TimestampedModel(MongoModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)


class UserBase(MongoModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=5)
    age: int = Field(..., gt=0)
    gender: str = Field(..., min_length=1)
    lifestyle: str = Field(..., min_length=1)
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    age: Optional[int] = Field(default=None, gt=0)
    gender: Optional[str] = Field(default=None, min_length=1)
    lifestyle: Optional[str] = Field(default=None, min_length=1)
    meta: Optional[Dict[str, Any]] = None


class UserInDB(UserBase, TimestampedModel):
    id: Optional[PyObjectId] = Field(alias='_id')
    hashed_password: str


class SymptomBase(MongoModel):
    user_id: Optional[PyObjectId] = None
    symptom: str = Field(..., min_length=1)
    duration: int = Field(..., ge=0)
    severity: int = Field(..., ge=1, le=10)
    timestamp: datetime
    notes: Optional[str] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SymptomCreate(SymptomBase):
    pass


class SymptomInDB(SymptomBase, TimestampedModel):
    id: Optional[PyObjectId] = Field(alias='_id')


class AnalysisBase(MongoModel):
    user_id: Optional[PyObjectId] = None
    risk_level: Optional[str] = None
    reason: Optional[str] = None
    summary: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)
    model_version: Optional[str] = None


class AnalysisCreate(AnalysisBase):
    pass


class AnalysisInDB(AnalysisBase, TimestampedModel):
    id: Optional[PyObjectId] = Field(alias='_id')


class AlertBase(MongoModel):
    user_id: Optional[PyObjectId] = None
    message: str = Field(..., min_length=1)
    severity: str = Field(..., min_length=1)
    is_read: bool = False
    category: Optional[str] = None
    source: Optional[str] = None


class AlertCreate(AlertBase):
    pass


class AlertInDB(AlertBase, TimestampedModel):
    id: Optional[PyObjectId] = Field(alias='_id')


class ReportBase(MongoModel):
    user_id: Optional[PyObjectId] = None
    summary: str = Field(..., min_length=1)
    report_type: str = Field(..., min_length=1)
    metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ReportCreate(ReportBase):
    pass


class ReportInDB(ReportBase, TimestampedModel):
    id: Optional[PyObjectId] = Field(alias='_id')
