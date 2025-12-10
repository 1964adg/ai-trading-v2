"""Base class for all ML models."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import joblib
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class BaseMLModel(ABC):
    """Abstract base class for all ML models."""
    
    def __init__(self, model_name: str):
        """
        Initialize the base model.
        
        Args:
            model_name: Name of the model for identification
        """
        self.model_name = model_name
        self.is_trained = False
        self.metrics: Dict[str, float] = {}
    
    @abstractmethod
    def train(self, X: Any, y: Any, **kwargs) -> Dict[str, float]:
        """
        Train the model.
        
        Args:
            X: Training features
            y: Training targets
            **kwargs: Additional training parameters
        
        Returns:
            Dictionary of training metrics
        """
        pass
    
    @abstractmethod
    def predict(self, X: Any) -> Any:
        """
        Make predictions.
        
        Args:
            X: Features for prediction
        
        Returns:
            Model predictions
        """
        pass
    
    def save(self, path: str) -> None:
        """
        Save the model to disk.
        
        Args:
            path: Path to save the model
        """
        try:
            save_path = Path(path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            
            model_data = {
                'model': self.get_model_state(),
                'model_name': self.model_name,
                'is_trained': self.is_trained,
                'metrics': self.metrics
            }
            
            joblib.dump(model_data, save_path)
            logger.info(f"Model saved to {path}")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
            raise
    
    def load(self, path: str) -> None:
        """
        Load the model from disk.
        
        Args:
            path: Path to load the model from
        """
        try:
            model_data = joblib.load(path)
            
            self.set_model_state(model_data['model'])
            self.model_name = model_data['model_name']
            self.is_trained = model_data['is_trained']
            self.metrics = model_data['metrics']
            
            logger.info(f"Model loaded from {path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    @abstractmethod
    def get_model_state(self) -> Any:
        """
        Get the model state for serialization.
        
        Returns:
            Model state object
        """
        pass
    
    @abstractmethod
    def set_model_state(self, state: Any) -> None:
        """
        Set the model state from deserialization.
        
        Args:
            state: Model state object
        """
        pass
    
    def calculate_metrics(
        self, 
        y_true: Any, 
        y_pred: Any, 
        metric_names: Optional[list] = None
    ) -> Dict[str, float]:
        """
        Calculate evaluation metrics.
        
        Args:
            y_true: True values
            y_pred: Predicted values
            metric_names: List of metric names to calculate
        
        Returns:
            Dictionary of metric values
        """
        # Override in subclasses for specific metrics
        return {}
    
    def validate(self, X: Any, y: Any) -> Dict[str, float]:
        """
        Validate the model on a dataset.
        
        Args:
            X: Validation features
            y: Validation targets
        
        Returns:
            Dictionary of validation metrics
        """
        if not self.is_trained:
            logger.warning("Model not trained, validation may not be meaningful")
        
        predictions = self.predict(X)
        metrics = self.calculate_metrics(y, predictions)
        
        return metrics
    
    def __repr__(self) -> str:
        """String representation of the model."""
        return f"{self.__class__.__name__}(name='{self.model_name}', trained={self.is_trained})"
