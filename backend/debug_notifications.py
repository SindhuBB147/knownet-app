
from app import SessionLocal
from app.models.user import User
from app.models.user_notification import UserNotification
import sys

def check_notifications(user_id):
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user:
            print(f"User {user_id} not found.")
            return
        
        print(f"Checking notifications for {user.name} (ID: {user.id})")
        notifs = db.query(UserNotification).filter(UserNotification.user_id == user.id).order_by(UserNotification.created_at.desc()).all()
        
        if not notifs:
            print("No notifications found.")
        
        for n in notifs:
            print(f"[{n.created_at}] Type: {n.type} | Title: {n.title} | Read: {n.read_at is not None}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_notifications(int(sys.argv[1]))
    else:
        # Default to Srishti if ID 2
        check_notifications(2)
