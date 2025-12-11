"""
Binance Historical Data Collector
Downloads and stores OHLCV data for model training
"""
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import httpx


class BinanceDataCollector:
    """Collect historical data from Binance API"""

    def __init__(self, base_url: str = "https://api.binance.com"):
        self.base_url = base_url
        self.data_dir = Path("infrastructure/ml/training_data")
        self.data_dir.mkdir(parents=True, exist_ok=True)

    async def fetch_klines(
        self,
        symbol: str,
        interval: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000
    ) -> pd.DataFrame:
        """Fetch klines from Binance"""
        url = f"{self.base_url}/api/v3/klines"

        params = {
            "symbol": symbol,
            "interval":  interval,
            "limit": limit
        }

        if start_time:
            params["startTime"] = int(start_time.timestamp() * 1000)
        if end_time:
            params["endTime"] = int(end_time.timestamp() * 1000)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client. get(url, params=params)
            response.raise_for_status()
            data = response.json()

        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_volume', 'trades', 'taker_buy_base',
            'taker_buy_quote', 'ignore'
        ])

        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col]. astype(float)

        return df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]

    async def download_historical_data(
        self,
        symbol: str,
        interval: str,
        days: int = 90
    ) -> pd.DataFrame:
        """Download multiple days of historical data"""
        print(f"📊 Downloading {days} days of {symbol} {interval} data...")

        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)

        all_data = []
        current_start = start_time

        while current_start < end_time:
            current_end = min(current_start + timedelta(hours=16), end_time)

            df = await self.fetch_klines(
                symbol=symbol,
                interval=interval,
                start_time=current_start,
                end_time=current_end
            )

            if len(df) > 0:
                all_data.append(df)
                print(f"  Downloaded {len(df)} candles from {current_start.date()}")

            current_start = current_end
            await asyncio.sleep(0.2)

        if all_data:
            full_df = pd.concat(all_data, ignore_index=True)
            full_df = full_df.drop_duplicates(subset=['timestamp']).sort_values('timestamp').reset_index(drop=True)
            print(f"✅ Downloaded {len(full_df)} total candles")
            return full_df

        return pd.DataFrame()

    def save_data(self, df:  pd.DataFrame, symbol: str, interval: str):
        """Save data to Parquet format"""
        filename = self.data_dir / f"{symbol}_{interval}_{datetime.now().strftime('%Y%m%d')}.parquet"

        df.to_parquet(filename, compression='gzip', index=False)
        print(f"💾 Saved to {filename}")
        return filename

    def load_data(self, symbol: str, interval: str) -> Optional[pd.DataFrame]:
        """Load latest data file"""
        pattern = f"{symbol}_{interval}_*. parquet"
        files = sorted(self.data_dir.glob(pattern), reverse=True)

        if files:
            df = pd.read_parquet(files[0])
            print(f"📂 Loaded {len(df)} candles from {files[0]. name}")
            return df

        return None
