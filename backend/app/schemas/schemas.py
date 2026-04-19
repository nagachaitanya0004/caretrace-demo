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
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    age: Optional[int] = Field(default=None, gt=0)
    gender: Optional[str] = Field(default=None, min_length=1)
    lifestyle: Optional[str] = Field(default=None, min_length=1)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    age: Optional[int] = Field(default=None, gt=0)
    gender: Optional[str] = Field(default=None, min_length=1)
    lifestyle: Optional[str] = Field(default=None, min_length=1)
    meta: Optional[Dict[str, Any]] = None
    height_cm: Optional[float] = Field(default=None, gt=0)
    weight_kg: Optional[float] = Field(default=None, gt=0)
    blood_group: Optional[str] = Field(default=None, min_length=1)


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


class MedicalHistoryUpsert(BaseModel):
    conditions: Optional[list[str]] = Field(default=None)
    medications: Optional[list[str]] = Field(default=None)
    allergies:   Optional[list[str]] = Field(default=None)
    surgeries:   Optional[list[str]] = Field(default=None)


class FamilyHistoryEntry(BaseModel):
    condition_name: str = Field(..., min_length=1)
    relation: Optional[str] = Field(default=None)


class FamilyHistoryBatch(BaseModel):
    entries: list[FamilyHistoryEntry] = Field(default_factory=list)


class LifestyleDataUpsert(BaseModel):
    sleep_hours:         Optional[float] = Field(default=None, ge=0, le=24)
    sleep_quality:       Optional[str]   = Field(default=None)
    diet_type:           Optional[str]   = Field(default=None)
    exercise_frequency:  Optional[str]   = Field(default=None)
    water_intake_liters: Optional[float] = Field(default=None, ge=0)
    smoking:             Optional[bool]  = Field(default=None)
    alcohol:             Optional[bool]  = Field(default=None)
    stress_level:        Optional[int]   = Field(default=None, ge=1, le=10)


class StructuredSymptomCreate(BaseModel):
    symptom_name: str          = Field(..., min_length=1)
    severity:     Optional[int]   = Field(default=None, ge=1, le=10)
    duration:     Optional[str]   = Field(default=None)
    frequency:    Optional[str]   = Field(default=None)
    notes:        Optional[str]   = Field(default=None)
