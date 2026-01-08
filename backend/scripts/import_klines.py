"""
Import Binance spot klines into Postgres candlesticks table.

Usage (from repo root):
  cd backend
  python scripts/import_klines.py --symbol BTCUSDT --interval 1m --days 7
  python scripts/import_klines.py --watchlist --days 90 --intervals 1m
"""

from __future__ import annotations

# ✅ Allow running as a script: ensure backend/ is on sys.path
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import argparse
import time
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple

import requests
from requests.exceptions import HTTPError
from sqlalchemy import text

from lib.database import init_database, create_tables, get_db


BINANCE_BASE_URL = "https://api.binance.com"
KLINES_ENDPOINT = "/api/v3/klines"
BINANCE_LIMIT = 1000

DEFAULT_WATCHLIST = [
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "AVAXUSDT",
    "LINKUSDT",
    "POLUSDT",
]

# Error codes for standardized error reporting
ERROR_CODES = {
    "EMPTY_RESPONSE": "EMPTY_RESPONSE",
    "INVALID_SYMBOL": "INVALID_SYMBOL",
    "INVALID_INTERVAL": "INVALID_INTERVAL",
    "RATE_LIMIT": "RATE_LIMIT",
    "NETWORK_ERROR": "NETWORK_ERROR",
    "HTTP_ERROR": "HTTP_ERROR",
    "DB_ERROR": "DB_ERROR",
    "UNKNOWN_ERROR": "UNKNOWN_ERROR",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_dt(ms: int) -> datetime:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)


def _fetch_klines(
    symbol: str,
    interval: str,
    start_ms: int,
    end_ms: int | None = None,
    limit: int = BINANCE_LIMIT,
    timeout: int = 20,
) -> List[List[Any]]:
    params: Dict[str, Any] = {
        "symbol": symbol,
        "interval": interval,
        "startTime": start_ms,
        "limit": limit,
    }
    if end_ms is not None:
        params["endTime"] = end_ms

    r = requests.get(
        f"{BINANCE_BASE_URL}{KLINES_ENDPOINT}", params=params, timeout=timeout
    )
    try:
        r.raise_for_status()
    except HTTPError as e:
        # Print Binance error body to help debugging (invalid symbol, rate limit, etc.)
        body = None
        try:
            body = r.json()
        except Exception:
            body = r.text
        raise HTTPError(f"{e} | Binance response: {body}") from e

    data = r.json()
    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected Binance response: {data}")
    return data


def _chunks_from_days(days: int) -> Tuple[int, int]:
    end = _utc_now()
    start = end - timedelta(days=days)
    return int(start.timestamp() * 1000), int(end.timestamp() * 1000)


def _insert_candles_bulk(db, rows: List[Dict[str, Any]]) -> int:
    if not rows:
        return 0

    # Uses unique index (symbol, interval, open_time) to avoid duplicates.
    sql = text(
        """
        INSERT INTO candlesticks (
            symbol, interval, open_time, close_time,
            open_price, high_price, low_price, close_price, volume,
            quote_asset_volume, number_of_trades,
            taker_buy_base_asset_volume, taker_buy_quote_asset_volume
        )
        VALUES (
            :symbol, :interval, :open_time, :close_time,
            :open_price, :high_price, :low_price, :close_price, :volume,
            :quote_asset_volume, :number_of_trades,
            :taker_buy_base_asset_volume, :taker_buy_quote_asset_volume
        )
        ON CONFLICT (symbol, interval, open_time) DO NOTHING
    """
    )
    result = db.execute(sql, rows)
    # rowcount is best-effort depending on driver; with psycopg2 it is OK.
    return int(result.rowcount or 0)


