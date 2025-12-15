"""
Binance Data Collector
"""
import pandas as pd
from binance.client import Client
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class BinanceDataCollector: 
    """Binance historical data collector"""
    
    def __init__(self):
        # Public API (no keys needed for public data)
        self.client = Client("", "")
    
    def get_historical_klines(
        self, 
        symbol: str, 
        interval: str = "1h", 
        days: int = 30
    ) -> Optional[pd.DataFrame]: 
        """
        Get historical klines/candlestick data
        
        Args:
            symbol:  Trading pair (e.g. "BTCUSDT")
            interval: Kline interval (1m, 5m, 15m, 1h, 4h, 1d)
            days: Number of days of historical data
            
        Returns: 
            DataFrame with OHLCV data or None if error
        """
        try: 
            # Calculate start time
            start_time = datetime.utcnow() - timedelta(days=days)
            start_str = start_time.strftime("%d %b %Y %H:%M:%S")
            
            logger.info(f"Fetching {symbol} {interval} data for last {days} days...")
            
            # Get klines from Binance
            klines = self.client.get_historical_klines(
                symbol=symbol,
                interval=interval,
                start_str=start_str
            )
            
            if not klines:
                logger.warning(f"No data returned for {symbol}")
                # Return empty DataFrame instead of None
                return pd.DataFrame()
            
            # Convert to DataFrame
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            
            # Convert types
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['close_time'] = pd.to_datetime(df['close_time'], unit='ms')
            
            for col in ['open', 'high', 'low', 'close', 'volume']: 
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
            # Set index
            df.set_index('timestamp', inplace=True)
            
            logger.info(f"✅ Fetched {len(df)} candles for {symbol}")
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            # Return empty DataFrame instead of None
            return pd.DataFrame()