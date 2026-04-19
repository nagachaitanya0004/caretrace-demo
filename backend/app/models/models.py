from datetime import datetime
from typing import Any, Dict, Optional

from .types import PyObjectId

USER_COLLECTION = 'users'
SYMPTOM_COLLECTION = 'symptoms'
ANALYSIS_COLLECTION = 'analysis'
ALERT_COLLECTION = 'alerts'
REPORT_COLLECTION = 'reports'
SESSION_COLLECTION = 'sessions'
MEDICAL_HISTORY_COLLECTION = 'medical_history'
FAMILY_HISTORY_COLLECTION = 'family_history'
LIFESTYLE_DATA_COLLECTION = 'lifestyle_data'
STRUCTURED_SYMPTOMS_COLLECTION = 'structured_symptoms'


# MongoDB document validators for collection-level validation.
USER_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['name', 'email', 'hashed_password', 'created_at', 'updated_at'],
        'properties': {
            '_id': {'bsonType': 'objectId'},
            'name': {'bsonType': 'string', 'description': 'Full user name'},
            'email': {'bsonType': 'string', 'description': 'User email address'},
            'hashed_password': {'bsonType': 'string', 'description': 'Stored password hash'},
            'age': {'bsonType': 'int', 'minimum': 1, 'description': 'Age must be greater than 0'},
            'gender': {'bsonType': 'string', 'enum': ['male', 'female', 'other'], 'description': 'Gender value'},
            'lifestyle': {'bsonType': 'string', 'description': 'Lifestyle classification'},
            'created_at': {'bsonType': 'date'},
            'updated_at': {'bsonType': 'date'},
            'meta': {'bsonType': 'object', 'description': 'Optional metadata for ML and segmentation'},
            'is_onboarded': {'bsonType': 'bool', 'description': 'Whether the user has completed onboarding'},
            'height_cm': {'bsonType': 'double', 'description': 'Height in centimetres'},
            'weight_kg': {'bsonType': 'double', 'description': 'Weight in kilograms'},
            'blood_group': {'bsonType': 'string', 'description': 'Blood group / type'},
            'bmi': {'bsonType': 'double', 'description': 'Body Mass Index, derived from height and weight'},
        },
        'additionalProperties': False,
    }
}

MEDICAL_HISTORY_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'created_at', 'updated_at'],
        'properties': {
            '_id': {'bsonType': 'objectId'},
            'user_id': {'bsonType': 'objectId'},
            'conditions': {'bsonType': 'array', 'items': {'bsonType': 'string'}},
            'medications': {'bsonType': 'array', 'items': {'bsonType': 'string'}},
            'allergies':   {'bsonType': 'array', 'items': {'bsonType': 'string'}},
            'surgeries':   {'bsonType': 'array', 'items': {'bsonType': 'string'}},
            'created_at':  {'bsonType': 'date'},
            'updated_at':  {'bsonType': 'date'},
        },
        'additionalProperties': False,
    }
}

FAMILY_HISTORY_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'condition_name', 'created_at', 'updated_at'],
        'properties': {
            '_id':            {'bsonType': 'objectId'},
            'user_id':        {'bsonType': 'objectId'},
            'condition_name': {'bsonType': 'string', 'description': 'Name of the hereditary condition'},
            'relation':       {'bsonType': 'string', 'description': 'Family relation (e.g. father, mother)'},
            'created_at':     {'bsonType': 'date'},
            'updated_at':     {'bsonType': 'date'},
        },
        'additionalProperties': False,
    }
}

LIFESTYLE_DATA_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'created_at', 'updated_at'],
        'properties': {
            '_id':                  {'bsonType': 'objectId'},
            'user_id':              {'bsonType': 'objectId'},
            'sleep_hours':          {'bsonType': 'double',  'minimum': 0, 'maximum': 24},
            'sleep_quality':        {'bsonType': 'string',  'enum': ['good', 'average', 'poor']},
            'diet_type':            {'bsonType': 'string',  'enum': ['veg', 'non-veg', 'mixed']},
            'exercise_frequency':   {'bsonType': 'string',  'enum': ['none', 'weekly', 'regular']},
            'water_intake_liters':  {'bsonType': 'double',  'minimum': 0},
            'smoking':              {'bsonType': 'bool'},
            'alcohol':              {'bsonType': 'bool'},
            'stress_level':         {'bsonType': 'int',     'minimum': 1, 'maximum': 10},
            'created_at':           {'bsonType': 'date'},
            'updated_at':           {'bsonType': 'date'},
        },
        'additionalProperties': False,
    }
}

STRUCTURED_SYMPTOMS_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'symptom_name', 'created_at'],
        'properties': {
            '_id':          {'bsonType': 'objectId'},
            'user_id':      {'bsonType': 'objectId'},
            'symptom_name': {'bsonType': 'string',  'description': 'Name of the symptom'},
            'severity':     {'bsonType': 'int',     'minimum': 1, 'maximum': 10},
            'duration':     {'bsonType': 'string',  'description': 'Duration as text, e.g. "3 days"'},
            'frequency':    {'bsonType': 'string',  'enum': ['constant', 'occasional', 'rare']},
            'notes':        {'bsonType': 'string'},
            'created_at':   {'bsonType': 'date'},
        },
        'additionalProperties': False,
    }
}

