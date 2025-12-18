"""Tests for klines endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)


@pytest.fixture
def mock_klines_data():
    """Mock klines data response."""
    return [
        {
            "timestamp": 1700000000000,
            "open": 50000.0,
            "high": 51000.0,
            "low": 49000.0,
            "close": 50500.0,
            "volume": 123.45
        },
        {
            "timestamp": 1700000060000,
            "open": 50500.0,
            "high": 51500.0,
            "low": 50000.0,
            "close": 51000.0,
            "volume": 234.56
        }
    ]


@patch('services.binance_service.binance_service.get_klines_data')
def test_get_klines_path_params(mock_get_klines, mock_klines_data):
    """Test klines endpoint with path parameters."""
    mock_get_klines.return_value = mock_klines_data
    
    response = client.get("/api/klines/BTCEUR/1m?limit=100")
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    assert data["data"][0]["open"] == 50000.0
    mock_get_klines.assert_called_once_with(symbol="BTCEUR", interval="1m", limit=100)


@patch('services.binance_service.binance_service.get_klines_data')
def test_get_klines_query_params(mock_get_klines, mock_klines_data):
    """Test klines endpoint with query parameters."""
    mock_get_klines.return_value = mock_klines_data
    
    response = client.get("/api/klines?symbol=BTCEUR&timeframe=1m&limit=100")
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2
    assert data["data"][0]["open"] == 50000.0
    mock_get_klines.assert_called_once_with(symbol="BTCEUR", interval="1m", limit=100)


@patch('services.binance_service.binance_service.get_klines_data')
def test_get_klines_query_params_default_limit(mock_get_klines, mock_klines_data):
    """Test klines endpoint with query parameters using default limit."""
    mock_get_klines.return_value = mock_klines_data
    
    response = client.get("/api/klines?symbol=ETHEUR&timeframe=5m")
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    mock_get_klines.assert_called_once_with(symbol="ETHEUR", interval="5m", limit=100)


@patch('services.binance_service.binance_service.get_klines_data')
def test_get_klines_path_params_default_limit(mock_get_klines, mock_klines_data):
    """Test klines endpoint with path parameters using default limit."""
    mock_get_klines.return_value = mock_klines_data
    
    response = client.get("/api/klines/ETHEUR/5m")
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    mock_get_klines.assert_called_once_with(symbol="ETHEUR", interval="5m", limit=500)


@patch('services.binance_service.binance_service.get_klines_data')
def test_get_klines_symbol_case_insensitive(mock_get_klines, mock_klines_data):
    """Test that symbol is converted to uppercase."""
    mock_get_klines.return_value = mock_klines_data
    
    # Test path params
    response = client.get("/api/klines/btceur/1m")
    assert response.status_code == 200
    mock_get_klines.assert_called_with(symbol="BTCEUR", interval="1m", limit=500)
    
    mock_get_klines.reset_mock()
    
    # Test query params
    response = client.get("/api/klines?symbol=btceur&timeframe=1m")
    assert response.status_code == 200
    mock_get_klines.assert_called_with(symbol="BTCEUR", interval="1m", limit=100)


def test_get_klines_query_params_missing_required():
    """Test klines endpoint with missing required query parameters."""
    # Missing symbol
    response = client.get("/api/klines?timeframe=1m&limit=100")
    assert response.status_code == 422
    
    # Missing timeframe
    response = client.get("/api/klines?symbol=BTCEUR&limit=100")
    assert response.status_code == 422
