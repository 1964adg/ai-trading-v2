# -*- coding: utf-8 -*-
"""Binance API service wrapper with lazy initialization."""

from binance.client import Client
from typing import Optional
import ssl


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
                    tld='com',
                    requests_params={'timeout': 10}
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

    @classmethod
    async def stream_klines(cls, symbol: str, interval: str):
        """
        Stream live klines from Binance WebSocket with SSL context fix.
        
        Args:
            symbol: Trading pair (e.g., BTCEUR)
            interval: Timeframe (e.g., 1m, 5m, 15m, 1h, 1d)
            
        Yields:
            Formatted kline data dictionaries
        """
        import websockets
        import json
        
        # Create unverified SSL context (fix for Windows certificate issues)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        ws_url = f"wss://stream.binance.com:9443/ws/{symbol.lower()}@kline_{interval}"
        
        print(f"[INFO] Connecting to Binance WebSocket: {symbol}/{interval}")
        
        try:
            async with websockets.connect(
                ws_url,
                ssl=ssl_context,
                ping_interval=20,
                ping_timeout=10,
                close_timeout=5
            ) as ws:
                print(f"[INFO] WebSocket connected: {symbol}/{interval}")
                
                async for message in ws:
                    data = json.loads(message)
                    
                    if 'k' in data:
                        k = data['k']
                        yield {
                            "type": "kline",
                            "symbol": k['s'],
                            "interval": k['i'],
                            "timestamp": k['t'],
                            "open": float(k['o']),
                            "high": float(k['h']),
                            "low": float(k['l']),
                            "close": float(k['c']),
                            "volume": float(k['v']),
                            "closed": k['x']
                        }
        except Exception as e:
            print(f"[ERROR] WebSocket stream error for {symbol}/{interval}: {e}")
            raise


# Singleton instance
binance_service = BinanceService()