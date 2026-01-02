import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import Connection, User

db = SessionLocal()
conns = db.query(Connection).all()

print(f"Total Connections: {len(conns)}")
for c in conns:
    s = db.query(User).filter(User.id == c.sender_id).first()
    r = db.query(User).filter(User.id == c.receiver_id).first()
    print(f"ID: {c.id} | {s.name} ({c.sender_id}) <-> {r.name} ({c.receiver_id}) | Status: {c.status}")

db.close()
