from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from pymongo.errors import DuplicateKeyError

from app.api.auth import get_current_user
from app.utils.user_identity import get_user_ref, normalize_gender

from app.db.db import get_database, get_gridfs_bucket
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
    user_ref = get_user_ref(current_user)
    await db.symptoms.delete_many({'user_id': user_ref})
    await db.analysis.delete_many({'user_id': user_ref})
    await db.alerts.delete_many({'user_id': user_ref})
    await db.reports.delete_many({'user_id': user_ref})
    return success_response(None, message='User and related records deleted successfully')


# ---------------------------------------------------------------------------
# Symptom endpoints
# ---------------------------------------------------------------------------

@router.post('/symptoms')
async def create_symptom(payload: SymptomCreate, current_user: dict = Depends(get_current_user)):
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
async def list_symptoms(symptom: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
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
async def create_analysis(payload: AnalysisCreate, current_user: dict = Depends(get_current_user)):
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
async def list_analysis(current_user: dict = Depends(get_current_user)):
    db = get_database()
    query: dict[str, Any] = {'user_id': get_user_ref(current_user)}
    cursor = db.analysis.find(query).sort('created_at', -1)
    items = [serialize_document(item) async for item in cursor]
    return success_response(items, message='Analyses retrieved successfully')


# ---------------------------------------------------------------------------
# Alert endpoints
# ---------------------------------------------------------------------------

@router.post('/alerts')
async def create_alert(payload: AlertCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    alert_data = payload.model_dump()
    alert_data["user_id"] = user_ref
    alert_data['created_at'] = datetime.utcnow()
    result = await db.alerts.insert_one(alert_data)
    alert = await db.alerts.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(alert), message='Alert created successfully')


@router.get('/alerts')
async def list_alerts(unread_only: Optional[bool] = Query(None), current_user: dict = Depends(get_current_user)):
    db = get_database()
    query: dict[str, Any] = {'user_id': get_user_ref(current_user)}
    if unread_only is True:
        query['is_read'] = False
    cursor = db.alerts.find(query).sort('created_at', -1)
    alerts = [serialize_document(item) async for item in cursor]
    return success_response(alerts, message='Alerts retrieved successfully')


# ---------------------------------------------------------------------------
# Medical history endpoints
# ---------------------------------------------------------------------------

@router.put('/medical-history')
async def upsert_medical_history(payload: MedicalHistoryUpsert, current_user: dict = Depends(get_current_user)):
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
async def get_medical_history(current_user: dict = Depends(get_current_user)):
    db = get_database()
    record = await db.medical_history.find_one({'user_id': get_user_ref(current_user)})
    return success_response(serialize_document(record) if record else None, message='Medical history retrieved')


# ---------------------------------------------------------------------------
# Family history endpoints
# ---------------------------------------------------------------------------

@router.post('/family-history')
async def save_family_history(payload: FamilyHistoryBatch, current_user: dict = Depends(get_current_user)):
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
async def get_family_history(current_user: dict = Depends(get_current_user)):
    db = get_database()
    entries = [serialize_document(d) async for d in db.family_history.find({'user_id': get_user_ref(current_user)}).sort('created_at', 1)]
    return success_response(entries, message='Family history retrieved')


# ---------------------------------------------------------------------------
# Lifestyle endpoints
# ---------------------------------------------------------------------------

@router.put('/lifestyle')
async def upsert_lifestyle(payload: LifestyleDataUpsert, current_user: dict = Depends(get_current_user)):
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
async def get_lifestyle(current_user: dict = Depends(get_current_user)):
    db = get_database()
    record = await db.lifestyle_data.find_one({'user_id': get_user_ref(current_user)})
    return success_response(serialize_document(record) if record else None, message='Lifestyle data retrieved')


# ---------------------------------------------------------------------------
# Health metrics endpoints
# ---------------------------------------------------------------------------

@router.post('/health-metrics')
async def create_health_metrics(payload: HealthMetricsCreate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_ref = get_user_ref(current_user)
    now = datetime.utcnow()
    doc = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not doc:
        raise HTTPException(status_code=400, detail='At least one metric value is required')
    doc.update({'user_id': user_ref, 'recorded_at': now, 'created_at': now})
    result = await db.health_metrics.insert_one(doc)
    saved = await db.health_metrics.find_one({'_id': result.inserted_id})
    return success_response(serialize_document(saved), message='Health metrics recorded')


@router.get('/health-metrics')
async def list_health_metrics(current_user: dict = Depends(get_current_user)):
    db = get_database()
    cursor = db.health_metrics.find({'user_id': get_user_ref(current_user)}).sort('recorded_at', -1)
    records = [serialize_document(d) async for d in cursor]
    return success_response(records, message='Health metrics retrieved')


# ---------------------------------------------------------------------------
# Medical reports endpoints
# ---------------------------------------------------------------------------

@router.post('/medical-reports/upload', status_code=201)
async def upload_medical_report(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a medical report (PDF, JPG, PNG) to GridFS."""
    # Validate file type
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
        try:
            await bucket.delete(gridfs_file_id)
        except Exception as cleanup_exc:
            logger.warning('Failed to clean up GridFS file %s: %s', gridfs_file_id, cleanup_exc)
        raise HTTPException(status_code=500, detail='Failed to save file metadata')


@router.get('/medical-reports')
async def list_medical_reports(current_user: dict = Depends(get_current_user)):
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
