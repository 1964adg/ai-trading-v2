"""Ensemble model for price prediction."""

import numpy as np
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path
import joblib

from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor

from app.ml.models.base_model import BaseMLModel

logger = logging.getLogger(__name__)


class PricePredictor(BaseMLModel):
    """
    Ensemble model combining XGBoost, LightGBM, and RandomForest.
    
    Predicts prices for multiple horizons: [1m, 5m, 15m, 60m]
    """
    
    def __init__(self, horizons: List[int] = [1, 5, 15, 60]):
        """
        Initialize the price predictor ensemble.
        
        Args:
            horizons: List of prediction horizons in minutes
        """
        super().__init__(model_name="PricePredictor")
        
        self.horizons = horizons
        self.models: Dict[int, Dict[str, Any]] = {}
        
        # Ensemble weights
        self.weights = {
            'xgboost': 0.4,
            'lightgbm': 0.4,
            'random_forest': 0.2
        }
        
        # Initialize models for each horizon
        for horizon in horizons:
            self.models[horizon] = {
                'xgboost': XGBRegressor(
                    n_estimators=100,
                    max_depth=6,
                    learning_rate=0.1,
                    random_state=42,
                    n_jobs=-1
                ),
                'lightgbm': LGBMRegressor(
                    n_estimators=100,
                    max_depth=6,
                    learning_rate=0.1,
                    random_state=42,
                    n_jobs=-1,
                    verbose=-1
                ),
                'random_forest': RandomForestRegressor(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42,
                    n_jobs=-1
                )
            }
    
    def train(self, X: np.ndarray, y_dict: Dict[int, np.ndarray], **kwargs) -> Dict[str, float]:
        """
        Train all models for all horizons.
        
        Args:
            X: Training features of shape (num_samples, num_features)
            y_dict: Dictionary mapping horizons to target arrays
            **kwargs: Additional training parameters
        
        Returns:
            Dictionary of training metrics
        """
        metrics = {}
        
        for horizon in self.horizons:
            if horizon not in y_dict:
                logger.warning(f"No targets provided for horizon {horizon}m, skipping")
                continue
            
            y = y_dict[horizon]
            logger.info(f"Training models for {horizon}m horizon...")
            
            # Train each model
            for model_name, model in self.models[horizon].items():
                try:
                    model.fit(X, y)
                    
                    # Calculate training score
                    score = model.score(X, y)
                    metrics[f'{horizon}m_{model_name}_score'] = score
                    
                    logger.info(f"  {model_name}: R² = {score:.4f}")
                except Exception as e:
                    logger.error(f"Failed to train {model_name} for {horizon}m: {e}")
                    raise
        
        self.is_trained = True
        self.metrics = metrics
        
        return metrics
    
    def predict(self, X: np.ndarray) -> Dict[int, Dict[str, Any]]:
        """
        Make predictions for all horizons.
        
        Args:
            X: Features for prediction of shape (num_samples, num_features)
        
        Returns:
            Dictionary mapping horizons to prediction dictionaries
        """
        if not self.is_trained:
            logger.warning("Model not trained, predictions may be unreliable")
        
        predictions = {}
        
        for horizon in self.horizons:
            horizon_preds = {}
            model_predictions = []
            
            # Get predictions from each model
            for model_name, model in self.models[horizon].items():
                try:
                    pred = model.predict(X)
                    horizon_preds[model_name] = float(pred[0]) if len(pred) > 0 else 0.0
                    model_predictions.append(pred[0] if len(pred) > 0 else 0.0)
                except Exception as e:
                    logger.error(f"Prediction failed for {model_name} at {horizon}m: {e}")
                    horizon_preds[model_name] = 0.0
                    model_predictions.append(0.0)
            
            # Calculate weighted ensemble prediction
            ensemble_pred = (
                horizon_preds.get('xgboost', 0.0) * self.weights['xgboost'] +
                horizon_preds.get('lightgbm', 0.0) * self.weights['lightgbm'] +
                horizon_preds.get('random_forest', 0.0) * self.weights['random_forest']
            )
            
            # Calculate confidence based on prediction variance
            pred_std = float(np.std(model_predictions))
            pred_mean = float(np.mean(model_predictions))
            
            # Confidence is inverse of coefficient of variation
            if pred_mean != 0:
                cv = abs(pred_std / pred_mean)
                confidence = max(0.0, min(1.0, 1.0 - cv))
            else:
                confidence = 0.5
            
            predictions[horizon] = {
                'prediction': ensemble_pred,
                'xgboost': horizon_preds.get('xgboost', 0.0),
                'lightgbm': horizon_preds.get('lightgbm', 0.0),
                'random_forest': horizon_preds.get('random_forest', 0.0),
                'confidence': confidence,
                'std': pred_std
            }
        
        return predictions
    
    def predict_single_horizon(self, X: np.ndarray, horizon: int) -> Dict[str, Any]:
        """
        Make prediction for a single horizon.
        
        Args:
            X: Features for prediction
            horizon: Prediction horizon in minutes
        
        Returns:
            Prediction dictionary for the horizon
        """
        if horizon not in self.horizons:
            raise ValueError(f"Horizon {horizon} not in configured horizons {self.horizons}")
        
        all_predictions = self.predict(X)
        return all_predictions[horizon]
    
    def get_model_state(self) -> Any:
        """Get model state for serialization."""
        return {
            'horizons': self.horizons,
            'models': self.models,
            'weights': self.weights
        }
    
    def set_model_state(self, state: Any) -> None:
        """Set model state from deserialization."""
        self.horizons = state['horizons']
        self.models = state['models']
        self.weights = state['weights']
    
    def save(self, path: str) -> None:
        """
        Save all models to disk.
        
        Args:
            path: Base path to save models (will create subdirectory)
        """
        try:
            save_path = Path(path)
            save_path.mkdir(parents=True, exist_ok=True)
            
            # Save each horizon's models
            for horizon in self.horizons:
                horizon_path = save_path / f"horizon_{horizon}m"
                horizon_path.mkdir(exist_ok=True)
                
                for model_name, model in self.models[horizon].items():
                    model_file = horizon_path / f"{model_name}.joblib"
                    joblib.dump(model, model_file)
            
            # Save metadata
            metadata = {
                'horizons': self.horizons,
                'weights': self.weights,
                'is_trained': self.is_trained,
                'metrics': self.metrics
            }
            joblib.dump(metadata, save_path / "metadata.joblib")
            
            logger.info(f"Models saved to {path}")
        except Exception as e:
            logger.error(f"Failed to save models: {e}")
            raise
    
    def load(self, path: str) -> None:
        """
        Load all models from disk.
        
        Args:
            path: Base path to load models from
        """
        try:
            load_path = Path(path)
            
            # Load metadata
            metadata = joblib.load(load_path / "metadata.joblib")
            self.horizons = metadata['horizons']
            self.weights = metadata['weights']
            self.is_trained = metadata['is_trained']
            self.metrics = metadata['metrics']
            
            # Load each horizon's models
            self.models = {}
            for horizon in self.horizons:
                horizon_path = load_path / f"horizon_{horizon}m"
                self.models[horizon] = {}
                
                for model_name in ['xgboost', 'lightgbm', 'random_forest']:
                    model_file = horizon_path / f"{model_name}.joblib"
                    if model_file.exists():
                        self.models[horizon][model_name] = joblib.load(model_file)
            
            logger.info(f"Models loaded from {path}")
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            raise
    
    def get_feature_importance(self, horizon: int, top_n: int = 20) -> Dict[str, Dict[str, float]]:
        """
        Get feature importance for a specific horizon.
        
        Args:
            horizon: Prediction horizon in minutes
            top_n: Number of top features to return
        
        Returns:
            Dictionary mapping model names to feature importance dictionaries
        """
        if horizon not in self.models:
            raise ValueError(f"Horizon {horizon} not found in models")
        
        importance = {}
        
        for model_name, model in self.models[horizon].items():
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
                # Sort and get top N
                top_indices = np.argsort(importances)[-top_n:][::-1]
                importance[model_name] = {
                    f'feature_{i}': float(importances[i]) for i in top_indices
                }
        
        return importance
