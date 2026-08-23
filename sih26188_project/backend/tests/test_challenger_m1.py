"""
SIH26188 — Challenger M1 Integration Alignment Test Suite
Empirical verification of:
1. Route compatibility: POST /api/v1/inspect (Android alias) & POST /api/v1/scan/inspect
2. Schema & field exactness: GET /api/v1/health matching Kotlin HealthResponse
3. Android SsbApiService multipart parameters (document_image, live_photo, checkpoint_id, transit_date)
4. Kotlin InspectionResponse data model compatibility
5. Adversarial edge cases, boundary conditions, fuzzing, and stress test
"""

import io
import json
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client

def make_valid_jpeg(size=400):
    """Generate minimal valid JFIF-compliant JPEG bytes."""
    header = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
    trailer = b"\xff\xd9"
    pad = b"\x00" * max(0, size - len(header) - len(trailer))
    return header + pad + trailer

def make_valid_png(size=400):
    """Generate minimal valid PNG bytes."""
    header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    iend = b"\x00\x00\x00\x00IEND\xaeB`\x82"
    pad = b"\x00" * max(0, size - len(header) - len(iend))
    return header + pad + iend

# ==============================================================================
# SECTION 1: Health Telemetry Exact Type & Field Verification
# ==============================================================================

def test_health_v1_schema_against_kotlin_model(client):
    """
    Verifies every field in GET /api/v1/health strictly matches Kotlin HealthResponse:
    - status: String
    - engine_mode: String
    - models_loaded: ModelsLoadedMap (pp_ocrv4, adaface, minifasnet, trufor, doctamper, stamp_verifier)
    - uptime_seconds: Double
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    
    data = response.json()
    
    # 1. Top-level keys
    assert "status" in data, "Missing 'status' key"
    assert isinstance(data["status"], str), f"'status' should be str, got {type(data['status'])}"
    assert data["status"] in ("healthy", "ok", "degraded"), f"Unexpected status value: {data['status']}"
    
    assert "engine_mode" in data, "Missing 'engine_mode' key"
    assert isinstance(data["engine_mode"], str), f"'engine_mode' should be str, got {type(data['engine_mode'])}"
    
    assert "uptime_seconds" in data, "Missing 'uptime_seconds' key"
    assert isinstance(data["uptime_seconds"], (int, float)), f"'uptime_seconds' should be numeric, got {type(data['uptime_seconds'])}"
    assert data["uptime_seconds"] >= 0.0
    
    assert "models_loaded" in data, "Missing 'models_loaded' key"
    assert isinstance(data["models_loaded"], dict), f"'models_loaded' should be dict, got {type(data['models_loaded'])}"
    
    # 2. Kotlin ModelsLoadedMap fields
    kotlin_required_models = [
        "pp_ocrv4",
        "adaface",
        "minifasnet",
        "trufor",
        "doctamper",
        "stamp_verifier",
    ]
    for key in kotlin_required_models:
        assert key in data["models_loaded"], f"Missing required Kotlin ModelsLoadedMap key: '{key}'"
        assert isinstance(data["models_loaded"][key], bool), f"models_loaded['{key}'] should be bool, got {type(data['models_loaded'][key])}"

# ==============================================================================
# SECTION 2: Master Inspection Android SsbApiService Compatibility
# ==============================================================================

def test_inspect_android_exact_multipart_payload(client):
    """
    Tests POST /api/v1/inspect with exact parts matching Android SsbApiService:
    - document_image: MultipartBody.Part (JPEG)
    - live_photo: MultipartBody.Part (JPEG)
    - checkpoint_id: RequestBody ("SSB_SONAULI_01")
    - transit_date: RequestBody ("2026-08-23T12:00:00Z")
    """
    doc_jpeg = make_valid_jpeg(500)
    live_jpeg = make_valid_jpeg(500)
    
    files = {
        "document_image": ("document.jpg", io.BytesIO(doc_jpeg), "image/jpeg"),
        "live_photo": ("live_selfie.jpg", io.BytesIO(live_jpeg), "image/jpeg"),
    }
    data = {
        "checkpoint_id": "SSB_SONAULI_01",
        "transit_date": "2026-08-23T12:00:00Z",
    }
    
    response = client.post("/api/v1/inspect", files=files, data=data)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    body = response.json()
    assert body["status"] == "completed"
    assert "session_id" in body and isinstance(body["session_id"], str)
    assert "assessment" in body and isinstance(body["assessment"], dict)
    assert "details" in body and isinstance(body["details"], dict)

def test_inspect_field_by_field_against_kotlin_inspection_models(client):
    """
    Strict validation of every field in DocumentInspectResponse against Kotlin InspectionResponse,
    Assessment, InspectionDetails, OcrDetails, MrzDetails, BiometricsDetails, LivenessDetails,
    ForensicsDetails, StampDetails, CrossValidationDetails, and RiskDetails.
    """
    doc_jpeg = make_valid_jpeg(500)
    files = {
        "document_image": ("id_card.jpg", io.BytesIO(doc_jpeg), "image/jpeg"),
    }
    data = {
        "checkpoint_id": "SSB_RAXAUL_02",
        "transit_date": "2026-08-23T15:30:00Z",
    }
    
    response = client.post("/api/v1/inspect", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    
    # Check top-level
    assert isinstance(res["session_id"], str)
    assert isinstance(res["status"], str)
    
    # Check Assessment (Kotlin: Assessment)
    assessment = res["assessment"]
    assert isinstance(assessment["risk_score"], (int, float))
    assert 0.0 <= assessment["risk_score"] <= 100.0
    assert assessment["risk_level"] in ("GREEN", "AMBER", "RED")
    assert isinstance(assessment["auto_clear"], bool)
    assert isinstance(assessment["tripwire_triggered"], bool)
    assert isinstance(assessment["tripwire_codes"], list)
    assert isinstance(assessment["reasons"], list)
    assert isinstance(assessment["cross_validation_violations"], list)
    assert isinstance(assessment["model_versions"], dict)
    assert isinstance(assessment["processing_time_ms"], (int, float))
    assert isinstance(assessment["audit_hash"], str) and len(assessment["audit_hash"]) == 64
    
    # Check Details (Kotlin: InspectionDetails)
    details = res["details"]
    assert isinstance(details["session_id"], str)
    assert isinstance(details["document_type"], str)
    assert isinstance(details["processing_time_ms"], (int, float))
    
    # OCR (Kotlin: OcrDetails)
    ocr = details["ocr"]
    assert isinstance(ocr["status"], str)
    assert isinstance(ocr["script_detected"], str)
    assert isinstance(ocr["fields"], dict)
    assert isinstance(ocr["field_confidences"], dict)
    assert isinstance(ocr["mean_confidence"], (int, float))
    assert isinstance(ocr["requires_tier2_vlm"], bool)
    assert isinstance(ocr["raw_text"], str)
    assert isinstance(ocr["processing_time_ms"], (int, float))
    
    # MRZ (Kotlin: MrzDetails)
    mrz = details["mrz"]
    assert isinstance(mrz["mrz_detected"], bool)
    assert isinstance(mrz["valid"], bool)
    assert isinstance(mrz["raw_lines"], list)
    assert isinstance(mrz["checksum_failures"], list)
    assert isinstance(mrz["parsed_fields"], dict)
    assert isinstance(mrz["processing_time_ms"], (int, float))
    
    # Forensics (Kotlin: ForensicsDetails)
    forensics = details["forensics"]
    assert isinstance(forensics["tamper_score"], (int, float))
    assert isinstance(forensics["is_tampered"], bool)
    assert isinstance(forensics["photo_region_tampered"], bool)
    assert isinstance(forensics["reasons"], list)
    assert isinstance(forensics["detected_anomalies"], list)
    assert isinstance(forensics["tampered_regions"], list)
    assert isinstance(forensics["doctamper_score"], (int, float))
    assert isinstance(forensics["trufor_score"], (int, float))
    assert isinstance(forensics["exif_suspicious"], bool)
    assert isinstance(forensics["dqt_quantization_altered"], bool)
    assert isinstance(forensics["processing_time_ms"], (int, float))
    
    # Stamp (Kotlin: StampDetails)
    stamp = details["stamp"]
    assert stamp is not None
    assert isinstance(stamp["stamp_found"], bool)
    assert isinstance(stamp["stamp_score"], (int, float))
    assert isinstance(stamp["verdict"], str)
    assert isinstance(stamp["reasons"], list)
    assert isinstance(stamp["processing_time_ms"], (int, float))
    
    # Cross Validation (Kotlin: CrossValidationDetails)
    cv = details["cross_validation"]
    assert isinstance(cv["cross_validation_passed"], bool)
    assert isinstance(cv["violation_count"], int)
    assert isinstance(cv["critical_violations"], list)
    assert isinstance(cv["warnings"], list)
    assert isinstance(cv["flags"], list)
    assert isinstance(cv["rules_checked"], int)
    assert isinstance(cv["processing_time_ms"], (int, float))
    
    # Risk (Kotlin: RiskDetails)
    risk = details["risk"]
    assert risk is not None
    assert isinstance(risk["risk_score"], (int, float))
    assert isinstance(risk["risk_level"], str)
    assert isinstance(risk["auto_clear"], bool)
    assert isinstance(risk["tripwire_triggered"], bool)
    assert isinstance(risk["tripwire_codes"], list)
    assert isinstance(risk["reasons"], list)
    assert isinstance(risk["cross_validation_violations"], list)

# ==============================================================================
# SECTION 3: Edge Cases, Omissions & Unusual String Ingestion
# ==============================================================================

def test_edge_case_optional_parts_omitted(client):
    """Only document_image provided (no live_photo, no checkpoint_id, no transit_date)."""
    doc_jpeg = make_valid_jpeg(450)
    files = {"document_image": ("doc_only.jpg", io.BytesIO(doc_jpeg), "image/jpeg")}
    
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "completed"
    # When live_photo is omitted, biometrics and liveness are None
    assert res["details"]["biometrics"] is None
    assert res["details"]["liveness"] is None

def test_edge_case_png_document_format(client):
    """Accept PNG format for document_image."""
    doc_png = make_valid_png(600)
    files = {"document_image": ("passport.png", io.BytesIO(doc_png), "image/png")}
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 200
    assert response.json()["status"] == "completed"

def test_edge_case_unusual_checkpoint_strings(client):
    """Test unusual and extreme string values for checkpoint_id."""
    unusual_checkpoints = [
        "",  # Empty string
        " ",  # Whitespace
        "SSB-SPECIAL-CHARS_!@#$%^&*()",  # Special characters
        "A" * 500,  # Long string
        "काठमांडू-रक्सौल-01",  # Devanagari unicode
        "' OR '1'='1",  # SQL injection syntax
        "<script>alert(1)</script>",  # XSS syntax
    ]
    doc_jpeg = make_valid_jpeg(400)
    for cp in unusual_checkpoints:
        files = {"document_image": ("doc.jpg", io.BytesIO(doc_jpeg), "image/jpeg")}
        data = {"checkpoint_id": cp}
        response = client.post("/api/v1/inspect", files=files, data=data)
        assert response.status_code == 200, f"Failed on checkpoint_id={cp!r} with status {response.status_code}"

def test_edge_case_unusual_transit_date_strings(client):
    """Test unusual string values for transit_date."""
    unusual_dates = [
        "",  # Empty
        "2026-08-23",  # YYYY-MM-DD
        "2026-08-23T18:51:01.123456+05:30",  # ISO with subseconds and timezone
        "9999-12-31T23:59:59Z",  # Far future
        "1900-01-01T00:00:00Z",  # Far past
        "INVALID_DATE_FORMAT_STRING",  # Corrupted string
    ]
    doc_jpeg = make_valid_jpeg(400)
    for td in unusual_dates:
        files = {"document_image": ("doc.jpg", io.BytesIO(doc_jpeg), "image/jpeg")}
        data = {"transit_date": td}
        response = client.post("/api/v1/inspect", files=files, data=data)
        assert response.status_code == 200, f"Failed on transit_date={td!r}"

def test_edge_case_both_desktop_and_android_parameters_supplied(client):
    """Test behavior when both Android (live_photo) and Desktop (live_face_image) parameters are supplied."""
    doc_jpeg = make_valid_jpeg(400)
    live_jpeg1 = make_valid_jpeg(400)
    live_jpeg2 = make_valid_jpeg(400)
    
    files = {
        "document_image": ("doc.jpg", io.BytesIO(doc_jpeg), "image/jpeg"),
        "live_face_image": ("selfie1.jpg", io.BytesIO(live_jpeg1), "image/jpeg"),
        "live_photo": ("selfie2.jpg", io.BytesIO(live_jpeg2), "image/jpeg"),
    }
    data = {
        "checkpoint_id": "SSB_SONAULI_01",
        "declared_checkpost": "SSB_JAIGAON_01",
        "transit_date": "2026-08-23T12:00:00Z",
        "declared_transit_date": "2026-08-23T14:00:00Z",
    }
    response = client.post("/api/v1/inspect", files=files, data=data)
    assert response.status_code == 200
    assert response.json()["status"] == "completed"

# ==============================================================================
# SECTION 4: Adversarial Stress & Error Handling
# ==============================================================================

def test_adversarial_missing_document_returns_422(client):
    """Missing document_image must return 422 Unprocessable Entity."""
    response = client.post("/api/v1/inspect", files={})
    assert response.status_code == 422

def test_adversarial_invalid_document_mime_type(client):
    """Uploading text or pdf as document_image must return 400 Bad Request."""
    files = {
        "document_image": ("payload.pdf", io.BytesIO(b"%PDF-1.4 mock data" + b"\x00"*200), "application/pdf"),
    }
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 400
    assert "Invalid document image file type" in response.json()["detail"]

def test_adversarial_invalid_live_photo_mime_type(client):
    """Uploading executable or text as live_photo must return 400 Bad Request."""
    doc_jpeg = make_valid_jpeg(400)
    files = {
        "document_image": ("doc.jpg", io.BytesIO(doc_jpeg), "image/jpeg"),
        "live_photo": ("malicious.exe", io.BytesIO(b"MZ\x90\x00" + b"\x00"*200), "application/x-dosexec"),
    }
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 400
    assert "Invalid live face image file type" in response.json()["detail"]

def test_adversarial_corrupted_tiny_document_payload(client):
    """Payload smaller than 100 bytes must return 400 Bad Request."""
    files = {
        "document_image": ("tiny.jpg", io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00"*20), "image/jpeg"),
    }
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 400
    assert "payload is empty or corrupted" in response.json()["detail"]

def test_adversarial_corrupted_tiny_live_photo_payload(client):
    """Live photo payload smaller than 100 bytes must return 400 Bad Request."""
    doc_jpeg = make_valid_jpeg(400)
    files = {
        "document_image": ("doc.jpg", io.BytesIO(doc_jpeg), "image/jpeg"),
        "live_photo": ("tiny_selfie.jpg", io.BytesIO(b"\xff\xd8\xff\xe0" + b"\x00"*10), "image/jpeg"),
    }
    response = client.post("/api/v1/inspect", files=files)
    assert response.status_code == 400
    assert "Live face image payload is empty or corrupted" in response.json()["detail"]

def test_stress_concurrency_and_session_isolation(client):
    """Run 15 consecutive requests to verify session isolation and unique audit hashes."""
    doc_jpeg = make_valid_jpeg(400)
    session_ids = set()
    audit_hashes = set()
    
    for i in range(15):
        files = {
            "document_image": (f"doc_{i}.jpg", io.BytesIO(doc_jpeg), "image/jpeg"),
        }
        data = {
            "checkpoint_id": f"SSB_CHECKPOINT_{i}",
        }
        res = client.post("/api/v1/inspect", files=files, data=data)
        assert res.status_code == 200
        body = res.json()
        
        sid = body["session_id"]
        ah = body["assessment"]["audit_hash"]
        
        assert sid not in session_ids, f"Duplicate session_id: {sid}"
        assert ah not in audit_hashes, f"Duplicate audit_hash: {ah}"
        session_ids.add(sid)
        audit_hashes.add(ah)

