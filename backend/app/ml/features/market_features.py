"""Market feature extraction for ML models."""

import pandas as pd
import numpy as np
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class MarketFeatureExtractor:
    """Extracts market-level features from OHLCV data."""
    
    def __init__(self):
        """Initialize the market feature extractor."""
        pass
    
    def extract(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract market features from OHLCV data.
        
        Args:
            df: DataFrame with columns ['open', 'high', 'low', 'close', 'volume']
        
        Returns:
            DataFrame with market features
        """
        features = df.copy()
        
        try:
            # Volume imbalance
            features = self._add_volume_imbalance(features)
            
            # Volatility regime
            features = self._add_volatility_regime(features)
            
            # Liquidity proxies
            features = self._add_liquidity_features(features)
            
            # Market pressure indicators
            features = self._add_market_pressure(features)
            
            logger.info(f"Extracted {len(features.columns)} market features")
        except Exception as e:
            logger.error(f"Market feature extraction failed: {e}")
            raise
        
        return features
    
    def _add_volume_imbalance(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volume imbalance (buy/sell pressure) features."""
        # Estimate buy/sell volume based on price movement
        df['price_change'] = df['close'] - df['open']
        
        # Approximate buy volume (when price goes up)
        df['buy_volume'] = np.where(df['price_change'] > 0, df['volume'], 0)
        df['sell_volume'] = np.where(df['price_change'] < 0, df['volume'], 0)
        
        # Volume imbalance ratio
        total_volume = df['buy_volume'] + df['sell_volume']
        df['volume_imbalance'] = (df['buy_volume'] - df['sell_volume']) / (total_volume + 1e-10)
        
        # Rolling volume imbalance
        for window in [5, 10, 20]:
            df[f'volume_imbalance_{window}'] = df['volume_imbalance'].rolling(window=window).mean()
        
        # Cumulative volume delta
        df['cumulative_volume_delta'] = df['volume_imbalance'].cumsum()
        
        return df
    
    def _add_volatility_regime(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add volatility regime classification features."""
        # Calculate rolling volatility
        returns = df['close'].pct_change()
        
        for window in [10, 20, 50]:
            volatility = returns.rolling(window=window).std()
            df[f'volatility_{window}'] = volatility
            
            # Volatility percentile
            df[f'volatility_percentile_{window}'] = volatility.rolling(window=100).apply(
                lambda x: pd.Series(x).rank(pct=True).iloc[-1] if len(x) > 0 else 0.5
            )
        
        # Volatility regime (low/medium/high)
        vol_20 = returns.rolling(window=20).std()
        vol_mean = vol_20.rolling(window=100).mean()
        vol_std = vol_20.rolling(window=100).std()
        
        df['volatility_regime'] = 0  # Medium
        df.loc[vol_20 < vol_mean - vol_std, 'volatility_regime'] = -1  # Low
        df.loc[vol_20 > vol_mean + vol_std, 'volatility_regime'] = 1  # High
        
        # GARCH-like volatility estimation
        df['squared_returns'] = returns ** 2
        df['garch_vol'] = df['squared_returns'].ewm(span=20).mean().apply(np.sqrt)
        
        return df
    
    def _add_liquidity_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add liquidity proxy features."""
        # Amihud illiquidity measure (approximation)
        # abs(return) / volume
        returns = df['close'].pct_change()
        df['amihud_illiquidity'] = abs(returns) / (df['volume'] + 1e-10)
        
        # Rolling illiquidity
        df['illiquidity_20'] = df['amihud_illiquidity'].rolling(window=20).mean()
        
        # Volume-price trend
        # Measure of liquidity based on volume and price movement consistency
        price_direction = np.sign(df['close'].diff())
        volume_normalized = df['volume'] / df['volume'].rolling(window=20).mean()
        df['volume_price_trend'] = (price_direction * volume_normalized).rolling(window=10).mean()
        
        # Spread proxy (high-low range as % of close)
        df['spread_proxy'] = (df['high'] - df['low']) / (df['close'] + 1e-10)
        df['avg_spread_20'] = df['spread_proxy'].rolling(window=20).mean()
        
        return df
    
    def _add_market_pressure(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add market pressure indicators."""
        # Buying/selling pressure based on close position in range
        df['close_position'] = (df['close'] - df['low']) / (df['high'] - df['low'] + 1e-10)
        
        # Money flow index (MFI) approximation
        typical_price = (df['high'] + df['low'] + df['close']) / 3
        money_flow = typical_price * df['volume']
        
        for period in [14, 20]:
            # Positive and negative money flow
            positive_flow = []
            negative_flow = []
            
            for i in range(len(df)):
                if i == 0:
                    positive_flow.append(0)
                    negative_flow.append(0)
                elif typical_price.iloc[i] > typical_price.iloc[i-1]:
                    positive_flow.append(money_flow.iloc[i])
                    negative_flow.append(0)
                else:
                    positive_flow.append(0)
                    negative_flow.append(money_flow.iloc[i])
            
            df[f'positive_mf_{period}'] = pd.Series(positive_flow).rolling(window=period).sum()
            df[f'negative_mf_{period}'] = pd.Series(negative_flow).rolling(window=period).sum()
            
            # MFI calculation
            mfi_ratio = df[f'positive_mf_{period}'] / (df[f'negative_mf_{period}'] + 1e-10)
            df[f'mfi_{period}'] = 100 - (100 / (1 + mfi_ratio))
        
        # Accumulation/Distribution approximation
        clv = ((df['close'] - df['low']) - (df['high'] - df['close'])) / (df['high'] - df['low'] + 1e-10)
        df['accumulation_distribution'] = (clv * df['volume']).cumsum()
        
        # Price momentum strength
        df['momentum_strength'] = df['close'].pct_change(periods=10).abs()
        
        return df
    
    def classify_market_regime(self, df: pd.DataFrame, window: int = 50) -> pd.DataFrame:
        """
        Classify overall market regime.
        
        Args:
            df: DataFrame with OHLCV data
            window: Window for regime classification
        
        Returns:
            DataFrame with regime classification column
        """
        # Calculate trend strength
        sma_short = df['close'].rolling(window=window//2).mean()
        sma_long = df['close'].rolling(window=window).mean()
        
        trend_strength = (sma_short - sma_long) / (sma_long + 1e-10)
        
        # Classify regime
        df['market_regime'] = 'ranging'
        df.loc[trend_strength > 0.02, 'market_regime'] = 'uptrend'
        df.loc[trend_strength < -0.02, 'market_regime'] = 'downtrend'
        
        # Encode as numeric
        regime_map = {'uptrend': 1, 'ranging': 0, 'downtrend': -1}
        df['market_regime_numeric'] = df['market_regime'].map(regime_map)
        
        return df
