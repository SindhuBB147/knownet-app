
from app import SessionLocal
from app.models.user import User
from app.models.user_skill import UserSkill # Fix mapper
from app.models.user_profile import UserProfile
from app.models.session import Session
from app.models.attendance import Attendance
from app.models.message import Message
from app.models.resource import Resource
from app.models.user_notification import UserNotification, NotificationType
from app.models.connection import Connection, ConnectionStatus
import json

def fix_notifications():
    db = SessionLocal()
    try:
        # Find all notifications that look like connection requests but have no extra_data
        notifs = db.query(UserNotification).filter(
            UserNotification.title == "New Connection Request",
            UserNotification.extra_data == None
        ).all()
        
        print(f"Found {len(notifs)} notifications to fix.")
        
        fixed_count = 0
        for n in notifs:
            # We need to find the corresponding connection.
            # The notification belongs to the RECEIVER (n.user_id).
            # The body says "NAME wants to connect...". We can try to parse the name,
            # or better, look for PENDING connections where receiver_id == n.user_id.
            
            # Find a pending connection for this receiver
            # This is a bit heuristic if there are multiple, but usually there's just one per sender.
            # Let's verify the sender name matches if possible, or just link the most recent pending.
            
            pending_conns = db.query(Connection).filter(
                Connection.receiver_id == n.user_id,
                Connection.status == ConnectionStatus.PENDING
            ).all()

            matched_conn = None
            for conn in pending_conns:
                # Get sender name
                sender = db.get(User, conn.sender_id)
                if sender and sender.name in n.body:
                    matched_conn = conn
                    break
            
            if matched_conn:
                data = {
                    "connection_id": matched_conn.id,
                    "action": "connection_request"
                }
                n.extra_data = json.dumps(data)
                db.add(n)
                fixed_count += 1
                print(f"Fixed notification {n.id} linked to Connection {matched_conn.id}")
            else:
                print(f"Could not find matching pending connection for notification {n.id}")

        if fixed_count > 0:
            db.commit()
            print(f"Successfully updated {fixed_count} notifications.")
        else:
            print("No notifications updated.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_notifications()
