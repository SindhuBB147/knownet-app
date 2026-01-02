from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app import get_db
from app.models.session import Session as SessionModel
from app.models.user import User, UserRole
from app.services import auth_service, recommendation_service

router = APIRouter(tags=["Recommendations"])


class RecommendedUser(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    location: Optional[str]
    city: Optional[str]
    state: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    distance_km: Optional[float]

    class Config:
        orm_mode = True


class LocationRecommendationResponse(BaseModel):
    local: List[RecommendedUser]
    global_: List[RecommendedUser] = Field(..., alias="global")
    combined: List[RecommendedUser]

    class Config:
        allow_population_by_field_name = True


@router.get("/recommend/{user_location}")
def get_recommendations(user_location: str, db: Session = Depends(get_db)):
    sessions = db.query(SessionModel).all()
    payload = [
        {"session_id": session.id, "title": session.title, "location": session.location}
        for session in sessions
    ]
    recommendations = recommendation_service.recommend_sessions(user_location, payload)
    return recommendations


@router.get("/recommendations/location", response_model=LocationRecommendationResponse)
def get_location_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    other_users = db.query(User).filter(User.id != current_user.id).all()
    print(f"DEBUG: Recommendation request for User: {current_user.name} (ID: {current_user.id}, Loc: {current_user.location})")
    results = recommendation_service.recommend_users_by_location(current_user, other_users)
    print(f"DEBUG: Found {len(results['local'])} local matches")
    return results

