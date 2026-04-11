from datetime import datetime, timedelta
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pymongo.errors import DuplicateKeyError

from app.db import get_database
from app.responses import error_response, success_response
from app.logger import logger
from backend.schemas import (
    AlertCreate,
    AnalysisCreate,
    ReportCreate,
    SymptomCreate,
    UserCreate,
    UserUpdate,
)

router = APIRouter()


def serialize_document(document: dict[str, Any]) -> dict[str, Any]:
    if document is None:
        return {}
    data = {
        key: (str(value) if isinstance(value, ObjectId) else value)
        for key, value in document.items()
    }
    data['id'] = str(document['_id'])
    data.pop('_id', None)
    return data


def get_object_id(document_id: str) -> ObjectId:
    if not ObjectId.is_valid(document_id):
        raise HTTPException(status_code=400, detail='Invalid identifier format')
    return ObjectId(document_id)


def evaluate_risk(symptoms: list[dict[str, Any]]) -> tuple[str, str]:
    if not symptoms:
        return 'low', 'No symptoms submitted; default low risk.'

    severity_scores = [item.get('severity', 0) for item in symptoms]
    durations = [item.get('duration', 0) for item in symptoms]
    critical_symptoms = {'chest pain', 'shortness of breath', 'severe headache', 'dizziness'}
    symptom_names = {item.get('symptom', '').lower() for item in symptoms}

    if symptom_names & critical_symptoms or max(severity_scores, default=0) >= 8:
        return 'high', 'Critical symptom pattern detected; urgent follow-up recommended.'

    if max(durations, default=0) >= 14 or sum(severity_scores) / max(len(severity_scores), 1) >= 6:
        return 'medium', 'Moderate risk based on persistent symptom patterns.'

    return 'low', 'Symptoms are mild or resolving; continue monitoring.'


async def create_alert_if_needed(user_id: ObjectId, symptom: SymptomCreate) -> None:
    db = get_database()
    severity = symptom.severity
    alert_level = None
    message = None

    if severity >= 8:
        alert_level = 'critical'
        message = f'High-severity symptom reported: {symptom.symptom}. Immediate review recommended.'
    elif severity >= 6:
        alert_level = 'warning'
        message = f'Moderate-severity symptom reported: {symptom.symptom}. Review the care plan.'

    if alert_level and message:
        duplicate_window = datetime.utcnow() - timedelta(hours=24)
        existing = await db.alerts.find_one(
            {
                'user_id': user_id,
                'message': message,
                'severity': alert_level,
                'created_at': {'$gte': duplicate_window},
            }
        )
        if existing:
            logger.info('Skipping duplicate alert for user=%s', user_id)
            return

        try:
            await db.alerts.insert_one(
                {
                    'user_id': user_id,
                    'message': message,
                    'severity': alert_level,
                    'created_at': datetime.utcnow(),
                    'is_read': False,
                    'category': 'symptom_monitoring',
                    'source': 'automated_signal',
                }
            )
            logger.info('Generated alert for user=%s: %s', user_id, message)
        except DuplicateKeyError:
            logger.warning('Alert duplicate skipped for user=%s', user_id)


