"""Machine Learning configuration settings."""

from pydantic_settings import BaseSettings
from typing import List
import os


class MLConfig(BaseSettings):
    """Machine Learning Configuration"""
    
    # Model Storage Paths
    MODEL_STORAGE_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "infrastructure", "ml", "model_storage"
    )
    TRAINING_DATA_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "infrastructure", "ml", "training_data"
    )
    
    # Training Configuration
    TRAIN_TEST_SPLIT: float = 0.8
    VALIDATION_SPLIT: float = 0.1
    RANDOM_SEED: int = 42
    
    # Pattern Recognition CNN Configuration
    PATTERN_SEQUENCE_LENGTH: int = 20
    PATTERN_NUM_CLASSES: int = 15
    
    # Price Prediction Configuration
    PREDICTION_HORIZONS: List[int] = [1, 5, 15, 60]  # Minutes
    
    # Inference Configuration
    ML_CACHE_TTL: int = 30  # seconds
    MIN_CONFIDENCE_THRESHOLD: float = 0.5
    
    # Feature Engineering Configuration
    FEATURE_LOOKBACK_PERIODS: List[int] = [5, 10, 20, 50, 100, 200]
    FEATURE_WINDOWS: List[int] = [5, 10, 20, 50, 100, 200]
    LAG_FEATURES: List[int] = [1, 2, 3, 5, 10]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_prefix = "ML_"
        extra = "ignore"


ml_config = MLConfig()
