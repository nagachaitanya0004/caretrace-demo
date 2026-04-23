from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.db.db import close_db, init_db
from app.db.postgres import init_postgres, close_postgres
from app.models.postgres_user import create_postgres_tables
from app.core.config import APP_NAME, APP_VERSION, CORS_ORIGINS
from app.core.logger import logger
from app.core.responses import error_response, http_error_response, validation_error_response
from app.api.routes import router as api_router
from app.api.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Starting %s v%s', APP_NAME, APP_VERSION)
    await init_db()
    await init_postgres()
    await create_postgres_tables()
    yield
    logger.info('Shutting down %s', APP_NAME)
    await close_db()
    await close_postgres()


app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)

app.include_router(auth_router, prefix='/auth', tags=['auth'])
app.include_router(api_router, prefix='/api', tags=['api'])

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r'^https://.*\.vercel\.app$|^https://.*\.onrender\.com$|^http://localhost:\d+$',
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
        content=error_response('Internal server error'),
    )


@app.get('/health')
async def health_check():
    return {
        'success': True,
        'data': {'status': 'ok', 'service': APP_NAME},
        'message': f'{APP_NAME} is healthy',
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app.main:app', host='127.0.0.1', port=8001, reload=True)