async def get_user_or_404(user_id: ObjectId) -> dict[str, Any]:
    db = get_database()
    user = await db.users.find_one({'_id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user


@router.get('/users')
async def list_users(name: str | None = Query(None), gender: str | None = Query(None)):
    db = get_database()
    filters: dict[str, Any] = {}
    if name:
        filters['name'] = {'$regex': name, '$options': 'i'}
    if gender:
        filters['gender'] = gender
    cursor = db.users.find(filters).sort('name', 1)
    users = [serialize_document(user) async for user in cursor]
    return success_response(users, message='Users retrieved successfully')


@router.post('/users')
async def create_user(payload: UserCreate):
    db = get_database()
    payload_data = payload.model_dump()
    payload_data.update({'created_at': datetime.utcnow(), 'updated_at': datetime.utcnow()})
    result = await db.users.insert_one(payload_data)
    user = await db.users.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(user), message='User created successfully')


@router.get('/users/{user_id}')
async def get_user(user_id: str):
    oid = get_object_id(user_id)
    user = await get_user_or_404(oid)
    return success_response(serialize_document(user), message='User retrieved successfully')


@router.put('/users/{user_id}')
async def update_user(user_id: str, payload: UserUpdate):
    oid = get_object_id(user_id)
    db = get_database()
    updated = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updated:
        raise HTTPException(status_code=400, detail='No changes were provided')
    updated['updated_at'] = datetime.utcnow()
    result = await db.users.update_one({'_id': oid}, {'$set': updated})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    user = await db.users.find_one({'_id': oid})
    return success_response(serialize_document(user), message='User updated successfully')


@router.delete('/users/{user_id}')
async def delete_user(user_id: str):
    oid = get_object_id(user_id)
    db = get_database()
    result = await db.users.delete_one({'_id': oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    await db.symptoms.delete_many({'user_id': oid})
    await db.analysis.delete_many({'user_id': oid})
    await db.alerts.delete_many({'user_id': oid})
    await db.reports.delete_many({'user_id': oid})
    return success_response(None, message='User and related records deleted successfully')


@router.post('/symptoms')
async def create_symptom(payload: SymptomCreate):
    db = get_database()
    user_id = get_object_id(str(payload.user_id))
    await get_user_or_404(user_id)
    payload_data = payload.model_dump()
    payload_data['created_at'] = datetime.utcnow()
    result = await db.symptoms.insert_one(payload_data)
    symptom = await db.symptoms.find_one({'_id': result.inserted_id})
    await create_alert_if_needed(user_id, payload)
    return success_response(serialize_document(symptom), message='Symptom recorded successfully')


@router.get('/symptoms')
async def list_symptoms(user_id: str | None = Query(None), symptom: str | None = Query(None)):
    db = get_database()
    query: dict[str, Any] = {}
    if user_id:
        query['user_id'] = get_object_id(user_id)
    if symptom:
        query['symptom'] = {'$regex': symptom, '$options': 'i'}
    cursor = db.symptoms.find(query).sort('timestamp', -1)
    symptoms = [serialize_document(item) async for item in cursor]
    return success_response(symptoms, message='Symptoms retrieved successfully')


@router.post('/analysis')
async def create_analysis(payload: AnalysisCreate):
    db = get_database()
    user_id = get_object_id(str(payload.user_id))
    await get_user_or_404(user_id)
    symptom_cursor = db.symptoms.find({'user_id': user_id}).sort('timestamp', -1).limit(20)
    recent_symptoms = [item async for item in symptom_cursor]
    risk_level, reason = evaluate_risk(recent_symptoms)
    analysis_data = payload.model_dump()
    analysis_data['risk_level'] = risk_level
    analysis_data['reason'] = reason
    analysis_data['summary'] = analysis_data.get('summary') or reason
    analysis_data['metrics'] = analysis_data.get('metrics') or {
        'symptom_count': len(recent_symptoms),
        'last_symptom_at': recent_symptoms[0]['timestamp'] if recent_symptoms else None,
    }
    analysis_data['created_at'] = datetime.utcnow()
    result = await db.analysis.insert_one(analysis_data)
    analysis = await db.analysis.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(analysis), message='Analysis created successfully')


@router.get('/analysis')
async def list_analysis(user_id: str | None = Query(None)):
    db = get_database()
    query: dict[str, Any] = {}
    if user_id:
        query['user_id'] = get_object_id(user_id)
    cursor = db.analysis.find(query).sort('created_at', -1)
    items = [serialize_document(item) async for item in cursor]
    return success_response(items, message='Analyses retrieved successfully')


@router.post('/alerts')
async def create_alert(payload: AlertCreate):
    db = get_database()
    user_id = get_object_id(str(payload.user_id))
    await get_user_or_404(user_id)
    alert_data = payload.model_dump()
    alert_data['created_at'] = datetime.utcnow()
    result = await db.alerts.insert_one(alert_data)
    alert = await db.alerts.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(alert), message='Alert created successfully')


@router.get('/alerts')
async def list_alerts(user_id: str | None = Query(None), unread_only: bool | None = Query(None)):
    db = get_database()
    query: dict[str, Any] = {}
    if user_id:
        query['user_id'] = get_object_id(user_id)
    if unread_only is True:
        query['is_read'] = False
    cursor = db.alerts.find(query).sort('created_at', -1)
    alerts = [serialize_document(item) async for item in cursor]
    return success_response(alerts, message='Alerts retrieved successfully')
