"""PyTorch CNN for pattern recognition."""

import torch
import torch.nn as nn
import numpy as np
from typing import Dict, Tuple, Any
import logging
from pathlib import Path

from app.ml.models.base_model import BaseMLModel
from app.ml.utils.preprocessing import normalize_ohlcv

logger = logging.getLogger(__name__)


class PatternCNN(BaseMLModel, nn.Module):
    """
    Convolutional Neural Network for candlestick pattern recognition.
    
    Detects 15 different patterns:
    - doji, hammer, shooting_star
    - engulfing_bullish, engulfing_bearish
    - morning_star, evening_star
    - three_white_soldiers, three_black_crows
    - harami, piercing_line, dark_cloud_cover
    - tweezer_top, tweezer_bottom, marubozu
    """
    
    PATTERN_NAMES = [
        'doji', 'hammer', 'shooting_star',
        'engulfing_bullish', 'engulfing_bearish',
        'morning_star', 'evening_star',
        'three_white_soldiers', 'three_black_crows',
        'harami', 'piercing_line', 'dark_cloud_cover',
        'tweezer_top', 'tweezer_bottom', 'marubozu'
    ]
    
    def __init__(self, sequence_length: int = 20, num_patterns: int = 15):
        """
        Initialize the Pattern CNN.
        
        Args:
            sequence_length: Length of input OHLCV sequences
            num_patterns: Number of patterns to detect
        """
        BaseMLModel.__init__(self, model_name="PatternCNN")
        nn.Module.__init__(self)
        
        self.sequence_length = sequence_length
        self.num_patterns = num_patterns
        
        # Conv1d layers expect (batch, channels, sequence)
        # Input: (batch, sequence_length, 5) -> need to transpose
        
        # First convolutional block
        self.conv1 = nn.Conv1d(in_channels=5, out_channels=32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(32)
        self.pool1 = nn.MaxPool1d(kernel_size=2)
        
        # Second convolutional block
        self.conv2 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm1d(64)
        self.pool2 = nn.MaxPool1d(kernel_size=2)
        
        # Third convolutional block
        self.conv3 = nn.Conv1d(in_channels=64, out_channels=128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm1d(128)
        self.pool3 = nn.MaxPool1d(kernel_size=2)
        
        # Calculate flattened size after convolutions
        # sequence_length -> pool1 -> pool2 -> pool3
        # 20 -> 10 -> 5 -> 2
        self.flat_size = 128 * (sequence_length // 8)
        
        # Fully connected layers
        self.fc1 = nn.Linear(self.flat_size, 256)
        self.dropout1 = nn.Dropout(0.5)
        self.fc2 = nn.Linear(256, 128)
        self.dropout2 = nn.Dropout(0.3)
        self.fc3 = nn.Linear(128, num_patterns)
        
        # Activation functions
        self.relu = nn.ReLU()
        self.sigmoid = nn.Sigmoid()
        
        # Device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.to(self.device)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass through the network.
        
        Args:
            x: Input tensor of shape (batch, sequence_length, 5)
        
        Returns:
            Output tensor of shape (batch, num_patterns) with pattern probabilities
        """
        # Transpose to (batch, channels, sequence)
        x = x.transpose(1, 2)
        
        # First conv block
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.pool1(x)
        
        # Second conv block
        x = self.conv2(x)
        x = self.bn2(x)
        x = self.relu(x)
        x = self.pool2(x)
        
        # Third conv block
        x = self.conv3(x)
        x = self.bn3(x)
        x = self.relu(x)
        x = self.pool3(x)
        
        # Flatten
        x = x.view(x.size(0), -1)
        
        # Fully connected layers
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout1(x)
        
        x = self.fc2(x)
        x = self.relu(x)
        x = self.dropout2(x)
        
        x = self.fc3(x)
        x = self.sigmoid(x)  # Multi-label classification
        
        return x
    
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> Dict[str, float]:
        """
        Train the model.
        
        Args:
            X: Training sequences of shape (num_samples, sequence_length, 5)
            y: Training labels of shape (num_samples, num_patterns)
            **kwargs: Additional training parameters (epochs, batch_size, lr)
        
        Returns:
            Dictionary of training metrics
        """
        epochs = kwargs.get('epochs', 50)
        batch_size = kwargs.get('batch_size', 32)
        learning_rate = kwargs.get('lr', 0.001)
        
        # Convert to tensors
        X_tensor = torch.FloatTensor(X).to(self.device)
        y_tensor = torch.FloatTensor(y).to(self.device)
        
        # Create data loader
        dataset = torch.utils.data.TensorDataset(X_tensor, y_tensor)
        loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        # Loss and optimizer
        criterion = nn.BCELoss()
        optimizer = torch.optim.Adam(self.parameters(), lr=learning_rate)
        
        # Training loop
        self.train_mode = True
        for epoch in range(epochs):
            total_loss = 0
            for batch_X, batch_y in loader:
                optimizer.zero_grad()
                outputs = self.forward(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            
            avg_loss = total_loss / len(loader)
            if (epoch + 1) % 10 == 0:
                logger.info(f"Epoch [{epoch+1}/{epochs}], Loss: {avg_loss:.4f}")
        
        self.is_trained = True
        self.metrics = {'final_loss': avg_loss}
        
        return self.metrics
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make predictions.
        
        Args:
            X: Input sequences of shape (num_samples, sequence_length, 5)
        
        Returns:
            Pattern probabilities of shape (num_samples, num_patterns)
        """
        self.eval()
        with torch.no_grad():
            X_tensor = torch.FloatTensor(X).to(self.device)
            outputs = self.forward(X_tensor)
            return outputs.cpu().numpy()
    
    def predict_patterns(self, ohlcv_sequence: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
        """
        Predict patterns from an OHLCV sequence.
        
        Args:
            ohlcv_sequence: OHLCV array of shape (sequence_length, 5)
            threshold: Confidence threshold for pattern detection
        
        Returns:
            Dictionary mapping pattern names to confidence scores
        """
        # Normalize sequence
        normalized = self._normalize_sequence(ohlcv_sequence)
        
        # Add batch dimension
        X = np.expand_dims(normalized, axis=0)
        
        # Predict
        probabilities = self.predict(X)[0]
        
        # Filter by threshold and create dictionary
        patterns = {}
        for i, prob in enumerate(probabilities):
            if prob >= threshold:
                patterns[self.PATTERN_NAMES[i]] = float(prob)
        
        return patterns
    
    def _normalize_sequence(self, ohlcv: np.ndarray) -> np.ndarray:
        """
        Normalize OHLCV sequence to [0, 1] range.
        
        Args:
            ohlcv: OHLCV array of shape (sequence_length, 5)
        
        Returns:
            Normalized OHLCV array
        """
        return normalize_ohlcv(ohlcv)
    
    def get_model_state(self) -> Any:
        """Get model state for serialization."""
        return {
            'state_dict': self.state_dict(),
            'sequence_length': self.sequence_length,
            'num_patterns': self.num_patterns
        }
    
    def set_model_state(self, state: Any) -> None:
        """Set model state from deserialization."""
        self.sequence_length = state['sequence_length']
        self.num_patterns = state['num_patterns']
        self.load_state_dict(state['state_dict'])
    
    def save(self, path: str) -> None:
        """Save the model to disk."""
        try:
            save_path = Path(path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            
            torch.save({
                'model_state_dict': self.state_dict(),
                'sequence_length': self.sequence_length,
                'num_patterns': self.num_patterns,
                'is_trained': self.is_trained,
                'metrics': self.metrics
            }, save_path)
            
            logger.info(f"Model saved to {path}")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
            raise
    
    def load(self, path: str) -> None:
        """Load the model from disk."""
        try:
            checkpoint = torch.load(path, map_location=self.device)
            
            self.sequence_length = checkpoint['sequence_length']
            self.num_patterns = checkpoint['num_patterns']
            self.load_state_dict(checkpoint['model_state_dict'])
            self.is_trained = checkpoint['is_trained']
            self.metrics = checkpoint['metrics']
            
            logger.info(f"Model loaded from {path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
