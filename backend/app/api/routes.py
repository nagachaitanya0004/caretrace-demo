from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Depends
from pymongo.errors import DuplicateKeyError

from app.api.auth import get_current_user
from app.utils.user_identity import normalize_gender

from app.db.db import get_database
from app.core.responses import error_response, success_response, serialize_document, get_object_id
from app.core.logger import logger
from app.schemas.schemas import (
    AlertCreate,
    AnalysisCreate,
    FamilyHistoryBatch,
    HealthMetricsCreate,
    LifestyleDataUpsert,
    MedicalHistoryUpsert,
    ReportCreate,
    SymptomCreate,
    UserCreate,
    UserUpdate,
)

router = APIRouter()


def compute_bmi(height_cm: Optional[float], weight_kg: Optional[float]) -> Optional[float]:
    try:
        if height_cm and weight_kg and height_cm > 0:
            return round(weight_kg / (height_cm / 100) ** 2, 2)
    except Exception:
        pass
    return None


def evaluate_risk(symptoms: list[dict[str, Any]]) -> tuple[str, str, str]:
    if not symptoms:
        return ('low', 
                'No symptom data provided. The autonomous baseline assessment defaults to a nominal health status.', 
                '• STATUS: No active symptoms logged in your user profile.\n• RECOMMENDATION: Continue routine wellness activities.\n• EXPLANATION: Our systems require active diagnostic input markers to compute probability vectors.')

    severity_scores = [item.get('severity', 0) for item in symptoms]
    durations = [item.get('duration', 0) for item in symptoms]
    symptom_names = [str(item.get('symptom', '')).lower() for item in symptoms if item.get('symptom')]
    
    unique_names = list(set(symptom_names))
    critical_symptoms = {'chest pain', 'shortness of breath', 'severe headache', 'dizziness', 'fainting'}
    matched_critical = list(set(unique_names) & critical_symptoms)
    
    max_sev = max(severity_scores, default=0)
    avg_sev = sum(severity_scores) / max(len(severity_scores), 1)
    max_dur = max(durations, default=0)

    # Contextual dynamic names for explainability
    names_str = ', '.join(unique_names[:3])
    if len(unique_names) > 3:
        names_str += f' (and {len(unique_names) - 3} more)'

    if matched_critical or max_sev >= 8:
        crit_str = ', '.join(matched_critical) if matched_critical else 'Extreme severity scale (>= 8/10)'
        reason = f"Calculated High Risk. The diagnostic engine identified critical anomalous priority markers: {crit_str}. A highly concerning pattern was verified across {len(symptoms)} contextual records."
        action_plan = (
            f"• IMMEDIATE ACTION: Seek urgent medical assessment regarding your reports of {names_str}.\n"
            f"• DATA CORRELATION: Peak severity reached {max_sev}/10. This mathematically aligns with acute distress models.\n"
            "• EXPLANATION: CareTrace AI algorithms automatically escalate critical vital deviations to expedite triage and prevent health cascades."
        )
        return 'high', reason, action_plan

    if max_dur >= 14 or avg_sev >= 6:
        reason = f"Calculated Medium Risk. The system detected continuous, statistically persistent signals ({names_str}). Evaluation of {len(symptoms)} data points confirmed an extended duration metric or elevated threshold."
        action_plan = (
            f"• PRIMARY ACTION: Schedule a non-urgent clinical review within the next 7-14 days regarding {names_str}.\n"
            f"• DATA CORRELATION: Trajectory indicates prolonged progression (up to {max_dur} days) or elevated density (Avg Severity: {avg_sev:.1f}/10).\n"
            "• EXPLANATION: Chronic persistence of moderate symptoms frequently maps to underlying conditions requiring standard laboratory validation rather than emergency intervention."
        )
        return 'medium', reason, action_plan

    reason = f"Calculated Low Risk. The system mapped {len(symptoms)} recorded indicators ({names_str}) and determined they fall entirely within acceptable nominal limits."
    action_plan = (
        "• ONGOING ACTION: Continue active self-monitoring. Track any deviations in severity routinely.\n"
        f"• DATA CORRELATION: Severity distribution (Peak: {max_sev}/10) and timelines (Max: {max_dur} days) remain in normal bounds.\n"
        "• EXPLANATION: Heuristic mapping links these features to resolving or completely benign etiologies. No clinical intervention is recommended."
    )
    return 'low', reason, action_plan


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
async def list_users(name: Optional[str] = Query(None), gender: Optional[str] = Query(None)):
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


