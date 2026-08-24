"""
SIH26188 — Unit & Integration Tests for Neural Model Diagnostics Router
Architecture Reference: Sections 1.4, 3.2, 5.2
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_get_models_status(client):
    res = client.get("/api/v1/models/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["total_models"] == 10
    assert "models" in data
    assert len(data["models"]) == 10
    
    # Verify model fields
    first_model = data["models"][0]
    assert "id" in first_model
    assert "name" in first_model
    assert "status" in first_model
    assert "latency_ms" in first_model
    assert "architecture" in first_model

def test_start_specific_model(client):
    res = client.post("/api/v1/models/insightface_scrfd/start")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["model_id"] == "insightface_scrfd"
    assert data["connection_state"] == "ONLINE"

def test_test_specific_model(client):
    res = client.post("/api/v1/models/verhoeff_checksum/test")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "PASS" in data["test_verdict"]
    assert "benchmark_latency_ms" in data

def test_start_all_models(client):
    res = client.post("/api/v1/models/start-all")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["all_online"] is True
    assert data["total_connected"] == 10
