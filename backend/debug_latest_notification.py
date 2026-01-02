
from app import SessionLocal
# Import all models to ensure registry is populated
from app.models.user import User
from app.models.user_skill import UserSkill
from app.models.user_profile import UserProfile
from app.models.connection import Connection
from app.models.session import Session
from app.models.attendance import Attendance
from app.models.message import Message
from app.models.resource import Resource
from app.models.user_notification import UserNotification
import json

def check_latest_notification():
    db = SessionLocal()
    try:
        # Get the very last notification created
        notif = db.query(UserNotification).order_by(UserNotification.created_at.desc()).first()
        
        if not notif:
            print("No notifications found.")
            return
            
        print(f"ID: {notif.id}")
        print(f"Title: {notif.title}")
        print(f"Type: {notif.type}")
        print(f"Extra Data (Raw): {notif.extra_data}")
        
        if notif.extra_data:
            try:
                data = json.loads(notif.extra_data)
                print(f"Extra Data (Parsed): {data}")
            except Exception as e:
                print(f"Failed to parse JSON: {e}")
        else:
            print("Extra Data is empty/None")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_latest_notification()
