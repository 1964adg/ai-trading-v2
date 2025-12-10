"""ML Service layer for AI Trading."""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
import logging

from services.binance_service import BinanceService
from app.ml.inference.predictor import MLPredictor
from app.ml.config import ml_config

logger = logging.getLogger(__name__)


class MLService:
    """Service layer for ML-powered trading insights."""
    
    def __init__(self):
        """Initialize the ML service."""
        self.predictor = MLPredictor()
        self.cache: Dict[str, Dict] = {}
        self.cache_timestamps: Dict[str, datetime] = {}
        
        # Try to load models on initialization
        self._load_models()
    
    def _load_models(self) -> None:
        """Load ML models."""
        try:
            success = self.predictor.load_models()
            if success:
                logger.info("ML models loaded successfully")
            else:
                logger.warning("Some ML models could not be loaded - predictions will be limited")
        except Exception as e:
            logger.error(f"Failed to load ML models: {e}")
    
    def get_ml_insights(
        self, 
        symbol: str, 
        timeframe: str = "1m",
        limit: int = 500
    ) -> Dict:
        """
        Get comprehensive ML insights for a trading symbol.
        
        Args:
            symbol: Trading symbol (e.g., BTCUSDT)
            timeframe: Timeframe for analysis (e.g., 1m, 5m, 15m)
            limit: Number of candles to fetch
        
        Returns:
            Dictionary with ML insights including patterns, predictions, and signals
        """
        cache_key = f"{symbol}_{timeframe}"
        
        # Check cache
        if self._is_cache_valid(cache_key):
            logger.info(f"Returning cached ML insights for {cache_key}")
            return self.cache[cache_key]
        
        try:
            # Fetch market data
            df = self._fetch_market_data(symbol, timeframe, limit)
            
            if df is None or len(df) < ml_config.PATTERN_SEQUENCE_LENGTH:
                return self._get_empty_insights(symbol, "Insufficient market data")
            
            # Extract features
            df_features = self._extract_all_features(df)
            
            # Get current price
            current_price = float(df['close'].iloc[-1])
            
            # Predict patterns
            patterns = self._predict_patterns(df)
            
            # Predict prices
            price_predictions = self._predict_prices(df_features)
            
            # Generate trading signals
            signals = self._generate_signals(patterns, price_predictions, current_price)
            
            # Calculate overall confidence
            overall_confidence = self._calculate_overall_confidence(patterns, price_predictions)
            
            # Build response
            insights = {
                'symbol': symbol,
                'patterns': {
                    'detected': patterns,
                    'count': len(patterns),
                    'strongest': self._get_strongest_pattern(patterns)
                },
                'price_predictions': price_predictions,
                'signals': signals,
                'confidence': overall_confidence,
                'timestamp': datetime.now().isoformat(),
                'current_price': current_price,
                'model_status': self.predictor.get_model_status()
            }
            
            # Cache the result
            self.cache[cache_key] = insights
            self.cache_timestamps[cache_key] = datetime.now()
            
            return insights
        
        except Exception as e:
            logger.error(f"Failed to get ML insights for {symbol}: {e}")
            return self._get_empty_insights(symbol, str(e))
    
    def _fetch_market_data(self, symbol: str, interval: str, limit: int) -> Optional[pd.DataFrame]:
        """Fetch market data from Binance."""
        try:
            klines = BinanceService.get_klines_data(symbol, interval, limit)
            
            # Convert to DataFrame
            df = pd.DataFrame(klines)
            
            # Rename columns to lowercase
            df = df.rename(columns={
                'open': 'open',
                'high': 'high',
                'low': 'low',
                'close': 'close',
                'volume': 'volume'
            })
            
            return df
        
        except Exception as e:
            logger.error(f"Failed to fetch market data: {e}")
            return None
    
    def _extract_all_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract all features from market data."""
        try:
            return self.predictor.extract_features(df)
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            return df
    
    def _predict_patterns(self, df: pd.DataFrame) -> Dict[str, float]:
        """Predict candlestick patterns."""
        try:
            # Get last sequence_length candles
            sequence_length = ml_config.PATTERN_SEQUENCE_LENGTH
            
            if len(df) < sequence_length:
                return {}
            
            # Extract OHLCV sequence
            ohlcv_sequence = df[['open', 'high', 'low', 'close', 'volume']].tail(sequence_length).values
            
            # Predict patterns
            patterns = self.predictor.predict_patterns(
                ohlcv_sequence, 
                threshold=ml_config.MIN_CONFIDENCE_THRESHOLD
            )
            
            return patterns
        
        except Exception as e:
            logger.error(f"Pattern prediction failed: {e}")
            return {}
    
    def _predict_prices(self, df: pd.DataFrame) -> Dict[int, Dict[str, float]]:
        """Predict future prices."""
        try:
            # Prepare features
            features = self.predictor.prepare_features_for_prediction(df)
            
            # Predict prices
            predictions = self.predictor.predict_prices(features)
            
            return predictions
        
        except Exception as e:
            logger.error(f"Price prediction failed: {e}")
            return {}
    
    def _generate_signals(
        self, 
        patterns: Dict[str, float],
        price_predictions: Dict[int, Dict[str, float]],
        current_price: float
    ) -> List[Dict]:
        """Generate trading signals from ML insights."""
        signals = []
        
        # Pattern-based signals
        bullish_patterns = ['hammer', 'engulfing_bullish', 'morning_star', 'three_white_soldiers', 'piercing_line']
        bearish_patterns = ['shooting_star', 'engulfing_bearish', 'evening_star', 'three_black_crows', 'dark_cloud_cover']
        
        for pattern, confidence in patterns.items():
            if pattern in bullish_patterns:
                signals.append({
                    'type': 'BUY',
                    'source': f'Pattern: {pattern}',
                    'reason': f'{pattern.replace("_", " ").title()} pattern detected',
                    'confidence': confidence
                })
            elif pattern in bearish_patterns:
                signals.append({
                    'type': 'SELL',
                    'source': f'Pattern: {pattern}',
                    'reason': f'{pattern.replace("_", " ").title()} pattern detected',
                    'confidence': confidence
                })
        
        # Price prediction-based signals
        if price_predictions:
            # Use 5m prediction for short-term signals
            if 5 in price_predictions:
                pred_5m = price_predictions[5]
                predicted_price = pred_5m.get('prediction', current_price)
                confidence = pred_5m.get('confidence', 0.5)
                
                price_change_pct = ((predicted_price - current_price) / current_price) * 100
                
                if price_change_pct > 0.5:  # Predicted increase > 0.5%
                    signals.append({
                        'type': 'BUY',
                        'source': 'Price Prediction (5m)',
                        'reason': f'Predicted +{price_change_pct:.2f}% increase in 5 minutes',
                        'confidence': confidence
                    })
                elif price_change_pct < -0.5:  # Predicted decrease > 0.5%
                    signals.append({
                        'type': 'SELL',
                        'source': 'Price Prediction (5m)',
                        'reason': f'Predicted {price_change_pct:.2f}% decrease in 5 minutes',
                        'confidence': confidence
                    })
        
        return signals
    
    def _get_strongest_pattern(self, patterns: Dict[str, float]) -> Optional[tuple]:
        """Get the strongest detected pattern."""
        if not patterns:
            return None
        
        strongest = max(patterns.items(), key=lambda x: x[1])
        return strongest
    
    def _calculate_overall_confidence(
        self, 
        patterns: Dict[str, float],
        price_predictions: Dict[int, Dict[str, float]]
    ) -> float:
        """Calculate overall confidence score."""
        confidences = []
        
        # Pattern confidences
        if patterns:
            confidences.extend(patterns.values())
        
        # Price prediction confidences
        for horizon_pred in price_predictions.values():
            if 'confidence' in horizon_pred:
                confidences.append(horizon_pred['confidence'])
        
        if not confidences:
            return 0.0
        
        return float(np.mean(confidences))
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid."""
        if cache_key not in self.cache:
            return False
        
        timestamp = self.cache_timestamps.get(cache_key)
        if timestamp is None:
            return False
        
        age = (datetime.now() - timestamp).total_seconds()
        return age < ml_config.ML_CACHE_TTL
    
    def _get_empty_insights(self, symbol: str, reason: str = "") -> Dict:
        """Get empty insights structure."""
        return {
            'symbol': symbol,
            'patterns': {
                'detected': {},
                'count': 0,
                'strongest': None
            },
            'price_predictions': {},
            'signals': [],
            'confidence': 0.0,
            'timestamp': datetime.now().isoformat(),
            'current_price': 0.0,
            'model_status': self.predictor.get_model_status(),
            'error': reason if reason else 'Models not trained yet'
        }
    
    def get_model_status(self) -> Dict:
        """Get ML model status."""
        return self.predictor.get_model_status()


# Global instance
ml_service = MLService()
