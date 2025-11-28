"""Binance API service wrapper."""

from binance.client import Client


class BinanceService:
    """Wrapper for Binance public API client."""
    
    def __init__(self):
        """Initialize service - client created lazily on first request."""
        self._client = None
    
    @property
    def client(self) -> Client:
        """Lazy initialization of Binance client."""
        if self._client is None:
            self._client = Client("", "")
        return self._client
    
    def get_klines_data(self, symbol: str, interval: str, limit: int = 500) -> list:
        """
        Fetch klines (candlestick) data from Binance.
        
        Args:
            symbol: Trading pair symbol (e.g., BTCEUR)
            interval: Kline interval (e.g., 15m, 1h)
            limit: Number of klines to fetch (default: 500)
        
        Returns:
            List of formatted kline data dictionaries
        """
        klines = self.client.get_klines(symbol=symbol, interval=interval, limit=limit)
        
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


binance_service = BinanceService()
