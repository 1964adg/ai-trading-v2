"""
Tests for candlestick metadata error reporting functionality.
"""
import pytest
from datetime import datetime, timezone
from sqlalchemy import text
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from lib.database import init_database, create_tables, get_db
from scripts.import_klines import (
    ERROR_CODES,
    _upsert_metadata,
    _set_metadata_status,
    _insert_candles_bulk,
)


@pytest.fixture(scope="function")
def setup_db():
    """Setup test database with tables."""
    os.environ["TESTING"] = "true"
    init_database()
    create_tables()
    
    # Clean up any existing test data
    with get_db("market") as db:
        db.execute(text("DELETE FROM candlestick_metadata WHERE symbol LIKE 'TEST%'"))
        db.execute(text("DELETE FROM candlesticks WHERE symbol LIKE 'TEST%'"))
        db.commit()
    
    yield
    
    # Cleanup after test
    with get_db("market") as db:
        db.execute(text("DELETE FROM candlestick_metadata WHERE symbol LIKE 'TEST%'"))
        db.execute(text("DELETE FROM candlesticks WHERE symbol LIKE 'TEST%'"))
        db.commit()


def test_error_codes_defined():
    """Test that all required error codes are defined."""
    required_codes = [
        "EMPTY_RESPONSE",
        "INVALID_SYMBOL",
        "INVALID_INTERVAL",
        "RATE_LIMIT",
        "NETWORK_ERROR",
        "HTTP_ERROR",
        "DB_ERROR",
        "UNKNOWN_ERROR",
    ]
    for code in required_codes:
        assert code in ERROR_CODES
        assert ERROR_CODES[code] == code


def test_metadata_error_status_no_data(setup_db):
    """Test metadata status is 'error' when DB has no candles and error occurred."""
    with get_db("market") as db:
        _upsert_metadata(
            db,
            symbol="TESTSYMBOL1",
            interval="1m",
            error_code=ERROR_CODES["EMPTY_RESPONSE"],
            error_message="No data returned from Binance",
        )
    
    # Verify metadata
    with get_db("market") as db:
        result = db.execute(
            text("SELECT sync_status, error_code, error_message, total_candles FROM candlestick_metadata WHERE symbol = 'TESTSYMBOL1'")
        ).fetchone()
        
        assert result is not None
        assert result[0] == "error"  # sync_status
        assert result[1] == ERROR_CODES["EMPTY_RESPONSE"]  # error_code
        assert "No data returned" in result[2]  # error_message
        assert result[3] == 0  # total_candles


def test_metadata_complete_status_with_data(setup_db):
    """Test metadata status is 'complete' when DB has candles and no error."""
    # Insert some test candles
    with get_db("market") as db:
        candles = [
            {
                "symbol": "TESTSYMBOL2",
                "interval": "1m",
                "open_time": datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
                "close_time": datetime(2026, 1, 1, 0, 1, tzinfo=timezone.utc),
                "open_price": 100.0,
                "high_price": 101.0,
                "low_price": 99.0,
                "close_price": 100.5,
                "volume": 1000.0,
                "quote_asset_volume": 100000.0,
                "number_of_trades": 50,
                "taker_buy_base_asset_volume": 500.0,
                "taker_buy_quote_asset_volume": 50000.0,
            }
        ]
        _insert_candles_bulk(db, candles)
    
    # Update metadata without error
    with get_db("market") as db:
        _upsert_metadata(db, symbol="TESTSYMBOL2", interval="1m")
    
    # Verify metadata
    with get_db("market") as db:
        result = db.execute(
            text("SELECT sync_status, error_code, error_message, total_candles FROM candlestick_metadata WHERE symbol = 'TESTSYMBOL2'")
        ).fetchone()
        
        assert result is not None
        assert result[0] == "complete"  # sync_status
        assert result[1] is None  # error_code should be cleared
        assert result[2] is None  # error_message should be cleared
        assert result[3] == 1  # total_candles


