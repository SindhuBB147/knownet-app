from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "mysql+pymysql://root:@localhost/knownet"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_requests():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT * FROM connections;"))
        rows = result.fetchall()
        print(f"Total Connections: {len(rows)}")
        for row in rows:
            print(f"ID: {row.id}, Sender: {row.sender_id}, Receiver: {row.receiver_id}, Status: {row.status}, UpdatedAt: {row.updated_at}")
    finally:
        db.close()

if __name__ == "__main__":
    check_requests()
