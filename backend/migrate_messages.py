
from sqlalchemy import text
from app import engine

def migrate_messages():
    with engine.connect() as conn:
        try:
            # 1. Modify session_id to be nullable
            conn.execute(text("ALTER TABLE messages MODIFY session_id INT NULL"))
            print("Modified session_id to be nullable.")
            
            # 2. Add connection_id column
            # Check if it exists first
            try:
                conn.execute(text("SELECT connection_id FROM messages LIMIT 1"))
                print("Column connection_id already exists.")
            except:
                conn.execute(text("ALTER TABLE messages ADD COLUMN connection_id INT NULL AFTER session_id"))
                conn.execute(text("ALTER TABLE messages ADD CONSTRAINT fk_messages_connection FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE"))
                print("Added connection_id column.")
                
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate_messages()
