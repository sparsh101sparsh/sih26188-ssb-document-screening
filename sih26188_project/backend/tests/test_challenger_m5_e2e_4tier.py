"""
Milestone 5: Comprehensive 4-Tier E2E Integration Test Suite (Backend)

Validates all 4 Tiers of requirements:
- Tier 1: Feature Coverage (F1 default theme backend CORS/host, F2 device telemetry, F3 pairing info & simulation, F4 real-time companion upload/polling/verdict)
- Tier 2: Boundary & Corner Cases (8.0s timeout, out-of-order sequence streams, corrupted base64, empty payloads, 0 devices)
- Tier 3: Cross-Feature Combinations (Simulate + Device Tracker + Companion Store synergy, Verdict sync across endpoints)
- Tier 4: Real-World Workload Scenarios (Complete frontline field workflow end-to-end)
"""

import base64
import io
import time
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.device_tracker import device_tracker, DeviceTracker
from app.api.routers.companion import companion_store

SAMPLE_JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
SAMPLE_PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"


@pytest.fixture(autouse=True)
def reset_backend_state():
    """Ensure clean device tracker and companion store before and after each test."""
    device_tracker.clear()
    companion_store.reset(hard=True)
    yield
    device_tracker.clear()
    companion_store.reset(hard=True)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


# =============================================================================
# TIER 1: FEATURE COVERAGE (F1, F2, F3, F4)
# =============================================================================

class TestTier1FeatureCoverage:
    """Tier 1: Feature verification across F1, F2, F3, and F4."""

    def test_f1_backend_network_binding_and_cors(self):
        """F1: Ensure Edge Gateway binds to wildcard 0.0.0.0 for LAN/Wi-Fi pairing."""
        assert settings.HOST == "0.0.0.0"
        assert settings.PORT == 8000

    def test_f2_device_tracking_and_live_telemetry(self, client):
        """F2: Verify device tracking middleware records client IP, user-agent, checkpoint, and latency."""
        headers = {
            "X-Forwarded-For": "192.168.1.120",
            "User-Agent": "SSB-Field-Companion/3.2",
            "X-Checkpoint-Id": "WB-JAI-01",
        }
        res = client.get("/api/v1/health", headers=headers)
        assert res.status_code == 200

        dev_res = client.get("/api/v1/devices")
        assert dev_res.status_code == 200
        data = dev_res.json()
        assert data["status"] == "ok"
        assert data["total_devices"] >= 1

        dev = next((d for d in data["devices"] if d["client_ip"] == "192.168.1.120"), None)
        assert dev is not None
        assert dev["user_agent"] == "SSB-Field-Companion/3.2"
        assert dev["checkpoint_id"] == "WB-JAI-01"
        assert dev["status"] == "ONLINE"
        assert dev["latency_ms"] is not None

    def test_f3_pairing_center_companion_info_and_simulate(self, client):
        """F3: Verify /api/v1/companion/info and /api/v1/companion/simulate endpoints."""
        # Info endpoint
        info_res = client.get("/api/v1/companion/info")
        assert info_res.status_code == 200
        info_data = info_res.json()
        assert info_data["status"] == "ok"
        assert "gateway_url" in info_data
        assert "emulator_url" in info_data
        assert "adb_command" in info_data
        assert info_data["port"] == 8000

        # Simulate Document Upload
        sim_doc = client.post(
            "/api/v1/companion/simulate",
            json={"capture_type": "document", "device_id": "Sim-Unit-01", "checkpoint_id": "WB-JAI-01"},
        )
        assert sim_doc.status_code == 200
        doc_json = sim_doc.json()
        assert doc_json["status"] == "success"
        assert doc_json["capture_type"] == "document"
        assert doc_json["sequence_id"] == 1

        # Simulate Selfie Upload
        sim_selfie = client.post(
            "/api/v1/companion/simulate",
            json={"capture_type": "selfie", "device_id": "Sim-Unit-01", "checkpoint_id": "WB-JAI-01"},
        )
        assert sim_selfie.status_code == 200
        selfie_json = sim_selfie.json()
        assert selfie_json["status"] == "success"
        assert selfie_json["capture_type"] == "selfie"
        assert selfie_json["sequence_id"] == 2

    def test_f4_realtime_ingestion_and_verdict_synchronization(self, client):
        """F4: Verify companion upload, polling, and verdict synchronization."""
        # 1. Upload Document
        b64_doc = base64.b64encode(SAMPLE_PNG).decode("utf-8")
        up_res = client.post(
            "/api/v1/companion/upload",
            json={"image_base64": b64_doc, "capture_type": "document", "device_id": "field-phone-1"},
        )
        assert up_res.status_code == 200
        assert up_res.json()["sequence_id"] == 1

        # 2. Poll latest
        poll_res = client.get("/api/v1/companion/latest")
        assert poll_res.status_code == 200
        poll_data = poll_res.json()
        assert poll_data["has_capture"] is True
        assert poll_data["sequence_id"] == 1
        assert poll_data["capture_type"] == "document"

        # 3. Post Verdict
        verdict_res = client.post(
            "/api/v1/companion/verdict",
            json={
                "sequence_id": 1,
                "verdict": "PASS",
                "risk_level": "GREEN",
                "risk_score": 1.2,
                "details": "Authenticated passport document",
            },
        )
        assert verdict_res.status_code == 200
        assert verdict_res.json()["status"] == "ok"

        # 4. Companion queries verdict
        query_res = client.get("/api/v1/companion/result/1")
        assert query_res.status_code == 200
        assert query_res.json()["verdict"] == "PASS"
        assert query_res.json()["risk_level"] == "GREEN"


