from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


def success_response(data=None, message='') -> dict:
    return {
        'success': True,
        'data': data,
        'message': message,
    }


def error_response(message: str, error: str | dict | None = None) -> dict:
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
