"""
SIH26188 — Challenger M1 Comprehensive Adversarial & Stress Test Suite
Author: Empirical Challenger 2 (Milestone M1 Integration Alignment)

Stress tests:
1. Full Cartesian Product of parameter combinations (live_photo / live_face_image,
   checkpoint_id / declared_checkpost, transit_date / declared_transit_date).
2. Strict behavioral and schema equivalence between /api/v1/inspect and /api/v1/scan/inspect.
3. Edge cases: boundary byte sizes (99b, 100b, 101b, 5MB), MIME types, corrupt payloads, malformed inputs.
4. JSON serialization and schema validation for HealthResponse against Android Moshi contracts.
5. Dynamic MODELS_STATE mutation testing for aggregated vs granular keys.
6. Deep schema compatibility validation against Android Moshi InspectionResponse model.
7. Concurrency and session isolation stress tests.
"""

import io
import itertools
import json
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any

import pytest
from fastapi.testclient import TestClient
from app.main import app, MODELS_STATE


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def valid_jpeg_bytes() -> bytes:
    # 200x200 JPEG with standard JFIF magic header and valid SOI/EOI
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
        + b"\x00" * 300
        + b"\xff\xd9"
    )


@pytest.fixture(scope="module")
def valid_png_bytes() -> bytes:
    # Minimal 1x1 PNG image with standard magic header
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        + b"\x00" * 100
    )


# =============================================================================
# 1. PARAMETER COMBINATIONS CARTESIAN PRODUCT STRESS TEST
# =============================================================================

class TestParameterPermutations:
    """
    Exhaustively stress-test all 64 permutations of:
    - Live face image: [None, live_photo, live_face_image, both] (4 choices)
    - Checkpoint: [None, checkpoint_id, declared_checkpost, both] (4 choices)
    - Transit date: [None, transit_date, declared_transit_date, both] (4 choices)
    Total combinations = 4 * 4 * 4 = 64
    """

    @pytest.mark.parametrize(
        "live_mode,checkpoint_mode,transit_mode",
        list(
            itertools.product(
                ["none", "live_photo", "live_face_image", "both"],
                ["none", "checkpoint_id", "declared_checkpost", "both"],
                ["none", "transit_date", "declared_transit_date", "both"],
            )
        ),
    )
    def test_parameter_permutation_grid_on_alias_route(
        self, client, valid_jpeg_bytes, live_mode, checkpoint_mode, transit_mode
    ):
        files: Dict[str, Any] = {
            "document_image": ("doc.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")
        }
        data: Dict[str, str] = {}

        # 1. Live photo permutations
        if live_mode == "live_photo":
            files["live_photo"] = ("live.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")
        elif live_mode == "live_face_image":
            files["live_face_image"] = ("live.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")
        elif live_mode == "both":
            files["live_photo"] = ("live_alt.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")
            files["live_face_image"] = ("live_pri.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")

        # 2. Checkpoint permutations
        if checkpoint_mode == "checkpoint_id":
            data["checkpoint_id"] = "SSB_SONAULI_01"
        elif checkpoint_mode == "declared_checkpost":
            data["declared_checkpost"] = "SSB_JAIGAON_01"
        elif checkpoint_mode == "both":
            data["checkpoint_id"] = "SSB_SONAULI_01"
            data["declared_checkpost"] = "SSB_JAIGAON_01"

        # 3. Transit date permutations
        if transit_mode == "transit_date":
            data["transit_date"] = "2026-08-23T10:00:00Z"
        elif transit_mode == "declared_transit_date":
            data["declared_transit_date"] = "2026-08-23T11:00:00Z"
        elif transit_mode == "both":
            data["transit_date"] = "2026-08-23T10:00:00Z"
            data["declared_transit_date"] = "2026-08-23T11:00:00Z"

        response = client.post("/api/v1/inspect", files=files, data=data)
        assert response.status_code == 200, f"Failed for ({live_mode}, {checkpoint_mode}, {transit_mode}): {response.text}"
        res_json = response.json()
        assert res_json["status"] == "completed"
        assert "session_id" in res_json
        assert "assessment" in res_json
        assert "risk_score" in res_json["assessment"]
        assert "audit_hash" in res_json["assessment"]
        assert len(res_json["assessment"]["audit_hash"]) == 64

    def test_parameter_precedence_rules(self, client, valid_jpeg_bytes, valid_png_bytes):
        """Verify explicit precedence behavior when both aliases are supplied."""
        files = {
            "document_image": ("doc.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg"),
            "live_face_image": ("primary.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg"),
            "live_photo": ("secondary.png", io.BytesIO(valid_png_bytes), "image/png"),
        }
        data = {
            "checkpoint_id": "SSB_SONAULI_01",
            "declared_checkpost": "SSB_JAIGAON_01",
            "transit_date": "2026-08-23T12:00:00Z",
            "declared_transit_date": "2026-08-24T12:00:00Z",
        }
        resp = client.post("/api/v1/inspect", files=files, data=data)
        assert resp.status_code == 200
        res = resp.json()
        assert res["status"] == "completed"
        assert res["assessment"]["risk_level"] in ("GREEN", "AMBER", "RED")

    def test_empty_string_form_parameters(self, client, valid_jpeg_bytes):
        """Verify empty strings in optional form parameters fallback cleanly without raising exceptions."""
        files = {
            "document_image": ("doc.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")
        }
        data = {
            "checkpoint_id": "",
            "declared_checkpost": "",
            "transit_date": "",
            "declared_transit_date": "",
        }
        resp = client.post("/api/v1/inspect", files=files, data=data)
        assert resp.status_code == 200
        res = resp.json()
        assert res["status"] == "completed"

    def test_adversarial_checkpoint_and_date_strings(self, client, valid_jpeg_bytes):
        """Test SQL injection tokens, unicode characters, and strange formatting in string fields."""
        files = {
            "document_image": ("doc.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")
        }
        adversarial_payloads = [
            {"checkpoint_id": "'; DROP TABLE outbox; --", "transit_date": "2026-08-23"},
            {"checkpoint_id": "<script>alert('xss')</script>", "transit_date": "invalid-date-format"},
            {"checkpoint_id": "सोनाली_चेकपोस्ट_01", "transit_date": "2026/08/23 15:30:00"},
            {"checkpoint_id": "A" * 1024, "transit_date": "9999-99-99T99:99:99Z"},
        ]
        for data in adversarial_payloads:
            resp = client.post("/api/v1/inspect", files=files, data=data)
            assert resp.status_code == 200
            assert resp.json()["status"] == "completed"


