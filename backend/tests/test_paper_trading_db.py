"""Tests for paper trading database integration."""

import pytest
import os
from sqlalchemy.orm import Session


def test_paper_trading_in_memory_mode():
    """Test paper trading service in in-memory mode."""
    from backend.services.paper_trading_service import PaperTradingService

    service = PaperTradingService()
    assert service.use_database is False

    # Create order
    result = service.create_order("buy", "BTCUSDT", 1.0, 50000.0)
    assert result["symbol"] == "BTCUSDT"
    assert result["status"] == "FILLED"

    # Get positions
    positions = service.get_positions()
    assert len(positions) == 1
    assert positions[0]["symbol"] == "BTCUSDT"


def test_paper_trading_db_mode():
    """Test paper trading service with database."""
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"

    from backend.lib.database import init_database, create_tables, get_db
    from backend.services.paper_trading_service import PaperTradingService

    if not init_database():
        pytest.skip("Database initialization failed")

    create_tables()
    service = PaperTradingService()
    service.set_database(True)

    with get_db() as db:
        # Create order
        result = service.create_order("buy", "BTCUSDT", 1.0, 50000.0, db=db)
        position_id = result["orderId"]
        assert result["symbol"] == "BTCUSDT"

    with get_db() as db:
        # Get positions
        positions = service.get_positions(db=db)
        assert len(positions) == 1
        assert positions[0]["symbol"] == "BTCUSDT"

    with get_db() as db:
        # Update position
        update_result = service.update_position(
            position_id=position_id, stop_loss=48000.0, take_profit=52000.0, db=db
        )
        assert update_result is not None
        assert update_result["stop_loss"] == 48000.0
        assert update_result["take_profit"] == 52000.0

    with get_db() as db:
        # Verify update persisted
        positions = service.get_positions(db=db)
        assert positions[0]["stop_loss"] == 48000.0

    with get_db() as db:
        # Close position
        close_result = service.close_position(position_id, 51000.0, db=db)
        assert close_result is not None
        assert close_result["realized_pnl"] == 1000.0

    with get_db() as db:
        # Verify closed
        positions = service.get_positions(db=db)
        assert len(positions) == 0


def test_database_fallback():
    """Test that app works with default SQLite databases."""
    # With new multi-database setup, databases should always initialize
    # since they use SQLite with default paths
    from backend.lib.database import init_database

    result = init_database()
    assert result is True  # SQLite databases should always initialize
