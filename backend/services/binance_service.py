# -*- coding: utf-8 -*-
"""Binance API service wrapper with lazy initialization."""

from binance.client import Client
from typing import Optional


class BinanceService:
    """Wrapper for Binance public API client (lazy initialization)."""
    
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
                    tld='com',  # Force .com domain
                    requests_params={'timeout': 10}  # 10s timeout
                )
                print("[INFO] Binance client ready")
            except Exception as e:
                print(f"[ERROR] Failed to initialize Binance client: {e}")
                raise
        return cls._client

    @classmethod
    def get_klines_data(cls, symbol: str, interval: str, limit: int = 500) -> list:
        """
        Fetch klines (candlestick) data from Binance. 

        Args:
            symbol: Trading pair (e.g., BTCEUR)
            interval: Kline interval (e.g., 15m, 1h, 4h)
            limit: Number of klines (default: 500, max: 1000)

        Returns:
            List of formatted kline dictionaries

        Raises:
            Exception: If Binance API request fails
        """
        try:
            client = cls.get_client()
            klines = client.get_klines(
                symbol=symbol,
                interval=interval,
                limit=limit
            )

            return [
                {
                    "timestamp": int(kline[0]),
                    "open": float(kline[1]),
                    "high": float(kline[2]),
                    "low": float(kline[3]),
                    "close": float(kline[4]),
                    "volume": float(kline[5])
                }
                for kline in klines
            ]
        except Exception as e:
            print(f"[ERROR] Binance API error for {symbol}/{interval}: {e}")
            raise


# Singleton instance (backwards compatibility)
binance_service = BinanceService()