"""Data preprocessing utilities for ML models."""

import numpy as np
import pandas as pd
from typing import Tuple, Optional, List
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import logging

logger = logging.getLogger(__name__)


class DataPreprocessor:
    """Handles data cleaning, scaling, and preparation for ML models."""
    
    def __init__(self):
        """Initialize the data preprocessor."""
        self.scaler = StandardScaler()
        self.min_max_scaler = MinMaxScaler()
        self.is_fitted = False
    
    def clean_data(
        self, 
        data: pd.DataFrame, 
        remove_nan: bool = True,
        remove_inf: bool = True,
        fill_method: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Clean data by handling NaN and infinite values.
        
        Args:
            data: Input dataframe
            remove_nan: Remove rows with NaN values
            remove_inf: Remove rows with infinite values
            fill_method: Method to fill NaN ('forward', 'backward', 'mean', 'zero')
        
        Returns:
            Cleaned dataframe
        """
        df = data.copy()
        
        # Handle infinite values
        if remove_inf:
            df = df.replace([np.inf, -np.inf], np.nan)
        
        # Handle NaN values
        if fill_method:
            if fill_method == 'forward':
                df = df.fillna(method='ffill')
            elif fill_method == 'backward':
                df = df.fillna(method='bfill')
            elif fill_method == 'mean':
                df = df.fillna(df.mean())
            elif fill_method == 'zero':
                df = df.fillna(0)
        elif remove_nan:
            initial_len = len(df)
            df = df.dropna()
            if len(df) < initial_len:
                logger.warning(f"Removed {initial_len - len(df)} rows with NaN values")
        
        return df
    
    def remove_outliers(
        self, 
        data: pd.DataFrame, 
        columns: Optional[List[str]] = None,
        n_std: float = 3.0
    ) -> pd.DataFrame:
        """
        Remove outliers using z-score method.
        
        Args:
            data: Input dataframe
            columns: Columns to check for outliers (None = all numeric)
            n_std: Number of standard deviations for outlier threshold
        
        Returns:
            Dataframe with outliers removed
        """
        df = data.copy()
        
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns.tolist()
        
        for col in columns:
            if col in df.columns:
                mean = df[col].mean()
                std = df[col].std()
                df = df[abs(df[col] - mean) <= n_std * std]
        
        return df
    
    def scale_features(
        self, 
        data: np.ndarray, 
        method: str = 'standard',
        fit: bool = True
    ) -> np.ndarray:
        """
        Scale features using StandardScaler or MinMaxScaler.
        
        Args:
            data: Input data array
            method: Scaling method ('standard' or 'minmax')
            fit: Whether to fit the scaler (True for training, False for inference)
        
        Returns:
            Scaled data array
        """
        scaler = self.scaler if method == 'standard' else self.min_max_scaler
        
        if fit:
            scaled_data = scaler.fit_transform(data)
            self.is_fitted = True
        else:
            if not self.is_fitted:
                logger.warning("Scaler not fitted, fitting now...")
                scaled_data = scaler.fit_transform(data)
                self.is_fitted = True
            else:
                scaled_data = scaler.transform(data)
        
        return scaled_data
    
    def create_sequences(
        self, 
        data: np.ndarray, 
        sequence_length: int,
        step: int = 1
    ) -> np.ndarray:
        """
        Create sequences for time series modeling.
        
        Args:
            data: Input data array
            sequence_length: Length of each sequence
            step: Step size between sequences
        
        Returns:
            Array of sequences with shape (num_sequences, sequence_length, features)
        """
        sequences = []
        for i in range(0, len(data) - sequence_length + 1, step):
            sequences.append(data[i:i + sequence_length])
        
        return np.array(sequences)
    
    def train_test_split(
        self, 
        X: np.ndarray, 
        y: np.ndarray,
        train_size: float = 0.8,
        shuffle: bool = False
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Split data into training and testing sets.
        
        Args:
            X: Features array
            y: Target array
            train_size: Proportion of data for training
            shuffle: Whether to shuffle data before splitting
        
        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        if shuffle:
            indices = np.random.permutation(len(X))
            X = X[indices]
            y = y[indices]
        
        split_idx = int(len(X) * train_size)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        return X_train, X_test, y_train, y_test
    
    def augment_data(
        self, 
        data: np.ndarray, 
        noise_level: float = 0.01
    ) -> np.ndarray:
        """
        Augment data by adding small random noise.
        
        Args:
            data: Input data array
            noise_level: Standard deviation of Gaussian noise
        
        Returns:
            Augmented data array
        """
        noise = np.random.normal(0, noise_level, data.shape)
        return data + noise


def normalize_ohlcv(ohlcv: np.ndarray) -> np.ndarray:
    """
    Normalize OHLCV data to [0, 1] range.
    
    Args:
        ohlcv: OHLCV array with shape (sequence_length, 5)
    
    Returns:
        Normalized OHLCV array
    """
    ohlcv_normalized = ohlcv.copy()
    
    # Find min and max for normalization
    min_val = ohlcv[:, [1, 2, 3]].min()  # Low values
    max_val = ohlcv[:, [0, 1, 2]].max()  # High values
    
    # Normalize price columns (OHLC)
    ohlcv_normalized[:, :4] = (ohlcv[:, :4] - min_val) / (max_val - min_val + 1e-8)
    
    # Normalize volume separately
    if ohlcv.shape[1] > 4:
        volume_max = ohlcv[:, 4].max()
        if volume_max > 0:
            ohlcv_normalized[:, 4] = ohlcv[:, 4] / volume_max
    
    return ohlcv_normalized
