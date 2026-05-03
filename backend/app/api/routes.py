from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from pymongo.errors import DuplicateKeyError

from app.api.auth import get_current_user
from app.utils.user_identity import get_user_ref, normalize_gender
from fastapi_cache.decorator import cache
from fastapi_cache import FastAPICache

from app.db.db import get_database, get_gridfs_bucket
from app.core.responses import success_response, serialize_document
from app.core.logger import logger
from app.schemas.schemas import (
    AlertCreate,
    AnalysisCreate,
    FamilyHistoryBatch,
    HealthMetricsCreate,
    LabResultCreate,
    LifestyleDataUpsert,
    MedicalHistoryUpsert,
    MedicationCreate,
    SymptomCreate,
    UserUpdate,
)
from app.services.mongo.user_service import UserService
from app.services.mongo.health_service import HealthService
from app.services.postgres.audit_service import AuditService
from app.core.limiter import limiter

router = APIRouter()

def user_specific_key_builder(
    func,
    namespace: str = "",
    *,
    request: Request = None,
    response: Any = None,
    args: tuple = None,
    kwargs: dict = None,
):
    user = kwargs.get("current_user")
    user_id = user.get("user_id") if user else "anon"
    return f"{namespace}:{func.__module__}:{func.__name__}:{user_id}"


# ---------------------------------------------------------------------------
# File validation helpers
# ---------------------------------------------------------------------------

ALLOWED_MIME_TYPES = {'application/pdf', 'image/jpeg', 'image/png'}
ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def validate_file_type(file: UploadFile) -> Optional[str]:
    """Return an error message if the file type is not allowed, else None."""
    if not file.content_type or file.content_type not in ALLOWED_MIME_TYPES:
        return "Invalid file type. Only PDF, JPG, and PNG are allowed"
    if file.filename:
        filename_lower = file.filename.lower()
        if not any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
            return "Invalid file type. Only PDF, JPG, and PNG are allowed"
    return None


def validate_file_size(content: bytes) -> Optional[str]:
    """Return an error message if the file size is out of range, else None."""
    size = len(content)
    if size == 0:
        return "File is empty or corrupted"
    if size > MAX_FILE_SIZE:
        return f"File size exceeds 10MB limit"
    return None


# ---------------------------------------------------------------------------
# Existing helpers
# ---------------------------------------------------------------------------

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


async def create_alert_if_needed(user_id: Any, symptom: SymptomCreate) -> None:
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


