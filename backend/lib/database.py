from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from config import settings
from contextlib import contextmanager
import logging
import os

logger = logging.getLogger(__name__)

# Multi-database engines and sessions
engines = {}
SessionLocals = {}

# Legacy single database support (primary uses trading database)
engine = None
SessionLocal = None

def _create_engine(database_url: str, database_name: str):
    """Create a SQLite engine with optimized parameters."""
    try:
        # Ensure data directory exists
        if database_url.startswith('sqlite:///'):
            db_path = database_url.replace('sqlite:///', '')
            if not db_path.startswith(':memory:'):
                os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        # Configure engine parameters for SQLite
        engine_params = {
            "pool_pre_ping": True,
            "echo": False,
            "connect_args": {
                "check_same_thread": False,  # Allow SQLite to be used across threads
                "timeout": 30  # Connection timeout
            }
        }
        
        engine = create_engine(database_url, **engine_params)
        
        # Test connection and optimize SQLite
        with engine.connect() as conn:
            # Enable WAL mode for better concurrency
            conn.execute(text("PRAGMA journal_mode=WAL"))
            # Set synchronous to NORMAL for better performance
            conn.execute(text("PRAGMA synchronous=NORMAL"))
            # Increase cache size (negative value = KB, -2000 = 2MB)
            conn.execute(text("PRAGMA cache_size=-2000"))
            # Enable foreign keys
            conn.execute(text("PRAGMA foreign_keys=ON"))
            conn.commit()
        
        logger.info(f"Database '{database_name}' initialized: {database_url}")
        return engine
    except Exception as e:
        logger.error(f"Failed to initialize database '{database_name}': {e}")
        return None

def init_database():
    """Initialize all database connections."""
    global engines, SessionLocals, engine, SessionLocal
    
    success = True
    
    # Initialize trading database (primary)
    trading_engine = _create_engine(settings.TRADING_DATABASE_URL, "trading")
    if trading_engine:
        engines['trading'] = trading_engine
        SessionLocals['trading'] = sessionmaker(bind=trading_engine, autocommit=False, autoflush=False)
        # Set as legacy engine for backward compatibility
        engine = trading_engine
        SessionLocal = SessionLocals['trading']
    else:
        success = False
    
    # Initialize market data database
    market_engine = _create_engine(settings.MARKET_DATABASE_URL, "market")
    if market_engine:
        engines['market'] = market_engine
        SessionLocals['market'] = sessionmaker(bind=market_engine, autocommit=False, autoflush=False)
    else:
        success = False
    
    # Initialize analytics database
    analytics_engine = _create_engine(settings.ANALYTICS_DATABASE_URL, "analytics")
    if analytics_engine:
        engines['analytics'] = analytics_engine
        SessionLocals['analytics'] = sessionmaker(bind=analytics_engine, autocommit=False, autoflush=False)
    else:
        success = False
    
    if success:
        logger.info("All databases initialized successfully")
    else:
        logger.warning("Some databases failed to initialize")
    
    return success

def create_tables():
    """Create all tables in their respective databases."""
    from models.base import Base
    import models  # Import all models
    
    # Create tables in trading database
    if 'trading' in engines:
        Base.metadata.create_all(bind=engines['trading'])
        logger.info("Trading database tables created")
    
    # Create tables in market database
    if 'market' in engines:
        from models.candlestick import CandlestickBase
        CandlestickBase.metadata.create_all(bind=engines['market'])
        logger.info("Market database tables created")
    
    # Create tables in analytics database
    if 'analytics' in engines:
        from models.pattern import PatternBase
        PatternBase.metadata.create_all(bind=engines['analytics'])
        logger.info("Analytics database tables created")

@contextmanager
def get_db(database: str = 'trading') -> Session:
    """
    Get database session context manager.
    
    Args:
        database: Database name ('trading', 'market', or 'analytics')
    """
    if database not in SessionLocals:
        raise RuntimeError(f"Database '{database}' not initialized")
    
    db = SessionLocals[database]()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_db_session(database: str = 'trading') -> Session:
    """
    Get database session (for dependency injection).
    
    Args:
        database: Database name ('trading', 'market', or 'analytics')
    """
    if database not in SessionLocals:
        raise RuntimeError(f"Database '{database}' not initialized")
    return SessionLocals[database]()

def get_engine(database: str = 'trading'):
    """
    Get database engine.
    
    Args:
        database: Database name ('trading', 'market', or 'analytics')
    """
    return engines.get(database)

def check_database_health() -> dict:
    """Check health of all databases."""
    health = {}
    
    for db_name, db_engine in engines.items():
        try:
            with db_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            health[db_name] = "connected"
        except Exception as e:
            health[db_name] = f"error: {str(e)}"
            logger.error(f"Database '{db_name}' health check failed: {e}")
    
    return health
