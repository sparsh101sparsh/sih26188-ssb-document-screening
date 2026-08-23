"""
SIH26188 — FastAPI Health & Ingestion API Test Suite
Verifies /health, /api/v1/health, and /api/v1/scan/inspect contracts.
"""

import io
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    """Verify /health returns 200 OK with expected structure and telemetry."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "models_loaded" in data
    assert "models_total" in data
    assert "hardware" in data
    assert "platform" in data["hardware"]
    assert "onnx_providers" in data["hardware"]
    assert "timestamp" in data
    assert data["uptime_seconds"] >= 0


def test_api_v1_health_endpoint(client):
    """Verify /api/v1/health satisfies Android/Tauri client contract."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "engine_mode" in data
    assert "models_loaded" in data
    assert isinstance(data["models_loaded"], dict)
    assert "stamp_verifier" in data["models_loaded"]


def test_scan_inspect_endpoint_valid_image(client):
    """Verify /api/v1/scan/inspect accepts valid image and returns genuine RiskAssessment."""
    # Create mock 200x200 JPEG image bytes with valid JPEG magic header
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
    
    files = {
        "document_image": ("passport_sample.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
    }
    response = client.post("/api/v1/scan/inspect", files=files)
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "completed"
    assert "session_id" in data
    assert "assessment" in data
    
    assessment = data["assessment"]
    assert assessment["risk_score"] >= 0.0
    assert assessment["risk_level"] in ("GREEN", "AMBER", "RED")
    assert assessment["auto_clear"] is True
    assert assessment["tripwire_triggered"] is False
    assert len(assessment["audit_hash"]) == 64  # Valid SHA-256 hex string
    assert assessment["processing_time_ms"] >= 0.0


def test_scan_inspect_endpoint_with_live_face(client):
    """Verify /api/v1/scan/inspect accepts both document and live selfie uploads."""
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
    
    files = {
        "document_image": ("aadhaar_card.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
        "live_face_image": ("officer_selfie.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
    }
    response = client.post("/api/v1/scan/inspect", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert len(data["assessment"]["audit_hash"]) == 64


def test_scan_inspect_invalid_file_type(client):
    """Verify /api/v1/scan/inspect rejects non-image mime types."""
    files = {
        "document_image": ("payload.txt", io.BytesIO(b"Not an image payload"), "text/plain"),
    }
    response = client.post("/api/v1/scan/inspect", files=files)
    assert response.status_code == 400
    assert "Invalid document image file type" in response.json()["detail"]


def test_scan_inspect_corrupted_payload(client):
    """Verify /api/v1/scan/inspect rejects excessively small payloads (<100 bytes)."""
    files = {
        "document_image": ("empty.jpg", io.BytesIO(b"short"), "image/jpeg"),
    }
    response = client.post("/api/v1/scan/inspect", files=files)
    assert response.status_code == 400
    assert "payload is empty or corrupted" in response.json()["detail"]
