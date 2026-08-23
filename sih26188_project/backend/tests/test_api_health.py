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
    """Verify /api/v1/health satisfies Android/Tauri client contract exactly."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "engine_mode" in data
    assert isinstance(data["engine_mode"], str)
    assert "models_loaded" in data
    assert isinstance(data["models_loaded"], dict)
    
    # Contract validation: simplified keys required by Android ModelsLoadedMap
    required_keys = ["pp_ocrv4", "adaface", "minifasnet", "trufor", "doctamper", "stamp_verifier"]
    for key in required_keys:
        assert key in data["models_loaded"], f"Missing required model key: {key}"
        assert isinstance(data["models_loaded"][key], bool)
    
    assert "uptime_seconds" in data
    assert isinstance(data["uptime_seconds"], (int, float))
    assert data["uptime_seconds"] >= 0


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


# -----------------------------------------------------------------------------
# POST /api/v1/inspect (Android & Mobile Backward-Compatible Alias Route)
# -----------------------------------------------------------------------------

def test_alias_inspect_endpoint_valid_image(client):
    """Verify POST /api/v1/inspect returns expected DocumentInspectResponse structure."""
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
    files = {
        "document_image": ("passport.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
    }
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert "session_id" in data
    assert "assessment" in data
    assert "details" in data
    assert len(data["assessment"]["audit_hash"]) == 64


def test_alias_inspect_endpoint_android_client_payload(client):
    """Verify POST /api/v1/inspect supports Android parameter names: live_photo, checkpoint_id, transit_date."""
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
    files = {
        "document_image": ("doc.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
        "live_photo": ("selfie.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
    }
    data = {
        "checkpoint_id": "SSB_SONAULI_01",
        "transit_date": "2026-08-23T12:00:00Z",
    }
    response = client.post("/api/v1/inspect", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "completed"
    assert "session_id" in res
    assert res["assessment"]["risk_level"] in ("GREEN", "AMBER", "RED")


def test_alias_inspect_endpoint_desktop_client_payload(client):
    """Verify POST /api/v1/inspect supports Desktop parameter names: live_face_image, declared_checkpost, declared_transit_date."""
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
    files = {
        "document_image": ("doc.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
        "live_face_image": ("selfie.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
    }
    data = {
        "declared_checkpost": "SSB_JAIGAON_01",
        "declared_transit_date": "2026-08-23T12:00:00Z",
    }
    response = client.post("/api/v1/inspect", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "completed"
    assert "session_id" in res


def test_alias_inspect_endpoint_invalid_file_type(client):
    """Verify POST /api/v1/inspect rejects non-image files."""
    files = {
        "document_image": ("bad.txt", io.BytesIO(b"plain text document"), "text/plain"),
    }
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 400
    assert "Invalid document image file type" in response.json()["detail"]


def test_alias_inspect_endpoint_invalid_live_photo_type(client):
    """Verify POST /api/v1/inspect rejects non-image live_photo uploads."""
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
    files = {
        "document_image": ("doc.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
        "live_photo": ("selfie.pdf", io.BytesIO(b"%PDF-1.4 mock invalid file"), "application/pdf"),
    }
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 400
    assert "Invalid live face image file type" in response.json()["detail"]


def test_alias_inspect_endpoint_missing_document_returns_422(client):
    """Verify POST /api/v1/inspect returns 422 when required document_image is missing."""
    response = client.post("/api/v1/inspect", files={})
    assert response.status_code == 422


# -----------------------------------------------------------------------------
# GET /api/v1/devices (Device Tracker Telemetry & Observability)
# -----------------------------------------------------------------------------

def test_devices_endpoint(client):
    """Verify /api/v1/devices returns connected screening devices and tracking state."""
    # Issue a request to record activity
    client.get("/api/v1/health", headers={"User-Agent": "SSB-Field-Android/3.0.0", "X-Checkpoint-Id": "SSB_RANI_01"})
    
    response = client.get("/api/v1/devices")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "total_devices" in data
    assert "devices" in data
    assert isinstance(data["devices"], list)
    assert len(data["devices"]) >= 1
    
    dev = data["devices"][0]
    assert "client_ip" in dev
    assert "last_seen" in dev
    assert "total_requests" in dev
    assert dev["total_requests"] >= 1
    assert "status" in dev
    assert dev["status"] == "ONLINE"


