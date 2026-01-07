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


def _upsert_metadata(db, symbol: str, interval: str) -> None:
    # Compute stats from candlesticks
    stats = (
        db.execute(
            text(
                """
            SELECT
              MIN(open_time) AS earliest,
              MAX(open_time) AS latest,
              COUNT(*)::int AS total
            FROM candlesticks
            WHERE symbol = :symbol AND interval = :interval
        """
            ),
            {"symbol": symbol, "interval": interval},
        )
        .mappings()
        .one()
    )

    status = "complete" if (stats["total"] and stats["total"] > 0) else "error"

    db.execute(
        text(
            """
            INSERT INTO candlestick_metadata (
                symbol, interval,
                earliest_timestamp, latest_timestamp,
                total_candles, last_sync, sync_status
            )
            VALUES (
                :symbol, :interval,
                :earliest, :latest,
                :total, NOW(), :status
            )
            ON CONFLICT (symbol, interval)
            DO UPDATE SET
                earliest_timestamp = EXCLUDED.earliest_timestamp,
                latest_timestamp = EXCLUDED.latest_timestamp,
                total_candles = EXCLUDED.total_candles,
                last_sync = EXCLUDED.last_sync,
                sync_status = EXCLUDED.sync_status,
                updated_at = NOW()
        """
        ),
        {
            "symbol": symbol,
            "interval": interval,
            "earliest": stats["earliest"],
            "latest": stats["latest"],
            "total": stats["total"],
            "status": status,
        },
    )


def _set_metadata_status(symbol: str, interval: str, status: str) -> None:
    """Best-effort metadata status update."""
    with get_db("market") as db:
        db.execute(
            text(
                """
                INSERT INTO candlestick_metadata (symbol, interval, sync_status, last_sync)
                VALUES (:symbol, :interval, :status, NOW())
                ON CONFLICT (symbol, interval)
                DO UPDATE SET sync_status=:status, last_sync=NOW(), updated_at=NOW()
            """
            ),
            {"symbol": symbol, "interval": interval, "status": status},
        )


def import_symbol_interval(
    symbol: str, interval: str, days: int, sleep_s: float = 0.25
) -> None:
    start_ms, end_ms = _chunks_from_days(days)

    print(f"\n[IMPORT] {symbol} {interval} days={days}")
    print(f"  range: { _to_dt(start_ms) } -> { _to_dt(end_ms) }")

    total_inserted = 0
    cursor_ms = start_ms
    last_open_ms = None

    # mark metadata as syncing
    _set_metadata_status(symbol, interval, "syncing")

    try:
        while cursor_ms < end_ms:
            klines = _fetch_klines(
                symbol=symbol, interval=interval, start_ms=cursor_ms, end_ms=end_ms
            )
            if not klines:
                print(
                    f"  [WARN] Binance returned 0 klines for {symbol} {interval} at cursor={_to_dt(cursor_ms)}; stopping."
                )
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

            with get_db("market") as db:
                inserted = _insert_candles_bulk(db, rows)
                total_inserted += inserted

            # Move cursor forward: next ms after last open_time
            cursor_ms = int(klines[-1][0]) + 1

            print(
                f"  batch: fetched={len(klines)} inserted≈{inserted} cursor={_to_dt(cursor_ms)}"
            )
            time.sleep(sleep_s)

            # Safety: prevent infinite loop if Binance repeats same candle
            if last_open_ms is not None and cursor_ms <= last_open_ms:
                cursor_ms = last_open_ms + 60_000  # +1 minute fallback

        # Finalize metadata
        with get_db("market") as db:
            _upsert_metadata(db, symbol, interval)

        print(f"[DONE] {symbol} {interval} inserted_total≈{total_inserted}")

    except Exception:
        # Patch 3: ensure we don't leave "syncing" on errors
        _set_metadata_status(symbol, interval, "error")
        raise


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

    for s in symbols:
        for itv in intervals:
            import_symbol_interval(symbol=s, interval=itv, days=args.days)


if __name__ == "__main__":
    main()
