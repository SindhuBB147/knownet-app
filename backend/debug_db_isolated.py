from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker

# Define base and model inline to avoid import errors
Base = declarative_base()

class MeetingDocument(Base):
    __tablename__ = "meeting_documents"
    id = Column(Integer, primary_key=True)
    connection_id = Column(Integer)
    uploader_id = Column(Integer)
    file_path = Column(String(512))
    file_name = Column(String(255))

# Connect to DB
DATABASE_URL = "sqlite:///./sql_app.db" # Assuming sqlite from default config, checking config...
# actually let's check config.py or use the engine from app if possible, 
# but safest is to check where the DB file is or just try to import engine if simple.
# The previous script failed on imports, so let's try reading config/settings. 
# actually, let's just Try importing engine only.

from app import engine
from sqlalchemy.orm import Session

session = Session(bind=engine)
try:
    # Use raw SQL to avoid model class mismatch
    from sqlalchemy import text
    result = session.execute(text("SELECT id, connection_id, file_name, uploader_id FROM meeting_documents"))
    rows = result.fetchall()
    print(f"Total Documents: {len(rows)}")
    for r in rows:
        print(f"ID: {r.id}, Connection: {r.connection_id}, File: {r.file_name}, Uploader: {r.uploader_id}")
except Exception:
    import traceback
    traceback.print_exc()
finally:
    session.close()
