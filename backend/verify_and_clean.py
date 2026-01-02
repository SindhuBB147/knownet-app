
from sqlalchemy.orm import Session
from app import engine, SessionLocal
from app.models.user_notification import UserNotification

def inspect_and_clean():
    db = SessionLocal()
    try:
        # Check count before
        all_notifs = db.query(UserNotification).all()
        print(f"Total notifications in DB: {len(all_notifs)}")
        for n in all_notifs:
            print(f" - [{n.id}] User:{n.user_id} Title:'{n.title}'")

        # Titles to remove
        titles = [
            "Live Session Reminder",
            "Mentor Feedback",
            "Achievement unlocked"
        ]
        
        # Delete
        query = db.query(UserNotification).filter(UserNotification.title.in_(titles))
        deleted = query.delete(synchronize_session=False)
        db.commit()
        print(f"Deleted {deleted} items matching default titles.")
        
        # Check after
        remaining = db.query(UserNotification).count()
        print(f"Notifications remaining in DB: {remaining}")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    inspect_and_clean()
