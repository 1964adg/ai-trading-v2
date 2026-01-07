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


def _is_sqlite(database_url: str) -> bool:
    return database_url.startswith("sqlite:///")


def _create_engine(database_url: str, database_name: str):
    """Create an engine.Applies SQLite-only pragmas when needed."""
    try:
        # Ensure data directory exists (SQLite)
        if _is_sqlite(database_url):
            db_path = database_url.replace("sqlite:///", "")
            if not db_path.startswith(":memory:"):
                os.makedirs(os.path.dirname(db_path), exist_ok=True)

        engine_params = {
            "pool_pre_ping": True,
            "echo": False,
        }

        if _is_sqlite(database_url):
            engine_params["connect_args"] = {
                "check_same_thread": False,
                "timeout": 30,
            }
        else:
            # Postgres (local) sane pooling defaults
            engine_params.update(
                {
                    "pool_size": 5,
                    "max_overflow": 10,
                    "pool_recycle": 1800,
                }
            )

        eng = create_engine(database_url, **engine_params)

        # SQLite optimizations only
        if _is_sqlite(database_url):
            with eng.connect() as conn:
                conn.execute(text("PRAGMA journal_mode=WAL"))
                conn.execute(text("PRAGMA synchronous=NORMAL"))
                conn.execute(text("PRAGMA cache_size=-2000"))
                conn.execute(text("PRAGMA foreign_keys=ON"))
                conn.commit()

        # Test connection
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))

        logger.info(f"Database '{database_name}' initialized: {database_url}")
        return eng

    except Exception as e:
        logger.error(f"Failed to initialize database '{database_name}': {e}")
        return None


def init_database():
    """Initialize all database connections."""
    global engines, SessionLocals, engine, SessionLocal

    success = True

    trading_engine = _create_engine(settings.TRADING_DATABASE_URL, "trading")
    if trading_engine:
        engines["trading"] = trading_engine
        SessionLocals["trading"] = sessionmaker(
            bind=trading_engine, autocommit=False, autoflush=False
        )
        engine = trading_engine
        SessionLocal = SessionLocals["trading"]
    else:
        success = False

    market_engine = _create_engine(settings.MARKET_DATABASE_URL, "market")
    if market_engine:
        engines["market"] = market_engine
        SessionLocals["market"] = sessionmaker(
            bind=market_engine, autocommit=False, autoflush=False
        )
    else:
        success = False

    analytics_engine = _create_engine(settings.ANALYTICS_DATABASE_URL, "analytics")
    if analytics_engine:
        engines["analytics"] = analytics_engine
        SessionLocals["analytics"] = sessionmaker(
            bind=analytics_engine, autocommit=False, autoflush=False
        )
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

    if "trading" in engines:
        Base.metadata.create_all(bind=engines["trading"])
        logger.info("Trading database tables created")

    if "market" in engines:
        from models.candlestick import CandlestickBase

        CandlestickBase.metadata.create_all(bind=engines["market"])
        logger.info("Market database tables created")

    if "analytics" in engines:
        from models.pattern import PatternBase

        PatternBase.metadata.create_all(bind=engines["analytics"])
        logger.info("Analytics database tables created")


@contextmanager
def get_db(database: str = "trading") -> Session:
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


def get_db_session(database: str = "trading") -> Session:
    if database not in SessionLocals:
        raise RuntimeError(f"Database '{database}' not initialized")
    return SessionLocals[database]()


def get_engine(database: str = "trading"):
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
