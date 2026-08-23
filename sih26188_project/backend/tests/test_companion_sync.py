import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_companion_sync_lifecycle():
    # 1. Clear state
    res_clear = client.post("/api/v1/companion/clear")
    assert res_clear.status_code == 200

    # 2. Get latest when empty
    res_latest_empty = client.get("/api/v1/companion/latest")
    assert res_latest_empty.status_code == 200
    data = res_latest_empty.json()
    assert data["has_capture"] is False

    # 3. Upload companion capture
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00")
    files = {"file": ("traveler_face.jpg", fake_img, "image/jpeg")}
    data_payload = {
        "capture_type": "selfie",
        "device_id": "phone-unit-alpha",
        "checkpoint_id": "WB-JAI-01"
    }

    res_upload = client.post("/api/v1/companion/upload", files=files, data=data_payload)
    assert res_upload.status_code == 200
    upload_json = res_upload.json()
    assert upload_json["status"] == "success"
    assert upload_json["sequence_id"] >= 1

    # 4. Fetch latest on desktop
    res_latest = client.get("/api/v1/companion/latest")
    assert res_latest.status_code == 200
    latest_data = res_latest.json()
    assert latest_data["has_capture"] is True
    assert latest_data["capture_type"] == "selfie"
    assert latest_data["device_id"] == "phone-unit-alpha"
    assert latest_data["image_data"].startswith("data:image/jpeg;base64,")

    # 5. Clear again
    client.post("/api/v1/companion/clear")
    res_after_clear = client.get("/api/v1/companion/latest")
    assert res_after_clear.json()["has_capture"] is False