def test_metadata_partial_status_with_data_and_error(setup_db):
    """Test metadata status is 'partial' when DB has some candles but error occurred."""
    # Insert some test candles
    with get_db("market") as db:
        candles = [
            {
                "symbol": "TESTSYMBOL3",
                "interval": "1m",
                "open_time": datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
                "close_time": datetime(2026, 1, 1, 0, 1, tzinfo=timezone.utc),
                "open_price": 100.0,
                "high_price": 101.0,
                "low_price": 99.0,
                "close_price": 100.5,
                "volume": 1000.0,
                "quote_asset_volume": 100000.0,
                "number_of_trades": 50,
                "taker_buy_base_asset_volume": 500.0,
                "taker_buy_quote_asset_volume": 50000.0,
            }
        ]
        _insert_candles_bulk(db, candles)
    
    # Update metadata with error (simulating mid-import failure)
    with get_db("market") as db:
        _upsert_metadata(
            db,
            symbol="TESTSYMBOL3",
            interval="1m",
            error_code=ERROR_CODES["NETWORK_ERROR"],
            error_message="Connection lost mid-import",
        )
    
    # Verify metadata
    with get_db("market") as db:
        result = db.execute(
            text("SELECT sync_status, error_code, error_message, total_candles FROM candlestick_metadata WHERE symbol = 'TESTSYMBOL3'")
        ).fetchone()
        
        assert result is not None
        assert result[0] == "partial"  # sync_status
        assert result[1] == ERROR_CODES["NETWORK_ERROR"]  # error_code
        assert "Connection lost" in result[2]  # error_message
        assert result[3] == 1  # total_candles


def test_metadata_timestamps_set(setup_db):
    """Test that last_attempt_at and last_success_at are set correctly."""
    # Test error case - should set last_attempt_at but not last_success_at
    _set_metadata_status(
        symbol="TESTSYMBOL4",
        interval="1m",
        status="error",
        error_code=ERROR_CODES["RATE_LIMIT"],
        error_message="Rate limit hit",
    )
    
    with get_db("market") as db:
        result = db.execute(
            text("SELECT last_attempt_at, last_success_at FROM candlestick_metadata WHERE symbol = 'TESTSYMBOL4'")
        ).fetchone()
        
        assert result is not None
        assert result[0] is not None  # last_attempt_at should be set
        # last_success_at might be None (first attempt failed)
    
    # Test success case - should set both timestamps
    with get_db("market") as db:
        candles = [
            {
                "symbol": "TESTSYMBOL5",
                "interval": "1m",
                "open_time": datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
                "close_time": datetime(2026, 1, 1, 0, 1, tzinfo=timezone.utc),
                "open_price": 100.0,
                "high_price": 101.0,
                "low_price": 99.0,
                "close_price": 100.5,
                "volume": 1000.0,
                "quote_asset_volume": 100000.0,
                "number_of_trades": 50,
                "taker_buy_base_asset_volume": 500.0,
                "taker_buy_quote_asset_volume": 50000.0,
            }
        ]
        _insert_candles_bulk(db, candles)
        _upsert_metadata(db, symbol="TESTSYMBOL5", interval="1m")
    
    with get_db("market") as db:
        result = db.execute(
            text("SELECT last_attempt_at, last_success_at FROM candlestick_metadata WHERE symbol = 'TESTSYMBOL5'")
        ).fetchone()
        
        assert result is not None
        assert result[0] is not None  # last_attempt_at should be set
        assert result[1] is not None  # last_success_at should be set


def test_metadata_error_cleared_on_success(setup_db):
    """Test that error fields are cleared when a subsequent import succeeds."""
    # First, set an error
    _set_metadata_status(
        symbol="TESTSYMBOL6",
        interval="1m",
        status="error",
        error_code=ERROR_CODES["NETWORK_ERROR"],
        error_message="Network failed",
    )
    
    # Verify error is set
    with get_db("market") as db:
        result = db.execute(
            text("SELECT error_code FROM candlestick_metadata WHERE symbol = 'TESTSYMBOL6'")
        ).fetchone()
        assert result[0] == ERROR_CODES["NETWORK_ERROR"]
    
    # Now insert data and update successfully
    with get_db("market") as db:
        candles = [
            {
                "symbol": "TESTSYMBOL6",
                "interval": "1m",
                "open_time": datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
                "close_time": datetime(2026, 1, 1, 0, 1, tzinfo=timezone.utc),
                "open_price": 100.0,
                "high_price": 101.0,
                "low_price": 99.0,
                "close_price": 100.5,
                "volume": 1000.0,
                "quote_asset_volume": 100000.0,
                "number_of_trades": 50,
                "taker_buy_base_asset_volume": 500.0,
                "taker_buy_quote_asset_volume": 50000.0,
            }
        ]
        _insert_candles_bulk(db, candles)
        _upsert_metadata(db, symbol="TESTSYMBOL6", interval="1m")
    
    # Verify error fields are cleared
    with get_db("market") as db:
        result = db.execute(
            text("SELECT sync_status, error_code, error_message FROM candlestick_metadata WHERE symbol = 'TESTSYMBOL6'")
        ).fetchone()
        
        assert result[0] == "complete"
        assert result[1] is None  # error_code cleared
        assert result[2] is None  # error_message cleared


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