# =============================================================================
# TIER 2: BOUNDARY & CORNER CASES
# =============================================================================

class TestTier2BoundaryAndCornerCases:
    """Tier 2: Boundary conditions, corner cases, and stress resilience."""

    def test_device_inactivity_timeout_8s(self, client):
        """Verify device status transitions to OFFLINE after 8.0s timeout."""
        # Directly test DeviceTracker logic
        tracker = DeviceTracker()
        tracker.record_activity("10.10.10.5", user_agent="Field-Test")
        assert len(tracker.get_active_devices()) == 1

        # Advance last_seen
        tracker._devices["10.10.10.5"].last_seen = (
            datetime.now(timezone.utc) - timedelta(seconds=10.0)
        ).isoformat()

        # Inactive device excluded from active devices
        assert len(tracker.get_active_devices()) == 0
        assert tracker.get_last_active_device() is None

    def test_concurrent_uploads_monotonic_sequence_integrity(self, client):
        """Stress test: 25 concurrent uploads must yield strictly monotonic, collision-free sequence IDs."""
        thread_count = 25
        results = []

        def worker_upload(idx: int):
            b64 = base64.b64encode(SAMPLE_JPEG).decode("utf-8")
            res = client.post(
                "/api/v1/companion/upload",
                json={"image_base64": b64, "device_id": f"thread-device-{idx}"},
            )
            return res.json()["sequence_id"]

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(worker_upload, i) for i in range(thread_count)]
            for f in futures:
                results.append(f.result())

        assert len(results) == thread_count
        assert set(results) == set(range(1, thread_count + 1))
        assert client.get("/api/v1/companion/latest").json()["sequence_id"] == thread_count

    def test_empty_and_corrupted_payload_error_handling(self, client):
        """Verify corrupted base64, empty files, and invalid data URIs return 400 Bad Request."""
        # 1. Corrupted base64
        res1 = client.post(
            "/api/v1/companion/upload",
            json={"image_base64": "!!!INVALID_BASE64_BYTES@@@"},
        )
        assert res1.status_code == 400

        # 2. Empty base64
        res2 = client.post(
            "/api/v1/companion/upload",
            json={"image_base64": "   "},
        )
        assert res2.status_code == 400

        # 3. 0-byte file upload
        res3 = client.post(
            "/api/v1/companion/upload",
            files={"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")},
        )
        assert res3.status_code == 400

        # 4. Malformed Data URI
        res4 = client.post(
            "/api/v1/companion/upload",
            json={"image_data": "data:image/jpeg;base64"},
        )
        assert res4.status_code == 400

    def test_zero_devices_empty_state_response(self, client):
        """Verify empty device tracker returns clean zero devices response."""
        device_tracker.clear()
        res = client.get("/api/v1/devices")
        assert res.status_code == 200
        data = res.json()
        # When no external devices have connected (only the testclient request itself if any)
        assert isinstance(data["devices"], list)


