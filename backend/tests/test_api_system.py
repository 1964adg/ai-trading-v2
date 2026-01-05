import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_system_info_endpoint():
    """Test /api/system/info endpoint"""
    response = client.get("/api/system/info")
    assert response.status_code == 200

    data = response.json()

    # Check required fields
    assert "server" in data
    assert "trading" in data
    assert "database" in data
    assert "ml_features" in data
    assert "data_source" in data
    assert "configuration" in data

    # Check server info
    assert data["server"]["version"] == "2.0.0"
    assert data["server"]["port"] == 8000
    assert data["server"]["environment"] == "development"

    # Check trading info
    assert data["trading"]["mode"] == "paper"
    assert data["trading"]["live_trading"] is False
    assert data["trading"]["realtime_enabled"] is True

    # Check database info
    assert data["database"]["status"] in ["connected", "disconnected", "error"]
    assert data["database"]["type"] in ["PostgreSQL", "In-Memory"]

    # Check ML features
    assert isinstance(data["ml_features"]["technical_analysis"], bool)
    assert isinstance(data["ml_features"]["pytorch_available"], bool)

    # Check data source
    assert "Binance" in data["data_source"]["provider"]
    assert data["data_source"]["type"] == "real-time"

    # Check configuration
    assert isinstance(data["configuration"]["cors_origins"], list)
    assert len(data["configuration"]["cors_origins"]) > 0
