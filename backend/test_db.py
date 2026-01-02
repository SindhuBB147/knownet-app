import sqlalchemy
from sqlalchemy import create_engine, text

# URL from config.py
DB_URL = "mysql+pymysql://root:@localhost/knownet"

try:
    engine = create_engine(DB_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("Database connection successful!")
        print(f"Result: {result.fetchone()}")
except Exception as e:
    print(f"Database connection FAILED: {str(e)}")
