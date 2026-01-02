
from app import SessionLocal
from app.models.user import User
from app.models.connection import Connection, ConnectionStatus

def check_connections():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        user_map = {u.id: u.name for u in users}
        
        print("\n--- All Connections ---")
        connections = db.query(Connection).all()
        if not connections:
            print("No connections found (pending or accepted).")
        
        pending_count = 0
        accepted_count = 0
        
        for conn in connections:
            sender = user_map.get(conn.sender_id, f"Unknown({conn.sender_id})")
            receiver = user_map.get(conn.receiver_id, f"Unknown({conn.receiver_id})")
            print(f"ID: {conn.id} | {sender} -> {receiver} | Status: {conn.status.value}")
            
            if conn.status == ConnectionStatus.PENDING:
                pending_count += 1
            elif conn.status == ConnectionStatus.ACCEPTED:
                accepted_count += 1

        print(f"\nSummary: {pending_count} pending requests, {accepted_count} active connections.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_connections()
