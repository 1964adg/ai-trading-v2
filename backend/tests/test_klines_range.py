"""Tests for klines range endpoint and DB-first backtest."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
from main import app

client = TestClient(app)


@pytest.fixture
def mock_db_range_data():
    """Mock DB range query response."""
    return [
        {
            "timestamp": "2024-01-01T00:00:00Z",
            "open": 42000.0,
            "high": 42500.0,
            "low": 41500.0,
            "close": 42200.0,
            "volume": 100.5,
        },
        {
            "timestamp": "2024-01-01T01:00:00Z",
            "open": 42200.0,
            "high": 42800.0,
            "low": 42000.0,
            "close": 42500.0,
            "volume": 150.3,
        },
        {
            "timestamp": "2024-01-01T02:00:00Z",
            "open": 42500.0,
            "high": 43000.0,
            "low": 42400.0,
            "close": 42900.0,
            "volume": 200.7,
        },
    ]


@patch("api.market._fetch_klines_from_db_range")
def test_klines_range_from_db(mock_fetch_range, mock_db_range_data):
    """Test klines range endpoint returns data from DB."""
    mock_fetch_range.return_value = mock_db_range_data

    response = client.get(
        "/api/klines/range?symbol=BTCEUR&timeframe=1h&start=2024-01-01T00:00:00Z&end=2024-01-01T23:59:59Z&limit=1000"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 3
    assert data["data"][0]["timestamp"] == "2024-01-01T00:00:00Z"
    assert data["data"][0]["close"] == 42200.0
    mock_fetch_range.assert_called_once()


@patch("api.market._fetch_klines_from_db_range")
@patch("services.binance_service.binance_service.get_klines_data")
def test_klines_range_fallback_to_binance(
    mock_binance, mock_fetch_range, mock_db_range_data
):
    """Test klines range endpoint falls back to Binance when DB is empty."""
    mock_fetch_range.return_value = []  # Empty DB
    mock_binance.return_value = mock_db_range_data

    response = client.get(
        "/api/klines/range?symbol=BTCEUR&timeframe=1h&start=2024-01-01T00:00:00Z&end=2024-01-01T23:59:59Z"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 3
    mock_fetch_range.assert_called_once()
    mock_binance.assert_called_once()


def test_klines_range_missing_params():
    """Test klines range endpoint with missing parameters."""
    # Missing start
    response = client.get(
        "/api/klines/range?symbol=BTCEUR&timeframe=1h&end=2024-01-01T23:59:59Z"
    )
    assert response.status_code == 422

    # Missing end
    response = client.get(
        "/api/klines/range?symbol=BTCEUR&timeframe=1h&start=2024-01-01T00:00:00Z"
    )
    assert response.status_code == 422


def test_klines_range_invalid_date():
    """Test klines range endpoint with invalid date format."""
    response = client.get(
        "/api/klines/range?symbol=BTCEUR&timeframe=1h&start=invalid-date&end=2024-01-01T23:59:59Z"
    )
    assert response.status_code == 400


@patch("api.market._fetch_klines_from_db_range")
def test_backtest_with_date_range_uses_db(mock_fetch_range, mock_db_range_data):
    """Test backtest endpoint uses DB-first range query when dates provided."""
    # Create more data for backtesting
    extended_data = []
    base_price = 42000.0
    for i in range(100):
        extended_data.append(
            {
                "timestamp": f"2024-01-{1 + i // 24:02d}T{i % 24:02d}:00:00Z",
                "open": base_price + i * 10,
                "high": base_price + i * 10 + 100,
                "low": base_price + i * 10 - 50,
                "close": base_price + i * 10 + 50,
                "volume": 100.0 + i,
            }
        )

    mock_fetch_range.return_value = extended_data

    backtest_config = {
        "symbol": "BTCEUR",
        "timeframe": "1h",
        "strategy": "ma_cross",
        "start_date": "2024-01-01",
        "end_date": "2024-01-05",
        "initial_capital": 10000,
        "position_size_pct": 2.0,
        "fast_period": 9,
        "slow_period": 21,
        "stop_loss_pct": 2.0,
        "take_profit_pct": 4.0,
    }

    response = client.post("/api/backtest", json=backtest_config)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "total_trades" in data
    assert "total_pnl" in data
    mock_fetch_range.assert_called_once()


@patch("api.market._fetch_klines_from_db")
def test_backtest_without_date_range_uses_limit(mock_fetch_limit):
    """Test backtest endpoint uses limit-based query when no dates provided."""
    extended_data = []
    base_price = 42000.0
    for i in range(100):
        extended_data.append(
            {
                "timestamp": f"2024-01-{1 + i // 24:02d}T{i % 24:02d}:00:00Z",
                "open": base_price + i * 10,
                "high": base_price + i * 10 + 100,
                "low": base_price + i * 10 - 50,
                "close": base_price + i * 10 + 50,
                "volume": 100.0 + i,
            }
        )

    mock_fetch_limit.return_value = extended_data

    backtest_config = {
        "symbol": "BTCEUR",
        "timeframe": "1h",
        "strategy": "rsi",
        "initial_capital": 10000,
        "position_size_pct": 2.0,
        "rsi_period": 14,
        "rsi_oversold": 30,
        "rsi_overbought": 70,
        "stop_loss_pct": 2.0,
        "take_profit_pct": 4.0,
    }

    response = client.post("/api/backtest", json=backtest_config)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    mock_fetch_limit.assert_called_once()
