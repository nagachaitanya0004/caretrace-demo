from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.database.connection import connect_to_mongo, close_mongo_connection
from app.routes import health, auth_routes, user_routes, symptom_routes, analysis_routes, alert_routes, report_routes
from app.core.config import settings
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="CareTrace AI API",
    description="A clean, scalable, production-ready API for a healthcare system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Error Handlers (Unified Response Format)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "message": exc.detail, "error": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"success": False, "data": None, "message": "Invalid input format detected", "error": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.error(f"Global Ex: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "message": "Internal Server Error", "error": str(exc)}
    )

# Include Routers
app.include_router(health.router, tags=["Health"])
app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])
app.include_router(user_routes.router, prefix="/users", tags=["Users"])
app.include_router(symptom_routes.router, prefix="/symptoms", tags=["Symptoms"])
app.include_router(analysis_routes.router, prefix="/analysis", tags=["Analysis"])
app.include_router(alert_routes.router, prefix="/alerts", tags=["Alerts"])
app.include_router(report_routes.router, prefix="/reports", tags=["Reports"])

@app.get("/", tags=["Root"])
async def root():
    return {
        "system": "CareTrace AI API",
        "status": "Online",
        "docs": "Access /docs for full API documentation"
    }
