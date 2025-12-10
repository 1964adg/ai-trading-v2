"""Pattern feature extraction for ML models."""

import pandas as pd
import numpy as np
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


class PatternFeatureExtractor:
    """Extracts candlestick pattern features from OHLCV data."""
    
    def __init__(self, window: int = 20):
        """
        Initialize the pattern feature extractor.
        
        Args:
            window: Rolling window size for normalization
        """
        self.window = window
    
    def extract(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract pattern features from OHLCV data.
        
        Args:
            df: DataFrame with columns ['open', 'high', 'low', 'close', 'volume']
        
        Returns:
            DataFrame with pattern features
        """
        features = df.copy()
        
        try:
            # Candlestick normalization
            features = self._add_normalized_features(features)
            
            # Body and shadow ratios
            features = self._add_candle_ratios(features)
            
            # Candle direction
            features = self._add_direction_features(features)
            
            # Consecutive patterns
            features = self._add_consecutive_patterns(features)
            
            # Multi-candle sequences
            features = self._add_sequence_features(features)
            
            logger.info(f"Extracted {len(features.columns)} pattern features")
        except Exception as e:
            logger.error(f"Pattern feature extraction failed: {e}")
            raise
        
        return features
    
    def _add_normalized_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize candlestick within rolling window."""
        # Rolling min and max
        rolling_min = df['low'].rolling(window=self.window).min()
        rolling_max = df['high'].rolling(window=self.window).max()
        rolling_range = rolling_max - rolling_min
        
        # Normalize OHLC
        df['open_norm'] = (df['open'] - rolling_min) / (rolling_range + 1e-10)
        df['high_norm'] = (df['high'] - rolling_min) / (rolling_range + 1e-10)
        df['low_norm'] = (df['low'] - rolling_min) / (rolling_range + 1e-10)
        df['close_norm'] = (df['close'] - rolling_min) / (rolling_range + 1e-10)
        
        return df
    
    def _add_candle_ratios(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add body and shadow ratio features."""
        # Price range
        price_range = df['high'] - df['low']
        
        # Body size and ratio
        df['body'] = abs(df['close'] - df['open'])
        df['body_ratio'] = df['body'] / (price_range + 1e-10)
        
        # Upper shadow
        df['upper_shadow'] = df['high'] - df[['open', 'close']].max(axis=1)
        df['upper_shadow_ratio'] = df['upper_shadow'] / (price_range + 1e-10)
        
        # Lower shadow
        df['lower_shadow'] = df[['open', 'close']].min(axis=1) - df['low']
        df['lower_shadow_ratio'] = df['lower_shadow'] / (price_range + 1e-10)
        
        # Shadow balance
        df['shadow_balance'] = (df['upper_shadow'] - df['lower_shadow']) / (price_range + 1e-10)
        
        # Tail ratio (total shadows vs body)
        df['tail_ratio'] = (df['upper_shadow'] + df['lower_shadow']) / (df['body'] + 1e-10)
        
        return df
    
    def _add_direction_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add candle direction features."""
        # Bullish/bearish
        df['is_bullish'] = (df['close'] > df['open']).astype(int)
        df['is_bearish'] = (df['close'] < df['open']).astype(int)
        df['is_doji'] = (abs(df['close'] - df['open']) < (df['high'] - df['low']) * 0.1).astype(int)
        
        # Trend direction
        df['close_direction'] = np.sign(df['close'] - df['open'])
        df['trend_direction'] = np.sign(df['close'] - df['close'].shift(1))
        
        return df
    
    def _add_consecutive_patterns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Count consecutive bullish/bearish candles."""
        # Consecutive bullish
        bullish_count = 0
        consecutive_bullish = []
        for val in df['is_bullish']:
            if val == 1:
                bullish_count += 1
            else:
                bullish_count = 0
            consecutive_bullish.append(bullish_count)
        df['consecutive_bullish'] = consecutive_bullish
        
        # Consecutive bearish
        bearish_count = 0
        consecutive_bearish = []
        for val in df['is_bearish']:
            if val == 1:
                bearish_count += 1
            else:
                bearish_count = 0
            consecutive_bearish.append(bearish_count)
        df['consecutive_bearish'] = consecutive_bearish
        
        return df
    
    def _add_sequence_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add multi-candle sequence features."""
        # 2-candle patterns
        df['pattern_engulfing_bull'] = (
            (df['is_bearish'].shift(1) == 1) & 
            (df['is_bullish'] == 1) &
            (df['body'] > df['body'].shift(1))
        ).astype(int)
        
        df['pattern_engulfing_bear'] = (
            (df['is_bullish'].shift(1) == 1) & 
            (df['is_bearish'] == 1) &
            (df['body'] > df['body'].shift(1))
        ).astype(int)
        
        # Harami pattern
        df['pattern_harami'] = (
            (df['body'].shift(1) > df['body']) &
            (df['close_direction'].shift(1) != df['close_direction'])
        ).astype(int)
        
        # Gap patterns
        df['gap_up'] = (df['low'] > df['high'].shift(1)).astype(int)
        df['gap_down'] = (df['high'] < df['low'].shift(1)).astype(int)
        
        # Long body/shadows
        body_mean = df['body'].rolling(window=self.window).mean()
        df['long_body'] = (df['body'] > body_mean * 1.5).astype(int)
        df['long_upper_shadow'] = (df['upper_shadow'] > df['body'] * 1.5).astype(int)
        df['long_lower_shadow'] = (df['lower_shadow'] > df['body'] * 1.5).astype(int)
        
        return df
    
    def detect_patterns(self, df: pd.DataFrame) -> Dict[str, List[int]]:
        """
        Detect specific candlestick patterns.
        
        Args:
            df: DataFrame with OHLCV data
        
        Returns:
            Dictionary mapping pattern names to lists of indices where detected
        """
        patterns = {}
        
        # Doji
        doji_threshold = (df['high'] - df['low']) * 0.1
        patterns['doji'] = df[abs(df['close'] - df['open']) < doji_threshold].index.tolist()
        
        # Hammer
        hammer_condition = (
            (df['lower_shadow_ratio'] > 0.6) &
            (df['upper_shadow_ratio'] < 0.1) &
            (df['body_ratio'] < 0.3)
        )
        patterns['hammer'] = df[hammer_condition].index.tolist()
        
        # Shooting Star
        shooting_star_condition = (
            (df['upper_shadow_ratio'] > 0.6) &
            (df['lower_shadow_ratio'] < 0.1) &
            (df['body_ratio'] < 0.3)
        )
        patterns['shooting_star'] = df[shooting_star_condition].index.tolist()
        
        # Marubozu (strong trend candle)
        marubozu_condition = (
            (df['body_ratio'] > 0.9) &
            (df['upper_shadow_ratio'] < 0.05) &
            (df['lower_shadow_ratio'] < 0.05)
        )
        patterns['marubozu'] = df[marubozu_condition].index.tolist()
        
        return patterns
