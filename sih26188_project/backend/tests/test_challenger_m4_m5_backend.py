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
from datetime import datetime, timezone, timedelta
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

    def test_inactivity_timeout_transition_to_offline(self):
        """Verify device status transitions to OFFLINE after 8.0s timeout and is excluded from active queries."""
        tracker = DeviceTracker()
        tracker.record_activity("192.168.2.50", user_agent="Android-App/1.0", checkpoint_id="CP_TEST")
        
        # Freshly recorded device is ONLINE
        active_devs = tracker.get_active_devices()
        assert len(active_devs) == 1
        assert active_devs[0].status == "ONLINE"
        assert tracker.get_last_active_device().client_ip == "192.168.2.50"

        # Advance timestamp past 8.0 seconds (e.g. 9 seconds ago)
        stale_time = (datetime.now(timezone.utc) - timedelta(seconds=9.0)).isoformat()
        tracker._devices["192.168.2.50"].last_seen = stale_time

        # Inactive device should now evaluate to OFFLINE
        all_devs = tracker.get_all_devices(active_only=False)
        assert len(all_devs) == 1
        assert all_devs[0].status == "OFFLINE"

        # Active queries must exclude it
        assert tracker.get_active_devices() == []
        assert tracker.get_last_active_device() is None
        # Non-active last device query should still return it with OFFLINE status
        last_dev = tracker.get_last_active_device(active_only=False)
        assert last_dev is not None
        assert last_dev.client_ip == "192.168.2.50"
        assert last_dev.status == "OFFLINE"

    def test_reactivation_after_inactivity(self):
        """Verify an OFFLINE device transitions back to ONLINE upon receiving fresh ping/request."""
        tracker = DeviceTracker()
        tracker.record_activity("192.168.2.60", endpoint="/api/v1/health")

        # Simulate going offline (15s ago)
        tracker._devices["192.168.2.60"].last_seen = (
            datetime.now(timezone.utc) - timedelta(seconds=15.0)
        ).isoformat()
        assert tracker.get_active_devices() == []

        # New ping comes in
        reactivated = tracker.record_activity("192.168.2.60", endpoint="/api/v1/health")
        assert reactivated.status == "ONLINE"
        assert reactivated.total_requests == 2
        assert len(tracker.get_active_devices()) == 1
        assert tracker.get_active_devices()[0].client_ip == "192.168.2.60"
        assert tracker.get_last_active_device().client_ip == "192.168.2.60"

    def test_custom_timeout_threshold(self):
        """Verify custom timeout_seconds parameter correctly controls active evaluation."""
        tracker = DeviceTracker()
        tracker.record_activity("192.168.2.70")
        # 5.0 seconds ago
        tracker._devices["192.168.2.70"].last_seen = (
            datetime.now(timezone.utc) - timedelta(seconds=5.0)
        ).isoformat()

        # Under default 8.0s timeout, it is active
        assert len(tracker.get_active_devices(timeout_seconds=8.0)) == 1
        assert tracker.get_active_devices(timeout_seconds=8.0)[0].status == "ONLINE"

        # Under 3.0s timeout, it is inactive (OFFLINE)
        assert len(tracker.get_active_devices(timeout_seconds=3.0)) == 0
        assert tracker.get_all_devices(timeout_seconds=3.0, active_only=False)[0].status == "OFFLINE"

    def test_multiple_devices_partial_expiry(self):
        """Verify mixed active and offline devices are filtered and sorted accurately."""
        tracker = DeviceTracker()
        now = datetime.now(timezone.utc)
        
        # Dev 1: Active 2s ago
        tracker.record_activity("10.0.0.1")
        tracker._devices["10.0.0.1"].last_seen = (now - timedelta(seconds=2.0)).isoformat()

        # Dev 2: Offline 12s ago
        tracker.record_activity("10.0.0.2")
        tracker._devices["10.0.0.2"].last_seen = (now - timedelta(seconds=12.0)).isoformat()

        # Dev 3: Active 0.5s ago
        tracker.record_activity("10.0.0.3")
        tracker._devices["10.0.0.3"].last_seen = (now - timedelta(seconds=0.5)).isoformat()

        active = tracker.get_active_devices()
        assert len(active) == 2
        # Sorted newest first: 10.0.0.3, then 10.0.0.1
        assert [d.client_ip for d in active] == ["10.0.0.3", "10.0.0.1"]
        assert tracker.get_last_active_device().client_ip == "10.0.0.3"

        all_devices = tracker.get_all_devices(active_only=False)
        assert len(all_devices) == 3
        assert [d.client_ip for d in all_devices] == ["10.0.0.3", "10.0.0.1", "10.0.0.2"]
        assert [d.status for d in all_devices] == ["ONLINE", "ONLINE", "OFFLINE"]


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

    def test_devices_endpoint_excludes_offline_devices(self, client):
        """Verify GET /api/v1/devices excludes clients older than 8.0 seconds."""
        headers = {"X-Real-IP": "192.168.2.99", "User-Agent": "SSB-Field-Android/3.0"}
        # Ping health endpoint to register device
        res = client.get("/api/v1/health", headers=headers)
        assert res.status_code == 200

        # Immediately active: total_devices == 1
        dev_res = client.get("/api/v1/devices")
        data = dev_res.json()
        assert data["total_devices"] == 1
        assert len(data["devices"]) == 1
        assert data["devices"][0]["client_ip"] == "192.168.2.99"
        assert data["devices"][0]["status"] == "ONLINE"
        assert data["last_active_device"] is not None
        assert data["last_active_device"]["client_ip"] == "192.168.2.99"

        # Advance last_seen beyond 8.0s timeout (e.g. 10.0s ago)
        device_tracker._devices["192.168.2.99"].last_seen = (
            datetime.now(timezone.utc) - timedelta(seconds=10.0)
        ).isoformat()

        # Query endpoint again: stale device should be excluded
        dev_res2 = client.get("/api/v1/devices")
        data2 = dev_res2.json()
        assert data2["total_devices"] == 0
        assert data2["devices"] == []
        assert data2["last_active_device"] is None

    def test_devices_endpoint_mixed_active_and_offline(self, client):
        """Verify GET /api/v1/devices filters out stale devices while keeping active ones."""
        # Device 1: Stale
        client.get("/health", headers={"X-Real-IP": "10.0.0.1", "User-Agent": "Field-Unit-1"})
        # Device 2: Active
        client.get("/health", headers={"X-Real-IP": "10.0.0.2", "User-Agent": "Field-Unit-2"})

        # Make Device 1 stale (15 seconds ago)
        device_tracker._devices["10.0.0.1"].last_seen = (
            datetime.now(timezone.utc) - timedelta(seconds=15.0)
        ).isoformat()

        dev_res = client.get("/api/v1/devices")
        data = dev_res.json()
        assert data["total_devices"] == 1
        assert len(data["devices"]) == 1
        assert data["devices"][0]["client_ip"] == "10.0.0.2"
        assert data["devices"][0]["status"] == "ONLINE"
        assert data["last_active_device"]["client_ip"] == "10.0.0.2"

    def test_devices_endpoint_reactivates_when_offline_pings_again(self, client):
        """Verify an inactive device immediately reappears in /api/v1/devices upon pinging."""
        # Initial ping
        client.get("/api/v1/health", headers={"X-Real-IP": "10.0.0.5"})
        # Expire device
        device_tracker._devices["10.0.0.5"].last_seen = (
            datetime.now(timezone.utc) - timedelta(seconds=12.0)
        ).isoformat()

        dev_res1 = client.get("/api/v1/devices")
        assert dev_res1.json()["total_devices"] == 0

        # Fresh health ping from the device
        client.get("/api/v1/health", headers={"X-Real-IP": "10.0.0.5"})

        dev_res2 = client.get("/api/v1/devices")
        data = dev_res2.json()
        assert data["total_devices"] == 1
        assert len(data["devices"]) == 1
        assert data["devices"][0]["client_ip"] == "10.0.0.5"
        assert data["devices"][0]["total_requests"] == 2
        assert data["devices"][0]["status"] == "ONLINE"


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
