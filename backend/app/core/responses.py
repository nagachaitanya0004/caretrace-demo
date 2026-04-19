from __future__ import annotations
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Any, Optional, Union
from bson import ObjectId

SENSITIVE_FIELDS = {'hashed_password', 'password', 'session_token'}

def serialize_document(document: dict[str, Any]) -> dict[str, Any]:
    if document is None:
        return {}
    data = {
        key: (str(value) if isinstance(value, ObjectId) else value)
        for key, value in document.items()
        if key not in SENSITIVE_FIELDS
    }
    data['id'] = str(document.get('_id', ''))
    data.pop('_id', None)
    return data

def get_object_id(document_id: str) -> ObjectId:
    if not ObjectId.is_valid(document_id):
        raise HTTPException(status_code=400, detail='Invalid identifier format')
    return ObjectId(document_id)


def success_response(data=None, message='') -> dict:
    return {
        'success': True,
        'data': data,
        'message': message,
    }


def error_response(message: str, error: Optional[Union[str, dict]] = None) -> dict:
    payload = {
        'success': False,
        'data': None,
        'message': message,
    }
    if error is not None:
        payload['error'] = error
    return payload


def http_error_response(exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(str(exc.detail), error=str(exc.detail)),
    )


def validation_error_response(exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content=error_response('Invalid request data', error=exc.errors()),
    )
