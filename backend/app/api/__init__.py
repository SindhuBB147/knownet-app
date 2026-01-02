from fastapi import APIRouter

from app.api import (
    attendance_api,
    auth_api,
    dashboard_api,
    message_api,
    notification_api,
    profile_api,
    recording_api,
    recommendation_api,
    resource_api,
    session_api,
    signaling_api,
)
from app.api.routes import connections, meetings

api_router = APIRouter()
api_router.include_router(auth_api.router, prefix="/auth", tags=["Auth"])
api_router.include_router(session_api.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(attendance_api.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(recording_api.router, prefix="/sessions", tags=["Recordings"])
api_router.include_router(message_api.router, prefix="/messages", tags=["Messages"])
api_router.include_router(resource_api.router, prefix="/sessions", tags=["Resources"])
api_router.include_router(connections.router)
api_router.include_router(meetings.router)
api_router.include_router(recommendation_api.router, tags=["Recommendations"])
api_router.include_router(dashboard_api.router)
api_router.include_router(notification_api.router)
api_router.include_router(profile_api.router)
api_router.include_router(signaling_api.router)
# Admin
# from app.api import admin_api
# api_router.include_router(admin_api.router, prefix="/admin", tags=["Admin"])
