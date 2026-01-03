import pandas as pd
import numpy as np
from typing import Dict, Any

def calculate_rsi(prices:  np.ndarray, period: int = 14) -> dict:
    """
    Calculate RSI (Relative Strength Index)

    Args:
        prices: Array of closing prices
        period: RSI period (default 14)

    Returns:
        dict with current_rsi, signal, and condition
    """
    if len(prices) < period + 1:
        return {
            "current_rsi":  None,
            "signal": "NEUTRAL",
            "condition":  "Insufficient data for RSI calculation"
        }

    # Convert to pandas Series for easier calculation
    prices_series = pd.Series(prices)

    # Calculate price changes
    delta = prices_series.diff()

    # Separate gains and losses
    gains = delta.where(delta > 0, 0.0)
    losses = -delta.where(delta < 0, 0.0)

    # Calculate average gains and losses
    avg_gain = gains.rolling(window=period, min_periods=period).mean()
    avg_loss = losses.rolling(window=period, min_periods=period).mean()

    # Calculate RS and RSI
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    # Get current RSI (last value)
    current_rsi = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None

    if current_rsi is None:
        return {
            "current_rsi": None,
            "signal": "NEUTRAL",
            "condition": "Unable to calculate RSI"
        }

    # Generate signal
    if current_rsi < 30:
        signal = "BUY"
        condition = f"RSI is oversold ({current_rsi:.2f} < 30)"
    elif current_rsi > 70:
        signal = "SELL"
        condition = f"RSI is overbought ({current_rsi:.2f} > 70)"
    else:
        signal = "NEUTRAL"
        condition = f"RSI is neutral ({current_rsi:.2f} in 30-70 range)"

    return {
        "current_rsi": round(current_rsi, 2),
        "signal": signal,
        "condition": condition
    }

def calculate_macd(prices: np.ndarray, fast: int = 12, slow:  int = 26, signal: int = 9) -> dict:
    """
    Calculate MACD (Moving Average Convergence Divergence)

    Args:
        prices: Array of closing prices
        fast: Fast EMA period (default 12)
        slow: Slow EMA period (default 26)
        signal: Signal line period (default 9)

    Returns:
        dict with macd, signal_line, histogram, signal, and condition
    """
    if len(prices) < slow + signal:
        return {
            "macd": None,
            "signal_line": None,
            "histogram": None,
            "signal": "NEUTRAL",
            "condition": "Insufficient data for MACD calculation"
        }

    # Convert to pandas Series
    prices_series = pd.Series(prices)

    # Calculate EMAs
    ema_fast = prices_series.ewm(span=fast, adjust=False).mean()
    ema_slow = prices_series.ewm(span=slow, adjust=False).mean()

    # Calculate MACD line
    macd_line = ema_fast - ema_slow

    # Calculate signal line
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()

    # Calculate histogram
    histogram = macd_line - signal_line

    # Get current values
    current_macd = float(macd_line.iloc[-1])
    current_signal = float(signal_line.iloc[-1])
    current_histogram = float(histogram.iloc[-1])

    # Check for crossover (need at least 2 values)
    if len(histogram) < 2:
        signal_direction = "NEUTRAL"
        condition = "Insufficient data for signal"
    else:
        prev_histogram = float(histogram.iloc[-2])

        if prev_histogram <= 0 and current_histogram > 0:
            signal_direction = "BUY"
            condition = "MACD crossed above signal line (bullish crossover)"
        elif prev_histogram >= 0 and current_histogram < 0:
            signal_direction = "SELL"
            condition = "MACD crossed below signal line (bearish crossover)"
        elif current_histogram > 0:
            signal_direction = "NEUTRAL"
            condition = "MACD above signal line (bullish momentum)"
        else:
            signal_direction = "NEUTRAL"
            condition = "MACD below signal line (bearish momentum)"

    return {
        "macd": round(current_macd, 2),
        "signal_line":  round(current_signal, 2),
        "histogram": round(current_histogram, 2),
        "signal": signal_direction,
        "condition": condition
    }


def calculate_bollinger_bands(prices:  np.ndarray, period: int = 20, std_dev:  float = 2.0) -> dict:
    """
    Calculate Bollinger Bands

    Args:
        prices: Array of closing prices
        period: Moving average period (default 20)
        std_dev: Standard deviation multiplier (default 2.0)

    Returns:
        dict with upper, middle, lower, current_price, signal, and condition
    """
    if len(prices) < period:
        return {
            "upper": None,
            "middle":  None,
            "lower": None,
            "current_price":  None,
            "signal": "NEUTRAL",
            "condition":  "Insufficient data for Bollinger Bands calculation"
        }

    # Convert to pandas Series
    prices_series = pd.Series(prices)

    # Calculate middle band (SMA)
    middle_band = prices_series.rolling(window=period).mean()

    # Calculate standard deviation
    std = prices_series.rolling(window=period).std()

    # Calculate upper and lower bands
    upper_band = middle_band + (std_dev * std)
    lower_band = middle_band - (std_dev * std)

    # Get current values
    current_price = float(prices_series.iloc[-1])
    current_upper = float(upper_band.iloc[-1])
    current_middle = float(middle_band.iloc[-1])
    current_lower = float(lower_band.iloc[-1])

    # Calculate bandwidth (for squeeze detection)
    bandwidth = ((current_upper - current_lower) / current_middle) * 100

    # Generate signal
    if current_price < current_lower:
        signal = "BUY"
        condition = f"Price below lower band (oversold, {current_price:.2f} < {current_lower:.2f})"
    elif current_price > current_upper:
        signal = "SELL"
        condition = f"Price above upper band (overbought, {current_price:.2f} > {current_upper:.2f})"
    elif bandwidth < 5:
        signal = "NEUTRAL"
        condition = f"Bollinger Bands squeezing (low volatility, bandwidth {bandwidth:.2f}%)"
    else:
        signal = "NEUTRAL"
        condition = f"Price within bands (neutral, {current_lower:.2f} < {current_price:.2f} < {current_upper:.2f})"

    return {
        "upper": round(current_upper, 2),
        "middle": round(current_middle, 2),
        "lower": round(current_lower, 2),
        "current_price": round(current_price, 2),
        "bandwidth": round(bandwidth, 2),
        "signal": signal,
        "condition": condition
    }


def get_rsi_signal(rsi_value: float) -> dict:
    """
    Get RSI signal interpretation

    Args:
        rsi_value: Current RSI value (0-100)

    Returns:
        Dict with signal type and description
    """
    if pd.isna(rsi_value):
        return {'signal': 'neutral', 'description': 'Insufficient data'}

    if rsi_value >= 70:
        return {
            'signal': 'overbought',
            'description':  'Overbought - Potential reversal down',
            'color': 'red'
        }
    elif rsi_value <= 30:
        return {
            'signal':  'oversold',
            'description': 'Oversold - Potential reversal up',
            'color': 'green'
        }
    elif rsi_value >= 60:
        return {
            'signal': 'bullish',
            'description': 'Strong uptrend',
            'color':  'green'
        }
    elif rsi_value <= 40:
        return {
            'signal': 'bearish',
            'description': 'Weak downtrend',
            'color': 'red'
        }
    else:
        return {
            'signal': 'neutral',
            'description': 'Neutral zone',
            'color': 'gray'
        }
