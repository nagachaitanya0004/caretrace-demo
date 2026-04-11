from datetime import datetime
from typing import Any, Dict, Optional

from .types import PyObjectId

USER_COLLECTION = 'users'
SYMPTOM_COLLECTION = 'symptoms'
ANALYSIS_COLLECTION = 'analysis'
ALERT_COLLECTION = 'alerts'
REPORT_COLLECTION = 'reports'
SESSION_COLLECTION = 'sessions'


# MongoDB document validators for collection-level validation.
USER_VALIDATOR = {
    '$jsonSchema': {
        'bsonType': 'object',
        'required': ['name', 'age', 'gender', 'lifestyle', 'created_at', 'updated_at'],
        'properties': {
            '_id': {'bsonType': 'objectId'},
            'name': {'bsonType': 'string', 'description': 'Full user name'},
            'age': {'bsonType': 'int', 'minimum': 1, 'description': 'Age must be greater than 0'},
            'gender': {'bsonType': 'string', 'enum': ['male', 'female', 'other'], 'description': 'Gender value'},
            'lifestyle': {'bsonType': 'string', 'description': 'Lifestyle classification'},
            'created_at': {'bsonType': 'date'},
            'updated_at': {'bsonType': 'date'},
            'meta': {'bsonType': 'object', 'description': 'Optional metadata for ML and segmentation'},
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


def build_user_document(name: str, age: int, gender: str, lifestyle: str) -> dict:
    now = datetime.utcnow()
    return {
        'name': name,
        'age': age,
        'gender': gender,
        'lifestyle': lifestyle,
        'created_at': now,
        'updated_at': now,
        'meta': {},
    }


def build_symptom_document(user_id: PyObjectId, symptom: str, duration: int, severity: int, timestamp: datetime, notes: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> dict:
    return {
        'user_id': user_id,
        'symptom': symptom,
        'duration': duration,
        'severity': severity,
        'timestamp': timestamp,
        'created_at': datetime.utcnow(),
        'notes': notes,
        'context': context or {},
    }


def build_analysis_document(user_id: PyObjectId, risk_level: str, reason: str, summary: Optional[str] = None, metrics: Optional[Dict[str, Any]] = None, model_version: Optional[str] = None) -> dict:
    return {
        'user_id': user_id,
        'risk_level': risk_level,
        'reason': reason,
        'summary': summary,
        'metrics': metrics or {},
        'model_version': model_version,
        'created_at': datetime.utcnow(),
    }


def build_alert_document(user_id: PyObjectId, message: str, severity: str, is_read: bool = False, category: Optional[str] = None, source: Optional[str] = None) -> dict:
    return {
        'user_id': user_id,
        'message': message,
        'severity': severity,
        'created_at': datetime.utcnow(),
        'is_read': is_read,
        'category': category,
        'source': source,
    }


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
