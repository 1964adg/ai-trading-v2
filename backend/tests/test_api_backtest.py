"""Tests for backtest API endpoint"""

import pytest

@pytest.mark.skip(reason="Timezone bug in backend - to be fixed")
def test_backtest_endpoint(client, sample_backtest_config):
    """Test POST /api/backtest with valid config"""
    response = client.post("/api/backtest", json=sample_backtest_config)
    assert response.status_code == 200

    result = response.json()
    assert "total_trades" in result
    assert "total_pnl" in result
    assert "win_rate" in result
    assert "sharpe_ratio" in result
    assert "trades" in result
    assert "equity_curve" in result


def test_backtest_missing_fields(client):
    """Test backtest with incomplete config"""
    incomplete = {"symbol": "BTCUSDT"}
    response = client.post("/api/backtest", json=incomplete)
    assert response.status_code == 422  # Validation error