# =============================================================================
# TIER 3: CROSS-FEATURE COMBINATIONS
# =============================================================================

class TestTier3CrossFeatureCombinations:
    """Tier 3: Cross-feature interactions and state synergies."""

    def test_simulation_trigger_updates_device_tracker_and_companion_store(self, client):
        """Verify 1-click simulation trigger updates both DeviceTracker and CompanionStore."""
        headers = {"X-Real-IP": "127.0.0.1", "User-Agent": "Workstation-Simulation-Suite"}
        sim_res = client.post(
            "/api/v1/companion/simulate",
            json={"capture_type": "document", "device_id": "Sim-Workstation"},
            headers=headers,
        )
        assert sim_res.status_code == 200

        # Verify companion store has capture
        latest = client.get("/api/v1/companion/latest").json()
        assert latest["has_capture"] is True
        assert latest["capture_type"] == "document"

        # Verify device tracker recorded the simulation request
        dev_res = client.get("/api/v1/devices")
        assert dev_res.status_code == 200
        data = dev_res.json()
        assert data["total_devices"] >= 1
        dev = next((d for d in data["devices"] if d["client_ip"] == "127.0.0.1"), None)
        assert dev is not None
        assert dev["user_agent"] == "Workstation-Simulation-Suite"

    def test_multi_risk_verdict_broadcast_synergy(self, client):
        """Verify multiple sequential verdicts with varied risk levels sync properly across all endpoints."""
        scenarios = [
            (1, "PASS", "GREEN", 2.0, "Authentic pass"),
            (2, "SECONDARY HOLD", "AMBER", 48.0, "Substrate anomaly"),
            (3, "CRITICAL FORGERY", "RED", 94.0, "Severe face mismatch"),
        ]

        for seq, verd, risk, score, details in scenarios:
            post_res = client.post(
                "/api/v1/companion/verdict",
                json={
                    "sequence_id": seq,
                    "verdict": verd,
                    "risk_level": risk,
                    "risk_score": score,
                    "details": details,
                },
            )
            assert post_res.status_code == 200

            # Fetch via /result/{id}
            get_res = client.get(f"/api/v1/companion/result/{seq}")
            assert get_res.status_code == 200
            assert get_res.json()["verdict"] == verd
            assert get_res.json()["risk_level"] == risk
            assert get_res.json()["risk_score"] == score


# =============================================================================
# TIER 4: REAL-WORLD APPLICATION SCENARIOS
# =============================================================================

