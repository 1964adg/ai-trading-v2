"""ML inference and prediction coordinator."""

import numpy as np
import pandas as pd
from typing import Dict, Optional, List
import logging
from pathlib import Path

# Try to import ML models, but allow graceful degradation
try:
    from app.ml.models.pattern_cnn import PatternCNN
    PATTERN_CNN_AVAILABLE = True
except ImportError:
    PatternCNN = None
    PATTERN_CNN_AVAILABLE = False
    
try:
    from app.ml.models.price_predictor import PricePredictor
    PRICE_PREDICTOR_AVAILABLE = True
except ImportError:
    PricePredictor = None
    PRICE_PREDICTOR_AVAILABLE = False

from app.ml.features.technical_features import TechnicalFeatureExtractor
from app.ml.features.pattern_features import PatternFeatureExtractor
from app.ml.features.market_features import MarketFeatureExtractor
from app.ml.config import ml_config

logger = logging.getLogger(__name__)


class MLPredictor:
    """Coordinates ML inference across all models and features."""
    
    def __init__(self):
        """Initialize the ML predictor."""
        self.pattern_cnn: Optional[PatternCNN] = None
        self.price_predictor: Optional[PricePredictor] = None
        
        # Feature extractors
        self.technical_extractor = TechnicalFeatureExtractor(
            windows=ml_config.FEATURE_WINDOWS,
            lag_periods=ml_config.LAG_FEATURES
        )
        self.pattern_extractor = PatternFeatureExtractor(
            window=ml_config.PATTERN_SEQUENCE_LENGTH
        )
        self.market_extractor = MarketFeatureExtractor()
        
        self.models_loaded = False
    
    def load_models(self) -> bool:
        """
        Load trained models from disk.
        
        Returns:
            True if models loaded successfully, False otherwise
        """
        try:
            model_path = Path(ml_config.MODEL_STORAGE_PATH)
            
            # Load Pattern CNN
            if PATTERN_CNN_AVAILABLE:
                pattern_cnn_path = model_path / "pattern_cnn.pth"
                if pattern_cnn_path.exists():
                    self.pattern_cnn = PatternCNN(
                        sequence_length=ml_config.PATTERN_SEQUENCE_LENGTH,
                        num_patterns=ml_config.PATTERN_NUM_CLASSES
                    )
                    self.pattern_cnn.load(str(pattern_cnn_path))
                    logger.info("Pattern CNN loaded successfully")
                else:
                    logger.warning(f"Pattern CNN not found at {pattern_cnn_path}")
                    self.pattern_cnn = None
            else:
                logger.warning("Pattern CNN not available (PyTorch not installed)")
                self.pattern_cnn = None
            
            # Load Price Predictor
            if PRICE_PREDICTOR_AVAILABLE:
                price_predictor_path = model_path / "price_predictor"
                if price_predictor_path.exists():
                    self.price_predictor = PricePredictor(horizons=ml_config.PREDICTION_HORIZONS)
                    self.price_predictor.load(str(price_predictor_path))
                    logger.info("Price Predictor loaded successfully")
                else:
                    logger.warning(f"Price Predictor not found at {price_predictor_path}")
                    self.price_predictor = None
            else:
                logger.warning("Price Predictor not available (XGBoost/LightGBM not installed)")
                self.price_predictor = None
            
            self.models_loaded = (self.pattern_cnn is not None or self.price_predictor is not None)
            
            return self.models_loaded
        
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            self.models_loaded = False
            return False
    
    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extract all features from OHLCV data.
        
        Args:
            df: DataFrame with OHLCV data
        
        Returns:
            DataFrame with all extracted features
        """
        try:
            # Technical features
            df_technical = self.technical_extractor.extract(df)
            
            # Pattern features
            df_pattern = self.pattern_extractor.extract(df_technical)
            
            # Market features
            df_market = self.market_extractor.extract(df_pattern)
            
            return df_market
        
        except Exception as e:
            logger.error(f"Feature extraction failed: {e}")
            raise
    
    def predict_patterns(
        self, 
        ohlcv_sequence: np.ndarray,
        threshold: float = 0.5
    ) -> Dict[str, float]:
        """
        Predict candlestick patterns.
        
        Args:
            ohlcv_sequence: OHLCV array of shape (sequence_length, 5)
            threshold: Confidence threshold for pattern detection
        
        Returns:
            Dictionary mapping pattern names to confidence scores
        """
        if self.pattern_cnn is None:
            logger.warning("Pattern CNN not loaded")
            return {}
        
        try:
            patterns = self.pattern_cnn.predict_patterns(ohlcv_sequence, threshold)
            return patterns
        except Exception as e:
            logger.error(f"Pattern prediction failed: {e}")
            return {}
    
    def predict_prices(
        self, 
        features: np.ndarray
    ) -> Dict[int, Dict[str, float]]:
        """
        Predict future prices for multiple horizons.
        
        Args:
            features: Feature array of shape (1, num_features)
        
        Returns:
            Dictionary mapping horizons to prediction dictionaries
        """
        if self.price_predictor is None:
            logger.warning("Price Predictor not loaded")
            return {}
        
        try:
            predictions = self.price_predictor.predict(features)
            return predictions
        except Exception as e:
            logger.error(f"Price prediction failed: {e}")
            return {}
    
    def prepare_features_for_prediction(
        self, 
        df: pd.DataFrame,
        feature_columns: Optional[List[str]] = None
    ) -> np.ndarray:
        """
        Prepare features for price prediction.
        
        Args:
            df: DataFrame with extracted features
            feature_columns: List of feature columns to use (None = all numeric)
        
        Returns:
            Feature array ready for prediction
        """
        if feature_columns is None:
            # Use all numeric columns except original OHLCV
            exclude_cols = ['open', 'high', 'low', 'close', 'volume', 'timestamp']
            feature_columns = [col for col in df.columns if col not in exclude_cols]
        
        # Get the last row's features
        features = df[feature_columns].iloc[-1:].values
        
        # Replace NaN with 0
        features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        
        return features
    
    def get_model_status(self) -> Dict[str, bool]:
        """
        Get status of loaded models.
        
        Returns:
            Dictionary with model availability status
        """
        return {
            'pattern_cnn_loaded': self.pattern_cnn is not None and self.pattern_cnn.is_trained,
            'price_predictor_loaded': self.price_predictor is not None and self.price_predictor.is_trained,
            'models_loaded': self.models_loaded
        }
