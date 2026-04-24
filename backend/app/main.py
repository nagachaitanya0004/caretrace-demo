from contextlib import asynccontextmanager
from datetime import datetime
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.db.db import close_db, init_db
from app.db.postgres import init_postgres, close_postgres
from app.models.postgres_user import create_postgres_tables
from app.core.config import APP_NAME, APP_VERSION, CORS_ORIGINS, MONGO_DB, validate_environment
from app.core.logger import logger
from app.core.responses import error_response, http_error_response, validation_error_response
from app.api.routes import router as api_router
from app.api.auth import router as auth_router


def validate_cors_configuration() -> None:
    """
    Validate CORS configuration including regex patterns.
    Raises RuntimeError if CORS configuration is invalid.
    """
    # Define the CORS regex pattern used in the middleware
    cors_regex_pattern = r'^https://.*\.vercel\.app$|^https://.*\.onrender\.com$|^http://localhost:\d+$'
    
    try:
        # Attempt to compile the regex pattern to ensure it's valid
        compiled_pattern = re.compile(cors_regex_pattern)
        logger.debug('CORS regex pattern compiled successfully')
    except re.error as exc:
        raise RuntimeError(
            f'Invalid CORS regex pattern: {exc}. '
            f'Pattern: {cors_regex_pattern}'
        ) from exc
    
    # Validate CORS_ORIGINS list
    if not CORS_ORIGINS:
        logger.warning('CORS_ORIGINS is empty - no explicit origins configured')
    else:
        logger.info('CORS origins configured: %s', ', '.join(CORS_ORIGINS))
    
    # Test the regex pattern against expected URLs to ensure it works correctly
    test_urls = [
        ('https://myapp.vercel.app', True),
        ('https://myapp.onrender.com', True),
        ('http://localhost:3000', True),
        ('http://localhost:5173', True),
        ('https://evil.com', False),
    ]
    
    for test_url, should_match in test_urls:
        matches = compiled_pattern.match(test_url) is not None
        if matches != should_match:
            raise RuntimeError(
                f'CORS regex pattern validation failed: '
                f'URL "{test_url}" {"should" if should_match else "should not"} match but {"does" if matches else "does not"}. '
                f'Pattern: {cors_regex_pattern}'
            )
    
    logger.debug('CORS regex pattern validation successful')


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info('Starting %s v%s', APP_NAME, APP_VERSION)
    
    # Validate environment variables first
    try:
        logger.info('Validating environment configuration...')
        env_config = validate_environment()
        
        logger.info('Using PostgreSQL: %s (Host: %s)', env_config["POSTGRES"]["type"], env_config["POSTGRES"]["host"])
        logger.info('Using MongoDB: %s (Host: %s)', env_config["MONGO"]["type"], env_config["MONGO"]["host"])
        
        logger.info('Environment validation successful (%s mode)', env_config["ENV"])
    except Exception as exc:
        logger.error('Environment validation failed: %s', exc)
        raise RuntimeError(f'Environment validation failed: {exc}') from exc
    
    # Validate CORS configuration
    try:
        logger.info('Validating CORS configuration...')
        validate_cors_configuration()
        logger.info('CORS configuration validated successfully')
    except Exception as exc:
        logger.error('CORS configuration validation failed: %s', exc)
        raise RuntimeError(f'CORS configuration validation failed: {exc}') from exc
    
    # Initialize databases with proper error handling
    try:
        logger.info('Initializing MongoDB...')
        await init_db()
        logger.info('MongoDB connected successfully')
    except Exception as exc:
        logger.error('MongoDB initialization failed: %s', exc)
        raise RuntimeError(f'MongoDB connection failed - application cannot start: {exc}') from exc
    
    try:
        logger.info('Initializing PostgreSQL...')
        await init_postgres()
        logger.info('PostgreSQL connected successfully')
    except Exception as exc:
        logger.error('PostgreSQL initialization failed: %s', exc)
        raise RuntimeError(f'PostgreSQL connection failed - application cannot start: {exc}') from exc
    
    try:
        logger.info('Creating PostgreSQL tables...')
        await create_postgres_tables()
        logger.info('PostgreSQL tables ready')
    except Exception as exc:
        logger.error('PostgreSQL table creation failed: %s', exc)
        raise RuntimeError(f'PostgreSQL table setup failed - application cannot start: {exc}') from exc
    
    logger.info('All database connections established successfully')
    yield
    
    logger.info('Shutting down %s', APP_NAME)
    try:
        await close_db()
        logger.info('MongoDB connection closed')
    except Exception as exc:
        logger.warning('MongoDB close failed: %s', exc)
    
    try:
        await close_postgres()
        logger.info('PostgreSQL connection closed')
    except Exception as exc:
        logger.warning('PostgreSQL close failed: %s', exc)


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
    """
    Health check endpoint that validates both database connections.
    Returns detailed status for monitoring and debugging.
    """
    health_status = {
        'service': APP_NAME,
        'version': APP_VERSION,
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'databases': {}
    }
    
    # Check MongoDB connection
    try:
        from app.db.db import get_database
        db = get_database()
        # Simple ping to verify connection
        await db.command('ping')
        health_status['databases']['mongodb'] = {
            'status': 'connected',
            'database': MONGO_DB
        }
        logger.debug('Health check: MongoDB connection verified')
    except Exception as exc:
        health_status['databases']['mongodb'] = {
            'status': 'error',
            'error': str(exc)
        }
        health_status['status'] = 'degraded'
        logger.warning('Health check: MongoDB connection failed: %s', exc)
    
    # Check PostgreSQL connection
    try:
        from app.db.postgres import test_postgres_connection
        pg_connected = await test_postgres_connection()
        if pg_connected:
            health_status['databases']['postgresql'] = {
                'status': 'connected'
            }
            logger.debug('Health check: PostgreSQL connection verified')
        else:
            health_status['databases']['postgresql'] = {
                'status': 'error',
                'error': 'Connection test failed'
            }
            health_status['status'] = 'degraded'
            logger.warning('Health check: PostgreSQL connection test failed')
    except Exception as exc:
        health_status['databases']['postgresql'] = {
            'status': 'error',
            'error': str(exc)
        }
        health_status['status'] = 'degraded'
        logger.warning('Health check: PostgreSQL connection check failed: %s', exc)
    
    # Determine overall status
    if health_status['status'] == 'degraded':
        return JSONResponse(
            status_code=503,
            content={
                'success': False,
                'data': health_status,
                'message': f'{APP_NAME} is experiencing database connectivity issues'
            }
        )
    
    return {
        'success': True,
        'data': health_status,
        'message': f'{APP_NAME} is healthy'
    }


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app.main:app', host='127.0.0.1', port=8001, reload=True)
