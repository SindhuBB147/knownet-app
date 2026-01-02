from sqlalchemy import create_engine, text
from config.config import settings

def get_admin_raw():
    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            # We look for role='admin' or 'ADMIN' depending on enum storage.
            # Assuming it's stored as string or enum. 
            # In SQLite, enums are strings usually.
            result = conn.execute(text("SELECT email, name, role FROM users WHERE role = 'admin' LIMIT 1"))
            row = result.fetchone()
            if row:
                print(f"ADMIN_EMAIL: {row[0]}")
                print(f"ADMIN_NAME: {row[1]}")
            else:
                # If no admin found, list first user to give a hint
                print("No admin found. Listing first user:")
                res2 = conn.execute(text("SELECT email, name, role FROM users LIMIT 1"))
                row2 = res2.fetchone()
                if row2:
                    print(f"FIRST_USER_EMAIL: {row2[0]} (Role: {row2[2]})")

    except Exception as e:
        print(f"RAW SQL ERROR: {e}")

if __name__ == "__main__":
    get_admin_raw()
