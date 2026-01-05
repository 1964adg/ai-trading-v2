import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_system_info_endpoint():
    """Test /api/system/info endpoint"""
    response = client.get("/api/system/info")
    assert response.status_code == 200

    data = response.json()

    # Verify structure
    assert "server" in data
    assert "trading" in data
    assert "database" in data
    assert "ml_features" in data
    assert "data_source" in data
    assert "configuration" in data

    # Verify server info
    assert data["server"]["version"] == "2.0.0"
    assert data["server"]["port"] == 8000
    assert "started" in data["server"]

    # Verify trading config
    assert data["trading"]["mode"] == "paper"
    assert data["trading"]["live_trading"] is False
    assert data["trading"]["realtime_enabled"] is True

    # Verify database status (should be connected or disconnected)
    assert data["database"]["status"] in ["connected", "disconnected", "error"]
    assert data["database"]["type"] in ["PostgreSQL", "In-Memory"]

    # Verify ML features
    assert "technical_analysis" in data["ml_features"]
    assert "pytorch_available" in data["ml_features"]

    # Verify data source
    assert data["data_source"]["provider"] == "Binance Public API + WebSocket"
    assert data["data_source"]["type"] == "real-time"

    # Verify configuration
    assert isinstance(data["configuration"]["cors_origins"], list)
    assert data["configuration"]["binance_url"] == "https://api.binance.com"


def test_system_info_database_connected():
    """Test system info with database connection"""
    response = client.get("/api/system/info")
    data = response.json()

    # If database is connected, URL should be masked
    if data["database"]["status"] == "connected":
        assert data["database"]["url"] is not None
        assert "***" in data["database"]["url"]
        assert data["database"]["type"] == "PostgreSQL"


def test_system_info_response_time():
    """Test system info endpoint response time"""
    import time

    start = time.time()
    response = client.get("/api/system/info")
    duration = time.time() - start

    assert response.status_code == 200
    assert duration < 1.0  # Should respond in less than 1 second
