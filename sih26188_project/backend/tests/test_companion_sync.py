"""
SIH26188 — Comprehensive Companion Camera Sync Test Suite
Validates real-time Android Companion Camera synchronization:
- Multipart file upload (JPEG, PNG, WebP, GIF, custom field names)
- JSON and Base64 Data URI upload payloads
- Monotonic sequence_id increments and polling lifecycle
- Ephemeral buffer clearing and sequence retention
- Error handling and boundary conditions (empty files, corrupted base64, invalid JSON)
- Thread-safety, concurrency stress, and lock integrity
- In-transit frame buffer ring history
"""

import base64
import concurrent.futures
import io
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.routers.companion import companion_store, CompanionStore, CompanionCaptureState
from app.api.v1.endpoints.companion import (
    companion_store as v1_companion_store,
    router as v1_companion_router,
)
from app.api.v1.api import api_router

client = TestClient(app)

# Standard mock image payloads
SAMPLE_JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
SAMPLE_PNG_BYTES = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"


@pytest.fixture(autouse=True)
def reset_companion_state():
    """Ensure clean companion store state before and after each test."""
    companion_store.reset(hard=True)
    yield
    companion_store.reset(hard=True)


# ============================================================================
# 1. LIFECYCLE & POLLING SEQUENCE INCREMENTS
# ============================================================================

def test_companion_sync_lifecycle():
    """Validates complete capture -> poll -> sequence increment -> clear lifecycle."""
    # 1. Verify initial clean state
    res_initial = client.get("/api/v1/companion/latest")
    assert res_initial.status_code == 200
    assert res_initial.json()["has_capture"] is False
    assert res_initial.json()["sequence_id"] == 0

    # 2. Upload first capture
    files = {"file": ("traveler_face.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")}
    data = {
        "capture_type": "selfie",
        "device_id": "phone-unit-alpha",
        "checkpoint_id": "WB-JAI-01",
    }
    res_upload1 = client.post("/api/v1/companion/upload", files=files, data=data)
    assert res_upload1.status_code == 200
    upload1_json = res_upload1.json()
    assert upload1_json["status"] == "success"
    assert upload1_json["sequence_id"] == 1
    assert upload1_json["capture_type"] == "selfie"
    assert upload1_json["device_id"] == "phone-unit-alpha"
    assert upload1_json["checkpoint_id"] == "WB-JAI-01"

    # 3. Poll latest on desktop terminal
    res_latest1 = client.get("/api/v1/companion/latest")
    assert res_latest1.status_code == 200
    latest1_json = res_latest1.json()
    assert latest1_json["has_capture"] is True
    assert latest1_json["sequence_id"] == 1
    assert latest1_json["capture_type"] == "selfie"
    assert latest1_json["device_id"] == "phone-unit-alpha"
    assert latest1_json["checkpoint_id"] == "WB-JAI-01"
    assert latest1_json["image_data"].startswith("data:image/jpeg;base64,")

    # 4. Upload second capture (document mode) -> sequence increments to 2
    files2 = {"file": ("traveler_doc.png", io.BytesIO(SAMPLE_PNG_BYTES), "image/png")}
    data2 = {
        "capture_type": "document",
        "device_id": "phone-unit-beta",
        "checkpoint_id": "SSB-SONAULI-01",
    }
    res_upload2 = client.post("/api/v1/companion/upload", files=files2, data=data2)
    assert res_upload2.status_code == 200
    assert res_upload2.json()["sequence_id"] == 2

    # 5. Verify polling returns updated sequence 2
    res_latest2 = client.get("/api/v1/companion/latest")
    assert res_latest2.json()["sequence_id"] == 2
    assert res_latest2.json()["capture_type"] == "document"
    assert res_latest2.json()["device_id"] == "phone-unit-beta"
    assert res_latest2.json()["image_data"].startswith("data:image/png;base64,")

    # 6. Clear buffer
    res_clear = client.post("/api/v1/companion/clear")
    assert res_clear.status_code == 200
    assert res_clear.json()["status"] == "cleared"

    # 7. Verify cleared state retains monotonic sequence_id (2) but has_capture is False
    res_after_clear = client.get("/api/v1/companion/latest")
    after_clear_json = res_after_clear.json()
    assert after_clear_json["has_capture"] is False
    assert after_clear_json["image_data"] is None
    assert after_clear_json["sequence_id"] == 2

    # 8. Upload after clear increments sequence to 3
    res_upload3 = client.post(
        "/api/v1/companion/upload",
        files={"file": ("re_capture.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")},
    )
    assert res_upload3.status_code == 200
    assert res_upload3.json()["sequence_id"] == 3


