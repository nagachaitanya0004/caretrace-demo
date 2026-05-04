"""
CareTrace AI - Scalable Backend Architecture
------------------------------------------
Architecture Rules:
* MongoDB is the PRIMARY data source (Users, Health Data, AI Analysis)
* PostgreSQL is SECONDARY and OPTIONAL (Audit Logs, System Config only)
* No duplication of data between databases
* No cross-database joins (Each API depends on exactly ONE database)
"""

from contextlib import asynccontextmanager
from datetime import datetime
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

from app.db.db import close_db, init_db, get_database
from app.db.postgres import init_postgres, close_postgres, postgres_manager
from app.core.config import APP_NAME, APP_VERSION, CORS_ORIGINS, validate_environment
from app.core.logger import logger
from app.core.responses import success_response, error_response, http_error_response, validation_error_response
from app.core.limiter import limiter
from app.api.routes import router as api_router
from app.api.auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('🚀 Starting %s v%s', APP_NAME, APP_VERSION)
    
    # 1. Validate Environment
    try:
        env_config = validate_environment()
        logger.info('✅ Environment validated (%s mode)', env_config["ENV"])
    except Exception as exc:
        logger.error('❌ Environment validation failed: %s', exc)
        raise RuntimeError(f'Environment validation failed: {exc}') from exc
    
    # 2. Initialize Primary Database (MongoDB - REQUIRED)
    try:
        await init_db()
        logger.info('🟢 MongoDB Primary initialized successfully')
        
        # 2a. Seed Demo Account
        from app.db.seed import ensure_demo_account
        await ensure_demo_account()
        logger.info('👤 Demo account synchronized')
        
    except Exception as exc:
        logger.error('🔴 MongoDB Primary FAILED: %s', exc)
        raise RuntimeError(f'Primary Database (MongoDB) connection failed: {exc}') from exc
    
    # 3. Initialize Secondary Database (PostgreSQL - OPTIONAL)
    try:
        await init_postgres()
        if postgres_manager.is_active:
            logger.info('🟢 PostgreSQL Secondary active (Audit/Config mode)')
        else:
            logger.info('🟡 PostgreSQL Secondary inactive (Optional features disabled)')
    except Exception as exc:
        logger.warning('🟡 PostgreSQL Secondary initialization encountered an error: %s', exc)
        logger.info('Proceeding with MongoDB-only primary features.')
    
    # 4. Initialize Cache
    FastAPICache.init(InMemoryBackend())
    logger.info('⚡ Caching initialized')
    
    yield
    
    # Shutdown
    await close_db()
    await close_postgres()
    logger.info('👋 Backend shutdown complete')

app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' https://*.onrender.com https://*.vercel.app; "
        "frame-ancestors 'none';"
    )
    return response

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
    # In production, integrate Sentry or similar:
    try:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)
    except ImportError:
        pass
    logger.exception('Unhandled exception: %s', exc)
    return JSONResponse(
        status_code=500,
        content=error_response('Internal server error', error='INTERNAL_ERROR'),
    )

@app.get('/health')
async def health_check():
    """Health check endpoint with DB latency and version."""
    start_time = time.time()
    db_status = "healthy"
    latency = 0
    
    try:
        db = get_database()
        await db.command('ping')
        latency = int((time.time() - start_time) * 1000)
    except Exception as exc:
        logger.error('Health check DB failed: %s', exc)
        db_status = "unhealthy"
        
    health_data = {
        'status': 'healthy' if db_status == "healthy" else "degraded",
        'db_latency_ms': latency,
        'secondary_db_active': postgres_manager.is_active,
        'version': APP_VERSION,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    return success_response(data=health_data)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app.main:app', host='127.0.0.1', port=8001, reload=True)
