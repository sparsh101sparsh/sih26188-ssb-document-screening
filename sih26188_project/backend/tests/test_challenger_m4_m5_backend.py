"""
Empirical Challenger Test Suite — Milestones M4 & M5 (Backend Verification)
Tests:
- DeviceTracker unit mechanics, concurrency, sorting, and edge cases.
- Middleware request interception, IP resolution (X-Forwarded-For, X-Real-IP), and latency telemetry.
- GET /api/v1/devices schema and behavior under zero and multiple connected devices.
- Module stubs (Qwen-VL Tier-2 and OmniMRZ NotImplementedError exceptions).
- Core config server host default (0.0.0.0).
"""

import asyncio
import io
import time
import pytest
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.device_tracker import DeviceTracker, ConnectedClient, device_tracker
from app.modules.ocr.pp_ocr_engine import PPOCREngine
from app.modules.mrz.mrz_engine import MRZEngine


@pytest.fixture(autouse=True)
def reset_device_tracker():
    """Ensure clean device registry before and after each test."""
    device_tracker.clear()
    yield
    device_tracker.clear()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


# =============================================================================
# 1. DeviceTracker Unit & Stress Mechanics
# =============================================================================

class TestDeviceTrackerMechanics:
    def test_empty_registry(self):
        tracker = DeviceTracker()
        assert tracker.get_all_devices() == []
        assert tracker.get_last_active_device() is None

    def test_single_device_lifecycle(self):
        tracker = DeviceTracker()
        client_info = tracker.record_activity(
            client_ip="192.168.2.45",
            user_agent="SSB-Field-Client/1.0",
            endpoint="/api/v1/inspect",
            checkpoint_id="SSB_SONAULI_01",
            latency_ms=123.456,
        )
        assert client_info.client_ip == "192.168.2.45"
        assert client_info.user_agent == "SSB-Field-Client/1.0"
        assert client_info.checkpoint_id == "SSB_SONAULI_01"
        assert client_info.last_endpoint == "/api/v1/inspect"
        assert client_info.total_requests == 1
        assert client_info.latency_ms == 123.46
        assert client_info.status == "ONLINE"

        # Subsequent activity
        updated = tracker.record_activity(
            client_ip="192.168.2.45",
            endpoint="/api/v1/health",
            latency_ms=15.2,
        )
        assert updated.total_requests == 2
        assert updated.last_endpoint == "/api/v1/health"
        assert updated.latency_ms == 15.2
        assert updated.user_agent == "SSB-Field-Client/1.0"  # preserved

    def test_multiple_devices_sorting_and_last_active(self):
        tracker = DeviceTracker()
        tracker.record_activity("192.168.2.10", checkpoint_id="CP_1")
        time.sleep(0.01)
        tracker.record_activity("192.168.2.20", checkpoint_id="CP_2")
        time.sleep(0.01)
        tracker.record_activity("192.168.2.30", checkpoint_id="CP_3")

        devices = tracker.get_all_devices()
        assert len(devices) == 3
        # Should be sorted newest first: .30, .20, .10
        assert [d.client_ip for d in devices] == ["192.168.2.30", "192.168.2.20", "192.168.2.10"]
        assert tracker.get_last_active_device().client_ip == "192.168.2.30"

        # Update .10 to become the newest
        time.sleep(0.01)
        tracker.record_activity("192.168.2.10")
        assert tracker.get_last_active_device().client_ip == "192.168.2.10"
        assert tracker.get_all_devices()[0].client_ip == "192.168.2.10"

    def test_concurrent_device_records(self):
        """Stress-test thread safety under concurrent requests."""
        tracker = DeviceTracker()
        num_workers = 10
        requests_per_worker = 50

        def worker_task(worker_id):
            ip = f"10.0.0.{worker_id % 4}"  # 4 distinct IPs
            for i in range(requests_per_worker):
                tracker.record_activity(
                    client_ip=ip,
                    user_agent=f"Worker-{worker_id}",
                    endpoint=f"/api/v1/test/{i}",
                    latency_ms=10.0 + i,
                )

        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            list(executor.map(worker_task, range(num_workers)))

        devices = tracker.get_all_devices()
        assert len(devices) == 4
        total_recorded = sum(d.total_requests for d in devices)
        assert total_recorded == num_workers * requests_per_worker