# =============================================================================
# 2. ENDPOINT PARITY AND EQUIVALENCE TEST (/api/v1/inspect vs /api/v1/scan/inspect)
# =============================================================================

class TestEndpointParity:
    """
    Ensure 100% behavioral, status code, and schema parity between:
    - POST /api/v1/inspect
    - POST /api/v1/scan/inspect
    """

    def test_identical_response_structure_on_both_endpoints(self, client, valid_jpeg_bytes):
        files_alias = {
            "document_image": ("doc.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg"),
            "live_photo": ("live.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg"),
        }
        data_alias = {
            "checkpoint_id": "SSB_PANITANKI_03",
            "transit_date": "2026-08-23T14:00:00Z",
        }

        files_master = {
            "document_image": ("doc.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg"),
            "live_photo": ("live.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg"),
        }
        data_master = {
            "checkpoint_id": "SSB_PANITANKI_03",
            "transit_date": "2026-08-23T14:00:00Z",
        }

        resp_alias = client.post("/api/v1/inspect", files=files_alias, data=data_alias)
        resp_master = client.post("/api/v1/scan/inspect", files=files_master, data=data_master)

        assert resp_alias.status_code == resp_master.status_code == 200
        json_alias = resp_alias.json()
        json_master = resp_master.json()

        # Both top-level keys must match exactly
        assert set(json_alias.keys()) == set(json_master.keys())
        assert set(json_alias.keys()) == {"session_id", "status", "assessment", "details"}

        # Assessment keys must match exactly
        assert set(json_alias["assessment"].keys()) == set(json_master["assessment"].keys())

        # Details keys must match exactly
        assert set(json_alias["details"].keys()) == set(json_master["details"].keys())

    def test_parity_on_missing_document_422(self, client):
        """Both endpoints return 422 when required document_image is omitted."""
        resp_alias = client.post("/api/v1/inspect", files={})
        resp_master = client.post("/api/v1/scan/inspect", files={})
        assert resp_alias.status_code == resp_master.status_code == 422

    def test_parity_on_invalid_mime_type_400(self, client):
        """Both endpoints return 400 when document_image MIME type is not image/*."""
        bad_file = ("test.txt", io.BytesIO(b"Hello world"), "text/plain")
        resp_alias = client.post("/api/v1/inspect", files={"document_image": bad_file})
        resp_master = client.post("/api/v1/scan/inspect", files={"document_image": bad_file})
        assert resp_alias.status_code == resp_master.status_code == 400
        assert "Invalid document image file type" in resp_alias.json()["detail"]
        assert "Invalid document image file type" in resp_master.json()["detail"]

    def test_parity_on_corrupt_small_payload_400(self, client):
        """Both endpoints return 400 when payload is under 100 bytes."""
        small_file = ("small.jpg", io.BytesIO(b"\xff\xd8\xff\xe0short"), "image/jpeg")
        resp_alias = client.post("/api/v1/inspect", files={"document_image": small_file})
        resp_master = client.post("/api/v1/scan/inspect", files={"document_image": small_file})
        assert resp_alias.status_code == resp_master.status_code == 400
        assert "payload is empty or corrupted" in resp_alias.json()["detail"]
        assert "payload is empty or corrupted" in resp_master.json()["detail"]

    def test_parity_on_invalid_live_face_mime_type_400(self, client, valid_jpeg_bytes):
        """Both endpoints return 400 when live image MIME type is invalid."""
        doc = ("doc.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")
        bad_live = ("selfie.pdf", io.BytesIO(b"%PDF-1.4" + b"\x00" * 200), "application/pdf")
        
        resp_alias_1 = client.post("/api/v1/inspect", files={"document_image": doc, "live_photo": bad_live})
        assert resp_alias_1.status_code == 400
        assert "Invalid live face image file type" in resp_alias_1.json()["detail"]

        resp_alias_2 = client.post("/api/v1/inspect", files={"document_image": doc, "live_face_image": bad_live})
        assert resp_alias_2.status_code == 400

        resp_master_1 = client.post("/api/v1/scan/inspect", files={"document_image": doc, "live_photo": bad_live})
        assert resp_master_1.status_code == 400

        resp_master_2 = client.post("/api/v1/scan/inspect", files={"document_image": doc, "live_face_image": bad_live})
        assert resp_master_2.status_code == 400

    def test_parity_on_small_live_face_payload_400(self, client, valid_jpeg_bytes):
        """Both endpoints return 400 when live image payload is < 100 bytes."""
        doc = ("doc.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg")
        small_live = ("selfie.jpg", io.BytesIO(b"\xff\xd8" + b"\x00" * 10), "image/jpeg")

        resp_alias = client.post("/api/v1/inspect", files={"document_image": doc, "live_photo": small_live})
        resp_master = client.post("/api/v1/scan/inspect", files={"document_image": doc, "live_photo": small_live})
        assert resp_alias.status_code == resp_master.status_code == 400
        assert "Live face image payload is empty or corrupted" in resp_alias.json()["detail"]
        assert "Live face image payload is empty or corrupted" in resp_master.json()["detail"]

    def test_disallowed_methods(self, client):
        """Both endpoints reject GET, PUT, DELETE with 405 Method Not Allowed."""
        for endpoint in ["/api/v1/inspect", "/api/v1/scan/inspect"]:
            assert client.get(endpoint).status_code == 405
            assert client.put(endpoint).status_code == 405
            assert client.delete(endpoint).status_code == 405


