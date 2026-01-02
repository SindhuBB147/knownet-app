from datetime import datetime, timedelta
import logging
import re
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app import get_db
from app.models.user import User, UserRole
from app.models.user_profile import UserProfile
from config.config import settings

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
MAX_PASSWORD_LENGTH = 256
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _validate_registration_data(
    name: str,
    email: str,
    password: str,
    location: str,
    *,
    city: Optional[str] = None,
    state: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> None:
    if len(name.strip()) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name is too short")
    if len(location.strip()) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Location is too short")
    if (latitude is not None) ^ (longitude is not None):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Latitude and longitude must both be provided")
    if latitude is not None and not (-90 <= latitude <= 90):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Latitude must be between -90 and 90")
    if longitude is not None and not (-180 <= longitude <= 180):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Longitude must be between -180 and 180")

    if len(password) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be 6+ characters")
    if len(password) > MAX_PASSWORD_LENGTH:
        logger.warning(
            "Password length validation failed",
            extra={"password_char_len": len(password)},
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password cannot exceed {MAX_PASSWORD_LENGTH} characters. Please choose a shorter password.",
        )
    email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    if not re.match(email_regex, email):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid email format")


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    *,
    name: str,
    email: str,
    password: str,
    role: UserRole,
    location: str,
    city: Optional[str] = None,
    state: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> User:
    _validate_registration_data(
        name,
        email,
        password,
        location,
        city=city,
        state=state,
        latitude=latitude,
        longitude=longitude,
    )
    logger.info(f"Creating user: {email}, role: {role}")
    hashed_password = get_password_hash(password)
    user = User(
        name=name.strip(),
        email=email.lower(),
        password=hashed_password,
        role=role,
        location=location.strip(),
        city=(city or "").strip() or None,
        state=(state or "").strip() or None,
        latitude=latitude,
        longitude=longitude,
    )
    user.profile = UserProfile()
    try:
        db.add(user)
        logger.info(f"User added to session, committing...")
        db.commit()
        logger.info(f"Commit successful, refreshing user...")
        db.refresh(user)
        logger.info(f"User created with ID: {user.id}")
        return user
    except IntegrityError as e:
        logger.error(f"Integrity error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    except SQLAlchemyError as exc:
        logger.error(f"SQLAlchemy error: {str(exc)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create user") from exc


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be 6+ characters")

    user.password = get_password_hash(new_password)
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to change password: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Password change failed")


def change_email(db: Session, user: User, current_password: str, new_email: str) -> None:
    if not verify_password(current_password, user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    
    email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    if not re.match(email_regex, new_email):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid email format")
    
    # Check if email is taken
    existing_user = get_user_by_email(db, new_email)
    if existing_user and existing_user.id != user.id:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user.email = new_email.lower()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    except Exception as e:
        logger.error(f"Failed to change email: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Email update failed")


def delete_account(db: Session, user: User, password: str) -> None:
    if not verify_password(password, user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password for confirmation")
    
    try:
        db.delete(user)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to delete account: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Account deletion failed")


def reset_password(db: Session, email: str, new_password: str) -> bool:
    user = get_user_by_email(db, email.lower())
    if not user:
        return False
    
    if len(new_password) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be 6+ characters")

    user.password = get_password_hash(new_password)
    try:
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Failed to reset password: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Password reset failed")


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email.lower())
    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user


def ensure_mentor(user: User) -> None:
    if not user.is_mentor():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can perform this action")
