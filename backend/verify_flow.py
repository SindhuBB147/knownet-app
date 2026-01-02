
import sys
import os
from datetime import datetime

# Force IPv4 loopback
os.environ["DATABASE_URL"] = "mysql+pymysql://root:@127.0.0.1/knownet"

# Add empty strings to simulate direct execution context if needed
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import Base, get_db
from app.models.user import User
from app.models.connection import Connection, ConnectionStatus
from app.services import connection_service, meeting_service
from fastapi import UploadFile
import io

# Setup DB
# We will use the actual DB but wrap in try/except to avoid crashing if data exists
# Ideally we should use a test DB but for this quick verification we will use careful logic.

# Create a manual session
from app import SessionLocal
db = SessionLocal()

def verify_flow():
    print("--- Starting Verify Flow ---")
    
    # 1. Get or Create Users
    sender_email = "verifier_sender@test.com"
    receiver_email = "verifier_receiver@test.com"
    
    sender = db.query(User).filter(User.email == sender_email).first()
    if not sender:
        sender = User(name="Verifier Sender", email=sender_email, password="hash", location="Test", role="student")
        db.add(sender)
    
    receiver = db.query(User).filter(User.email == receiver_email).first()
    if not receiver:
        receiver = User(name="Verifier Receiver", email=receiver_email, password="hash", location="Test", role="student")
        db.add(receiver)
        
    db.commit()
    db.refresh(sender)
    db.refresh(receiver)
    print(f"Users ready: {sender.id} -> {receiver.id}")

    # 2. Cleanup existing connections
    existing_conn = db.query(Connection).filter(
        (Connection.sender_id == sender.id) & (Connection.receiver_id == receiver.id)
    ).first()
    if existing_conn:
        db.delete(existing_conn)
        db.commit()
        print("Cleaned up existing connection")

    # 3. Create Request
    print("Creating connection request...")
    conn = connection_service.create_request(db, sender=sender, receiver_id=receiver.id)
    print(f"Connection created. ID: {conn.id}, Status: {conn.status}")
    assert conn.status == ConnectionStatus.PENDING

    # 4. Accept Request
    print("Accepting connection request...")
    conn = connection_service.accept_request(db, connection_id=conn.id, receiver=receiver)
    print(f"Connection accepted. Status: {conn.status}")
    assert conn.status == ConnectionStatus.ACCEPTED

    # 5. Check Redirect
    redirect = connection_service.get_sender_redirect(db, sender=sender)
    print(f"Sender redirect check: {redirect.id if redirect else 'None'}")
    assert redirect.id == conn.id

    # 6. Upload Meeting Recording
    print("Uploading recording...")
    # Mock UploadFile
    mock_file = UploadFile(filename="test.webm", file=io.BytesIO(b"fake video content"), headers={"content-type": "video/webm"})
    # Need to patch settings.videos_dir or ensure it exists
    # Assuming standard config
    
    try:
        rel_path = meeting_service.save_video_file(mock_file, connection_id=conn.id)
        print(f"File saved at: {rel_path}")
        
        record = meeting_service.create_record(db, connection_id=conn.id, file_path=rel_path)
        print(f"Record created. ID: {record.id}")
        
        # 7. List Recordings
        records = meeting_service.list_recordings(db, connection_id=conn.id)
        print(f"Found {len(records)} recordings.")
        assert len(records) >= 1
        print("--- Verification Successful ---")
        
    except Exception as e:
        import traceback
        print(f"Error during recording test: {e}")
        traceback.print_exc()

    # Cleanup
    # db.delete(sender)
    # db.delete(receiver)
    # db.commit()

try:
    verify_flow()
finally:
    db.close()
