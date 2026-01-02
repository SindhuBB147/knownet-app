from app import get_db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection():
    logger.info("Testing database connection using get_db()...")
    try:
        # get_db is a generator
        db_gen = get_db()
        db = next(db_gen)
        
        # Try simple query
        result = db.execute(text("SELECT 1"))
        val = result.scalar()
        
        if val == 1:
            logger.info("SUCCESS: Database connection established and query executed.")
        else:
            logger.error(f"FAILURE: Query returned unexpected value: {val}")
            
        db.close()
    except Exception as e:
        logger.error(f"FAILURE: Could not connect or query database. Error: {e}")

if __name__ == "__main__":
    test_connection()
