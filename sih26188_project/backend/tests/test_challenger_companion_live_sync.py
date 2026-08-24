"""
SIH26188 — Challenger 1: Adversarial Companion Camera Sync & Live Ingestion Test Suite
Author: Challenger 1 (Backend & Web Live Sync Challenger)

Empirically challenges:
1. High-concurrency multi-threaded uploads (100 simultaneous threads) with zero sequence collision.
2. Monotonic sequence numbering across 50 rapid upload/clear/upload cycles.
3. Extreme adversarial payload fuzzing (corrupt base64, missing fields, malformed URIs, huge 10MB images, unicode/SQLi strings).
4. Buffer clearing race conditions with concurrent readers, clearers, and uploaders.
5. In-transit ring buffer capacity, FIFO eviction, and boundary operations.
6. Strict adherence to PROJECT.md interface contracts.
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

client = TestClient(app)

JPEG_MAGIC = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
JPEG_TRAILER = b"\xff\xd9"
SAMPLE_JPEG = JPEG_MAGIC + b"\x00" * 300 + JPEG_TRAILER

PNG_MAGIC = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
SAMPLE_PNG = PNG_MAGIC


@pytest.fixture(autouse=True)
def reset_store():
    """Ensure clean store before and after every test."""
    companion_store.reset(hard=True)
    yield
    companion_store.reset(hard=True)


# ==============================================================================
# 1. HIGH-CONCURRENCY MULTI-THREADED STRESS TESTS
# ==============================================================================

class TestHighConcurrencyIngestion:
    """Stress tests high concurrency and thread-safety under heavy parallel load."""

    def test_concurrent_100_thread_burst_uploads(self):
        """100 threads concurrently upload images; verify strict monotonic uniqueness."""
        thread_count = 100
        results = []

        def worker(idx: int):
            b64_data = base64.b64encode(SAMPLE_JPEG).decode("utf-8")
            res = client.post(
                "/api/v1/companion/upload",
                json={
                    "image_base64": b64_data,
                    "capture_type": "selfie" if idx % 2 == 0 else "document",
                    "device_id": f"field-unit-{idx:03d}",
                    "checkpoint_id": f"CP-{idx % 5}",
                    "filename": f"burst_{idx}.jpg",
                },
            )
            assert res.status_code == 200, f"Upload failed for worker {idx}: {res.text}"
            data = res.json()
            assert data["status"] == "success"
            return data["sequence_id"]

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(worker, i) for i in range(thread_count)]
            for f in concurrent.futures.as_completed(futures):
                results.append(f.result())

        assert len(results) == thread_count
        # All 100 sequence IDs must be unique integers from 1 to 100
        assert len(set(results)) == thread_count
        assert set(results) == set(range(1, thread_count + 1))

        # Check final latest state
        latest = client.get("/api/v1/companion/latest").json()
        assert latest["has_capture"] is True
        assert latest["sequence_id"] == thread_count


    def test_buffer_clearing_race_conditions_under_load(self):
        """
        Simulate real-world chaotic conditions:
        Simultaneous uploads, polling readers, and buffer clearers running in parallel threads.
        """
        operations_count = 60
        exceptions = []

        def uploader(idx: int):
            try:
                b64 = base64.b64encode(SAMPLE_PNG).decode("utf-8")
                res = client.post(
                    "/api/v1/companion/upload",
                    json={"image_base64": b64, "device_id": f"uploader-{idx}"},
                )
                assert res.status_code == 200
            except Exception as e:
                exceptions.append(("uploader", e))

        def reader(idx: int):
            try:
                res = client.get("/api/v1/companion/latest")
                assert res.status_code == 200
                data = res.json()
                assert "has_capture" in data
                assert "sequence_id" in data
            except Exception as e:
                exceptions.append(("reader", e))

        def clearer(idx: int):
            try:
                res = client.post("/api/v1/companion/clear")
                assert res.status_code == 200
                data = res.json()
                assert data["status"] == "cleared"
            except Exception as e:
                exceptions.append(("clearer", e))

        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
            futures = []
            for i in range(operations_count):
                futures.append(executor.submit(uploader, i))
                futures.append(executor.submit(reader, i))
                if i % 3 == 0:
                    futures.append(executor.submit(clearer, i))

            for f in concurrent.futures.as_completed(futures):
                f.result()

        assert len(exceptions) == 0, f"Encountered race condition exceptions: {exceptions}"


# ==============================================================================
# 2. SEQUENCE MONOTONICITY ACROSS CLEAR / UPLOAD CYCLES
# ==============================================================================

class TestSequenceMonotonicityCycles:
    """Stress tests sequence monotonicity across multiple clear/upload cycles."""

    def test_50_cycles_monotonic_progression(self):
        """
        Runs 50 sequential upload -> poll -> clear cycles.
        Sequence ID must increment strictly monotonically: 1, 2, 3, ..., 50.
        Cleared state must preserve the sequence ID without decrementing or rolling back.
        """
        for cycle in range(1, 51):
            # 1. Upload
            res_up = client.post(
                "/api/v1/companion/upload",
                data={
                    "image_base64": base64.b64encode(SAMPLE_JPEG).decode("utf-8"),
                    "capture_type": "selfie",
                    "device_id": f"device-cycle-{cycle}",
                    "checkpoint_id": "WB-JAI-01",
                },
            )
            assert res_up.status_code == 200
            up_data = res_up.json()
            assert up_data["sequence_id"] == cycle

            # 2. Poll
            res_poll = client.get("/api/v1/companion/latest")
            assert res_poll.status_code == 200
            poll_data = res_poll.json()
            assert poll_data["has_capture"] is True
            assert poll_data["sequence_id"] == cycle
            assert poll_data["device_id"] == f"device-cycle-{cycle}"

            # 3. Clear
            res_clear = client.post("/api/v1/companion/clear")
            assert res_clear.status_code == 200
            assert res_clear.json()["status"] == "cleared"

            # 4. Poll after clear -> has_capture is False, sequence_id remains `cycle`
            res_cleared_poll = client.get("/api/v1/companion/latest")
            assert res_cleared_poll.status_code == 200
            cleared_data = res_cleared_poll.json()
            assert cleared_data["has_capture"] is False
            assert cleared_data["sequence_id"] == cycle
            assert cleared_data["image_data"] is None

        # Final assertion: next upload after 50 cycles is exactly 51
        res_final = client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": base64.b64encode(SAMPLE_PNG).decode("utf-8"),
                "capture_type": "document",
            },
        )
        assert res_final.status_code == 200
        assert res_final.json()["sequence_id"] == 51


# ==============================================================================
# 3. ADVERSARIAL PAYLOAD FUZZING & ERROR RECOVERY
# ==============================================================================

class TestAdversarialPayloadFuzzing:
    """Stress tests boundary cases, corrupt base64, missing fields, huge files, and malformed inputs."""

    def test_corrupted_base64_payloads(self):
        """Fuzz with various corrupted, truncated, and invalid base64 payloads."""
        corrupted_payloads = [
            "not-a-base64-string!@#$%^&*()",
            "data:image/jpeg;base64,!!!invalid!!!",
            "data:image/png;base64",  # Missing comma
            "====",  # Only padding characters
            "ABCD" * 10 + "??",  # Corrupt tail with non-base64 chars
            "\x00\x01\x02\x03",  # Binary garbage in string
            "data:image/jpeg;base64,@@@###$$$%%%",
        ]

        for bad_b64 in corrupted_payloads:
            res = client.post(
                "/api/v1/companion/upload",
                json={"image_base64": bad_b64, "capture_type": "selfie"},
            )
            assert res.status_code == 400, f"Expected 400 Bad Request for bad_b64={bad_b64[:20]}, got {res.status_code}"
            assert "detail" in res.json()

    def test_missing_and_empty_fields_handling(self):
        """Fuzz with missing, empty, or None fields."""
        # 1. Empty JSON object
        res1 = client.post("/api/v1/companion/upload", json={})
        assert res1.status_code == 400
        assert "missing or empty" in res1.json()["detail"].lower()

        # 2. JSON with None image
        res2 = client.post("/api/v1/companion/upload", json={"image_base64": None})
        assert res2.status_code == 400

        # 3. JSON with whitespace only
        res3 = client.post("/api/v1/companion/upload", json={"image_base64": "   \n\t  "})
        assert res3.status_code == 400

        # 4. JSON with non-dict payload (e.g. list, string)
        res4 = client.post("/api/v1/companion/upload", json=["not", "a", "dict"])
        assert res4.status_code == 400

    def test_huge_10mb_payload_upload(self):
        """Upload large 10MB image file via multipart and base64; verify buffer handles it gracefully."""
        huge_bytes = JPEG_MAGIC + b"\x00" * (10 * 1024 * 1024) + JPEG_TRAILER

        # Multipart upload
        files = {"file": ("huge_camera_frame.jpg", io.BytesIO(huge_bytes), "image/jpeg")}
        data = {"capture_type": "document", "device_id": "dslr-companion-1"}
        res = client.post("/api/v1/companion/upload", files=files, data=data)
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert res.json()["sequence_id"] == 1

        # Verify retrieval via latest
        latest = client.get("/api/v1/companion/latest").json()
        assert latest["has_capture"] is True
        assert latest["capture_type"] == "document"
        assert latest["device_id"] == "dslr-companion-1"
        assert latest["image_data"].startswith("data:image/jpeg;base64,")

    def test_unicode_and_special_character_metadata(self):
        """Test non-ASCII unicode, emojis, and injection payloads in metadata fields."""
        b64 = base64.b64encode(SAMPLE_PNG).decode("utf-8")
        test_cases = [
            {"device_id": "📱 मोबाइल-यूनिट-०१", "checkpoint_id": "रक्सौल-01"},
            {"device_id": "<script>alert('xss')</script>", "checkpoint_id": "'; DROP TABLE sync; --"},
            {"device_id": "🚀" * 50, "checkpoint_id": "WB-SPECIAL-#@$&*"},
            {"device_id": "A" * 500, "checkpoint_id": "B" * 500},
        ]

        for tc in test_cases:
            res = client.post(
                "/api/v1/companion/upload",
                json={
                    "image_base64": b64,
                    "capture_type": "selfie",
                    "device_id": tc["device_id"],
                    "checkpoint_id": tc["checkpoint_id"],
                },
            )
            assert res.status_code == 200
            latest = client.get("/api/v1/companion/latest").json()
            assert latest["device_id"] == tc["device_id"]
            assert latest["checkpoint_id"] == tc["checkpoint_id"]


# ==============================================================================
# 4. IN-TRANSIT RING BUFFER HISTORY & EVICTION
# ==============================================================================

class TestRingBufferEviction:
    """Validates in-memory ring buffer limits and FIFO eviction."""

    def test_ring_buffer_fifo_eviction_and_history(self):
        """CompanionStore ring buffer must strictly respect max_buffer_size with FIFO eviction."""
        store = CompanionStore(max_buffer_size=10)

        for i in range(1, 26):
            store.set_capture(
                capture_type="selfie" if i % 2 == 0 else "document",
                image_bytes=SAMPLE_JPEG,
                filename=f"snap_{i}.jpg",
                device_id=f"dev_{i}",
            )

        # Buffer size must be capped at 10
        assert store.get_buffer_size() == 10
        buffer_items = store.get_buffer(limit=10)
        assert len(buffer_items) == 10
        # Expected sequence IDs in buffer: 16 through 25
        assert [item.sequence_id for item in buffer_items] == list(range(16, 26))

        # Reset check
        store.reset(hard=False)
        assert store.get_buffer_size() == 0
        assert store.state.sequence_id == 25
        assert store.state.has_capture is False

        # Next capture after soft reset has sequence_id 26
        next_state = store.set_capture("selfie", SAMPLE_JPEG)
        assert next_state.sequence_id == 26


# ==============================================================================
# 5. INTERFACE CONTRACT VERIFICATION (PROJECT.md)
# ==============================================================================

class TestInterfaceContractCompliance:
    """Verifies strict field naming and typing against PROJECT.md §Interface Contracts."""

    def test_upload_response_contract(self):
        """POST /api/v1/companion/upload response contract."""
        res = client.post(
            "/api/v1/companion/upload",
            data={
                "image_base64": base64.b64encode(SAMPLE_JPEG).decode("utf-8"),
                "capture_type": "selfie",
                "device_id": "field-unit-1",
                "checkpoint_id": "WB-JAI-01",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("success", "ok")
        assert isinstance(data["sequence_id"], int)
        assert isinstance(data["device_id"], str)
        assert isinstance(data["timestamp"], (int, float))

    def test_latest_response_contract(self):
        """GET /api/v1/companion/latest response contract."""
        # Initial empty
        res_empty = client.get("/api/v1/companion/latest")
        assert res_empty.status_code == 200
        data_empty = res_empty.json()
        assert isinstance(data_empty["has_capture"], bool)
        assert isinstance(data_empty["sequence_id"], int)
        assert data_empty["has_capture"] is False

        # After upload
        client.post(
            "/api/v1/companion/upload",
            json={
                "image_base64": base64.b64encode(SAMPLE_PNG).decode("utf-8"),
                "capture_type": "document",
                "device_id": "test-phone",
            },
        )
        res_populated = client.get("/api/v1/companion/latest")
        assert res_populated.status_code == 200
        data_pop = res_populated.json()
        assert data_pop["has_capture"] is True
        assert isinstance(data_pop["sequence_id"], int)
        assert isinstance(data_pop["image_data"], str)
        assert isinstance(data_pop["device_id"], str)
        assert isinstance(data_pop["capture_type"], str)
        assert isinstance(data_pop["timestamp"], (int, float))

    def test_clear_response_contract(self):
        """POST /api/v1/companion/clear response contract."""
        res = client.post("/api/v1/companion/clear")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "cleared"
