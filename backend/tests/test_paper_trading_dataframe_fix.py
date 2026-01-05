"""Integration test for paper trading API with DataFrame fixes."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pandas as pd


def test_paper_trading_order_with_dataframe_fix():
    """Test that paper trading order endpoint handles DataFrame properly."""
    from main import app
    client = TestClient(app)
    
    # Mock binance_service to return a valid DataFrame
    mock_klines = pd.DataFrame({
        'timestamp': ['2024-01-01T00:00:00'],
        'open': [50000.0],
        'high': [50100.0],
        'low': [49900.0],
        'close': [50050.0],
        'volume': [100.0]
    })
    
    with patch('api.paper_trading.binance_service.get_klines_data', return_value=mock_klines):
        response = client.post(
            "/api/paper/order",
            json={
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0.001
            }
        )
        
        # Should succeed without DataFrame truth value error
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orderId" in data
        assert data["symbol"] == "BTCUSDT"


def test_paper_trading_order_with_empty_dataframe():
    """Test that paper trading handles empty DataFrame properly."""
    from main import app
    client = TestClient(app)
    
    # Mock binance_service to return empty DataFrame
    empty_df = pd.DataFrame()
    
    with patch('api.paper_trading.binance_service.get_klines_data', return_value=empty_df):
        response = client.post(
            "/api/paper/order",
            json={
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0.001
            }
        )
        
        # Should return 503 (service unavailable) because no price data
        assert response.status_code == 503
        assert "Unable to fetch market price" in response.json()["detail"]


def test_paper_trading_order_with_none_dataframe():
    """Test that paper trading handles None DataFrame properly."""
    from main import app
    client = TestClient(app)
    
    # Mock binance_service to return None
    with patch('api.paper_trading.binance_service.get_klines_data', return_value=None):
        response = client.post(
            "/api/paper/order",
            json={
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0.001
            }
        )
        
        # Should return 503 (service unavailable) because no price data
        assert response.status_code == 503
        assert "Unable to fetch market price" in response.json()["detail"]


def test_paper_trading_positions_with_dataframe():
    """Test that get positions endpoint handles DataFrame properly."""
    from main import app
    client = TestClient(app)
    
    # Mock binance_service to return valid DataFrame
    mock_klines = pd.DataFrame({
        'timestamp': ['2024-01-01T00:00:00'],
        'close': [50050.0],
        'open': [50000.0],
        'high': [50100.0],
        'low': [49900.0],
        'volume': [100.0]
    })
    
    with patch('api.paper_trading.binance_service.get_klines_data', return_value=mock_klines):
        response = client.get("/api/paper/positions")
        
        # Should succeed without DataFrame truth value error
        assert response.status_code == 200
        data = response.json()
        assert "positions" in data
        assert isinstance(data["positions"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--no-cov"])
