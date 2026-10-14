"""Unit test for health check endpoint and database initialization."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "python_version" in data
    assert "ffmpeg_available" in data
    assert "ollama_available" in data


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "FotoOwl" in data["service"]
