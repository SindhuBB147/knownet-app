from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, constr
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User, UserRole
from app.services import auth_service
from config.config import settings

router = APIRouter()


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    location: str
    city: Optional[str]
    state: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    name: constr(min_length=2)
    email: EmailStr
    password: constr(min_length=6)
    role: UserRole
    location: constr(min_length=2)
    city: Optional[constr(min_length=2)] = None
    state: Optional[constr(min_length=2)] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


@router.post("/register", response_model=TokenResponse)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Registration attempt for email: {payload.email}")
    try:
        user = auth_service.create_user(
            db,
            name=payload.name,
            email=payload.email,
            password=payload.password,
            role=payload.role,
            location=payload.location,
            city=payload.city,
            state=payload.state,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        logger.info(f"User created successfully with ID: {user.id}")
        token = auth_service.create_access_token({"sub": str(user.id)})
        return TokenResponse(access_token=token, user=user)
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}", exc_info=True)
        raise


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # Check if user exists first
    user = auth_service.get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account does not exist")
    
    # Verify password
    if not auth_service.verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(access_token=access_token, user=user)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: constr(min_length=6)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = auth_service.reset_password(db, payload.email, payload.new_password)
    # Always return success to prevent email enumeration, unless specific error
    return {"message": "If an account exists, the password has been updated."}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(auth_service.get_current_user)):
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: constr(min_length=6)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    auth_service.change_password(
        db,
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return {"message": "Password changed successfully"}


class ChangeEmailRequest(BaseModel):
    current_password: str
    new_email: EmailStr


@router.post("/change-email")
def change_email(
    payload: ChangeEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    auth_service.change_email(
        db,
        user=current_user,
        current_password=payload.current_password,
        new_email=payload.new_email,
    )
    return {"message": "Email updated successfully"}


class DeleteAccountRequest(BaseModel):
    password: str


@router.delete("/account")
def delete_account(
    payload: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    auth_service.delete_account(db, user=current_user, password=payload.password)
    return {"message": "Account deleted successfully"}


@router.get("/data")
def download_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth_service.get_current_user),
):
    # Basic data dump for GDPR/portability
    # In a real app, this would be a comprehensive zip or JSON of all user data
    from app.services import profile_service, skill_service, connection_service
    
    profile = profile_service.get_profile(db, current_user)
    details = profile_service.serialize_profile_details(current_user, profile)
    skills = skill_service.list_skills(db, user=current_user)
    connections = connection_service.list_accepted_connections(db, user=current_user)
    
    return {
        "user_profile": details,
        "skills": skills,
        "connections_count": len(connections),
        "exported_at": datetime.utcnow().isoformat(),
    }
