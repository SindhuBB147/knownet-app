
from sqlalchemy.orm import Session
from app import engine, SessionLocal
from app.models.user_notification import UserNotification, NotificationType

def cleanup_notifications():
    db = SessionLocal()
    try:
        # Titles of the default notifications we want to remove
        titles_to_remove = [
            "Live Session Reminder",
            "Mentor Feedback",
            "Achievement unlocked"
        ]
        
        # Delete them
        query = db.query(UserNotification).filter(UserNotification.title.in_(titles_to_remove))
        count = query.delete(synchronize_session=False)
        db.commit()
        print(f"Removed {count} default notifications.")
        
    except Exception as e:
        print(f"Error cleaning up: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_notifications()
