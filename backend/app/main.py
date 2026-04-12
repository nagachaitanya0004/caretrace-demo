from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.app.db.db import close_db, init_db
from backend.app.core.logger import logger
from backend.app.core.responses import error_response, http_error_response, validation_error_response
from backend.app.api.routes import router as api_router
from backend.app.api.auth import router as auth_router
from backend.app.core.config import APP_NAME, APP_VERSION

app = FastAPI(title=APP_NAME, version=APP_VERSION)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(api_router, prefix="/api", tags=["api"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.middleware('http')
async def log_requests(request: Request, call_next):
    logger.info('Request %s %s', request.method, request.url.path)
    response = await call_next(request)
    logger.info('Response %s %s %s', request.method, request.url.path, response.status_code)
    return response


@app.on_event('startup')
async def on_startup():
    logger.info('Starting CareTrace AI backend')
    await init_db()


@app.on_event('shutdown')
async def on_shutdown():
    logger.info('Shutting down CareTrace AI backend')
    await close_db()


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return http_error_response(exc)


@app.exception_handler(RequestValidationError)
async def custom_validation_exception_handler(request: Request, exc: RequestValidationError):
    return validation_error_response(exc)


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception('Unhandled exception: %s', exc)
    return JSONResponse(
        status_code=500,
        content=error_response('Internal server error', error=str(exc)),
    )


@app.get('/health')
async def health_check():
    return {
        'success': True,
        'data': {'status': 'ok', 'service': APP_NAME},
        'message': 'CareTrace AI backend is healthy',
    }


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app.main:app', host='127.0.0.1', port=8000, reload=True)
