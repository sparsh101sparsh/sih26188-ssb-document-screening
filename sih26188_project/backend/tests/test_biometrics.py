"""
SIH26188 — Biometrics Test Suite
Comprehensive Verification for:
- Umeyama 5-point canonical affine alignment & similarity transform
- 1:1 Cosine similarity calculation & L2 normalization
- Facial deadband math (psi_face(s) = max(0.0, 0.70 - s))
- Liveness deadband math (psi_live(s) = max(0.0, 0.85 - s))
- SCRFD Face Detector and fallback localization across PNG/JPEG/PPM formats
- AdaFace 512-D Feature Extractor, apparent age estimation, and 1:1 Matcher
- MiniFASNetV2-SE Anti-Spoofing and 2D Fourier spectral analysis
- Biometrics FastAPI REST API Endpoints (/detect, /match, /liveness, /status)
"""

import io
import math
import struct
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routers.biometrics import router as biometrics_router
from app.core.config import settings
from app.modules.biometrics.face_detector import (
    REFERENCE_FACIAL_POINTS_112x112,
    SCRFDFaceDetector,
    align_face_112x112,
    face_detector,
    parse_image_dimensions,
    umeyama_alignment,
)
from app.modules.biometrics.face_matcher import (
    AdaFaceMatcher,
    compute_cosine_similarity,
    compute_face_deadband,
    face_matcher,
)
from app.modules.biometrics.liveness_detector import (
    MiniFASNetLivenessDetector,
    compute_liveness_deadband,
    liveness_detector,
)
from app.schemas.biometrics import (
    BiometricMatchResponse,
    FaceBBox,
    FaceDetectionResult,
    FaceMatchResult,
    LivenessResult,
)


def create_synthetic_face_ppm(width: int = 200, height: int = 200) -> bytes:
    """Generates a valid raw PPM (P6) image byte payload representing a synthetic face."""
    header = f"P6\n{width} {height}\n255\n".encode("ascii")
    pixels = bytearray(width * height * 3)

    for y in range(height):
        for x in range(width):
            idx = (y * width + x) * 3
            # Skin tone base
            r, g, b = 210, 160, 130

            # Left eye area
            if 60 <= x <= 80 and 65 <= y <= 85:
                r, g, b = 40, 30, 20
            # Right eye area
            elif 120 <= x <= 140 and 65 <= y <= 85:
                r, g, b = 40, 30, 20
            # Nose area
            elif 95 <= x <= 105 and 95 <= y <= 120:
                r, g, b = 170, 120, 95
            # Mouth area
            elif 75 <= x <= 125 and 140 <= y <= 155:
                r, g, b = 150, 60, 60

            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b

    return bytes(header + pixels)


def create_synthetic_png_header(width: int = 150, height: int = 150) -> bytes:
    """Creates a minimal synthetic PNG byte stream containing valid IHDR chunk."""
    # PNG signature: 8 bytes
    sig = b"\x89PNG\r\n\x1a\n"
    # IHDR chunk: length (13 bytes), type ('IHDR'), data (w, h, bit_depth, color_type, comp, filter, interlace), crc (4 bytes)
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_chunk = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + b"\x00\x00\x00\x00"
    # Dummy image payload bytes
    dummy_payload = b"\x00" * 300
    return sig + ihdr_chunk + dummy_payload


@pytest.fixture
def test_app() -> FastAPI:
    """Creates a standalone FastAPI test application mounting the biometrics router."""
    app = FastAPI(title="Biometrics Test App")
    app.include_router(biometrics_router)
    return app


@pytest.fixture
def client(test_app: FastAPI) -> TestClient:
    """Provides a TestClient for testing HTTP endpoints."""
    return TestClient(test_app)


# =============================================================================
# 1. Umeyama 5-Point Affine Alignment Tests
# =============================================================================

