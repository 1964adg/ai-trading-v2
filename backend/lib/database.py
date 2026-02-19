import os
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from backend.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()


def get_database_url():
    return os.environ.get("DATABASE_URL") or settings.DATABASE_URL


DATABASE_URL = get_database_url()
print(f"USO DATABASE_URL: {DATABASE_URL}")
if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError(
        f"Devi settare una variabile PostgreSQL DATABASE_URL valida! (ora: {DATABASE_URL})"
    )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_timeout=60,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_database():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Database initialized: {DATABASE_URL}")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


def create_tables():
    # Assicura che TUTTI i modelli siano importati
    import backend.models

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")


def get_db():
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
    return SessionLocal()


def check_database_health() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "connected"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "error", "details": str(e)}


# --- ⚡ FUNZIONE AGGIUNTA: crea solo le tabelle mancanti e chiede conferma ---
def check_and_create_tables(interactive=True):
    """
    Controlla se ci sono tabelle SQLAlchemy mancanti e le crea se vuoi.
    Se 'interactive' è True, chiede conferma con (s/n).
    """
    import backend.models  # Assicurati che importa TUTTI i modelli!

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    defined_tables = Base.metadata.tables.keys()

    missing_tables = [t for t in defined_tables if t not in existing_tables]

    if not missing_tables:
        print("✅ Tutte le tabelle sono già presenti nel database.")
        return

    print("⚠️ Tabelle mancanti nel database:")
    for t in missing_tables:
        print(f" - {t}")

    if interactive:
        try:
            resp = input("Vuoi crearle adesso? (s/n): ").strip().lower()
        except EOFError:
            print("Input interattivo non disponibile (avvio silente o test)")
            resp = "n"
        if resp != "s":
            print("Nessuna tabella creata. Avvio normale.")
            return

    print("🔨 Creo le tabelle mancanti...")
    Base.metadata.create_all(
        bind=engine, tables=[Base.metadata.tables[t] for t in missing_tables]
    )
    print("✅ Tabelle mancanti create con successo!")
