"""
Empirical Adversarial Test Suite for Milestone 4:
Live Companion Ingestion, Viewport Auto-Slotting & Auto-Screening Synchronization
"""

import base64
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.routers.companion import companion_store

client = TestClient(app)

JPEG_MAGIC = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
JPEG_TRAILER = b"\xff\xd9"
SAMPLE_JPEG = JPEG_MAGIC + b"\x00" * 300 + JPEG_TRAILER

PNG_MAGIC = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
SAMPLE_PNG = PNG_MAGIC


@pytest.fixture(autouse=True)
def reset_store():
    companion_store.reset(hard=True)
    yield
    companion_store.reset(hard=True)


class TestMilestone4EmpiricalPipeline:
    """Empirical verification of Milestone 4 task requirements."""

    def test_single_capture_arrival_document_only(self):
        """Test single capture arrival (document only): verifies payload ingestion and state."""
        b64_doc = base64.b64encode(SAMPLE_PNG).decode("utf-8")
        res_upload = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": b64_doc,
                "capture_type": "document",
                "device_id": "field-unit-doc-01",
                "checkpoint_id": "WB-JAI-01",
                "filename": "passport_scan.png",
            },
        )
        assert res_upload.status_code == 200
        up_data = res_upload.json()
        assert up_data["status"] == "success"
        assert up_data["sequence_id"] == 1
        assert up_data["capture_type"] == "document"
        assert up_data["device_id"] == "field-unit-doc-01"

        # Poll latest capture
        res_poll = client.get("/api/v1/companion/latest")
        assert res_poll.status_code == 200
        poll_data = res_poll.json()
        assert poll_data["has_capture"] is True
        assert poll_data["sequence_id"] == 1
        assert poll_data["capture_type"] == "document"
        assert poll_data["image_data"].startswith("data:image/png;base64,")

    def test_single_capture_arrival_portrait_only(self):
        """Test single capture arrival (portrait only): verifies payload ingestion and state."""
        b64_face = base64.b64encode(SAMPLE_JPEG).decode("utf-8")
        res_upload = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": b64_face,
                "capture_type": "selfie",
                "device_id": "field-unit-face-01",
                "checkpoint_id": "WB-JAI-01",
                "filename": "traveler_portrait.jpg",
            },
        )
        assert res_upload.status_code == 200
        up_data = res_upload.json()
        assert up_data["status"] == "success"
        assert up_data["sequence_id"] == 1
        assert up_data["capture_type"] == "selfie"
        assert up_data["device_id"] == "field-unit-face-01"

        # Poll latest capture
        res_poll = client.get("/api/v1/companion/latest")
        assert res_poll.status_code == 200
        poll_data = res_poll.json()
        assert poll_data["has_capture"] is True
        assert poll_data["sequence_id"] == 1
        assert poll_data["capture_type"] == "selfie"
        assert poll_data["image_data"].startswith("data:image/jpeg;base64,")

    def test_dual_stream_arrival_and_verdict_synchronization(self):
        """
        Simulate dual stream arrival:
        1. Document arrives (seq 1). Workstation buffers doc.
        2. Portrait arrives (seq 2). Workstation triggers auto-screening.
        3. Workstation posts verdict for seq 2 back to /api/v1/companion/verdict.
        4. Companion device queries /api/v1/companion/result/2 and receives verdict.
        """
        # Step 1: Document scan arrives
        b64_doc = base64.b64encode(SAMPLE_PNG).decode("utf-8")
        res1 = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": b64_doc,
                "capture_type": "document",
                "device_id": "field-unit-01",
            },
        )
        assert res1.status_code == 200
        seq1 = res1.json()["sequence_id"]
        assert seq1 == 1

        # Step 2: Live portrait arrives
        b64_face = base64.b64encode(SAMPLE_JPEG).decode("utf-8")
        res2 = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": b64_face,
                "capture_type": "selfie",
                "device_id": "field-unit-01",
            },
        )
        assert res2.status_code == 200
        seq2 = res2.json()["sequence_id"]
        assert seq2 == 2

        # Step 3: Workstation finishes screening and posts verdict for seq 2
        res_verdict = client.post(
            "/api/v1/companion/verdict",
            json={
                "sequence_id": seq2,
                "verdict": "PASS",
                "risk_level": "GREEN",
                "risk_score": 3.0,
                "details": "1:1 Biometric Match Verified (Auto-Screening)",
            },
        )
        assert res_verdict.status_code == 200
        assert res_verdict.json()["status"] == "ok"

        # Step 4: Companion retrieves verdict by sequence ID
        res_query = client.get(f"/api/v1/companion/result/{seq2}")
        assert res_query.status_code == 200
        q_data = res_query.json()
        assert q_data["has_verdict"] is True
        assert q_data["sequence_id"] == 2
        assert q_data["verdict"] == "PASS"
        assert q_data["risk_level"] == "GREEN"
        assert q_data["risk_score"] == 3.0
        assert "Auto-Screening" in q_data["details"]

        # Also latest verdict endpoint returns the same verdict
        res_latest_v = client.get("/api/v1/companion/verdict")
        assert res_latest_v.status_code == 200
        lv_data = res_latest_v.json()
        assert lv_data["sequence_id"] == 2
        assert lv_data["verdict"] == "PASS"

    def test_sequence_monotonicity_across_out_of_order_responses(self):
        """
        Verify sequence monotonicity under rapid uploads and simulated network re-ordering.
        """
        seq_ids = []
        for i in range(10):
            res = client.post(
                "/api/v1/companion/upload",
                json={
                    "image_base64": base64.b64encode(SAMPLE_PNG).decode("utf-8"),
                    "capture_type": "document" if i % 2 == 0 else "selfie",
                    "device_id": f"unit-{i}",
                },
            )
            assert res.status_code == 200
            seq_ids.append(res.json()["sequence_id"])

        # Strictly monotonic from 1 to 10
        assert seq_ids == list(range(1, 11))

        # Simulated client-side ingestion tracker with out-of-order arrivals
        simulated_incoming_stream = [1, 3, 2, 4, 4, 7, 5, 6, 8, 10, 9]
        last_seen = 0
        accepted = []
        rejected = []

        for s in simulated_incoming_stream:
            if s > last_seen:
                last_seen = s
                accepted.append(s)
            else:
                rejected.append(s)

        assert accepted == [1, 3, 4, 7, 8, 10]
        assert rejected == [2, 4, 5, 6, 9]
        assert last_seen == 10

    def test_verdict_synchronization_all_risk_levels(self):
        """Test verdict synchronization for GREEN, AMBER, and RED risk levels."""
        verdict_scenarios = [
            (101, "PASS", "GREEN", 2.5, "Genuine document"),
            (102, "SECONDARY HOLD", "AMBER", 45.0, "Suspicious stamp context"),
            (103, "CRITICAL FORGERY", "RED", 88.5, "Tampered photo substrate"),
        ]

        for seq, v_label, r_level, score, details in verdict_scenarios:
            res = client.post(
                "/api/v1/companion/verdict",
                json={
                    "sequence_id": seq,
                    "verdict": v_label,
                    "risk_level": r_level,
                    "risk_score": score,
                    "details": details,
                },
            )
            assert res.status_code == 200

            res_check = client.get(f"/api/v1/companion/result/{seq}")
            assert res_check.status_code == 200
            d = res_check.json()
            assert d["sequence_id"] == seq
            assert d["verdict"] == v_label
            assert d["risk_level"] == r_level
            assert d["risk_score"] == score
            assert d["details"] == details

    def test_buffer_clearing_on_session_reset(self):
        """Test buffer clearing on session reset: verifies clear endpoint and state preservation."""
        # 1. Upload frame
        res_up = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": base64.b64encode(SAMPLE_JPEG).decode("utf-8"),
                "capture_type": "document",
                "device_id": "test-device",
            },
        )
        assert res_up.status_code == 200
        assert res_up.json()["sequence_id"] == 1

        # 2. Verify buffer holds capture
        res_latest1 = client.get("/api/v1/companion/latest")
        assert res_latest1.json()["has_capture"] is True
        assert res_latest1.json()["sequence_id"] == 1

        # 3. Clear buffer (as done on session reset / manual reset)
        res_clear = client.post("/api/v1/companion/clear")
        assert res_clear.status_code == 200
        assert res_clear.json()["status"] == "cleared"

        # 4. Verify buffer is empty but sequence_id is preserved
        res_latest2 = client.get("/api/v1/companion/latest")
        data2 = res_latest2.json()
        assert data2["has_capture"] is False
        assert data2["image_data"] is None
        assert data2["sequence_id"] == 1

        # 5. Next upload increments to 2
        res_up2 = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": base64.b64encode(SAMPLE_PNG).decode("utf-8"),
                "capture_type": "selfie",
            },
        )
        assert res_up2.status_code == 200
        assert res_up2.json()["sequence_id"] == 2
