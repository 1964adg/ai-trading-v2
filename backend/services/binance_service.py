# -*- coding: utf-8 -*-
"""Binance API service wrapper with lazy initialization and caching."""

from binance.client import Client
from typing import Optional, Dict, Tuple, Any
import pandas as pd
from datetime import datetime

# ✅ Cache inline (no external import)
class KlineCache:
    def __init__(self, ttl_seconds: int = 60):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self.ttl = ttl_seconds
        self.max_size = 100

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            data, timestamp = self._cache[key]
            age = datetime.now().timestamp() - timestamp

            if age < self.ttl:
                print(f"[BACKEND CACHE HIT] {key} (age:  {age:.1f}s)")
                return data
            else:
                del self._cache[key]
        return None

    def set(self, key:  str, value: Any):
        now = datetime.now().timestamp()
        self._cache[key] = (value, now)

        if len(self._cache) > self.max_size:
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]
            print(f"[CACHE] Removed oldest:  {oldest_key}")

# Global cache instance
kline_cache = KlineCache(ttl_seconds=60)


class BinanceService:
    """Wrapper for Binance public API client (lazy initialization with caching)."""

    _client: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """
        Lazy initialization of Binance client.
        Client is created only on first API request.
        Note: Empty credentials for public API access (klines don't require auth).
        """
        if cls._client is None:
            print("[INFO] Initializing Binance API client...")
            try:
                cls._client = Client(
                    api_key="",
                    api_secret="",
                    tld='com',
                    requests_params={'timeout': 30}  # ← Aumentato a 30s
                )
                print("[INFO] Binance client ready")
            except Exception as e:
                print(f"[ERROR] Failed to initialize Binance client: {e}")
                raise
        return cls._client

    @classmethod
    def get_klines_data(cls, symbol: str, interval: str, limit: int):
        """Fetch klines with caching and proper type conversion"""

        cache_key = f"{symbol}_{interval}_{limit}"

        # Check cache first
        cached = kline_cache.get(cache_key)
        if cached is not None:
            return cached

        # Cache miss - fetch from Binance
        print(f"[BINANCE API] Fetching {cache_key}")

        try:
            client = cls.get_client()

            # Fetch raw klines from Binance
            klines = client.get_klines(
                symbol=symbol,
                interval=interval,
                limit=limit
            )

            # Convert to DataFrame
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])

            # Convert timestamp to datetime then to ISO string
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['timestamp'] = df['timestamp'].dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')

            # Convert to native Python float (JSON serializable)
            df['open'] = df['open'].astype(float)
            df['high'] = df['high'].astype(float)
            df['low'] = df['low'].astype(float)
            df['close'] = df['close'].astype(float)
            df['volume'] = df['volume'].astype(float)

            # Select only required columns
            df_clean = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']].copy()

            # Cache the cleaned DataFrame
            kline_cache.set(cache_key, df_clean)

            print(f"[CACHE] Stored {cache_key} ({len(df_clean)} rows)")

            return df_clean

        except Exception as e:
            print(f"[BINANCE ERROR] {cache_key}: {e}")
            import traceback
            traceback.print_exc()
            return pd.DataFrame(columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])

    @classmethod
    def get_exchange_info(cls):
        """Get exchange trading rules and symbol information."""
        try:
            client = cls.get_client()
            return client.get_exchange_info()
        except Exception as e:
            print(f"[ERROR] Failed to get exchange info: {e}")
            return None

    @classmethod
    def get_symbol_ticker(cls, symbol: str):
        """Get 24hr ticker price change statistics."""
        try:
            client = cls.get_client()
            return client.get_ticker(symbol=symbol)
        except Exception as e:
            print(f"[ERROR] Failed to get ticker for {symbol}: {e}")
            return None

    @classmethod
    def get_orderbook(cls, symbol: str, limit: int = 20):
        """Get current orderbook."""
        try:
            client = cls.get_client()
            return client.get_order_book(symbol=symbol, limit=limit)
        except Exception as e:
            print(f"[ERROR] Failed to get orderbook for {symbol}: {e}")
            return None

    @classmethod
    def stream_klines(cls, symbol: str, interval: str):
        """
        Stream real-time klines via WebSocket.
        Returns a WebSocket connection manager.
        """
        try:
            client = cls.get_client()
            # Return websocket connection
            return client.get_kline_socket(symbol=symbol, interval=interval)
        except Exception as e:
            print(f"[ERROR] Failed to stream klines for {symbol}/{interval}: {e}")
            return None

# Singleton instance for backward compatibility
class _BinanceServiceInstance:
    """Wrapper to make classmethod calls work as instance methods"""

    def get_klines_data(self, symbol: str, interval: str, limit: int):
        return BinanceService.get_klines_data(symbol, interval, limit)

    def get_exchange_info(self):
        return BinanceService.get_exchange_info()

    def get_symbol_ticker(self, symbol: str):
        return BinanceService.get_symbol_ticker(symbol)

    def get_orderbook(self, symbol: str, limit: int = 20):
        return BinanceService.get_orderbook(symbol, limit)

    def stream_klines(self, symbol: str, interval: str):
        """WebSocket stream for real-time klines"""
        return BinanceService.stream_klines(symbol, interval)

# Export singleton instance
binance_service = _BinanceServiceInstance()
