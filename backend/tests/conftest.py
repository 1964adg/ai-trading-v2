"""Pytest configuration and fixtures"""
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Test client for API calls"""
    return TestClient(app)


@pytest.fixture
def sample_backtest_config():
    """Sample backtest configuration"""
    return {
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "strategy": "ma_cross",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "initial_capital": 10000,
        "position_size_pct": 2.0,
        "fast_period": 9,
        "slow_period":  21,
        "stop_loss_pct": 2.0,
        "take_profit_pct": 4.0
    }
