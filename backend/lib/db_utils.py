"""Database initialization and migration utilities."""
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import text
from lib.database import engines, SessionLocals, get_db

logger = logging.getLogger(__name__)


def initialize_databases():
    """Initialize all databases with tables and indexes."""
    try:
        # Create trading database tables
        from models.base import Base
        if 'trading' in engines:
            Base.metadata.create_all(bind=engines['trading'])
            logger.info("✓ Trading database tables created")
        
        # Create market database tables
        from models.candlestick import CandlestickBase
        if 'market' in engines:
            CandlestickBase.metadata.create_all(bind=engines['market'])
            logger.info("✓ Market database tables created")
        
        # Create analytics database tables
        from models.pattern import PatternBase
        if 'analytics' in engines:
            PatternBase.metadata.create_all(bind=engines['analytics'])
            logger.info("✓ Analytics database tables created")
        
        return True
    except Exception as e:
        logger.error(f"Failed to initialize databases: {e}")
        return False


def verify_database_integrity():
    """Verify database integrity and indexes."""
    results = {}
    
    # Check trading database
    if 'trading' in engines:
        try:
            with get_db('trading') as db:
                # Check positions table
                result = db.execute(text("SELECT COUNT(*) FROM positions")).fetchone()
                results['trading_positions'] = f"{result[0]} positions"
                
                # Check orders table
                result = db.execute(text("SELECT COUNT(*) FROM orders")).fetchone()
                results['trading_orders'] = f"{result[0]} orders"
                
            results['trading'] = "OK"
        except Exception as e:
            results['trading'] = f"Error: {str(e)}"
    
    # Check market database
    if 'market' in engines:
        try:
            with get_db('market') as db:
                # Check candlesticks table
                result = db.execute(text("SELECT COUNT(*) FROM candlesticks")).fetchone()
                results['market_candlesticks'] = f"{result[0]} candlesticks"
                
                # Check metadata table
                result = db.execute(text("SELECT COUNT(*) FROM candlestick_metadata")).fetchone()
                results['market_metadata'] = f"{result[0]} metadata entries"
                
            results['market'] = "OK"
        except Exception as e:
            results['market'] = f"Error: {str(e)}"
    
    # Check analytics database
    if 'analytics' in engines:
        try:
            with get_db('analytics') as db:
                # Check pattern cache table
                result = db.execute(text("SELECT COUNT(*) FROM pattern_cache")).fetchone()
                results['analytics_patterns'] = f"{result[0]} patterns"
                
                # Check trade execution log
                result = db.execute(text("SELECT COUNT(*) FROM trade_execution_log")).fetchone()
                results['analytics_trades'] = f"{result[0]} trade logs"
                
                # Check ML model results
                result = db.execute(text("SELECT COUNT(*) FROM ml_model_results")).fetchone()
                results['analytics_ml'] = f"{result[0]} ML results"
                
            results['analytics'] = "OK"
        except Exception as e:
            results['analytics'] = f"Error: {str(e)}"
    
    return results


def export_database(database: str, output_path: Optional[str] = None):
    """
    Export database to SQL dump.
    
    Args:
        database: Database name ('trading', 'market', or 'analytics')
        output_path: Output file path (defaults to ./data/exports/)
    """
    if database not in engines:
        raise ValueError(f"Database '{database}' not available")
    
    if not output_path:
        export_dir = Path("./data/exports")
        export_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = export_dir / f"{database}_export_{timestamp}.sql"
    
    # SQLite backup using .dump command
    import subprocess
    
    db_path = str(engines[database].url).replace("sqlite:///", "")
    
    try:
        with open(output_path, 'w') as f:
            subprocess.run(['sqlite3', db_path, '.dump'], stdout=f, check=True)
        logger.info(f"Database '{database}' exported to {output_path}")
        return str(output_path)
    except Exception as e:
        logger.error(f"Failed to export database: {e}")
        raise


def import_database(database: str, input_path: str):
    """
    Import database from SQL dump.
    
    Args:
        database: Database name ('trading', 'market', or 'analytics')
        input_path: Input SQL file path
    """
    if database not in engines:
        raise ValueError(f"Database '{database}' not available")
    
    db_path = str(engines[database].url).replace("sqlite:///", "")
    
    try:
        with open(input_path, 'r') as f:
            sql_dump = f.read()
        
        with get_db(database) as db:
            for statement in sql_dump.split(';'):
                if statement.strip():
                    db.execute(text(statement))
        
        logger.info(f"Database '{database}' imported from {input_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to import database: {e}")
        raise


def optimize_databases():
    """Run VACUUM and ANALYZE on all databases for optimization."""
    results = {}
    
    for db_name, engine in engines.items():
        try:
            with engine.connect() as conn:
                # VACUUM reclaims space and defragments
                conn.execute(text("VACUUM"))
                # ANALYZE updates query planner statistics
                conn.execute(text("ANALYZE"))
                conn.commit()
            results[db_name] = "optimized"
            logger.info(f"Database '{db_name}' optimized")
        except Exception as e:
            results[db_name] = f"error: {str(e)}"
            logger.error(f"Failed to optimize database '{db_name}': {e}")
    
    return results


def get_database_stats():
    """Get statistics for all databases."""
    stats = {}
    
    for db_name, engine in engines.items():
        try:
            db_path = str(engine.url).replace("sqlite:///", "")
            
            # Get file size
            if Path(db_path).exists():
                size_bytes = Path(db_path).stat().st_size
                size_mb = size_bytes / (1024 * 1024)
                
                with engine.connect() as conn:
                    # Get page count
                    result = conn.execute(text("PRAGMA page_count")).fetchone()
                    page_count = result[0] if result else 0
                    
                    # Get page size
                    result = conn.execute(text("PRAGMA page_size")).fetchone()
                    page_size = result[0] if result else 0
                    
                    # Get freelist count
                    result = conn.execute(text("PRAGMA freelist_count")).fetchone()
                    freelist = result[0] if result else 0
                    
                stats[db_name] = {
                    "path": db_path,
                    "size_mb": round(size_mb, 2),
                    "page_count": page_count,
                    "page_size": page_size,
                    "freelist": freelist,
                    "fragmentation_pct": round((freelist / page_count * 100) if page_count > 0 else 0, 2)
                }
            else:
                stats[db_name] = {"status": "file not found"}
                
        except Exception as e:
            stats[db_name] = {"error": str(e)}
    
    return stats


if __name__ == "__main__":
    # Run as standalone script for database management
    import sys
    from lib.database import init_database
    
    logging.basicConfig(level=logging.INFO)
    
    if not init_database():
        print("Failed to initialize databases")
        sys.exit(1)
    
    print("\n=== Database Initialization ===")
    if initialize_databases():
        print("✓ All databases initialized successfully")
    else:
        print("✗ Database initialization failed")
        sys.exit(1)
    
    print("\n=== Database Integrity Check ===")
    results = verify_database_integrity()
    for key, value in results.items():
        print(f"  {key}: {value}")
    
    print("\n=== Database Statistics ===")
    stats = get_database_stats()
    for db_name, db_stats in stats.items():
        print(f"\n{db_name.upper()}:")
        for key, value in db_stats.items():
            print(f"  {key}: {value}")
    
    print("\n✓ Database management complete")
