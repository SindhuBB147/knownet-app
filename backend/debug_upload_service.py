from sqlalchemy.orm import Session
from app import engine, Base
from app.services import meeting_service, auth_service, connection_service
from app.models import User, Connection
from fastapi import UploadFile
from io import BytesIO

# Setup DB
session = Session(bind=engine)

def test_upload():
    try:
        connection_id = 7
        conn = session.query(Connection).get(connection_id)
        if not conn:
            print(f"Connection {connection_id} not found!")
            return

        print(f"Connection found: {conn.id}, Sender: {conn.sender_id}, Receiver: {conn.receiver_id}")
        
        # Pick sender as uploader
        uploader = conn.sender
        print(f"Uploader: {uploader.name} (ID: {uploader.id})")

        # Simulate file
        file_content = b"fake pdf content"
        file = UploadFile(filename="test_doc.pdf", file=BytesIO(file_content))
        
        # Call service manually
        print("Calling save_document_file...")
        original_name, relative_path = meeting_service.save_document_file(file, connection_id=connection_id)
        print(f"File saved at: {relative_path}")
        
        print("Calling create_document_record...")
        doc = meeting_service.create_document_record(
            session,
            connection_id=connection_id,
            uploader_id=uploader.id,
            file_path=relative_path,
            file_name=original_name,
            file_type="application/pdf"
        )
        print(f"Document record created: ID {doc.id}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    test_upload()
