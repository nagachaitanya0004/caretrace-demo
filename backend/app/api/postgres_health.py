"""
PostgreSQL health check routes (ISOLATED - NOT INTEGRATED).

These routes are for testing PostgreSQL connectivity only.
They do NOT affect any existing MongoDB functionality.

To enable these routes, uncomment the router import in main.py
"""

from fastapi import APIRouter

from app.db.postgres import test_postgres_connection, get_engine
from app.core.responses import success_response, error_response

router = APIRouter(prefix='/postgres', tags=['postgres-health'])


@router.get('/health')
async def postgres_health_check():
    """
    Check PostgreSQL connection health.
    
    This endpoint tests if PostgreSQL is accessible and responding.
    It does NOT affect MongoDB or any existing functionality.
    
    Returns:
        dict: Health status with connection details
    """
    engine = get_engine()
    
    if engine is None:
        return error_response(
            message='PostgreSQL is not initialized',
            error='Engine not created. Check POSTGRES_URL configuration.'
        )
    
    # Test connection
    is_connected = await test_postgres_connection()
    
    if is_connected:
        return success_response(
            data={
                'status': 'connected',
                'database': 'PostgreSQL',
                'driver': 'asyncpg',
                'note': 'PostgreSQL is ready but NOT actively used. MongoDB is the active database.'
            },
            message='PostgreSQL connection is healthy'
        )
    else:
        return error_response(
            message='PostgreSQL connection failed',
            error='Unable to connect to PostgreSQL. Check server status and credentials.'
        )


@router.get('/info')
async def postgres_info():
    """
    Get PostgreSQL connection information.
    
    Returns basic information about the PostgreSQL setup.
    Does NOT expose sensitive credentials.
    
    Returns:
        dict: PostgreSQL configuration info
    """
    engine = get_engine()
    
    if engine is None:
        return error_response(
            message='PostgreSQL is not initialized',
            error='Engine not created'
        )
    
    # Get safe connection info (without credentials)
    url = engine.url
    
    return success_response(
        data={
            'driver': url.drivername,
            'host': url.host,
            'port': url.port,
            'database': url.database,
            'status': 'initialized',
            'active': False,
            'note': 'PostgreSQL is configured but not actively used in the application'
        },
        message='PostgreSQL configuration retrieved'
    )
