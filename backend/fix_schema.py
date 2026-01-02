import os
import sys
from sqlalchemy import create_engine, text

# Set up database URL
DATABASE_URL = "mysql+pymysql://root:@localhost/knownet"

def fix_schema():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        try:
            print("Attempting to add 'updated_at' column to 'connections' table...")
            connection.execute(text("ALTER TABLE connections ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;"))
            print("Success: Column 'updated_at' added.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Column 'updated_at' already exists.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    fix_schema()
