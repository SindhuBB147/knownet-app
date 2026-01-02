from app import engine
from sqlalchemy.orm import Session
# Import all models via the init to ensure registry is okay
import app.models 
from app.models.meeting_document import MeetingDocument

session = Session(bind=engine)
try:
    docs = session.query(MeetingDocument).all()
    print(f"Total Documents: {len(docs)}")
    for d in docs:
        print(f"ID: {d.id}, Connection: {d.connection_id}, File: {d.file_name}, Uploader: {d.uploader_id}")
except Exception:
    import traceback
    traceback.print_exc()
finally:
    session.close()
