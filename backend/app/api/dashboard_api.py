from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User
from app.services import auth_service, dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    return dashboard_service.get_dashboard_overview(db, user=current_user)


@router.get("/search")
def search_dashboard(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    return dashboard_service.search_general(db, query=q)

