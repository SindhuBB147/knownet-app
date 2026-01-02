from sqlalchemy import create_engine, text
from config.config import settings

def force_promote_admin():
    try:
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            # Force update, case sensitive check on enum if needed but usually lowercase
            conn.execute(text("UPDATE users SET role = 'admin' WHERE email = 'sindhubinkadakatti@gmail.com'"))
            conn.commit()
            print("Force update executed.")
            
            # Verify
            result = conn.execute(text("SELECT email, role FROM users WHERE email='sindhubinkadakatti@gmail.com'"))
            row = result.fetchone()
            print(f"VERIFICATION: {row[0]} is now {row[1]}")

    except Exception as e:
        print(f"RAW SQL ERROR: {e}")

if __name__ == "__main__":
    force_promote_admin()
