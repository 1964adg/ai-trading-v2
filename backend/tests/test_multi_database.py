"""Tests for SQLite multi-database setup."""
import pytest
import os
from pathlib import Path
from sqlalchemy import text


def test_database_config():
    """Test that database configuration is properly set."""
    from config import settings
    
    assert settings.TRADING_DATABASE_URL.startswith('sqlite:///')
    assert settings.MARKET_DATABASE_URL.startswith('sqlite:///')
    assert settings.ANALYTICS_DATABASE_URL.startswith('sqlite:///')
    
    assert 'trading.db' in settings.TRADING_DATABASE_URL
    assert 'market_data.db' in settings.MARKET_DATABASE_URL
    assert 'analytics.db' in settings.ANALYTICS_DATABASE_URL


def test_multi_database_initialization():
    """Test that all three databases can be initialized."""
    from lib.database import init_database, engines, SessionLocals
    
    # Initialize databases
    result = init_database()
    assert result is True, "Database initialization should succeed"
    
    # Check that all three engines exist
    assert 'trading' in engines
    assert 'market' in engines
    assert 'analytics' in engines
    
    # Check that all three session makers exist
    assert 'trading' in SessionLocals
    assert 'market' in SessionLocals
    assert 'analytics' in SessionLocals


def test_database_health_check():
    """Test database health check functionality."""
    from lib.database import init_database, check_database_health
    
    init_database()
    health = check_database_health()
    
    assert 'trading' in health
    assert 'market' in health
    assert 'analytics' in health
    
    assert health['trading'] == 'connected'
    assert health['market'] == 'connected'
    assert health['analytics'] == 'connected'


def test_trading_database_tables():
    """Test that trading database has correct tables."""
    from lib.database import init_database, create_tables, get_db
    
    init_database()
    create_tables()
    
    with get_db('trading') as db:
        # Check positions table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='positions'"))
        assert result.fetchone() is not None
        
        # Check orders table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'"))
        assert result.fetchone() is not None
        
        # Check portfolio_snapshots table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='portfolio_snapshots'"))
        assert result.fetchone() is not None


def test_market_database_tables():
    """Test that market database has correct tables."""
    from lib.database import init_database, create_tables, get_db
    
    init_database()
    create_tables()
    
    with get_db('market') as db:
        # Check candlesticks table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='candlesticks'"))
        assert result.fetchone() is not None
        
        # Check candlestick_metadata table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='candlestick_metadata'"))
        assert result.fetchone() is not None


def test_analytics_database_tables():
    """Test that analytics database has correct tables."""
    from lib.database import init_database, create_tables, get_db
    
    init_database()
    create_tables()
    
    with get_db('analytics') as db:
        # Check pattern_cache table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='pattern_cache'"))
        assert result.fetchone() is not None
        
        # Check trade_execution_log table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='trade_execution_log'"))
        assert result.fetchone() is not None
        
        # Check ml_model_results table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='ml_model_results'"))
        assert result.fetchone() is not None
        
        # Check analytics_metrics table exists
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='analytics_metrics'"))
        assert result.fetchone() is not None


def test_trading_database_crud():
    """Test CRUD operations on trading database."""
    from lib.database import init_database, create_tables, get_db
    from models.position import Position, PositionStatus, PositionSide
    from datetime import datetime
    
    init_database()
    create_tables()
    
    # Create a position
    with get_db('trading') as db:
        position = Position(
            id='test_position_1',
            symbol='BTCUSDT',
            side=PositionSide.BUY,
            quantity=1.0,
            entry_price=50000.0,
            current_price=50000.0,
            status=PositionStatus.OPEN,
            opened_at=datetime.now()
        )
        db.add(position)
        db.commit()
    
    # Read the position
    with get_db('trading') as db:
        result = db.execute(text("SELECT * FROM positions WHERE id='test_position_1'"))
        row = result.fetchone()
        assert row is not None
        assert row[1] == 'BTCUSDT'  # symbol
    
    # Clean up
    with get_db('trading') as db:
        db.execute(text("DELETE FROM positions WHERE id='test_position_1'"))
        db.commit()


