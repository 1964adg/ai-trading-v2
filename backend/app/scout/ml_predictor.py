"""
ML Predictor Integration for Crypto Scout
Uses trained price predictor models for enhanced opportunity detection
"""
import numpy as np
import pandas as pd
from typing import Optional, Dict, List, Tuple
import logging
from pathlib import Path
import torch
from datetime import datetime

logger = logging.getLogger(__name__)


class MLPredictor:
    """ML-based price prediction for crypto scout"""
    
    def __init__(self):
        self.model_path = Path("infrastructure/ml/model_storage")
        self.models_loaded = False
        self.price_predictor = None
        
        # Try to load models
        try:
            self._load_models()
        except Exception as e:
            logger.warning(f"ML models not loaded: {e}")
            logger.info("Scout will work without ML predictions")
    
    def _load_models(self):
        """Load trained ML models"""
        try: 
            predictor_path = self.model_path / "price_predictor"
            
            if predictor_path.exists():
                # Check if it's a PyTorch model
                model_file = predictor_path / "model.pth"
                if model_file.exists():
                    logger.info("Found PyTorch price predictor model")
                    # We'll integrate actual loading when needed
                    self.models_loaded = True
                else:
                    logger.info("Price predictor directory found but no model.pth")
            else:
                logger.info(f"Price predictor not found at {predictor_path}")
                
        except Exception as e:
            logger.error(f"Error loading ML models: {e}")
            self.models_loaded = False
    
    def predict_price_movement(
        self, 
        df: pd.DataFrame,
        symbol: str,
        horizons: List[str] = ["1m", "5m", "15m", "60m"]
    ) -> Dict[str, Dict]: 
        """
        Predict price movements for multiple time horizons
        
        Args: 
            df: Historical OHLCV DataFrame
            symbol: Trading pair symbol
            horizons: List of prediction horizons
            
        Returns: 
            Dict with predictions per horizon
        """
        if not self.models_loaded or df is None or len(df) < 50:
            return self._get_fallback_predictions(df, horizons)
        
        try:
            # For now, use technical-based predictions
            # TODO: Integrate actual ML model inference
            return self._technical_based_predictions(df, horizons)
            
        except Exception as e: 
            logger.error(f"Prediction error for {symbol}: {e}")
            return self._get_fallback_predictions(df, horizons)
    
    def _technical_based_predictions(
        self, 
        df:  pd.DataFrame, 
        horizons: List[str]
    ) -> Dict[str, Dict]: 
        """
        Generate predictions based on technical indicators
        (Fallback until ML models are fully integrated)
        """
        predictions = {}
        
        close = df['close']
        current_price = float(close.iloc[-1])
        
        # Calculate momentum indicators
        returns_1 = close.pct_change(1).iloc[-5: ].mean()
        returns_5 = close.pct_change(5).iloc[-3:].mean() if len(df) >= 8 else returns_1
        returns_10 = close.pct_change(10).iloc[-2:].mean() if len(df) >= 12 else returns_5
        
        # Volatility
        volatility = close.pct_change().std()
        
        # RSI-based momentum
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else 50
        
        # Predictions for each horizon
        horizon_multipliers = {
            "1m": 0.0005,   # 0.05% typical move
            "5m": 0.002,    # 0.2% typical move
            "15m":  0.005,   # 0.5% typical move
            "60m":  0.015    # 1.5% typical move
        }
        
        for horizon in horizons:
            multiplier = horizon_multipliers.get(horizon, 0.01)
            
            # Base prediction on recent momentum
            if horizon == "1m":
                momentum = returns_1
            elif horizon == "5m":
                momentum = (returns_1 * 0.6 + returns_5 * 0.4)
            elif horizon == "15m":
                momentum = (returns_1 * 0.3 + returns_5 * 0.4 + returns_10 * 0.3)
            else:  # 60m
                momentum = (returns_5 * 0.4 + returns_10 * 0.6)
            
            # Adjust for RSI
            if current_rsi > 70:  # Overbought
                momentum *= 0.7
            elif current_rsi < 30:  # Oversold
                momentum *= 1.3
            
            # Predicted price change
            predicted_change_pct = momentum * 100
            predicted_price = current_price * (1 + momentum)
            
            # Confidence based on consistency
            confidence = self._calculate_confidence(
                df, 
                momentum, 
                volatility, 
                current_rsi
            )
            
            # Direction
            direction = "UP" if predicted_change_pct > 0.1 else "DOWN" if predicted_change_pct < -0.1 else "NEUTRAL"
            
            predictions[horizon] = {
                "predicted_price": round(predicted_price, 8),
                "predicted_change_pct": round(predicted_change_pct, 4),
                "confidence": round(confidence, 2),
                "direction": direction,
                "current_price": round(current_price, 8)
            }
        
        return predictions
    
    def _calculate_confidence(
        self, 
        df:  pd.DataFrame, 
        momentum: float, 
        volatility: float,
        rsi: float
    ) -> float:
        """Calculate prediction confidence (0-100)"""
        
        confidence = 50.0  # Base confidence
        
        # Higher confidence if momentum is strong and consistent
        recent_returns = df['close'].pct_change().iloc[-10:]
        consistency = 1 - abs(recent_returns.std() / (abs(recent_returns.mean()) + 0.001))
        confidence += consistency * 20
        
        # Lower confidence if high volatility
        if volatility > 0.05:  # >5% volatility
            confidence -= 15
        elif volatility < 0.02:  # <2% volatility
            confidence += 10
        
        # Adjust for RSI extremes (more confident at extremes)
        if rsi > 70 or rsi < 30:
            confidence += 10
        
        # Volume consistency
        volume_std = df['volume'].iloc[-10:].std() / df['volume'].iloc[-10:].mean()
        if volume_std < 0.5:  # Consistent volume
            confidence += 10
        
        return max(0, min(100, confidence))
    
    def _get_fallback_predictions(
        self, 
        df: Optional[pd.DataFrame],
        horizons: List[str]
    ) -> Dict[str, Dict]:
        """Fallback predictions when ML not available"""
        
        if df is None or len(df) < 2:
            return {}
        
        current_price = float(df['close'].iloc[-1])
        
        predictions = {}
        for horizon in horizons:
            predictions[horizon] = {
                "predicted_price": current_price,
                "predicted_change_pct": 0.0,
                "confidence": 30.0,  # Low confidence
                "direction": "NEUTRAL",
                "current_price": current_price
            }
        
        return predictions
    
    def calculate_ml_score(
        self, 
        predictions: Dict[str, Dict]
    ) -> float:
        """
        Calculate ML score (0-100) based on predictions
        
        Args:
            predictions: Dict of predictions per horizon
            
        Returns:
            ML score 0-100
        """
        if not predictions:
            return 50.0  # Neutral
        
        # Aggregate scores from all horizons
        total_score = 0
        total_weight = 0
        
        # Weights per horizon (shorter term = higher weight for trading)
        horizon_weights = {
            "1m": 0.15,
            "5m": 0.25,
            "15m": 0.35,
            "60m": 0.25
        }
        
        for horizon, pred in predictions.items():
            weight = horizon_weights.get(horizon, 0.25)
            
            # Score based on predicted change and confidence
            change_pct = pred["predicted_change_pct"]
            confidence = pred["confidence"]
            
            # Positive change = higher score
            if change_pct > 2:  # >2% up
                horizon_score = 80
            elif change_pct > 1:  # >1% up
                horizon_score = 70
            elif change_pct > 0.5:  # >0.5% up
                horizon_score = 60
            elif change_pct > -0.5:  # Flat
                horizon_score = 50
            elif change_pct > -1:  # <0.5% down
                horizon_score = 40
            elif change_pct > -2:  # <1% down
                horizon_score = 30
            else:  # <2% down
                horizon_score = 20
            
            # Weight by confidence
            weighted_score = horizon_score * (confidence / 100)
            
            total_score += weighted_score * weight
            total_weight += weight
        
        ml_score = total_score / total_weight if total_weight > 0 else 50.0
        
        return round(ml_score, 2)
    
    def get_prediction_trend(
        self, 
        predictions: Dict[str, Dict]
    ) -> str:
        """
        Get overall prediction trend
        
        Returns:
            "STRONG_BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "STRONG_BEARISH"
        """
        if not predictions:
            return "NEUTRAL"
        
        # Count directions
        up_count = sum(1 for p in predictions.values() if p["direction"] == "UP")
        down_count = sum(1 for p in predictions.values() if p["direction"] == "DOWN")
        
        # Average predicted change
        avg_change = sum(p["predicted_change_pct"] for p in predictions.values()) / len(predictions)
        
        if avg_change > 1 and up_count >= 3:
            return "STRONG_BULLISH"
        elif avg_change > 0.3 and up_count >= 2:
            return "BULLISH"
        elif avg_change < -1 and down_count >= 3:
            return "STRONG_BEARISH"
        elif avg_change < -0.3 and down_count >= 2:
            return "BEARISH"
        else:
            return "NEUTRAL"


# Global instance
ml_predictor = MLPredictor()