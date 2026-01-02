import logging
from sqlalchemy import create_engine, text
from config.config import settings
from app.models import Base
# Make sure all models are imported so they are registered with Base
from app.models import * 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_database():
    # Parse the database URL to get the base URL and database name
    # Assumption: mysql+pymysql://root:@localhost/knownet
    db_url = settings.database_url
    if "/" in db_url.split("@")[-1]:
        base_url = db_url.rsplit("/", 1)[0]
        db_name = db_url.rsplit("/", 1)[1]
    else:
        logger.error("Could not parse database URL")
        return

    logger.info(f"Connecting to MySQL server at {base_url}...")
    engine = create_engine(base_url)
    
    try:
        with engine.connect() as conn:
            logger.info(f"Creating database '{db_name}' if it does not exist...")
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS {db_name}"))
            logger.info(f"Database '{db_name}' ensured.")
    except Exception as e:
        logger.error(f"Error creating database: {e}")
        return

def create_tables():
    logger.info("Creating tables...")
    # Create an engine connected to the specific database
    engine = create_engine(settings.database_url)
    
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating tables: {e}")

if __name__ == "__main__":
    create_database()
    create_tables()