def test_umeyama_identity_transform():
    """Test that canonical reference points map to themselves with identity transform."""
    src_pts = [list(pt) for pt in REFERENCE_FACIAL_POINTS_112x112]
    m, scale, r, t = umeyama_alignment(src_pts, REFERENCE_FACIAL_POINTS_112x112)

    assert abs(scale - 1.0) < 1e-4
    assert abs(r[0][0] - 1.0) < 1e-4
    assert abs(r[0][1] - 0.0) < 1e-4
    assert abs(r[1][0] - 0.0) < 1e-4
    assert abs(r[1][1] - 1.0) < 1e-4
    assert abs(t[0]) < 1e-4
    assert abs(t[1]) < 1e-4


def test_umeyama_known_scaled_translated_points():
    """Test Umeyama similarity transform recovery on known rotated, scaled, translated points."""
    target_pts = REFERENCE_FACIAL_POINTS_112x112
    true_scale = 2.0
    tx, ty = 50.0, 30.0

    transformed_src = []
    for pt in target_pts:
        transformed_src.append([pt[0] * true_scale + tx, pt[1] * true_scale + ty])

    m, scale, r, t = umeyama_alignment(transformed_src, target_pts)

    assert abs(scale - 0.5) < 1e-3
    for i, pt in enumerate(transformed_src):
        mapped_x = m[0][0] * pt[0] + m[0][1] * pt[1] + m[0][2]
        mapped_y = m[1][0] * pt[0] + m[1][1] * pt[1] + m[1][2]
        assert abs(mapped_x - target_pts[i][0]) < 0.5
        assert abs(mapped_y - target_pts[i][1]) < 0.5


def test_umeyama_known_rotation_points():
    """Test Umeyama recovery under pure 90-degree clockwise rotation."""
    target_pts = REFERENCE_FACIAL_POINTS_112x112
    # 90-deg CW rotation: (x, y) -> (y, -x)
    transformed_src = [[pt[1], -pt[0]] for pt in target_pts]

    m, scale, r, t = umeyama_alignment(transformed_src, target_pts)
    assert abs(scale - 1.0) < 1e-3

    for i, pt in enumerate(transformed_src):
        mapped_x = m[0][0] * pt[0] + m[0][1] * pt[1] + m[0][2]
        mapped_y = m[1][0] * pt[0] + m[1][1] * pt[1] + m[1][2]
        assert abs(mapped_x - target_pts[i][0]) < 0.5
        assert abs(mapped_y - target_pts[i][1]) < 0.5


def test_umeyama_insufficient_points_raises_error():
    """Test that fewer than 3 point correspondences raise a ValueError."""
    with pytest.raises(ValueError):
        umeyama_alignment([[10.0, 20.0], [30.0, 40.0]])


def test_align_face_112x112_fallback():
    """Test align_face_112x112 function returns valid object with arbitrary inputs."""
    landmarks = REFERENCE_FACIAL_POINTS_112x112
    dummy_img = [[10, 20], [30, 40]]
    result = align_face_112x112(dummy_img, landmarks)
    assert result is not None


def test_parse_image_dimensions_png_and_ppm():
    """Test pure-python image dimension parser on PNG and PPM headers."""
    png_data = create_synthetic_png_header(250, 180)
    h, w = parse_image_dimensions(png_data)
    assert h == 180
    assert w == 250

    ppm_data = create_synthetic_face_ppm(320, 240)
    h, w = parse_image_dimensions(ppm_data)
    assert h == 240
    assert w == 320


# =============================================================================
# 2. Cosine Similarity & Deadband Math Tests
# =============================================================================

def test_cosine_similarity_identical_vectors():
    """Test cosine similarity of identical vectors is exactly 1.0."""
    v1 = [0.1, 0.5, 0.8, -0.2, 0.4]
    assert abs(compute_cosine_similarity(v1, v1) - 1.0) < 1e-6


def test_cosine_similarity_orthogonal_vectors():
    """Test cosine similarity of orthogonal vectors is 0.0."""
    v1 = [1.0, 0.0, 0.0]
    v2 = [0.0, 1.0, 0.0]
    assert abs(compute_cosine_similarity(v1, v2) - 0.0) < 1e-6


def test_cosine_similarity_opposite_vectors():
    """Test cosine similarity of opposite vectors is -1.0."""
    v1 = [0.3, -0.4, 0.5]
    v2 = [-0.3, 0.4, -0.5]
    assert abs(compute_cosine_similarity(v1, v2) - (-1.0)) < 1e-6