# ============================================================================
# 2. MULTIPART & FORM-DATA UPLOAD VARIATIONS
# ============================================================================

def test_multipart_png_and_jpeg_mime_detection():
    """Validates proper MIME type detection for PNG and JPEG image buffers."""
    # Test PNG
    res_png = client.post(
        "/api/v1/companion/upload",
        files={"file": ("doc.png", io.BytesIO(SAMPLE_PNG_BYTES), "image/png")},
    )
    assert res_png.status_code == 200
    latest_png = client.get("/api/v1/companion/latest").json()
    assert latest_png["image_data"].startswith("data:image/png;base64,")

    # Test JPEG
    res_jpeg = client.post(
        "/api/v1/companion/upload",
        files={"file": ("photo.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")},
    )
    assert res_jpeg.status_code == 200
    latest_jpeg = client.get("/api/v1/companion/latest").json()
    assert latest_jpeg["image_data"].startswith("data:image/jpeg;base64,")


def test_multipart_alternative_form_keys():
    """Validates upload when file is passed under 'image', 'live_photo', or 'document_image'."""
    # 'image' key
    res1 = client.post(
        "/api/v1/companion/upload",
        files={"image": ("face.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")},
        data={"capture_type": "selfie", "device_id": "cam-1"},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "success"

    # 'live_photo' key
    res2 = client.post(
        "/api/v1/companion/upload",
        files={"live_photo": ("live.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")},
        data={"capture_type": "selfie", "device_id": "cam-2"},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "success"


def test_form_data_with_base64_string():
    """Validates uploading a base64 string via form-data fields."""
    b64_str = base64.b64encode(SAMPLE_JPEG_BYTES).decode("utf-8")
    res = client.post(
        "/api/v1/companion/upload",
        data={
            "image_base64": b64_str,
            "capture_type": "selfie",
            "device_id": "form-b64-unit",
            "checkpoint_id": "WB-01",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    assert res.json()["device_id"] == "form-b64-unit"

    latest = client.get("/api/v1/companion/latest").json()
    assert latest["has_capture"] is True
    assert latest["image_data"].startswith("data:image/jpeg;base64,")


# ============================================================================
# 3. JSON AND BASE64 PAYLOAD UPLOADS
# ============================================================================

def test_json_upload_raw_base64():
    """Validates uploading JSON payload with raw base64 string."""
    b64_str = base64.b64encode(SAMPLE_JPEG_BYTES).decode("utf-8")
    payload = {
        "image_base64": b64_str,
        "capture_type": "selfie",
        "device_id": "json-field-unit",
        "checkpoint_id": "WB-JAI-02",
        "filename": "traveler.jpg",
    }
    res = client.post("/api/v1/companion/upload", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    assert res.json()["device_id"] == "json-field-unit"

    latest = client.get("/api/v1/companion/latest").json()
    assert latest["has_capture"] is True
    assert latest["checkpoint_id"] == "WB-JAI-02"
    assert latest["image_data"].startswith("data:image/jpeg;base64,")


def test_json_upload_data_uri():
    """Validates uploading JSON payload with Data URI format."""
    b64_str = base64.b64encode(SAMPLE_PNG_BYTES).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64_str}"
    payload = {
        "image_data": data_uri,
        "capture_type": "document",
        "device_id": "tablet-unit-3",
        "checkpoint_id": "SSB-RPA-01",
    }
    res = client.post("/api/v1/companion/upload", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    assert res.json()["capture_type"] == "document"

    latest = client.get("/api/v1/companion/latest").json()
    assert latest["has_capture"] is True
    assert latest["image_data"] == data_uri


def test_json_upload_unpadded_base64():
    """Validates uploading base64 string with missing padding."""
    b64_str = base64.b64encode(SAMPLE_JPEG_BYTES).decode("utf-8").rstrip("=")
    payload = {"image_base64": b64_str, "capture_type": "selfie"}
    res = client.post("/api/v1/companion/upload", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"


# ============================================================================
# 4. ERROR HANDLING & BOUNDARY CONDITIONS
# ============================================================================

def test_upload_empty_file_fails():
    """Validates rejection of 0-byte file upload."""
    files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
    res = client.post("/api/v1/companion/upload", files=files)
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_upload_empty_json_fails():
    """Validates rejection of empty JSON body."""
    res = client.post("/api/v1/companion/upload", json={})
    assert res.status_code == 400
    assert "missing or empty" in res.json()["detail"].lower()


def test_upload_invalid_base64_fails():
    """Validates rejection of corrupt base64 data."""
    payload = {"image_base64": "!!!not_valid_base64_data@@@###", "capture_type": "selfie"}
    res = client.post("/api/v1/companion/upload", json=payload)
    assert res.status_code == 400
    assert "invalid base64" in res.json()["detail"].lower()


def test_upload_empty_base64_string_fails():
    """Validates rejection of empty string in image_base64."""
    payload = {"image_base64": "   ", "capture_type": "selfie"}
    res = client.post("/api/v1/companion/upload", json=payload)
    assert res.status_code == 400


def test_upload_malformed_data_uri_fails():
    """Validates rejection of malformed Data URI with no comma."""
    payload = {"image_data": "data:image/jpeg;base64", "capture_type": "selfie"}
    res = client.post("/api/v1/companion/upload", json=payload)
    assert res.status_code == 400
    assert "invalid data uri" in res.json()["detail"].lower()


def test_upload_no_content_fails():
    """Validates rejection when no body or file is supplied."""
    res = client.post("/api/v1/companion/upload")
    assert res.status_code == 400


# ============================================================================
# 5. THREAD-SAFETY & CONCURRENCY
# ============================================================================

def test_concurrency_monotonic_sequence_ids():
    """
    Spawns 30 concurrent threads uploading images simultaneously.
    Verifies that all sequence IDs are strictly unique, monotonic, and lock-protected.
    """
    thread_count = 30
    results = []

    def perform_upload(thread_idx: int):
        b64 = base64.b64encode(SAMPLE_JPEG_BYTES).decode("utf-8")
        res = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": b64,
                "capture_type": "selfie",
                "device_id": f"unit-{thread_idx}",
                "checkpoint_id": "WB-CONC",
            },
        )
        return res.json()["sequence_id"]

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(perform_upload, i) for i in range(thread_count)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    assert len(results) == thread_count
    # All sequence IDs must be unique integers from 1 to thread_count
    assert set(results) == set(range(1, thread_count + 1))

    # Final latest sequence_id must be exactly thread_count
    latest = client.get("/api/v1/companion/latest").json()
    assert latest["sequence_id"] == thread_count
    assert latest["has_capture"] is True


def test_concurrency_mixed_operations():
    """
    Executes mixed concurrent uploads, reads, and clears without crashing or deadlock.
    """
    def worker_upload(idx: int):
        b64 = base64.b64encode(SAMPLE_PNG_BYTES).decode("utf-8")
        client.post(
            "/api/v1/companion/upload",
            json={"image_base64": b64, "device_id": f"worker-{idx}"},
        )

    def worker_read():
        client.get("/api/v1/companion/latest")

    def worker_clear():
        client.post("/api/v1/companion/clear")

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
        futures = []
        for i in range(15):
            futures.append(executor.submit(worker_upload, i))
            futures.append(executor.submit(worker_read))
            if i % 3 == 0:
                futures.append(executor.submit(worker_clear))
        
        for f in concurrent.futures.as_completed(futures):
            f.result()  # Ensure no exceptions raised


# ============================================================================
# 6. IN-TRANSIT FRAME BUFFER & STORE UNIT TESTS
# ============================================================================

def test_companion_store_frame_buffer_history():
    """Validates that CompanionStore records recent captures in its frame ring buffer."""
    store = CompanionStore(max_buffer_size=5)

    for i in range(7):
        store.set_capture(
            capture_type="selfie" if i % 2 == 0 else "document",
            image_bytes=SAMPLE_JPEG_BYTES,
            filename=f"frame_{i}.jpg",
            device_id=f"device_{i}",
        )

    # Buffer capped at max_buffer_size=5
    assert store.get_buffer_size() == 5
    buffer_items = store.get_buffer()
    assert len(buffer_items) == 5
    # Sequence IDs should be 3, 4, 5, 6, 7
    assert [item.sequence_id for item in buffer_items] == [3, 4, 5, 6, 7]
    assert store.get_latest().sequence_id == 7

    # Test buffer slice
    last_two = store.get_buffer(limit=2)
    assert len(last_two) == 2
    assert [item.sequence_id for item in last_two] == [6, 7]


def test_companion_store_mime_type_detection():
    """Tests static MIME detection logic across multiple header signatures."""
    assert CompanionStore._detect_mime_type(b"\xff\xd8\xff\x00", "any.dat") == "image/jpeg"
    assert CompanionStore._detect_mime_type(b"\x89PNG\r\n\x1a\n\x00", "any.dat") == "image/png"
    assert CompanionStore._detect_mime_type(b"RIFF\x00\x00\x00\x00WEBP", "any.dat") == "image/webp"
    assert CompanionStore._detect_mime_type(b"GIF87a...", "any.dat") == "image/gif"
    assert CompanionStore._detect_mime_type(b"GIF89a...", "any.dat") == "image/gif"
    assert CompanionStore._detect_mime_type(b"unknown_bytes", "photo.png") == "image/png"
    assert CompanionStore._detect_mime_type(b"unknown_bytes", "doc.webp") == "image/webp"
    assert CompanionStore._detect_mime_type(b"unknown_bytes", "pic.gif") == "image/gif"
    assert CompanionStore._detect_mime_type(b"unknown_bytes", "default.dat") == "image/jpeg"


def test_companion_v1_module_exports():
    """Verifies that API v1 package exports and router registration are intact."""
    assert v1_companion_store is not None
    assert v1_companion_router is not None
    assert api_router is not None
    # Check routes are registered in v1_companion_router
    companion_paths = [route.path for route in v1_companion_router.routes if hasattr(route, "path")]
    assert "/upload" in companion_paths or "/api/v1/companion/upload" in companion_paths
    assert "/latest" in companion_paths or "/api/v1/companion/latest" in companion_paths
    assert "/clear" in companion_paths or "/api/v1/companion/clear" in companion_paths


def test_companion_info_endpoint():
    """Validates /api/v1/companion/info returns network info, gateway URLs, and device count."""
    res = client.get("/api/v1/companion/info")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "primary_ip" in data
    assert "local_ips" in data
    assert isinstance(data["local_ips"], list)
    assert data["port"] == 8000
    assert "gateway_url" in data
    assert "emulator_url" in data
    assert "adb_command" in data
    assert "active_devices_count" in data


def test_companion_simulate_endpoint():
    """Validates /api/v1/companion/simulate uploads simulated field capture and triggers sequence increment."""
    res = client.post(
        "/api/v1/companion/simulate",
        json={"capture_type": "document", "device_id": "Sim-Pixel", "checkpoint_id": "WB-JAI-01"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["capture_type"] == "document"
    assert data["sequence_id"] >= 1

    latest = client.get("/api/v1/companion/latest").json()
    assert latest["has_capture"] is True
    assert latest["capture_type"] == "document"