def _upsert_metadata(
    db,
    symbol: str,
    interval: str,
    error_code: str | None = None,
    error_message: str | None = None,
) -> None:
    """
    Update metadata based on actual DB state.
    
    Always computes stats from candlesticks table. Sets status:
    - 'complete': DB has candles and no error
    - 'error': DB has 0 candles or error occurred
    - 'partial': DB has some candles but error occurred during sync
    """
    now = _utc_now()
    
    # Compute stats from candlesticks
    stats = (
        db.execute(
            text(
                """
            SELECT
              MIN(open_time) AS earliest,
              MAX(open_time) AS latest,
              COUNT(*) AS total
            FROM candlesticks
            WHERE symbol = :symbol AND interval = :interval
        """
            ),
            {"symbol": symbol, "interval": interval},
        )
        .mappings()
        .one()
    )

    total = int(stats["total"] or 0)
    
    # Determine sync_status based on DB state and error presence
    if error_code:
        # Had an error during sync
        if total > 0:
            status = "partial"  # Some data exists but sync failed
        else:
            status = "error"  # No data and error occurred
    else:
        # No error reported
        if total > 0:
            status = "complete"  # Data exists and sync completed
        else:
            status = "error"  # No data even though no explicit error (shouldn't happen)

    # Build update parameters
    params = {
        "symbol": symbol,
        "interval": interval,
        "earliest": stats["earliest"],
        "latest": stats["latest"],
        "total": total,
        "status": status,
        "error_code": error_code,
        "error_message": error_message,
        "now": now,
    }

    # Build dynamic SQL based on whether we're clearing or setting errors
    if error_code:
        # Set error fields
        db.execute(
            text(
                """
                INSERT INTO candlestick_metadata (
                    symbol, interval,
                    earliest_timestamp, latest_timestamp,
                    total_candles, last_sync, sync_status,
                    error_code, error_message, last_attempt_at
                )
                VALUES (
                    :symbol, :interval,
                    :earliest, :latest,
                    :total, :now, :status,
                    :error_code, :error_message, :now
                )
                ON CONFLICT (symbol, interval)
                DO UPDATE SET
                    earliest_timestamp = EXCLUDED.earliest_timestamp,
                    latest_timestamp = EXCLUDED.latest_timestamp,
                    total_candles = EXCLUDED.total_candles,
                    last_sync = EXCLUDED.last_sync,
                    sync_status = EXCLUDED.sync_status,
                    error_code = EXCLUDED.error_code,
                    error_message = EXCLUDED.error_message,
                    last_attempt_at = EXCLUDED.last_attempt_at,
                    updated_at = :now
            """
            ),
            params,
        )
    else:
        # Clear error fields and set last_success_at
        db.execute(
            text(
                """
                INSERT INTO candlestick_metadata (
                    symbol, interval,
                    earliest_timestamp, latest_timestamp,
                    total_candles, last_sync, sync_status,
                    error_code, error_message, last_attempt_at, last_success_at
                )
                VALUES (
                    :symbol, :interval,
                    :earliest, :latest,
                    :total, :now, :status,
                    NULL, NULL, :now, :now
                )
                ON CONFLICT (symbol, interval)
                DO UPDATE SET
                    earliest_timestamp = EXCLUDED.earliest_timestamp,
                    latest_timestamp = EXCLUDED.latest_timestamp,
                    total_candles = EXCLUDED.total_candles,
                    last_sync = EXCLUDED.last_sync,
                    sync_status = EXCLUDED.sync_status,
                    error_code = NULL,
                    error_message = NULL,
                    last_attempt_at = EXCLUDED.last_attempt_at,
                    last_success_at = EXCLUDED.last_success_at,
                    updated_at = :now
            """
            ),
            params,
        )



def _set_metadata_status(
    symbol: str,
    interval: str,
    status: str,
    error_code: str | None = None,
    error_message: str | None = None,
) -> None:
    """Best-effort metadata status update."""
    now = _utc_now()
    
    with get_db("market") as db:
        if error_code:
            db.execute(
                text(
                    """
                    INSERT INTO candlestick_metadata (
                        symbol, interval, sync_status, last_sync,
                        error_code, error_message, last_attempt_at
                    )
                    VALUES (
                        :symbol, :interval, :status, :now,
                        :error_code, :error_message, :now
                    )
                    ON CONFLICT (symbol, interval)
                    DO UPDATE SET
                        sync_status = :status,
                        last_sync = :now,
                        error_code = :error_code,
                        error_message = :error_message,
                        last_attempt_at = :now,
                        updated_at = :now
                """
                ),
                {
                    "symbol": symbol,
                    "interval": interval,
                    "status": status,
                    "error_code": error_code,
                    "error_message": error_message,
                    "now": now,
                },
            )
        else:
            db.execute(
                text(
                    """
                    INSERT INTO candlestick_metadata (
                        symbol, interval, sync_status, last_sync, last_attempt_at
                    )
                    VALUES (:symbol, :interval, :status, :now, :now)
                    ON CONFLICT (symbol, interval)
                    DO UPDATE SET
                        sync_status = :status,
                        last_sync = :now,
                        last_attempt_at = :now,
                        updated_at = :now
                """
                ),
                {"symbol": symbol, "interval": interval, "status": status, "now": now},
            )