async def get_user_or_404(user_id: Any) -> dict[str, Any]:
    db = get_database()
    user = await db.users.find_one({'_id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user


# ---------------------------------------------------------------------------
# User endpoints
# ---------------------------------------------------------------------------

@router.get('/users')
@limiter.limit("100/minute")
async def list_users(
    request: Request,
    name: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_database()
    filters: dict[str, Any] = {'_id': current_user['_id']}
    if name:
        filters['name'] = {'$regex': name, '$options': 'i'}
    if gender:
        filters['gender'] = gender
    cursor = db.users.find(filters).sort('name', 1)
    users = [serialize_document(user) async for user in cursor]
    return success_response(users, message='Users retrieved successfully')


@router.get('/users/me')
@limiter.limit("100/minute")
async def get_user_me(request: Request, current_user: dict = Depends(get_current_user)):
    return success_response(serialize_document(current_user), message='User retrieved successfully')


# Fields in UserUpdate that PostgreSQL users table also stores
_PG_USER_FIELDS = {'name', 'age', 'gender', 'height_cm', 'weight_kg', 'blood_group', 'bmi', 'health_goal'}


@router.put('/users/me')
@limiter.limit("100/minute")
async def update_user(request: Request, payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    oid = current_user['_id']
    db = get_database()

    updated = {k: v for k, v in payload.model_dump().items() if v is not None}
    if 'gender' in updated:
        updated['gender'] = normalize_gender(str(updated['gender']))
    if not updated:
        raise HTTPException(status_code=400, detail='No changes were provided')

    height = updated.get('height_cm') or current_user.get('height_cm')
    weight = updated.get('weight_kg') or current_user.get('weight_kg')
    bmi = compute_bmi(height, weight)
    if bmi is not None:
        updated['bmi'] = bmi
    
    # Update via Service (Primary: MongoDB)
    updated_user = await UserService.update_profile(oid, updated)
    if not updated_user:
        raise HTTPException(status_code=404, detail='User not found')

    # Audit Log (Secondary: PostgreSQL - Non-blocking)
    pg_user_id: str | None = current_user.get('user_id')
    await AuditService.log_action(pg_user_id or str(oid), "user_profile_update")

    return success_response(updated_user, message='User updated successfully')


@router.delete('/users/me')
@limiter.limit("100/minute")
async def delete_user(request: Request, current_user: dict = Depends(get_current_user)):
    oid = current_user['_id']
    pg_user_id: str | None = current_user.get('user_id')
    user_ref = get_user_ref(current_user)
    db = get_database()

    # 1. MongoDB Delete (Primary)
    result = await db.users.delete_one({'_id': oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    
    # 2. Cleanup related data (MongoDB)
    refs = [user_ref]
    if pg_user_id:
        refs.append(pg_user_id)
        
    for coll_name in [
        'symptoms', 'analysis', 'alerts', 'reports', 'lab_results', 
        'medication_tracking', 'medical_history', 'family_history', 
        'lifestyle_data', 'health_metrics'
    ]:
        await db[coll_name].delete_many({'user_id': {'$in': refs}})

    # 3. Cleanup Medical Reports (GridFS + Metadata)
    bucket = get_gridfs_bucket()
    async for report in db.medical_reports.find({'user_id': user_ref}):
        try:
            await bucket.delete(report['gridfs_file_id'])
        except Exception as exc:
            logger.warning('GridFS delete failed for report %s: %s', report.get('file_name'), exc)
    await db.medical_reports.delete_many({'user_id': user_ref})

    # 4. Audit Log (Secondary: PostgreSQL - Non-blocking)
    await AuditService.log_action(pg_user_id or str(oid), "user_account_deleted")

    logger.info('User %s and all related data deleted successfully', oid)
    return success_response(None, message='User deleted successfully')


# ---------------------------------------------------------------------------
# Symptom endpoints (Primary: MongoDB)
# ---------------------------------------------------------------------------

@router.post('/symptoms')
@limiter.limit("100/minute")
async def create_symptom(request: Request, payload: SymptomCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    payload_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    payload_data["user_id"] = user_ref
    now = datetime.utcnow()
    payload_data['created_at'] = now
    payload_data['recorded_at'] = now
    result = await db.symptoms.insert_one(payload_data)
    symptom = await db.symptoms.find_one({'_id': result.inserted_id})
    await create_alert_if_needed(user_ref, payload)
    return success_response(serialize_document(symptom), message='Symptom recorded successfully')


@router.get('/symptoms')
@limiter.limit("100/minute")
async def list_symptoms(request: Request, symptom: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    db = get_database()
    query: dict[str, Any] = {'user_id': get_user_ref(current_user)}
    if symptom:
        query['symptom'] = {'$regex': symptom, '$options': 'i'}
    cursor = db.symptoms.find(query).sort('timestamp', -1)
    symptoms = [serialize_document(item) async for item in cursor]
    return success_response(symptoms, message='Symptoms retrieved successfully')


# ---------------------------------------------------------------------------
# Analysis endpoints
# ---------------------------------------------------------------------------

@router.post('/analysis')
@limiter.limit("100/minute")
async def create_analysis(request: Request, payload: AnalysisCreate, current_user: dict = Depends(get_current_user)):
    # Invalidate cache for this user
    user_id = current_user.get("user_id") or str(current_user["_id"])
    await FastAPICache.clear(namespace="analysis", key=f"analysis:app.api.routes:list_analysis:{user_id}")
    db = get_database()
    user_ref = get_user_ref(current_user)
    symptom_cursor = db.symptoms.find({'user_id': user_ref}).sort('timestamp', -1).limit(20)
    recent_symptoms = [item async for item in symptom_cursor]
    risk_level, reason, action_plan = evaluate_risk(recent_symptoms)
    analysis_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    analysis_data["user_id"] = user_ref
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
@limiter.limit("100/minute")
@cache(expire=300, namespace="analysis", key_builder=user_specific_key_builder)
async def list_analysis(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_database()
    query: dict[str, Any] = {'user_id': get_user_ref(current_user)}
    cursor = db.analysis.find(query).sort('created_at', -1)
    items = [serialize_document(item) async for item in cursor]
    return success_response(items, message='Analyses retrieved successfully')


# ---------------------------------------------------------------------------
# Alert endpoints
# ---------------------------------------------------------------------------

@router.post('/alerts')
@limiter.limit("100/minute")
async def create_alert(request: Request, payload: AlertCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    alert_data = payload.model_dump()
    alert_data["user_id"] = user_ref
    alert_data['created_at'] = datetime.utcnow()
    result = await db.alerts.insert_one(alert_data)
    alert = await db.alerts.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(alert), message='Alert created successfully')


@router.get('/alerts')
@limiter.limit("100/minute")
async def list_alerts(request: Request, unread_only: Optional[bool] = Query(None), current_user: dict = Depends(get_current_user)):
    db = get_database()
    query: dict[str, Any] = {'user_id': get_user_ref(current_user)}
    if unread_only is True:
        query['is_read'] = False
    cursor = db.alerts.find(query).sort('created_at', -1)
    alerts = [serialize_document(item) async for item in cursor]
    return success_response(alerts, message='Alerts retrieved successfully')


@router.patch('/alerts/{alert_id}/read')
@limiter.limit("100/minute")
async def mark_alert_read(request: Request, alert_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    try:
        obj_id = ObjectId(alert_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid alert ID")

    result = await db.alerts.update_one(
        {'_id': obj_id, 'user_id': user_ref},
        {'$set': {'is_read': True, 'updated_at': datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return success_response(None, message='Alert marked as read')


# ---------------------------------------------------------------------------
# Medical history endpoints
# ---------------------------------------------------------------------------

@router.put('/medical-history')
@limiter.limit("100/minute")
async def upsert_medical_history(request: Request, payload: MedicalHistoryUpsert, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    now = datetime.utcnow()
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    existing = await db.medical_history.find_one({'user_id': user_ref})
    if existing:
        fields['updated_at'] = now
        await db.medical_history.update_one({'user_id': user_ref}, {'$set': fields})
    else:
        doc = {'user_id': user_ref, 'conditions': [], 'medications': [], 'allergies': [], 'surgeries': [], 'created_at': now, 'updated_at': now}
        doc.update(fields)
        await db.medical_history.insert_one(doc)
    record = await db.medical_history.find_one({'user_id': user_ref})
    return success_response(serialize_document(record), message='Medical history saved')


@router.get('/medical-history')
@limiter.limit("100/minute")
async def get_medical_history(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_database()
    record = await db.medical_history.find_one({'user_id': get_user_ref(current_user)})
    return success_response(serialize_document(record) if record else None, message='Medical history retrieved')


# ---------------------------------------------------------------------------
# Family history endpoints
# ---------------------------------------------------------------------------

@router.post('/family-history')
@limiter.limit("100/minute")
async def save_family_history(request: Request, payload: FamilyHistoryBatch, current_user: dict = Depends(get_current_user)):
    """Replace all family history entries for the user with the submitted batch."""
    db = get_database()
    user_ref = get_user_ref(current_user)
    now = datetime.utcnow()
    await db.family_history.delete_many({'user_id': user_ref})
    valid = [e for e in payload.entries if e.condition_name.strip()]
    if valid:
        docs = [
            {
                'user_id': user_ref,
                'condition_name': e.condition_name.strip(),
                **({'relation': e.relation.strip()} if e.relation and e.relation.strip() else {}),
                'created_at': now,
                'updated_at': now,
            }
            for e in valid
        ]
        await db.family_history.insert_many(docs)
    entries = [serialize_document(d) async for d in db.family_history.find({'user_id': user_ref}).sort('created_at', 1)]
    return success_response(entries, message='Family history saved')


@router.get('/family-history')
@limiter.limit("100/minute")
async def get_family_history(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_database()
    entries = [serialize_document(d) async for d in db.family_history.find({'user_id': get_user_ref(current_user)}).sort('created_at', 1)]
    return success_response(entries, message='Family history retrieved')


# ---------------------------------------------------------------------------
# Lifestyle endpoints
# ---------------------------------------------------------------------------

@router.put('/lifestyle')
@limiter.limit("100/minute")
async def upsert_lifestyle(request: Request, payload: LifestyleDataUpsert, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    now = datetime.utcnow()
    fields = {k: v for k, v in payload.model_dump().items() if v is not None}
    existing = await db.lifestyle_data.find_one({'user_id': user_ref})
    if existing:
        fields['updated_at'] = now
        await db.lifestyle_data.update_one({'user_id': user_ref}, {'$set': fields})
    else:
        fields.update({'user_id': user_ref, 'created_at': now, 'updated_at': now})
        await db.lifestyle_data.insert_one(fields)
    record = await db.lifestyle_data.find_one({'user_id': user_ref})
    return success_response(serialize_document(record), message='Lifestyle data saved')


@router.get('/lifestyle')
@limiter.limit("100/minute")
async def get_lifestyle(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_database()
    record = await db.lifestyle_data.find_one({'user_id': get_user_ref(current_user)})
    return success_response(serialize_document(record) if record else None, message='Lifestyle data retrieved')


# ---------------------------------------------------------------------------
# Health metrics endpoints
# ---------------------------------------------------------------------------

@router.post('/health-metrics')
@limiter.limit("100/minute")
async def create_health_metrics(request: Request, payload: HealthMetricsCreate, current_user: dict = Depends(get_current_user)):
    user_ref = get_user_ref(current_user)
    saved = await HealthService.create_health_metrics(user_ref, payload)
    
    # Audit Log to PostgreSQL (Non-blocking)
    user_uuid = current_user.get("user_id") or str(current_user["_id"])
    await AuditService.log_action(user_uuid, "log_health_metrics", resource="health_metrics", payload=payload.model_dump())
    
    return success_response(saved, message="Health metrics recorded successfully")


@router.get('/health-metrics')
@limiter.limit("100/minute")
async def list_health_metrics(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    cursor = db.health_metrics.find({'user_id': user_ref}).sort('recorded_at', -1).limit(10)
    items = [serialize_document(item) async for item in cursor]
    return success_response(items, message="Health metrics retrieved successfully")


# ---------------------------------------------------------------------------
# Medical reports endpoints (Primary: MongoDB)
# ---------------------------------------------------------------------------

@router.post('/medical-reports/upload', status_code=201)
async def upload_medical_report(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    type_error = validate_file_type(file)
    if type_error:
        raise HTTPException(status_code=400, detail=type_error)

    # Read file content
    content = await file.read()

    # Validate file size
    size_error = validate_file_size(content)
    if size_error:
        raise HTTPException(status_code=400, detail=size_error)

    user_ref = get_user_ref(current_user)
    mime_type = file.content_type
    original_filename = file.filename or 'unknown'

    # Upload to GridFS
    bucket = get_gridfs_bucket()
    gridfs_file_id: Optional[ObjectId] = None
    try:
        gridfs_file_id = await bucket.upload_from_stream(
            original_filename,
            content,
            metadata={'user_id': user_ref, 'content_type': mime_type},
        )
        logger.info('File uploaded to GridFS: %s for user %s', gridfs_file_id, user_ref)
    except Exception as exc:
        logger.error('GridFS upload failed for user %s: %s', user_ref, exc)
        raise HTTPException(status_code=500, detail='Failed to upload file to storage')

    # Save metadata to medical_reports collection
    db = get_database()
    now = datetime.utcnow()
    report_doc = {
        'user_id': user_ref,
        'file_name': original_filename,
        'gridfs_file_id': gridfs_file_id,
        'file_type': mime_type,
        'uploaded_at': now,
    }
    try:
        result = await db.medical_reports.insert_one(report_doc)
        saved = await db.medical_reports.find_one({'_id': result.inserted_id})
        logger.info('Metadata saved for report %s', result.inserted_id)
        return success_response(serialize_document(saved), message='Medical report uploaded successfully')
    except Exception as exc:
        logger.error('DB insert failed for user %s, cleaning up GridFS file %s: %s', user_ref, gridfs_file_id, exc)
        import asyncio
        cleanup_success = False
        for attempt in range(1, 4):
            try:
                await bucket.delete(gridfs_file_id)
                cleanup_success = True
                logger.info('GridFS cleanup SUCCESS: deleted orphan file %s on attempt %d', gridfs_file_id, attempt)
                break
            except Exception as cleanup_exc:
                logger.error('GridFS cleanup FAILED on attempt %d for file %s: %s', attempt, gridfs_file_id, cleanup_exc)
                await asyncio.sleep(0.5)
        
        if not cleanup_success:
            logger.critical('CRITICAL: Failed to clean up orphan GridFS file %s after 3 attempts!', gridfs_file_id)
            
        raise HTTPException(status_code=500, detail='Failed to save file metadata')


@router.get('/medical-reports')
@limiter.limit("100/minute")
async def list_medical_reports(request: Request, current_user: dict = Depends(get_current_user)):
    """Retrieve all medical reports for the authenticated user."""
    db = get_database()
    cursor = db.medical_reports.find({'user_id': get_user_ref(current_user)}).sort('uploaded_at', -1)
    reports = [serialize_document(doc) async for doc in cursor]
    return success_response(reports, message='Medical reports retrieved successfully')


@router.get('/medical-reports/{report_id}/download')
async def download_medical_report(
    report_id: str,
    inline: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
    """Stream a medical report file from GridFS."""
    # Validate report_id
    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid report ID')

    db = get_database()
    report = await db.medical_reports.find_one({'_id': oid})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    if report['user_id'] != get_user_ref(current_user):
        raise HTTPException(status_code=403, detail='Access denied')

    # Retrieve file from GridFS
    bucket = get_gridfs_bucket()
    try:
        gridfs_stream = await bucket.open_download_stream(report['gridfs_file_id'])
    except Exception:
        raise HTTPException(status_code=404, detail='File not found in storage')

    file_name = report['file_name']
    file_type = report['file_type']
    disposition = f'inline; filename="{file_name}"' if inline else f'attachment; filename="{file_name}"'

    async def stream_file():
        while True:
            chunk = await gridfs_stream.readchunk()
            if not chunk:
                break
            yield chunk

    return StreamingResponse(
        stream_file(),
        media_type=file_type,
        headers={'Content-Disposition': disposition},
    )


@router.delete('/medical-reports/{report_id}')
async def delete_medical_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a medical report and its associated GridFS file."""
    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid report ID')

    db = get_database()
    report = await db.medical_reports.find_one({'_id': oid})
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    if report['user_id'] != get_user_ref(current_user):
        raise HTTPException(status_code=403, detail='Access denied')

    # Delete from GridFS (log warning if it fails, continue)
    bucket = get_gridfs_bucket()
    try:
        await bucket.delete(report['gridfs_file_id'])
        logger.info('Deleted GridFS file %s', report['gridfs_file_id'])
    except Exception as exc:
        logger.warning('Failed to delete GridFS file %s: %s', report['gridfs_file_id'], exc)

    # Delete metadata
    await db.medical_reports.delete_one({'_id': oid})
    logger.info('Deleted medical report metadata %s', oid)

    return success_response(None, message='Medical report deleted successfully')


# ---------------------------------------------------------------------------
# Lab results endpoints
# ---------------------------------------------------------------------------

@router.post('/lab-results')
async def create_lab_result(payload: LabResultCreate, current_user: dict = Depends(get_current_user)):
    """Add a lab result for the authenticated user."""
    db = get_database()
    user_ref = get_user_ref(current_user)
    now = datetime.utcnow()
    
    doc = {
        'user_id': user_ref,
        'test_name': payload.test_name,
        'value': payload.value,
        'recorded_at': payload.recorded_at or now,
        'created_at': now,
    }
    
    if payload.unit:
        doc['unit'] = payload.unit
    
    if payload.reference_range:
        ref_dict = {k: v for k, v in payload.reference_range.model_dump().items() if v is not None}
        if ref_dict:
            doc['reference_range'] = ref_dict
            # Auto-calculate status
            min_val = ref_dict.get('min')
            max_val = ref_dict.get('max')
            if min_val is not None and payload.value < min_val:
                doc['status'] = 'abnormal'
            elif max_val is not None and payload.value > max_val:
                doc['status'] = 'abnormal'
            elif min_val is not None or max_val is not None:
                doc['status'] = 'normal'
    
    result = await db.lab_results.insert_one(doc)
    saved = await db.lab_results.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(saved), message='Lab result recorded successfully')


@router.get('/lab-results')
async def list_lab_results(current_user: dict = Depends(get_current_user)):
    """Get all lab results for the authenticated user."""
    db = get_database()
    cursor = db.lab_results.find({'user_id': get_user_ref(current_user)}).sort('recorded_at', -1)
    results = [serialize_document(d) async for d in cursor]
    return success_response(results, message='Lab results retrieved successfully')


# ---------------------------------------------------------------------------
# Medication tracking endpoints
# ---------------------------------------------------------------------------

@router.post('/medications')
@limiter.limit("100/minute")
async def create_medication(request: Request, payload: MedicationCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    
    doc = {
        'user_id': user_ref,
        'name': payload.medication_name,
        'dose': payload.dosage or "Not specified",
        'schedule': payload.frequency or "As needed",
        'notes': payload.side_effects or "",
        'created_at': datetime.utcnow(),
    }
    
    result = await db.medications.insert_one(doc)
    saved = await db.medications.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(saved), message='Medication recorded successfully')


@router.get('/medications')
@limiter.limit("100/minute")
async def list_medications(request: Request, current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.medications.find({'user_id': get_user_ref(current_user)}).sort('created_at', -1)
    medications = [serialize_document(d) async for d in cursor]
    return success_response(medications, message='Medications retrieved successfully')