def test_market_database_candlestick_insert():
    """Test inserting candlestick data into market database."""
    from lib.database import init_database, create_tables, get_db
    from models.candlestick import Candlestick
    from datetime import datetime
    
    init_database()
    create_tables()
    
    # Insert a candlestick
    with get_db('market') as db:
        candle = Candlestick(
            symbol='BTCUSDT',
            interval='1h',
            open_time=datetime(2024, 1, 1, 0, 0),
            close_time=datetime(2024, 1, 1, 1, 0),
            open_price=50000.0,
            high_price=51000.0,
            low_price=49500.0,
            close_price=50500.0,
            volume=100.0
        )
        db.add(candle)
        db.commit()
        db.refresh(candle)
        candle_id = candle.id
    
    # Read the candlestick
    with get_db('market') as db:
        result = db.execute(text(f"SELECT * FROM candlesticks WHERE id={candle_id}"))
        row = result.fetchone()
        assert row is not None
        assert row[1] == 'BTCUSDT'  # symbol
    
    # Clean up
    with get_db('market') as db:
        db.execute(text(f"DELETE FROM candlesticks WHERE id={candle_id}"))
        db.commit()


def test_analytics_database_pattern_insert():
    """Test inserting pattern data into analytics database."""
    from lib.database import init_database, create_tables, get_db
    from models.pattern import PatternCache
    from datetime import datetime
    
    init_database()
    create_tables()
    
    # Insert a pattern
    with get_db('analytics') as db:
        pattern = PatternCache(
            symbol='BTCUSDT',
            interval='1h',
            pattern_type='double_top',
            pattern_name='Double Top Pattern',
            detected_at=datetime.now(),
            pattern_start=datetime.now(),
            confidence_score=0.85
        )
        db.add(pattern)
        db.commit()
        db.refresh(pattern)
        pattern_id = pattern.id
    
    # Read the pattern
    with get_db('analytics') as db:
        result = db.execute(text(f"SELECT * FROM pattern_cache WHERE id={pattern_id}"))
        row = result.fetchone()
        assert row is not None
        assert row[1] == 'BTCUSDT'  # symbol
    
    # Clean up
    with get_db('analytics') as db:
        db.execute(text(f"DELETE FROM pattern_cache WHERE id={pattern_id}"))
        db.commit()


def test_paper_trading_with_database():
    """Test paper trading service with database backend."""
    from lib.database import init_database, create_tables, get_db
    from services.paper_trading_service import PaperTradingService
    
    init_database()
    create_tables()
    
    service = PaperTradingService()
    service.set_database(True)
    
    # Create an order
    with get_db('trading') as db:
        result = service.create_order('buy', 'BTCUSDT', 1.0, 50000.0, db=db)
        position_id = result['orderId']
        assert result['symbol'] == 'BTCUSDT'
        assert result['status'] == 'FILLED'
    
    # Get positions
    with get_db('trading') as db:
        positions = service.get_positions(db=db)
        assert len(positions) == 1
        assert positions[0]['symbol'] == 'BTCUSDT'
    
    # Close position
    with get_db('trading') as db:
        close_result = service.close_position(position_id, 51000.0, db=db)
        assert close_result is not None
        assert close_result['realized_pnl'] == 1000.0
    
    # Verify closed
    with get_db('trading') as db:
        positions = service.get_positions(db=db)
        assert len(positions) == 0


def test_database_files_exist():
    """Test that database files are created."""
    from lib.database import init_database
    
    init_database()
    
    # Check files exist
    assert Path('data/trading.db').exists()
    assert Path('data/market_data.db').exists()
    assert Path('data/analytics.db').exists()


def test_sqlite_optimizations():
    """Test that SQLite optimizations are applied."""
    from lib.database import init_database, get_engine
    from sqlalchemy import text
    
    init_database()
    
    for db_name in ['trading', 'market', 'analytics']:
        engine = get_engine(db_name)
        with engine.connect() as conn:
            # Check WAL mode
            result = conn.execute(text("PRAGMA journal_mode"))
            mode = result.fetchone()[0]
            assert mode.lower() == 'wal', f"{db_name} should use WAL mode"
            
            # Check foreign keys
            result = conn.execute(text("PRAGMA foreign_keys"))
            fk_enabled = result.fetchone()[0]
            assert fk_enabled == 1, f"{db_name} should have foreign keys enabled"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