def test_cosine_similarity_empty_or_zero():
    """Test cosine similarity handles empty and zero vectors gracefully."""
    assert compute_cosine_similarity([], []) == 0.0
    assert compute_cosine_similarity([0.0, 0.0], [1.0, 2.0]) == 0.0
    assert compute_cosine_similarity(None, [1.0, 2.0]) == 0.0


def test_facial_deadband_math():
    """
    Test facial deadband function psi_face(s) = max(0.0, 0.70 - s)
    Architecture Reference: Section 6.2
    """
    assert compute_face_deadband(0.90) == 0.0
    assert compute_face_deadband(0.70) == 0.0
    assert abs(compute_face_deadband(0.50) - 0.20) < 1e-6
    assert abs(compute_face_deadband(0.35) - 0.35) < 1e-6
    assert abs(compute_face_deadband(0.00) - 0.70) < 1e-6
    assert abs(compute_face_deadband(-0.30) - 1.00) < 1e-6


def test_liveness_deadband_math():
    """
    Test liveness deadband function psi_live(s) = max(0.0, 0.85 - s)
    Architecture Reference: Section 6.2
    """
    assert compute_liveness_deadband(0.95) == 0.0
    assert compute_liveness_deadband(0.85) == 0.0
    assert abs(compute_liveness_deadband(0.60) - 0.25) < 1e-6
    assert abs(compute_liveness_deadband(0.00) - 0.85) < 1e-6


# =============================================================================
# 3. Detector, Matcher, and Liveness Engine Tests
# =============================================================================

def test_face_detector_synthetic_image():
    """Test FaceDetector on synthetic image payload."""
    img_bytes = create_synthetic_face_ppm(200, 200)
    result, crops = face_detector.detect_faces(img_bytes)

    assert isinstance(result, FaceDetectionResult)
    assert result.faces_found >= 1
    assert len(result.faces) >= 1
    assert result.primary_face is not None
    assert len(result.primary_face.bbox) == 4
    assert result.processing_time_ms >= 0.0
    assert len(crops) >= 1


def test_face_detector_with_png_payload():
    """Test FaceDetector handles PNG header bytes properly."""
    png_bytes = create_synthetic_png_header(180, 180)
    result, crops = face_detector.detect_faces(png_bytes)

    assert isinstance(result, FaceDetectionResult)
    assert result.faces_found >= 1
    assert result.primary_face is not None
    assert result.primary_face.bbox[2] <= 180
    assert result.primary_face.bbox[3] <= 180


def test_face_matcher_embedding_and_match():
    """Test FaceMatcher embedding extraction and 1:1 matching logic."""
    img_bytes = create_synthetic_face_ppm(112, 112)

    emb1 = face_matcher.extract_embedding(img_bytes)
    assert isinstance(emb1, list)
    assert len(emb1) == 512

    # L2 unit norm check
    norm_sq = sum(x * x for x in emb1)
    assert abs(norm_sq - 1.0) < 1e-3

    # Match identical representations
    match_res = face_matcher.match_faces(img_bytes, img_bytes, threshold=0.35)
    assert isinstance(match_res, FaceMatchResult)
    assert match_res.similarity >= 0.90
    assert match_res.match is True
    assert match_res.threshold == 0.35
    assert match_res.apparent_age_id is not None
    assert match_res.apparent_age_live is not None
    assert match_res.age_drift_years == 0


def test_face_matcher_custom_threshold_rejection():
    """Test FaceMatcher threshold strictness evaluation."""
    img_bytes1 = create_synthetic_face_ppm(112, 112)
    # Modify bytes to create a distinct representation
    img_bytes2 = bytearray(img_bytes1)
    for i in range(50, len(img_bytes2), 2):
        img_bytes2[i] = (img_bytes2[i] + 120) % 256

    # Test with standard threshold vs strict threshold
    match_std = face_matcher.match_faces(img_bytes1, bytes(img_bytes2), threshold=0.35)
    match_strict = face_matcher.match_faces(img_bytes1, bytes(img_bytes2), threshold=0.999)

    assert match_strict.threshold == 0.999
    assert match_strict.match is False  # Must fail on ultra-strict threshold if not bit-exact