def import_symbol_interval(
    symbol: str, interval: str, days: int, sleep_s: float = 0.25, max_retries: int = 3
) -> dict:
    """
    Import klines for a symbol/interval pair.
    
    Returns dict with status info:
        {"success": bool, "error_code": str|None, "error_message": str|None, "inserted": int}
    """
    start_ms, end_ms = _chunks_from_days(days)

    print(f"\n[IMPORT] {symbol} {interval} days={days}")
    print(f"  range: { _to_dt(start_ms) } -> { _to_dt(end_ms) }")

    total_inserted = 0
    cursor_ms = start_ms
    last_open_ms = None
    error_code = None
    error_message = None

    # mark metadata as syncing
    _set_metadata_status(symbol, interval, "syncing")

    try:
        while cursor_ms < end_ms:
            retry_count = 0
            klines = None
            
            # Retry loop for transient errors
            while retry_count <= max_retries:
                try:
                    klines = _fetch_klines(
                        symbol=symbol, interval=interval, start_ms=cursor_ms, end_ms=end_ms
                    )
                    break  # Success, exit retry loop
                    
                except HTTPError as e:
                    error_str = str(e)
                    
                    # Check for specific Binance error codes
                    if "Invalid symbol" in error_str or "400" in error_str:
                        error_code = ERROR_CODES["INVALID_SYMBOL"]
                        error_message = f"Invalid symbol: {symbol}"
                        print(f"  [ERROR] {error_message}")
                        raise  # Don't retry for invalid symbol
                        
                    elif "Invalid interval" in error_str:
                        error_code = ERROR_CODES["INVALID_INTERVAL"]
                        error_message = f"Invalid interval: {interval}"
                        print(f"  [ERROR] {error_message}")
                        raise  # Don't retry for invalid interval
                        
                    elif "429" in error_str or "rate limit" in error_str.lower():
                        error_code = ERROR_CODES["RATE_LIMIT"]
                        error_message = "Rate limit exceeded"
                        retry_count += 1
                        if retry_count <= max_retries:
                            backoff = min(2 ** retry_count, 60)  # Exponential backoff, max 60s
                            print(f"  [WARN] Rate limit hit, retrying in {backoff}s (attempt {retry_count}/{max_retries})...")
                            time.sleep(backoff)
                            continue
                        else:
                            print(f"  [ERROR] {error_message} - max retries exceeded")
                            raise
                            
                    else:
                        error_code = ERROR_CODES["HTTP_ERROR"]
                        error_message = f"HTTP error: {error_str[:200]}"
                        retry_count += 1
                        if retry_count <= max_retries:
                            backoff = min(2 ** retry_count, 30)
                            print(f"  [WARN] HTTP error, retrying in {backoff}s (attempt {retry_count}/{max_retries})...")
                            time.sleep(backoff)
                            continue
                        else:
                            print(f"  [ERROR] {error_message} - max retries exceeded")
                            raise
                            
                except requests.exceptions.RequestException as e:
                    error_code = ERROR_CODES["NETWORK_ERROR"]
                    error_message = f"Network error: {str(e)[:200]}"
                    retry_count += 1
                    if retry_count <= max_retries:
                        backoff = min(2 ** retry_count, 30)
                        print(f"  [WARN] Network error, retrying in {backoff}s (attempt {retry_count}/{max_retries})...")
                        time.sleep(backoff)
                        continue
                    else:
                        print(f"  [ERROR] {error_message} - max retries exceeded")
                        raise
                        
                except Exception as e:
                    error_code = ERROR_CODES["UNKNOWN_ERROR"]
                    error_message = f"Unexpected error: {str(e)[:200]}"
                    print(f"  [ERROR] {error_message}")
                    raise
            
            # Check if we got an empty response
            if not klines:
                error_code = ERROR_CODES["EMPTY_RESPONSE"]
                error_message = f"Binance returned 0 klines for cursor={_to_dt(cursor_ms)}"
                print(f"  [WARN] {error_message}; stopping.")
                break

            # Convert Binance kline arrays into dict rows
            rows: List[Dict[str, Any]] = []
            for k in klines:
                open_time_ms = int(k[0])
                close_time_ms = int(k[6])
                rows.append(
                    {
                        "symbol": symbol,
                        "interval": interval,
                        "open_time": _to_dt(open_time_ms),
                        "close_time": _to_dt(close_time_ms),
                        "open_price": float(k[1]),
                        "high_price": float(k[2]),
                        "low_price": float(k[3]),
                        "close_price": float(k[4]),
                        "volume": float(k[5]),
                        "quote_asset_volume": float(k[7]) if k[7] is not None else None,
                        "number_of_trades": int(k[8]) if k[8] is not None else None,
                        "taker_buy_base_asset_volume": (
                            float(k[9]) if k[9] is not None else None
                        ),
                        "taker_buy_quote_asset_volume": (
                            float(k[10]) if k[10] is not None else None
                        ),
                    }
                )
                last_open_ms = open_time_ms

            # Insert into database
            try:
                with get_db("market") as db:
                    inserted = _insert_candles_bulk(db, rows)
                    total_inserted += inserted
            except Exception as e:
                error_code = ERROR_CODES["DB_ERROR"]
                error_message = f"Database error: {str(e)[:200]}"
                print(f"  [ERROR] {error_message}")
                raise

            # Move cursor forward: next ms after last open_time
            cursor_ms = int(klines[-1][0]) + 1

            print(
                f"  batch: fetched={len(klines)} inserted≈{inserted} cursor={_to_dt(cursor_ms)}"
            )
            time.sleep(sleep_s)

            # Safety: prevent infinite loop if Binance repeats same candle
            if last_open_ms is not None and cursor_ms <= last_open_ms:
                cursor_ms = last_open_ms + 60_000  # +1 minute fallback

        # Finalize metadata based on what happened
        with get_db("market") as db:
            _upsert_metadata(db, symbol, interval, error_code, error_message)

        if error_code:
            print(f"[FAILED] {symbol} {interval} - {error_code}: {error_message}")
            return {
                "success": False,
                "error_code": error_code,
                "error_message": error_message,
                "inserted": total_inserted,
            }
        else:
            print(f"[DONE] {symbol} {interval} inserted_total≈{total_inserted}")
            return {
                "success": True,
                "error_code": None,
                "error_message": None,
                "inserted": total_inserted,
            }

    except Exception as e:
        # Ensure metadata reflects error state
        if not error_code:
            error_code = ERROR_CODES["UNKNOWN_ERROR"]
            error_message = f"Unhandled exception: {str(e)[:200]}"
        
        try:
            with get_db("market") as db:
                _upsert_metadata(db, symbol, interval, error_code, error_message)
        except Exception as meta_error:
            print(f"  [ERROR] Failed to update metadata: {meta_error}")
        
        print(f"[FAILED] {symbol} {interval} - {error_code}: {error_message}")
        return {
            "success": False,
            "error_code": error_code,
            "error_message": error_message,
            "inserted": total_inserted,
        }


