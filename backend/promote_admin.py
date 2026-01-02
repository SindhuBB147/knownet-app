# Fix imports to ensure models are registered
import app.models # Register all models
from app.models.user import User, UserRole
from app import engine, SessionLocal

def promote_first_user_to_admin():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No users found to promote.")
            return

        print(f"Promoting user: {user.name} ({user.email}) to ADMIN")
        user.role = UserRole.ADMIN
        db.commit()
        print("Success! User is now an admin.")
        
        # Verify
        refreshed_user = db.query(User).filter(User.id == user.id).first()
        print(f"Verification: Role is now {refreshed_user.role}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    promote_first_user_to_admin()