def test_liveness_detector_evaluation():
    """Test MiniFASNetLivenessDetector on synthetic image."""
    img_bytes = create_synthetic_face_ppm(160, 160)
    liveness_res = liveness_detector.evaluate_liveness(img_bytes)

    assert isinstance(liveness_res, LivenessResult)
    assert isinstance(liveness_res.is_live, bool)
    assert 0.0 <= liveness_res.confidence <= 1.0
    assert 0.0 <= liveness_res.fourier_anomaly_score <= 1.0
    assert liveness_res.processing_time_ms >= 0.0


# =============================================================================
# 4. FastAPI Router Endpoints Tests
# =============================================================================

def test_biometrics_status_endpoint(client: TestClient):
    """Test GET /api/v1/biometrics/status returns valid model configuration."""
    response = client.get("/api/v1/biometrics/status")
    assert response.status_code == 200
    data = response.json()
    assert "scrfd_detector_loaded" in data
    assert "adaface_matcher_loaded" in data
    assert "minifasnet_liveness_loaded" in data
    assert data["tau_face_match"] == 0.35
    assert data["tau_face_deadband"] == 0.70
    assert data["tau_live_deadband"] == 0.85
    assert isinstance(data["execution_providers"], list)


def test_biometrics_detect_endpoint_valid_image(client: TestClient):
    """Test POST /api/v1/biometrics/detect returns FaceDetectionResult."""
    img_bytes = create_synthetic_face_ppm(200, 200)
    files = {"image": ("test_face.ppm", img_bytes, "image/jpeg")}

    response = client.post("/api/v1/biometrics/detect", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "faces_found" in data
    assert data["faces_found"] >= 1
    assert "faces" in data
    assert "primary_face" in data


def test_biometrics_detect_endpoint_invalid_file_type(client: TestClient):
    """Test POST /api/v1/biometrics/detect rejects non-image mime types."""
    files = {"image": ("test.txt", b"Hello world", "text/plain")}
    response = client.post("/api/v1/biometrics/detect", files=files)
    assert response.status_code == 400


def test_biometrics_liveness_endpoint(client: TestClient):
    """Test POST /api/v1/biometrics/liveness returns LivenessResult."""
    img_bytes = create_synthetic_face_ppm(180, 180)
    files = {"face_image": ("selfie.jpg", img_bytes, "image/jpeg")}

    response = client.post("/api/v1/biometrics/liveness", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "is_live" in data
    assert "confidence" in data
    assert "fourier_anomaly_score" in data


def test_biometrics_match_endpoint(client: TestClient):
    """Test POST /api/v1/biometrics/match executes 1:1 verification and returns BiometricMatchResponse."""
    doc_bytes = create_synthetic_face_ppm(200, 200)
    live_bytes = create_synthetic_face_ppm(200, 200)

    files = {
        "document_image": ("doc_face.jpg", doc_bytes, "image/jpeg"),
        "live_image": ("live_face.jpg", live_bytes, "image/jpeg"),
    }
    data = {
        "threshold": "0.35",
        "check_liveness": "true",
    }

    response = client.post("/api/v1/biometrics/match", files=files, data=data)
    assert response.status_code == 200
    res = response.json()

    assert "match_result" in res
    assert "liveness_result" in res
    assert res["document_face_detected"] is True
    assert res["live_face_detected"] is True
    assert "deadband_penalty" in res
    assert res["match_result"]["similarity"] >= 0.80
    assert res["match_result"]["match"] is True
    assert res["match_result"]["embedding_model_used"] is not None


def test_biometrics_match_endpoint_corrupted_payload(client: TestClient):
    """Test POST /api/v1/biometrics/match with empty payload returns 400 Bad Request."""
    files = {
        "document_image": ("doc_face.jpg", b"short", "image/jpeg"),
        "live_image": ("live_face.jpg", create_synthetic_face_ppm(100, 100), "image/jpeg"),
    }
    response = client.post("/api/v1/biometrics/match", files=files)
    assert response.status_code == 400