SYMPTOM_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'symptom', 'duration', 'severity', 'timestamp', 'created_at'],
        'properties': {
            '_id': {'bsonType': 'objectId'},
            'user_id': {'bsonType': 'objectId'},
            'symptom': {'bsonType': 'string', 'description': 'Symptom label or taxonomy key'},
            'duration': {'bsonType': 'int', 'minimum': 0, 'description': 'Duration in days'},
            'severity': {'bsonType': 'int', 'minimum': 1, 'maximum': 10, 'description': 'Severity from 1-10'},
            'timestamp': {'bsonType': 'date', 'description': 'Event timestamp'},
            'created_at': {'bsonType': 'date'},
            'notes': {'bsonType': 'string'},
            'context': {'bsonType': 'object', 'description': 'Optional structured metadata for future ML'},
        },
        'additionalProperties': False,
    }
}

ANALYSIS_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'risk_level', 'reason', 'created_at'],
        'properties': {
            '_id': {'bsonType': 'objectId'},
            'user_id': {'bsonType': 'objectId'},
            'risk_level': {'bsonType': 'string', 'enum': ['low', 'medium', 'high']},
            'reason': {'bsonType': 'string'},
            'summary': {'bsonType': 'string'},
            'metrics': {'bsonType': 'object'},
            'model_version': {'bsonType': 'string'},
            'created_at': {'bsonType': 'date'},
        },
        'additionalProperties': False,
    }
}

ALERT_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'message', 'severity', 'created_at', 'is_read'],
        'properties': {
            '_id': {'bsonType': 'objectId'},
            'user_id': {'bsonType': 'objectId'},
            'message': {'bsonType': 'string'},
            'severity': {'bsonType': 'string', 'enum': ['info', 'warning', 'critical']},
            'created_at': {'bsonType': 'date'},
            'is_read': {'bsonType': 'bool'},
            'category': {'bsonType': 'string'},
            'source': {'bsonType': 'string'},
        },
        'additionalProperties': False,
    }
}

REPORT_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'summary', 'generated_at'],
        'properties': {
            '_id': {'bsonType': 'objectId'},
            'user_id': {'bsonType': 'objectId'},
            'summary': {'bsonType': 'string'},
            'generated_at': {'bsonType': 'date'},
            'report_type': {'bsonType': 'string'},
            'metrics': {'bsonType': 'object'},
            'created_at': {'bsonType': 'date'},
        },
        'additionalProperties': False,
    }
}

SESSION_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['user_id', 'session_token', 'expires_at', 'created_at'],
        'properties': {
            '_id': {'bsonType': 'objectId'},
            'user_id': {'bsonType': 'objectId'},
            'session_token': {'bsonType': 'string'},
            'expires_at': {'bsonType': 'date'},
            'created_at': {'bsonType': 'date'},
            'ip_address': {'bsonType': 'string'},
            'user_agent': {'bsonType': 'string'},
        },
        'additionalProperties': False,
    }
}


def build_user_document(name: str, email: str, hashed_password: str, age: int, gender: str, lifestyle: str) -> dict:
    now = datetime.utcnow()
    return {
        'name': name,
        'email': email,
        'hashed_password': hashed_password,
        'age': age,
        'gender': gender,
        'lifestyle': lifestyle,
        'created_at': now,
        'updated_at': now,
        'meta': {},
        'is_onboarded': False,
    }


def build_symptom_document(user_id: PyObjectId, symptom: str, duration: int, severity: int, timestamp: datetime, notes: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> dict:
    doc = {
        'user_id': user_id,
        'symptom': symptom,
        'duration': duration,
        'severity': severity,
        'timestamp': timestamp,
        'created_at': datetime.utcnow(),
    }
    if notes is not None:
        doc['notes'] = notes
    if context:
        doc['context'] = context
    return doc


def build_analysis_document(user_id: PyObjectId, risk_level: str, reason: str, summary: Optional[str] = None, metrics: Optional[Dict[str, Any]] = None, model_version: Optional[str] = None) -> dict:
    doc = {
        'user_id': user_id,
        'risk_level': risk_level,
        'reason': reason,
        'created_at': datetime.utcnow(),
    }
    if summary is not None:
        doc['summary'] = summary
    if metrics:
        doc['metrics'] = metrics
    if model_version is not None:
        doc['model_version'] = model_version
    return doc


def build_alert_document(user_id: PyObjectId, message: str, severity: str, is_read: bool = False, category: Optional[str] = None, source: Optional[str] = None) -> dict:
    doc = {
        'user_id': user_id,
        'message': message,
        'severity': severity,
        'created_at': datetime.utcnow(),
        'is_read': is_read,
    }
    if category is not None:
        doc['category'] = category
    if source is not None:
        doc['source'] = source
    return doc


def build_report_document(user_id: PyObjectId, summary: str, report_type: str = 'health_summary', metrics: Optional[Dict[str, Any]] = None) -> dict:
    now = datetime.utcnow()
    return {
        'user_id': user_id,
        'summary': summary,
        'report_type': report_type,
        'metrics': metrics or {},
        'generated_at': now,
        'created_at': now,
    }
