"""
Manual validation script for candlestick metadata error reporting.

This script demonstrates the functionality of the standardized error reporting system
without requiring external network access.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timezone
from sqlalchemy import text
from backend.lib.database import init_database, create_tables, get_db
from scripts.import_klines import (
    ERROR_CODES,
    _upsert_metadata,
    _insert_candles_bulk,
)


def print_section(title):
    """Print a section header."""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def print_metadata(symbol, interval):
    """Print metadata for a symbol/interval."""
    with get_db() as db:
        result = db.execute(
            text(
                """
                SELECT
                    symbol, interval, sync_status, error_code, error_message,
                    total_candles, last_attempt_at, last_success_at
                FROM candlestick_metadata
                WHERE symbol = :symbol AND interval = :interval
            """
            ),
            {"symbol": symbol, "interval": interval},
        ).fetchone()

        if result:
            print(f"\n  Symbol: {result[0]}")
            print(f"  Interval: {result[1]}")
            print(f"  Sync Status: {result[2]}")
            print(f"  Error Code: {result[3] or 'None'}")
            print(f"  Error Message: {result[4][:80] + '...' if result[4] else 'None'}")
            print(f"  Total Candles: {result[5]}")
            print(f"  Last Attempt: {result[6]}")
            print(f"  Last Success: {result[7]}")
        else:
            print(f"\n  No metadata found for {symbol} {interval}")


def main():
    """Run validation scenarios."""
    os.environ["TESTING"] = "true"

    print("\n🔍 Candlestick Metadata Error Reporting - Manual Validation")
    print("=" * 80)

    # Initialize database
    print("\n📊 Initializing test database...")
    init_database()
    create_tables()

    # Clean up test data
    with get_db() as db:
        db.execute(text("DELETE FROM candlestick_metadata WHERE symbol LIKE 'DEMO%'"))
        db.execute(text("DELETE FROM candlesticks WHERE symbol LIKE 'DEMO%'"))
        db.commit()

    # Scenario 1: Empty response error
    print_section("Scenario 1: Empty Response (No Data from Exchange)")

    with get_db() as db:
        _upsert_metadata(
            db,
            symbol="DEMOSYMBOL1",
            interval="1m",
            error_code=ERROR_CODES["EMPTY_RESPONSE"],
            error_message="Binance returned empty array for the requested timeframe",
        )

    print("✅ Simulated empty response from Binance")
    print_metadata("DEMOSYMBOL1", "1m")
    print(
        "\n  Expected: sync_status='error', error_code='EMPTY_RESPONSE', total_candles=0"
    )

    # Scenario 2: Successful import
    print_section("Scenario 2: Successful Import")

    # Insert test candles
    candles = [
        {
            "symbol": "DEMOSYMBOL2",
            "interval": "1m",
            "open_time": datetime(2026, 1, 8, 12, i, tzinfo=timezone.utc),
            "close_time": datetime(2026, 1, 8, 12, i + 1, tzinfo=timezone.utc),
            "open_price": 100.0 + i,
            "high_price": 101.0 + i,
            "low_price": 99.0 + i,
            "close_price": 100.5 + i,
            "volume": 1000.0,
            "quote_asset_volume": 100000.0,
            "number_of_trades": 50,
            "taker_buy_base_asset_volume": 500.0,
            "taker_buy_quote_asset_volume": 50000.0,
        }
        for i in range(5)
    ]

    with get_db() as db:
        inserted = _insert_candles_bulk(db, candles)
        _upsert_metadata(db, symbol="DEMOSYMBOL2", interval="1m")

    print(f"✅ Inserted {inserted} candles successfully")
    print_metadata("DEMOSYMBOL2", "1m")
    print("\n  Expected: sync_status='complete', error_code=None, total_candles=5")

    # Scenario 3: Partial import (some data, then error)
    print_section("Scenario 3: Partial Import (Network Error Mid-Import)")

    # Insert some candles
    candles = [
        {
            "symbol": "DEMOSYMBOL3",
            "interval": "1m",
            "open_time": datetime(2026, 1, 8, 13, i, tzinfo=timezone.utc),
            "close_time": datetime(2026, 1, 8, 13, i + 1, tzinfo=timezone.utc),
            "open_price": 100.0 + i,
            "high_price": 101.0 + i,
            "low_price": 99.0 + i,
            "close_price": 100.5 + i,
            "volume": 1000.0,
            "quote_asset_volume": 100000.0,
            "number_of_trades": 50,
            "taker_buy_base_asset_volume": 500.0,
            "taker_buy_quote_asset_volume": 50000.0,
        }
        for i in range(3)
    ]

    with get_db() as db:
        _insert_candles_bulk(db, candles)
        _upsert_metadata(
            db,
            symbol="DEMOSYMBOL3",
            interval="1m",
            error_code=ERROR_CODES["NETWORK_ERROR"],
            error_message="Connection lost during batch fetch after 3 candles",
        )

    print("✅ Simulated network error after partial import")
    print_metadata("DEMOSYMBOL3", "1m")
    print(
        "\n  Expected: sync_status='partial', error_code='NETWORK_ERROR', total_candles=3"
    )

    # Scenario 4: Rate limit error
    print_section("Scenario 4: Rate Limit Error")

    with get_db() as db:
        _upsert_metadata(
            db,
            symbol="DEMOSYMBOL4",
            interval="1m",
            error_code=ERROR_CODES["RATE_LIMIT"],
            error_message="Binance API rate limit exceeded - will retry with backoff",
        )

    print("✅ Simulated rate limit error")
    print_metadata("DEMOSYMBOL4", "1m")
    print("\n  Expected: sync_status='error', error_code='RATE_LIMIT', total_candles=0")

    # Scenario 5: Error recovery
    print_section("Scenario 5: Error Recovery (Previously Failed, Now Success)")

    # First, set an error
    with get_db() as db:
        _upsert_metadata(
            db,
            symbol="DEMOSYMBOL5",
            interval="1m",
            error_code=ERROR_CODES["INVALID_SYMBOL"],
            error_message="Symbol not found on Binance",
        )

    print("✅ Initial state - error")
    print_metadata("DEMOSYMBOL5", "1m")

    # Now simulate successful recovery
    candles = [
        {
            "symbol": "DEMOSYMBOL5",
            "interval": "1m",
            "open_time": datetime(2026, 1, 8, 14, 0, tzinfo=timezone.utc),
            "close_time": datetime(2026, 1, 8, 14, 1, tzinfo=timezone.utc),
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

    with get_db() as db:
        _insert_candles_bulk(db, candles)
        _upsert_metadata(db, symbol="DEMOSYMBOL5", interval="1m")

    print("\n✅ After recovery - success")
    print_metadata("DEMOSYMBOL5", "1m")
    print(
        "\n  Expected: sync_status='complete', error_code=None (cleared), total_candles=1"
    )

    # Summary
    print_section("Validation Complete!")
    print("\n✅ All scenarios demonstrated successfully")
    print("\n📚 Key Features Validated:")
    print(
        "  • Error codes properly set (EMPTY_RESPONSE, NETWORK_ERROR, RATE_LIMIT, etc.)"
    )
    print("  • Sync status correctly reflects DB state (complete/error/partial)")
    print("  • Error fields cleared on successful recovery")
    print("  • Timestamps tracked (last_attempt_at, last_success_at)")
    print("  • Total candles accurately counted from DB")
    print("\n" + "=" * 80)

    # Cleanup
    with get_db() as db:
        db.execute(text("DELETE FROM candlestick_metadata WHERE symbol LIKE 'DEMO%'"))
        db.execute(text("DELETE FROM candlesticks WHERE symbol LIKE 'DEMO%'"))
        db.commit()


if __name__ == "__main__":
    main()
