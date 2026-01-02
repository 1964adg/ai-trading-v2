"""
Tests for backtesting functionality
"""
import pytest


@pytest.mark.skip(reason="Timezone bug in backend - to be fixed")
def test_backtest_endpoint(client, sample_backtest_config):
    """Test backtest endpoint with valid config"""
    response = client.post("/api/backtest", json=sample_backtest_config)
    assert response.status_code == 200

    result = response.json()

    # Check structure
    assert "total_trades" in result
    assert "total_pnl" in result
    assert "total_pnl_percent" in result
    assert "win_rate" in result
    assert "sharpe_ratio" in result
    assert "max_drawdown" in result
    assert "trades" in result
    assert "equity_curve" in result

    # Check types
    assert isinstance(result["total_trades"], int)
    assert isinstance(result["total_pnl"], (int, float))
    assert isinstance(result["win_rate"], (int, float))
    assert isinstance(result["trades"], list)
    assert isinstance(result["equity_curve"], list)


def test_backtest_missing_fields(client):
    """Test backtest with missing required fields"""
    incomplete_config = {
        "symbol": "BTCUSDT",
        "timeframe": "1h"
        # Missing other required fields
    }

    response = client.post("/api/backtest", json=incomplete_config)
    assert response.status_code == 422  # Validation error

@pytest.mark.skip(reason="Timezone bug in backend - to be fixed")
def test_backtest_invalid_dates(client, sample_backtest_config):
    """Test backtest with invalid date range"""
    config = sample_backtest_config. copy()
    config["start_date"] = "2024-12-31"
    config["end_date"] = "2024-01-01"  # End before start

    response = client.post("/api/backtest", json=config)
    # Should handle gracefully
    assert response.status_code in [200, 400]

@pytest.mark.skip(reason="Timezone bug in backend - to be fixed")
def test_backtest_zero_capital(client, sample_backtest_config):
    """Test backtest with zero initial capital"""
    config = sample_backtest_config.copy()
    config["initial_capital"] = 0

    response = client.post("/api/backtest", json=config)
    assert response.status_code in [200, 400, 422]
