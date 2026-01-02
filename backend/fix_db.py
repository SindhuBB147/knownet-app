import sys
import traceback
from app import Base, engine

print("Importing models...")
try:
    from app.models import Connection
    print(f"Connection imported: {Connection}")
    from app.models import MeetingDocument
    print(f"MeetingDocument imported: {MeetingDocument}")
except Exception:
    traceback.print_exc()

print("Registry keys:", list(Base.registry._class_registry.keys()))

print("Creating all tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("Tables created.")
except Exception:
    traceback.print_exc()
