# -*- coding: utf-8 -*-
"""DataFrame utility functions for safe DataFrame operations."""

import pandas as pd
from typing import Optional


def is_dataframe_valid(df) -> bool:
    """
    Check if DataFrame is valid and not empty.
    
    Args:
        df: DataFrame to check (can be None, DataFrame, or dict)
        
    Returns:
        True if DataFrame is valid and not empty, False otherwise
    """
    if df is None:
        return False
    
    # Handle dict (from cache)
    if isinstance(df, dict):
        # Check if dict has data
        if not df:
            return False
        # Check if any list in dict has data
        return any(len(v) > 0 for v in df.values() if isinstance(v, list))
    
    # Handle DataFrame
    if isinstance(df, pd.DataFrame):
        return not df.empty
    
    return False


def get_latest_price(df, price_column: str = 'close') -> Optional[float]:
    """
    Safely extract latest price from DataFrame.
    
    Args:
        df: DataFrame or dict containing price data
        price_column: Name of the price column (default: 'close')
        
    Returns:
        Latest price as float, or None if data is invalid
    """
    if not is_dataframe_valid(df):
        return None
    
    try:
        # Handle dict (from cache)
        if isinstance(df, dict):
            if price_column in df and len(df[price_column]) > 0:
                return float(df[price_column][-1])
            return None
        
        # Handle DataFrame
        if isinstance(df, pd.DataFrame):
            if price_column not in df.columns:
                return None
            return float(df[price_column].iloc[-1])
        
        return None
    except (KeyError, IndexError, ValueError, TypeError):
        return None


def dataframe_to_dict_safe(df) -> Optional[list]:
    """
    Safely convert DataFrame to list of dicts (records format), handling edge cases.
    
    Args:
        df: DataFrame to convert
        
    Returns:
        List of dicts with 'records' format, or None if invalid
    """
    if not is_dataframe_valid(df):
        return None
    
    try:
        if isinstance(df, dict):
            # Already a dict, return as-is
            return df
        
        if isinstance(df, pd.DataFrame):
            return df.to_dict('records')
        
        return None
    except Exception:
        return None