def main():
    parser = argparse.ArgumentParser(description="Import Binance klines into Postgres.")
    parser.add_argument("--symbol", type=str, help="Symbol like BTCUSDT")
    parser.add_argument(
        "--interval", type=str, default="1m", help="Interval like 1m,5m,15m,30m"
    )
    parser.add_argument(
        "--days", type=int, default=7, help="How many days back from now"
    )

    parser.add_argument(
        "--watchlist", action="store_true", help="Import default watchlist (10 symbols)"
    )
    parser.add_argument(
        "--intervals",
        type=str,
        default="",
        help="Comma-separated intervals (overrides --interval)",
    )

    args = parser.parse_args()

    # Ensure DB ready
    init_database()
    create_tables()

    intervals: List[str]
    if args.intervals.strip():
        intervals = [x.strip() for x in args.intervals.split(",") if x.strip()]
    else:
        intervals = [args.interval]

    symbols: List[str]
    if args.watchlist:
        symbols = DEFAULT_WATCHLIST
    else:
        if not args.symbol:
            raise SystemExit("Provide --symbol or use --watchlist")
        symbols = [args.symbol.strip().upper()]

    # Track results for summary
    results = []
    
    for s in symbols:
        for itv in intervals:
            result = import_symbol_interval(symbol=s, interval=itv, days=args.days)
            results.append({
                "symbol": s,
                "interval": itv,
                **result
            })
    
    # Print summary
    print("\n" + "=" * 80)
    print("IMPORT SUMMARY")
    print("=" * 80)
    
    successes = [r for r in results if r["success"]]
    failures = [r for r in results if not r["success"]]
    
    print(f"\n✅ Successful: {len(successes)}/{len(results)}")
    for r in successes:
        print(f"   {r['symbol']} {r['interval']}: {r['inserted']} candles inserted")
    
    if failures:
        print(f"\n❌ Failed: {len(failures)}/{len(results)}")
        for r in failures:
            print(f"   {r['symbol']} {r['interval']}: {r['error_code']} - {r['error_message']}")
        
        # Exit with error code if any job failed
        print("\n⚠️  Some imports failed. Exiting with code 1.")
        sys.exit(1)
    else:
        print("\n✅ All imports completed successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