# =============================================================================
# 2. HTTP Middleware & /api/v1/devices Endpoint Integration
# =============================================================================

class TestDevicesEndpointIntegration:
    def test_devices_empty_response(self, client):
        response = client.get("/api/v1/devices")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["total_devices"] == 0
        assert data["devices"] == []
        assert data["last_active_device"] is None

    def test_ip_resolution_x_forwarded_for(self, client):
        headers = {
            "X-Forwarded-For": "192.168.100.55, 10.0.0.1",
            "User-Agent": "Android-Field-App/v2.4",
            "X-Checkpoint-Id": "SSB_RANI_CHECKPOINT",
        }
        res = client.get("/api/v1/health", headers=headers)
        assert res.status_code == 200

        dev_res = client.get("/api/v1/devices")
        assert dev_res.status_code == 200
        data = dev_res.json()
        assert data["total_devices"] == 1
        dev = data["devices"][0]
        assert dev["client_ip"] == "192.168.100.55"
        assert dev["user_agent"] == "Android-Field-App/v2.4"
        assert dev["checkpoint_id"] == "SSB_RANI_CHECKPOINT"
        assert dev["last_endpoint"] == "/api/v1/health"
        assert dev["latency_ms"] is not None
        assert dev["latency_ms"] >= 0.0

    def test_ip_resolution_x_real_ip(self, client):
        headers = {
            "X-Real-IP": "172.16.50.99",
            "User-Agent": "SSB-Field-Tablet/3.1",
        }
        res = client.get("/health", headers=headers)
        assert res.status_code == 200

        dev_res = client.get("/api/v1/devices")
        data = dev_res.json()
        assert data["total_devices"] == 1
        assert data["devices"][0]["client_ip"] == "172.16.50.99"
        assert data["devices"][0]["last_endpoint"] == "/health"

    def test_inspect_alias_activity_tracking(self, client):
        fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
        files = {"document_image": ("doc.jpg", io.BytesIO(fake_jpeg), "image/jpeg")}
        headers = {"X-Real-IP": "192.168.2.100", "X-Checkpoint-Id": "SSB_JAIGAON_01"}
        res = client.post("/api/v1/inspect", files=files, headers=headers)
        assert res.status_code == 200

        dev_res = client.get("/api/v1/devices")
        data = dev_res.json()
        assert data["total_devices"] == 1
        assert data["devices"][0]["client_ip"] == "192.168.2.100"
        assert data["devices"][0]["checkpoint_id"] == "SSB_JAIGAON_01"
        assert data["devices"][0]["last_endpoint"] == "/api/v1/inspect"


# =============================================================================
# 3. Model Stubs & Error Contracts
# =============================================================================

class TestModelStubs:
    def test_pp_ocr_qwen_vl_quality_gate_stub(self):
        ocr_engine = PPOCREngine()
        with pytest.raises(NotImplementedError) as exc_info:
            asyncio.run(ocr_engine.run_qwen_vl_quality_gate(None, ["dob", "doc_number"]))
        assert "Qwen2.5-VL-3B-Instruct" in str(exc_info.value)
        assert "dob" in str(exc_info.value)
        assert "doc_number" in str(exc_info.value)

    def test_mrz_engine_omnimrz_stub(self):
        mrz_engine = MRZEngine()
        # Force onnx_session to None to test the fallback/stub path
        mrz_engine._onnx_session = None
        with pytest.raises(NotImplementedError) as exc_info:
            mrz_engine.run_omnimrz_inference(None)
        assert "OmniMRZ ONNX model weights" in str(exc_info.value)
        assert "omnimrz_ppocr_v4.onnx" in str(exc_info.value)


# =============================================================================
# 4. Host Configuration
# =============================================================================

class TestCoreConfiguration:
    def test_backend_host_is_wildcard_for_hotspot_access(self):
        assert settings.HOST == "0.0.0.0", "HOST must be 0.0.0.0 to accept hotspot / LAN clients"
        assert settings.PORT == 8000