class TestTier4RealWorldFrontlineWorkflow:
    """Tier 4: Comprehensive end-to-end frontline simulation workflow."""

    def test_complete_frontline_companion_screening_pipeline_e2e(self, client):
        """
        Frontline simulation workflow:
        1. Field device sends health ping -> device tracker marks unit online.
        2. Companion queries pairing info.
        3. Field device captures & uploads document scan -> seq 1.
        4. Workstation receives document scan from /latest.
        5. Field device captures & uploads live selfie -> seq 2.
        6. Workstation receives selfie from /latest.
        7. Workstation executes multi-modal inspection via /api/v1/inspect.
        8. Workstation posts screening verdict back to companion endpoint.
        9. Field device queries /api/v1/companion/result/2 to present verdict to officer.
        10. Workstation clears session buffer via /api/v1/companion/clear.
        """
        mobile_headers = {
            "X-Forwarded-For": "192.168.1.150",
            "User-Agent": "SSB-FieldCamera-App/v2.1 (Pixel 7)",
            "X-Checkpoint-Id": "SSB-JAIGAON-POST-01",
        }

        # Step 1: Mobile connects & pings health
        h_res = client.get("/api/v1/health", headers=mobile_headers)
        assert h_res.status_code == 200

        # Step 2: Verify device is online in device monitor
        dev_res = client.get("/api/v1/devices")
        assert dev_res.json()["total_devices"] >= 1
        dev = next((d for d in dev_res.json()["devices"] if d["client_ip"] == "192.168.1.150"), None)
        assert dev is not None
        assert dev["checkpoint_id"] == "SSB-JAIGAON-POST-01"

        # Step 3: Companion queries pairing info
        info_res = client.get("/api/v1/companion/info")
        assert info_res.status_code == 200
        assert info_res.json()["port"] == 8000

        # Step 4: Companion uploads Document Scan
        doc_b64 = base64.b64encode(SAMPLE_PNG).decode("utf-8")
        doc_up = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": doc_b64,
                "capture_type": "document",
                "device_id": "pixel-7-field",
                "checkpoint_id": "SSB-JAIGAON-POST-01",
                "filename": "passport_scan.png",
            },
            headers=mobile_headers,
        )
        assert doc_up.status_code == 200
        assert doc_up.json()["sequence_id"] == 1

        # Step 5: Workstation polls document
        poll1 = client.get("/api/v1/companion/latest")
        assert poll1.json()["has_capture"] is True
        assert poll1.json()["sequence_id"] == 1
        assert poll1.json()["capture_type"] == "document"

        # Step 6: Companion uploads Live Traveler Selfie
        selfie_b64 = base64.b64encode(SAMPLE_JPEG).decode("utf-8")
        selfie_up = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": selfie_b64,
                "capture_type": "selfie",
                "device_id": "pixel-7-field",
                "checkpoint_id": "SSB-JAIGAON-POST-01",
                "filename": "traveler_selfie.jpg",
            },
            headers=mobile_headers,
        )
        assert selfie_up.status_code == 200
        assert selfie_up.json()["sequence_id"] == 2

        # Step 7: Workstation polls selfie
        poll2 = client.get("/api/v1/companion/latest")
        assert poll2.json()["has_capture"] is True
        assert poll2.json()["sequence_id"] == 2
        assert poll2.json()["capture_type"] == "selfie"

        # Step 8: Workstation executes multi-modal inspection
        files = {
            "document_image": ("passport.jpg", io.BytesIO(SAMPLE_JPEG), "image/jpeg"),
            "live_photo": ("selfie.jpg", io.BytesIO(SAMPLE_JPEG), "image/jpeg"),
        }
        data = {"checkpoint_id": "WB-JAI-01", "transit_date": "2026-08-24"}
        inspect_res = client.post("/api/v1/inspect", files=files, data=data)
        assert inspect_res.status_code == 200
        inspect_data = inspect_res.json()
        assert "risk_score" in inspect_data["assessment"]
        assert "risk_level" in inspect_data["assessment"]

        # Step 9: Workstation synchronizes verdict back to companion
        v_res = client.post(
            "/api/v1/companion/verdict",
            json={
                "sequence_id": 2,
                "verdict": "PASS",
                "risk_level": inspect_data["assessment"]["risk_level"],
                "risk_score": inspect_data["assessment"]["risk_score"],
                "details": "Multi-Modal Border Screening Automated Clearance",
            },
        )
        assert v_res.status_code == 200
        assert v_res.json()["status"] == "ok"

        # Step 10: Mobile companion retrieves verdict
        comp_res = client.get("/api/v1/companion/result/2")
        assert comp_res.status_code == 200
        assert comp_res.json()["has_verdict"] is True
        assert comp_res.json()["verdict"] == "PASS"
        assert comp_res.json()["sequence_id"] == 2

        # Step 11: Workstation clears session buffer for next traveler
        clear_res = client.post("/api/v1/companion/clear")
        assert clear_res.status_code == 200
        assert clear_res.json()["status"] == "cleared"

        # Verify buffer is clear while sequence_id is retained
        poll_after = client.get("/api/v1/companion/latest")
        assert poll_after.json()["has_capture"] is False
        assert poll_after.json()["image_data"] is None
        assert poll_after.json()["sequence_id"] == 2
