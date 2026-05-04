"""MongoDB collection definitions, validators, and index configuration for CareTrace AI."""

from typing import Any, Dict, List

from .models import (
    ALERT_COLLECTION,
    ALERT_VALIDATOR,
    ANALYSIS_COLLECTION,
    ANALYSIS_VALIDATOR,
    FAMILY_HISTORY_COLLECTION,
    FAMILY_HISTORY_VALIDATOR,
    HEALTH_METRICS_COLLECTION,
    HEALTH_METRICS_VALIDATOR,
    LIFESTYLE_DATA_COLLECTION,
    LIFESTYLE_DATA_VALIDATOR,
    MEDICAL_HISTORY_COLLECTION,
    MEDICAL_HISTORY_VALIDATOR,
    MEDICAL_REPORTS_COLLECTION,
    MEDICAL_REPORTS_VALIDATOR,
    MEDICATIONS_COLLECTION,
    MEDICATIONS_VALIDATOR,
    REPORT_COLLECTION,
    REPORT_VALIDATOR,
    SESSION_COLLECTION,
    SESSION_VALIDATOR,
    SYMPTOM_COLLECTION,
    SYMPTOM_VALIDATOR,
    USER_COLLECTION,
    USER_VALIDATOR,
    TOKEN_BLOCKLIST_COLLECTION,
    TOKEN_BLOCKLIST_VALIDATOR,
)


def get_collection_configuration() -> Dict[str, Dict[str, Any]]:
    return {
        USER_COLLECTION: {
            'validator': USER_VALIDATOR,
            'indexes': [
                {'fields': [('email', 'asc')], 'unique': True, 'name': 'idx_user_email'},
                {'fields': [('user_id', 'asc')], 'unique': True, 'name': 'idx_user_id'},
                {'fields': [('name', 'asc')], 'unique': False, 'name': 'idx_user_name'},
                {'fields': [('age', 'asc')], 'unique': False, 'name': 'idx_user_age'},
                {'fields': [('gender', 'asc')], 'unique': False, 'name': 'idx_user_gender'},
            ],
        },
        SYMPTOM_COLLECTION: {
            'validator': SYMPTOM_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc'), ('timestamp', 'desc')], 'unique': False, 'name': 'idx_symptom_user_timestamp'},
                {'fields': [('symptom', 'asc')], 'unique': False, 'name': 'idx_symptom_label'},
            ],
        },
        ANALYSIS_COLLECTION: {
            'validator': ANALYSIS_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc'), ('created_at', 'desc')], 'unique': False, 'name': 'idx_analysis_user_created'},
                {'fields': [('risk_level', 'asc')], 'unique': False, 'name': 'idx_analysis_risk_level'},
            ],
        },
        ALERT_COLLECTION: {
            'validator': ALERT_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc'), ('is_read', 'asc'), ('created_at', 'desc')], 'unique': False, 'name': 'idx_alert_user_read_created'},
                {'fields': [('severity', 'asc')], 'unique': False, 'name': 'idx_alert_severity'},
            ],
        },
        REPORT_COLLECTION: {
            'validator': REPORT_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc'), ('generated_at', 'desc')], 'unique': False, 'name': 'idx_report_user_generated'},
                {'fields': [('report_type', 'asc')], 'unique': False, 'name': 'idx_report_type'},
            ],
        },
        SESSION_COLLECTION: {
            'validator': SESSION_VALIDATOR,
            'indexes': [
                {'fields': [('session_token', 'asc')], 'unique': True, 'name': 'idx_session_token'},
                {'fields': [('user_id', 'asc'), ('expires_at', 'asc')], 'unique': False, 'name': 'idx_session_user_expires'},
                {'fields': [('expires_at', 'asc')], 'unique': False, 'name': 'idx_session_ttl', 'expireAfterSeconds': 0},
            ],
        },
        MEDICAL_HISTORY_COLLECTION: {
            'validator': MEDICAL_HISTORY_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc')], 'unique': True, 'name': 'idx_medical_history_user_id'},
            ],
        },
        FAMILY_HISTORY_COLLECTION: {
            'validator': FAMILY_HISTORY_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc')], 'unique': False, 'name': 'idx_family_history_user_id'},
            ],
        },
        LIFESTYLE_DATA_COLLECTION: {
            'validator': LIFESTYLE_DATA_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc')], 'unique': True, 'name': 'idx_lifestyle_data_user_id'},
            ],
        },
        HEALTH_METRICS_COLLECTION: {
            'validator': HEALTH_METRICS_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc'), ('recorded_at', 'desc')], 'unique': False, 'name': 'idx_health_metrics_user_recorded'},
            ],
        },
        MEDICAL_REPORTS_COLLECTION: {
            'validator': MEDICAL_REPORTS_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc'), ('uploaded_at', 'desc')], 'unique': False, 'name': 'idx_medical_reports_user_uploaded'},
            ],
        },
        MEDICATIONS_COLLECTION: {
            'validator': MEDICATIONS_VALIDATOR,
            'indexes': [
                {'fields': [('user_id', 'asc'), ('created_at', 'desc')], 'unique': False, 'name': 'idx_medications_user_created'},
            ],
        },
        TOKEN_BLOCKLIST_COLLECTION: {
            'validator': TOKEN_BLOCKLIST_VALIDATOR,
            'indexes': [
                {'fields': [('jti', 'asc')], 'unique': True, 'name': 'idx_token_jti'},
                {'fields': [('expires_at', 'asc')], 'unique': False, 'name': 'idx_token_ttl', 'expireAfterSeconds': 0},
            ],
        },
    }


def get_collection_names() -> List[str]:
    return list(get_collection_configuration().keys())
