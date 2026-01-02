# Fix imports
import app.models
from app.models.user import User, UserRole
from app import engine, SessionLocal

def get_admin_email():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if user:
            print(f"ADMIN_EMAIL: {user.email}")
            print(f"ADMIN_NAME: {user.name}")
        else:
            print("No admin found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    get_admin_email()
