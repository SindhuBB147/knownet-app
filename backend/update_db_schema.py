from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Connect to the database
DB_URL = "mysql+pymysql://root:@localhost/knownet"
engine = create_engine(DB_URL)

def add_avatar_column():
    try:
        with engine.connect() as connection:
            # Check if column exists
            result = connection.execute(text("SHOW COLUMNS FROM user_profiles LIKE 'avatar_url'"))
            if result.fetchone():
                print("Column 'avatar_url' already exists.")
            else:
                # Add the column
                connection.execute(text("ALTER TABLE user_profiles ADD COLUMN avatar_url VARCHAR(255) NULL"))
                print("Successfully added 'avatar_url' column to 'user_profiles' table.")
                
            # Verification
            result = connection.execute(text("SHOW COLUMNS FROM user_profiles LIKE 'avatar_url'"))
            if result.fetchone():
                print("VERIFICATION: Column 'avatar_url' is present.")
            else:
                print("VERIFICATION FAILED: Column not found.")

    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    add_avatar_column()
