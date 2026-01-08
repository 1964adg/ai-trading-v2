"""Tests for orderbook recording endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)


@pytest.fixture
def mock_recorder():
    """Mock orderbook recorder service."""
    with patch("api.market.orderbook_recorder") as mock:
        yield mock


def test_start_orderbook_recording(mock_recorder):
    """Test starting orderbook recording."""
    mock_recorder.start_recording.return_value = {
        "success": True,
        "message": "Recording started for BTCEUR",
        "status": "recording",
    }

    response = client.post("/api/rec/start?symbol=BTCEUR")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "recording"
    mock_recorder.start_recording.assert_called_once_with(symbol="BTCEUR")


def test_start_orderbook_recording_already_active(mock_recorder):
    """Test starting orderbook recording when already active."""
    mock_recorder.start_recording.return_value = {
        "success": False,
        "message": "Already recording for BTCEUR",
        "status": "recording",
    }

    response = client.post("/api/rec/start?symbol=BTCEUR")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_stop_orderbook_recording(mock_recorder):
    """Test stopping orderbook recording."""
    mock_recorder.stop_recording.return_value = {
        "success": True,
        "message": "Recording stopped",
        "status": "stopped",
    }

    response = client.post("/api/rec/stop")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "stopped"
    mock_recorder.stop_recording.assert_called_once()


def test_stop_orderbook_recording_not_active(mock_recorder):
    """Test stopping orderbook recording when not active."""
    mock_recorder.stop_recording.return_value = {
        "success": False,
        "message": "Not currently recording",
        "status": "stopped",
    }

    response = client.post("/api/rec/stop")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_get_orderbook_recording_status(mock_recorder):
    """Test getting orderbook recording status."""
    mock_recorder.get_status.return_value = {
        "is_recording": True,
        "symbol": "BTCEUR",
        "status": "recording",
        "error_count": 0,
        "interval_ms": 500,
    }

    response = client.get("/api/rec/status")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["is_recording"] is True
    assert data["symbol"] == "BTCEUR"
    assert data["interval_ms"] == 500
    mock_recorder.get_status.assert_called_once()


def test_get_orderbook_recording_status_stopped(mock_recorder):
    """Test getting orderbook recording status when stopped."""
    mock_recorder.get_status.return_value = {
        "is_recording": False,
        "symbol": None,
        "status": "stopped",
        "error_count": 0,
        "interval_ms": 500,
    }

    response = client.get("/api/rec/status")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["is_recording"] is False
    assert data["status"] == "stopped"
