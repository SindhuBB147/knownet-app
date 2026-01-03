import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import Base, engine
from app.api import api_router
from app.api.recommendation_api import router as recommendation_router
from config.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)

# CORS middleware - must be added before exception handlers
allowed_origins_list = [origin.strip() for origin in settings.allowed_origins.split(",")]

# If '*' is in the list and credentials are allowed, we must use regex to reflect origin
# because browsers reject 'Access-Control-Allow-Origin: *' with credentials.
if "*" in allowed_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",  # Allows any origin and reflects it in the header
        allow_credentials=True,
        allow_headers=["*"],
        allow_methods=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins_list,
        allow_credentials=True,
        allow_headers=["*"],
        allow_methods=["*"],
    )

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"INCOMING REQUEST: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"REQUEST PROCESSED: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"REQUEST FAILED: {str(e)}")
        raise

# Static file mounts for shared media
app.mount("/recordings", StaticFiles(directory=settings.recordings_dir), name="recordings")
app.mount("/resources", StaticFiles(directory=settings.resources_dir), name="resources")
app.mount("/videos", StaticFiles(directory=settings.videos_dir), name="videos")

# Global exception handler to ensure CORS headers are always sent
# This catches unhandled exceptions (not HTTPExceptions which are handled by FastAPI)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    from fastapi import HTTPException
    # Don't catch HTTPExceptions - let FastAPI handle them
    if isinstance(exc, HTTPException):
        raise
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    origin = request.headers.get("origin")
    cors_headers = {}
    allowed_list = [origin.strip() for origin in settings.allowed_origins.split(",")]
    if origin and (origin in allowed_list or "*" in allowed_list):
        cors_headers["Access-Control-Allow-Origin"] = origin
        cors_headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers=cors_headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )


@app.on_event("startup")
def on_startup() -> None:
    logger.info("Starting up application...")
    logger.info(f"Database URL: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'hidden'}")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}", exc_info=True)


@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok"}


app.include_router(api_router)
app.include_router(recommendation_router)