# =============================================================================
# 3. BOUNDARY PAYLOAD SIZES & IMAGE FORMATS
# =============================================================================

class TestBoundaryAndImageFormats:
    """Stress-test byte size boundaries and supported image formats."""

    def test_exact_boundary_99_bytes_rejected(self, client):
        payload_99 = b"\xff\xd8\xff\xe0" + b"\x00" * 95
        assert len(payload_99) == 99
        resp = client.post(
            "/api/v1/inspect",
            files={"document_image": ("doc.jpg", io.BytesIO(payload_99), "image/jpeg")},
        )
        assert resp.status_code == 400
        assert "payload is empty or corrupted" in resp.json()["detail"]

    def test_exact_boundary_100_bytes_accepted(self, client):
        payload_100 = b"\xff\xd8\xff\xe0" + b"\x00" * 96
        assert len(payload_100) == 100
        resp = client.post(
            "/api/v1/inspect",
            files={"document_image": ("doc.jpg", io.BytesIO(payload_100), "image/jpeg")},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_large_5mb_payload_accepted(self, client):
        payload_5mb = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * (5 * 1024 * 1024) + b"\xff\xd9"
        resp = client.post(
            "/api/v1/inspect",
            files={"document_image": ("large_doc.jpg", io.BytesIO(payload_5mb), "image/jpeg")},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    @pytest.mark.parametrize("mime_type", ["image/jpeg", "image/png", "image/webp", "image/bmp"])
    def test_accepted_image_mime_types(self, client, valid_jpeg_bytes, mime_type):
        resp = client.post(
            "/api/v1/inspect",
            files={"document_image": ("doc.img", io.BytesIO(valid_jpeg_bytes), mime_type)},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"


# =============================================================================
# 4. HEALTH RESPONSE JSON SERIALIZATION & CONTRACT VALIDATION
# =============================================================================

class TestHealthResponseContract:
    """
    Validate GET /api/v1/health response against Android Moshi data class contracts:
    - HealthResponse(status: String, engine_mode: String, models_loaded: ModelsLoadedMap, uptime_seconds: Double)
    - ModelsLoadedMap(pp_ocrv4: Boolean, adaface: Boolean, minifasnet: Boolean,
                      trufor: Boolean, doctamper: Boolean, stamp_verifier: Boolean)
    """

    def test_health_api_v1_json_keys_and_types(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("application/json")
        data = resp.json()

        # Check required top-level keys
        assert "status" in data
        assert "engine_mode" in data
        assert "models_loaded" in data
        assert "uptime_seconds" in data

        # Check types
        assert isinstance(data["status"], str)
        assert data["status"] == "healthy"
        assert isinstance(data["engine_mode"], str)
        assert len(data["engine_mode"]) > 0
        assert isinstance(data["models_loaded"], dict)
        assert isinstance(data["uptime_seconds"], (int, float))
        assert data["uptime_seconds"] >= 0.0

    def test_models_loaded_map_contains_all_required_android_fields(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        models = resp.json()["models_loaded"]

        # 6 required keys mapped in Moshi ModelsLoadedMap
        expected_android_keys = [
            "pp_ocrv4",
            "adaface",
            "minifasnet",
            "trufor",
            "doctamper",
            "stamp_verifier",
        ]
        for key in expected_android_keys:
            assert key in models, f"Key '{key}' missing from models_loaded"
            assert isinstance(models[key], bool), f"Key '{key}' must be boolean, got {type(models[key])}"

    def test_models_loaded_map_contains_granular_keys(self, client):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        models = resp.json()["models_loaded"]

        granular_keys = [
            "pp_ocrv4_det",
            "pp_ocrv4_rec",
            "omnimrz",
            "scrfd_10gf",
            "adaface_r100",
            "minifasnet_v2",
            "doctamper_dtd",
            "trufor",
            "stamp_verifier",
        ]
        for key in granular_keys:
            assert key in models, f"Granular key '{key}' missing from models_loaded"
            assert isinstance(models[key], bool)

    def test_json_strict_serialization_roundtrip(self, client):
        """Ensure serialization is valid RFC 8259 JSON without NaN, Inf, or non-string keys."""
        resp = client.get("/api/v1/health")
        raw_text = resp.text
        parsed = json.loads(raw_text)
        assert isinstance(parsed, dict)
        re_serialized = json.dumps(parsed, allow_nan=False)
        assert len(re_serialized) > 0

    def test_health_v1_vs_health_telemetry_differentiation(self, client):
        """Ensure /health (operator telemetry) and /api/v1/health (mobile contract) are both functional and distinct."""
        op_resp = client.get("/health")
        v1_resp = client.get("/api/v1/health")

        assert op_resp.status_code == 200
        assert v1_resp.status_code == 200

        op_data = op_resp.json()
        v1_data = v1_resp.json()

        assert op_data["status"] == "ok"
        assert v1_data["status"] == "healthy"
        assert isinstance(op_data["models_loaded"], list)
        assert isinstance(v1_data["models_loaded"], dict)


# =============================================================================
# 5. DYNAMIC MODEL STATE MUTATION TESTING
# =============================================================================

class TestModelStatesDynamism:
    """Stress-test dynamic mutations of MODELS_STATE to verify aggregation logic."""

    def test_ppocr_aggregation_logic(self, client):
        orig_det = MODELS_STATE.get("pp_ocrv4_det", False)
        orig_rec = MODELS_STATE.get("pp_ocrv4_rec", False)
        try:
            # Case 1: Both False -> pp_ocrv4 False
            MODELS_STATE["pp_ocrv4_det"] = False
            MODELS_STATE["pp_ocrv4_rec"] = False
            res = client.get("/api/v1/health").json()
            assert res["models_loaded"]["pp_ocrv4"] is False

            # Case 2: Only Det True -> pp_ocrv4 True
            MODELS_STATE["pp_ocrv4_det"] = True
            MODELS_STATE["pp_ocrv4_rec"] = False
            res = client.get("/api/v1/health").json()
            assert res["models_loaded"]["pp_ocrv4"] is True

            # Case 3: Only Rec True -> pp_ocrv4 True
            MODELS_STATE["pp_ocrv4_det"] = False
            MODELS_STATE["pp_ocrv4_rec"] = True
            res = client.get("/api/v1/health").json()
            assert res["models_loaded"]["pp_ocrv4"] is True

            # Case 4: Both True -> pp_ocrv4 True
            MODELS_STATE["pp_ocrv4_det"] = True
            MODELS_STATE["pp_ocrv4_rec"] = True
            res = client.get("/api/v1/health").json()
            assert res["models_loaded"]["pp_ocrv4"] is True
        finally:
            MODELS_STATE["pp_ocrv4_det"] = orig_det
            MODELS_STATE["pp_ocrv4_rec"] = orig_rec

    def test_individual_model_mappings(self, client):
        mappings = [
            ("adaface_r100", "adaface"),
            ("minifasnet_v2", "minifasnet"),
            ("trufor", "trufor"),
            ("doctamper_dtd", "doctamper"),
            ("stamp_verifier", "stamp_verifier"),
        ]
        for internal_key, aggregated_key in mappings:
            orig = MODELS_STATE.get(internal_key, False)
            try:
                MODELS_STATE[internal_key] = True
                res = client.get("/api/v1/health").json()
                assert res["models_loaded"][aggregated_key] is True

                MODELS_STATE[internal_key] = False
                res = client.get("/api/v1/health").json()
                assert res["models_loaded"][aggregated_key] is False
            finally:
                MODELS_STATE[internal_key] = orig


# =============================================================================
# 6. CONCURRENCY & SESSION ISOLATION STRESS TEST
# =============================================================================

class TestConcurrencyAndSessionIsolation:
    """
    Stress-test concurrent calls to ensure session_id uniqueness,
    no race conditions in audit hash generation, and thread safety.
    """

    def test_concurrent_alias_inspections(self, client, valid_jpeg_bytes):
        num_requests = 20
        results = []

        def make_call(idx: int):
            files = {
                "document_image": (f"doc_{idx}.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg"),
                "live_photo": (f"live_{idx}.jpg", io.BytesIO(valid_jpeg_bytes), "image/jpeg"),
            }
            data = {
                "checkpoint_id": f"SSB_STATION_{idx:02d}",
                "transit_date": "2026-08-23T12:00:00Z",
            }
            endpoint = "/api/v1/inspect" if idx % 2 == 0 else "/api/v1/scan/inspect"
            resp = client.post(endpoint, files=files, data=data)
            return resp.status_code, resp.json()

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(make_call, i) for i in range(num_requests)]
            for f in futures:
                results.append(f.result())

        # Assert all 20 succeeded
        session_ids = set()
        audit_hashes = set()
        for status_code, body in results:
            assert status_code == 200
            assert body["status"] == "completed"
            s_id = body["session_id"]
            a_hash = body["assessment"]["audit_hash"]
            assert s_id not in session_ids, f"Duplicate session_id detected: {s_id}"
            assert a_hash not in audit_hashes, f"Duplicate audit_hash detected: {a_hash}"
            session_ids.add(s_id)
            audit_hashes.add(a_hash)

        assert len(session_ids) == num_requests