@router.get('/users/me')
async def get_user_me(current_user: dict = Depends(get_current_user)):
    return success_response(serialize_document(current_user), message='User retrieved successfully')


@router.put('/users/me')
async def update_user(payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    oid = current_user["_id"]
    db = get_database()
    updated = {k: v for k, v in payload.model_dump().items() if v is not None}
    if 'gender' in updated:
        updated['gender'] = normalize_gender(str(updated['gender']))
    if not updated:
        raise HTTPException(status_code=400, detail='No changes were provided')
    # Derive BMI whenever height or weight is being updated
    height = updated.get('height_cm') or current_user.get('height_cm')
    weight = updated.get('weight_kg') or current_user.get('weight_kg')
    bmi = compute_bmi(height, weight)
    if bmi is not None:
        updated['bmi'] = bmi
    updated['updated_at'] = datetime.utcnow()
    result = await db.users.update_one({'_id': oid}, {'$set': updated})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    user = await db.users.find_one({'_id': oid})
    return success_response(serialize_document(user), message='User updated successfully')


@router.delete('/users/me')
async def delete_user(current_user: dict = Depends(get_current_user)):
    oid = current_user["_id"]
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
async def create_symptom(payload: SymptomCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    payload_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    payload_data["user_id"] = user_id
    payload_data['created_at'] = datetime.utcnow()
    result = await db.symptoms.insert_one(payload_data)
    symptom = await db.symptoms.find_one({'_id': result.inserted_id})
    await create_alert_if_needed(user_id, payload)
    return success_response(serialize_document(symptom), message='Symptom recorded successfully')


@router.get('/symptoms')
async def list_symptoms(symptom: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    db = get_database()
    query: dict[str, Any] = {'user_id': current_user["_id"]}
    if symptom:
        query['symptom'] = {'$regex': symptom, '$options': 'i'}
    cursor = db.symptoms.find(query).sort('timestamp', -1)
    symptoms = [serialize_document(item) async for item in cursor]
    return success_response(symptoms, message='Symptoms retrieved successfully')


@router.post('/analysis')
async def create_analysis(payload: AnalysisCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    symptom_cursor = db.symptoms.find({'user_id': user_id}).sort('timestamp', -1).limit(20)
    recent_symptoms = [item async for item in symptom_cursor]
    risk_level, reason, action_plan = evaluate_risk(recent_symptoms)
    analysis_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    analysis_data["user_id"] = user_id
    analysis_data['risk_level'] = risk_level
    analysis_data['reason'] = reason
    analysis_data['summary'] = action_plan
    analysis_data['metrics'] = analysis_data.get('metrics') or {
        'symptom_count': len(recent_symptoms),
    }
    analysis_data['created_at'] = datetime.utcnow()
    result = await db.analysis.insert_one(analysis_data)
    analysis = await db.analysis.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(analysis), message='Analysis created successfully')


@router.get('/analysis')
async def list_analysis(current_user: dict = Depends(get_current_user)):
    db = get_database()
    query: dict[str, Any] = {'user_id': current_user["_id"]}
    cursor = db.analysis.find(query).sort('created_at', -1)
    items = [serialize_document(item) async for item in cursor]
    return success_response(items, message='Analyses retrieved successfully')


@router.post('/alerts')
async def create_alert(payload: AlertCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user["_id"]
    alert_data = payload.model_dump()
    alert_data["user_id"] = user_id
    alert_data['created_at'] = datetime.utcnow()
    result = await db.alerts.insert_one(alert_data)
    alert = await db.alerts.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(alert), message='Alert created successfully')


@router.get('/alerts')
async def list_alerts(unread_only: Optional[bool] = Query(None), current_user: dict = Depends(get_current_user)):
    db = get_database()
    query: dict[str, Any] = {'user_id': current_user["_id"]}
    if unread_only is True:
        query['is_read'] = False
    cursor = db.alerts.find(query).sort('created_at', -1)
    alerts = [serialize_document(item) async for item in cursor]
    return success_response(alerts, message='Alerts retrieved successfully')


@router.put('/medical-history')
async def upsert_medical_history(payload: MedicalHistoryUpsert, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user['_id']
    now = datetime.utcnow()
    # Only write fields that were actually provided (not None)
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    existing = await db.medical_history.find_one({'user_id': user_id})
    if existing:
        fields['updated_at'] = now
        await db.medical_history.update_one({'user_id': user_id}, {'$set': fields})
    else:
        doc = {'user_id': user_id, 'conditions': [], 'medications': [], 'allergies': [], 'surgeries': [], 'created_at': now, 'updated_at': now}
        doc.update(fields)
        await db.medical_history.insert_one(doc)
    record = await db.medical_history.find_one({'user_id': user_id})
    return success_response(serialize_document(record), message='Medical history saved')


@router.get('/medical-history')
async def get_medical_history(current_user: dict = Depends(get_current_user)):
    db = get_database()
    record = await db.medical_history.find_one({'user_id': current_user['_id']})
    return success_response(serialize_document(record) if record else None, message='Medical history retrieved')


@router.post('/family-history')
async def save_family_history(payload: FamilyHistoryBatch, current_user: dict = Depends(get_current_user)):
    """Replace all family history entries for the user with the submitted batch."""
    db = get_database()
    user_id = current_user['_id']
    now = datetime.utcnow()
    # Delete existing entries then insert the new batch (idempotent replace)
    await db.family_history.delete_many({'user_id': user_id})
    valid = [e for e in payload.entries if e.condition_name.strip()]
    if valid:
        docs = [
            {
                'user_id': user_id,
                'condition_name': e.condition_name.strip(),
                **({'relation': e.relation.strip()} if e.relation and e.relation.strip() else {}),
                'created_at': now,
                'updated_at': now,
            }
            for e in valid
        ]
        await db.family_history.insert_many(docs)
    entries = [serialize_document(d) async for d in db.family_history.find({'user_id': user_id}).sort('created_at', 1)]
    return success_response(entries, message='Family history saved')


@router.get('/family-history')
async def get_family_history(current_user: dict = Depends(get_current_user)):
    db = get_database()
    entries = [serialize_document(d) async for d in db.family_history.find({'user_id': current_user['_id']}).sort('created_at', 1)]
    return success_response(entries, message='Family history retrieved')


@router.put('/lifestyle')
async def upsert_lifestyle(payload: LifestyleDataUpsert, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user['_id']
    now = datetime.utcnow()
    # Only write fields explicitly provided (not None)
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    existing = await db.lifestyle_data.find_one({'user_id': user_id})
    if existing:
        fields['updated_at'] = now
        await db.lifestyle_data.update_one({'user_id': user_id}, {'$set': fields})
    else:
        fields.update({'user_id': user_id, 'created_at': now, 'updated_at': now})
        await db.lifestyle_data.insert_one(fields)
    record = await db.lifestyle_data.find_one({'user_id': user_id})
    return success_response(serialize_document(record), message='Lifestyle data saved')


@router.get('/lifestyle')
async def get_lifestyle(current_user: dict = Depends(get_current_user)):
    db = get_database()
    record = await db.lifestyle_data.find_one({'user_id': current_user['_id']})
    return success_response(serialize_document(record) if record else None, message='Lifestyle data retrieved')


@router.post('/health-metrics')
async def create_health_metrics(payload: HealthMetricsCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = current_user['_id']
    now = datetime.utcnow()
    # Only write fields that were actually provided
    doc = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not doc:
        raise HTTPException(status_code=400, detail='At least one metric value is required')
    doc.update({'user_id': user_id, 'recorded_at': now, 'created_at': now})
    result = await db.health_metrics.insert_one(doc)
    saved = await db.health_metrics.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(saved), message='Health metrics recorded')


@router.get('/health-metrics')
async def list_health_metrics(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.health_metrics.find({'user_id': current_user['_id']}).sort('recorded_at', -1)
    records = [serialize_document(d) async for d in cursor]
    return success_response(records, message='Health metrics retrieved')
