"""Tests for health endpoints"""

def test_health_check(client):
    """Test /health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_endpoint(client):
    """Test root / endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "online"
    assert data["version"] == "2.0.0"
    assert data["realtime"] is True
