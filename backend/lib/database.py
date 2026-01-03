from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config import settings
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# Create engine
engine = None
SessionLocal = None

def init_database():
    """Initialize database connection."""
    global engine, SessionLocal
    
    if not settings.DATABASE_URL:
        logger.warning("DATABASE_URL not set, using in-memory fallback")
        return False
    
    try:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            echo=False
        )
        SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
        
        # Test connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        
        logger.info("Database connection initialized")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        return False

def create_tables():
    """Create all tables."""
    from models.base import Base
    import models  # Import all models
    
    if engine:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created")

@contextmanager
def get_db() -> Session:
    """Get database session context manager."""
    if not SessionLocal:
        raise RuntimeError("Database not initialized")
    
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_db_session() -> Session:
    """Get database session (for dependency injection)."""
    if not SessionLocal:
        raise RuntimeError("Database not initialized")
    return SessionLocal()
