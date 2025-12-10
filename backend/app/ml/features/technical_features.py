"""Technical feature extraction for ML models."""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class TechnicalFeatureExtractor:
    """Extracts 100+ technical features from OHLCV data."""
    
    def __init__(self, windows: Optional[List[int]] = None, lag_periods: Optional[List[int]] = None):
        """
        Initialize the technical feature extractor.
        
        Args:
            windows: List of periods for moving averages and indicators
            lag_periods: List of lag periods for lag features
        """
        self.windows = windows or [5, 10, 20, 50, 100, 200]
        self.lag_periods = lag_periods or [1, 2, 3, 5, 10]
    
    def extract(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract all technical features from OHLCV data.
        
        Args:
            df: DataFrame with columns ['open', 'high', 'low', 'close', 'volume']
        
        Returns:
            DataFrame with all extracted features
        """
        features = df.copy()
        
        try:
            # Price-based features
            features = self._add_price_features(features)
            
            # Moving averages
            features = self._add_moving_averages(features)
            
            # Volatility indicators
            features = self._add_volatility_features(features)
            
            # Volume indicators
            features = self._add_volume_features(features)
            
            # Momentum indicators
            features = self._add_momentum_features(features)
            
            # Trend indicators
            features = self._add_trend_features(features)
            
            # Lag features
            features = self._add_lag_features(features)
            
            # Rolling statistics
            features = self._add_rolling_statistics(features)
            
            logger.info(f"Extracted {len(features.columns)} features")
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            raise
        
        return features
    
    def _add_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add price-based features."""
        # Returns
        df['returns'] = df['close'].pct_change()
        df['log_returns'] = np.log(df['close'] / df['close'].shift(1))
        
        # Price range and body
        df['price_range'] = df['high'] - df['low']
        df['body_size'] = abs(df['close'] - df['open'])
        df['body_ratio'] = df['body_size'] / (df['price_range'] + 1e-10)
        
        # Shadows
        df['upper_shadow'] = df['high'] - df[['open', 'close']].max(axis=1)
        df['lower_shadow'] = df[['open', 'close']].min(axis=1) - df['low']
        df['upper_shadow_ratio'] = df['upper_shadow'] / (df['price_range'] + 1e-10)
        df['lower_shadow_ratio'] = df['lower_shadow'] / (df['price_range'] + 1e-10)
        
        # Price position in range
        df['close_position'] = (df['close'] - df['low']) / (df['price_range'] + 1e-10)
        
        return df
    
    def _add_moving_averages(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add moving average features."""
        for window in self.windows:
            # Simple Moving Average
            df[f'sma_{window}'] = df['close'].rolling(window=window).mean()
            df[f'sma_{window}_diff'] = df['close'] - df[f'sma_{window}']
            df[f'sma_{window}_ratio'] = df['close'] / (df[f'sma_{window}'] + 1e-10)
            
            # Exponential Moving Average
            df[f'ema_{window}'] = df['close'].ewm(span=window, adjust=False).mean()
            df[f'ema_{window}_diff'] = df['close'] - df[f'ema_{window}']
            df[f'ema_{window}_ratio'] = df['close'] / (df[f'ema_{window}'] + 1e-10)
        
        return df
    
    def _add_volatility_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volatility indicators."""
        # ATR (Average True Range)
        for window in [14, 20]:
            high_low = df['high'] - df['low']
            high_close = abs(df['high'] - df['close'].shift())
            low_close = abs(df['low'] - df['close'].shift())
            true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
            df[f'atr_{window}'] = true_range.rolling(window=window).mean()
        
        # Rolling standard deviation
        for window in [5, 10, 20]:
            df[f'std_{window}'] = df['returns'].rolling(window=window).std()
            df[f'volatility_{window}'] = df['returns'].rolling(window=window).std() * np.sqrt(window)
        
        # High/Low ratio
        df['high_low_ratio'] = df['high'] / (df['low'] + 1e-10)
        
        return df
    
    def _add_volume_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volume indicators."""
        # Volume moving averages
        for window in [5, 10, 20]:
            df[f'volume_sma_{window}'] = df['volume'].rolling(window=window).mean()
            df[f'volume_ratio_{window}'] = df['volume'] / (df[f'volume_sma_{window}'] + 1e-10)
        
        # On-Balance Volume (OBV)
        df['obv'] = (np.sign(df['close'].diff()) * df['volume']).fillna(0).cumsum()
        
        # Volume Rate of Change
        df['volume_roc'] = df['volume'].pct_change(periods=5)
        
        return df
    
    def _add_momentum_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add momentum indicators."""
        # RSI (Relative Strength Index)
        for period in [14, 20]:
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            rs = gain / (loss + 1e-10)
            df[f'rsi_{period}'] = 100 - (100 / (1 + rs))
        
        # MACD
        ema_12 = df['close'].ewm(span=12, adjust=False).mean()
        ema_26 = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = ema_12 - ema_26
        df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
        df['macd_diff'] = df['macd'] - df['macd_signal']
        
        # Stochastic Oscillator
        for period in [14]:
            low_min = df['low'].rolling(window=period).min()
            high_max = df['high'].rolling(window=period).max()
            df[f'stoch_{period}'] = 100 * (df['close'] - low_min) / (high_max - low_min + 1e-10)
            df[f'stoch_{period}_sma'] = df[f'stoch_{period}'].rolling(window=3).mean()
        
        # CCI (Commodity Channel Index)
        for period in [20]:
            typical_price = (df['high'] + df['low'] + df['close']) / 3
            sma_tp = typical_price.rolling(window=period).mean()
            mad = typical_price.rolling(window=period).apply(lambda x: np.abs(x - x.mean()).mean())
            df[f'cci_{period}'] = (typical_price - sma_tp) / (0.015 * mad + 1e-10)
        
        # Rate of Change
        for period in [5, 10, 20]:
            df[f'roc_{period}'] = df['close'].pct_change(periods=period)
        
        return df
    
    def _add_trend_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add trend indicators."""
        # ADX (Average Directional Index)
        period = 14
        
        # Calculate +DM and -DM
        high_diff = df['high'].diff()
        low_diff = -df['low'].diff()
        
        plus_dm = high_diff.where((high_diff > low_diff) & (high_diff > 0), 0)
        minus_dm = low_diff.where((low_diff > high_diff) & (low_diff > 0), 0)
        
        # Calculate ATR
        high_low = df['high'] - df['low']
        high_close = abs(df['high'] - df['close'].shift())
        low_close = abs(df['low'] - df['close'].shift())
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr = true_range.rolling(window=period).mean()
        
        # Calculate +DI and -DI
        plus_di = 100 * (plus_dm.rolling(window=period).mean() / (atr + 1e-10))
        minus_di = 100 * (minus_dm.rolling(window=period).mean() / (atr + 1e-10))
        
        df['plus_di'] = plus_di
        df['minus_di'] = minus_di
        
        # Calculate ADX
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
        df['adx'] = dx.rolling(window=period).mean()
        
        return df
    
    def _add_lag_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add lag features."""
        for lag in self.lag_periods:
            df[f'close_lag_{lag}'] = df['close'].shift(lag)
            df[f'volume_lag_{lag}'] = df['volume'].shift(lag)
            df[f'returns_lag_{lag}'] = df['returns'].shift(lag)
        
        return df
    
    def _add_rolling_statistics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add rolling statistics."""
        for window in [10, 20]:
            # Rolling mean and std
            df[f'rolling_mean_{window}'] = df['close'].rolling(window=window).mean()
            df[f'rolling_std_{window}'] = df['close'].rolling(window=window).std()
            
            # Rolling skewness and kurtosis
            df[f'rolling_skew_{window}'] = df['returns'].rolling(window=window).skew()
            df[f'rolling_kurt_{window}'] = df['returns'].rolling(window=window).kurt()
        
        return df
    
    def get_feature_names(self, df: pd.DataFrame) -> List[str]:
        """
        Get list of feature names.
        
        Args:
            df: DataFrame with extracted features
        
        Returns:
            List of feature column names
        """
        # Exclude original OHLCV columns
        original_cols = ['open', 'high', 'low', 'close', 'volume', 'timestamp']
        return [col for col in df.columns if col not in original_cols]
