import app.models
from app import get_db, Base, engine
from app.models.user import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def list_users():
    # Ensure tables exist (just in case, triggers mappers)
    # Base.metadata.create_all(bind=engine)
    
    db_gen = get_db()
    db = next(db_gen)
    try:
        users = db.query(User).order_by(User.created_at.desc()).limit(10).all()
        print(f"Found {len(users)} recent users:")
        for u in users:
            print(f"- ID: {u.id}, Email: {u.email}, Created: {u.created_at}")
    except Exception as e:
        logger.error(f"Error querying users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
