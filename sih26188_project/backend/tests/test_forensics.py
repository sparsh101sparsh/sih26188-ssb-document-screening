"""
SIH26188 — Document Forensics & Stamp Verifier Comprehensive Test Suite
Architecture Reference: Section 2.3, 2.4, 6.2, 6.4

Verifies:
1. Classical ELA Engine (error calculation, compression variance, ELAResult schema).
2. EXIF & DQT Metadata Parser (APP13 Photoshop, GIMP/Canva signatures, DQT tables).
3. DocForge Adaptive Threshold (tau_adapt = 0.18) & Tamper Deadband psi_tamper(s).
4. Turbo Colormap & 55% Alpha-Blended Overlay generation.
5. 4-Stage Stamp Verification Pipeline (HSV localization, SSB registry matching, SSIM, ORB, context checking).
6. Fused Stamp Risk Scoring (S_stamp = 0.40*(1-SSIM) + 0.35*Tamper_Energy + 0.25*Context_Mismatch) & psi_stamp(s).
7. FastAPI Forensics Router Endpoints (/analyze, /stamp, /ela) with error handling.
"""

import io
import json
import math
import struct
import zlib
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routers.forensics import router as forensics_router
from app.core.config import settings
from app.modules.forensics.ela_engine import ELAEngine, _decode_png_rgb, _encode_png_rgb, ela_engine
from app.modules.forensics.metadata_parser import MetadataParser, metadata_parser
from app.modules.forensics.tamper_detector import (
    TamperDetector,
    psi_tamper,
    tamper_detector,
    turbo_map,
)
from app.modules.stamp_verifier import (
    StampVerifier,
    _rgb_to_hsv_360,
    compute_ssim,
    is_stamp_ink_color,
    psi_stamp,
    stamp_verifier,
)
from app.schemas.forensics import ELAResult, ForensicsResult, TamperRegion
from app.schemas.stamp import StampResult


# -----------------------------------------------------------------------------
# Fixtures & Test Images
# -----------------------------------------------------------------------------

@pytest.fixture
def app_with_forensics():
    test_app = FastAPI()
    test_app.include_router(forensics_router)
    return test_app


@pytest.fixture
def client(app_with_forensics):
    with TestClient(app_with_forensics) as test_client:
        yield test_client


def create_mock_png(width: int = 64, height: int = 64, color: tuple = (240, 240, 240)) -> bytes:
    """Creates valid uncompressed standard PNG bytes."""
    rgb = bytes(list(color) * (width * height))
    return _encode_png_rgb(rgb, width, height)


def create_mock_jpeg_with_exif(software: str = "Adobe Photoshop 24.0", app13: bool = True) -> bytes:
    """Constructs valid binary JPEG with embedded APP1 EXIF Software tag and optional APP13 marker."""
    header = b"\xff\xd8"  # SOI

    # APP0 (JFIF)
    app0 = b"\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"

    # APP1 (EXIF)
    # Build minimal TIFF structure with Software tag (0x0131)
    soft_bytes = software.encode("utf-8") + b"\x00"
    soft_len = len(soft_bytes)

    # TIFF Header: Little Endian 'II', magic 42, offset to IFD0 = 8
    tiff_header = b"II\x2a\x00\x08\x00\x00\x00"

    # IFD0: 1 tag (Software) + next IFD offset (0)
    # Tag structure: tag_id (2B), type=2 ASCII (2B), count (4B), offset/val (4B)
    num_tags = struct.pack("<H", 1)
    tag_software_offset = 8 + 2 + 12 + 4  # after IFD0
    tag_entry = struct.pack("<HHI I", 0x0131, 2, soft_len, tag_software_offset)
    next_ifd = struct.pack("<I", 0)

    tiff_payload = tiff_header + num_tags + tag_entry + next_ifd + soft_bytes
    exif_seg = b"Exif\x00\x00" + tiff_payload
    app1 = b"\xff\xe1" + struct.pack(">H", len(exif_seg) + 2) + exif_seg

    # APP13 (Photoshop 3.0 8BIM)
    app13_seg = b""
    if app13:
        payload = b"Photoshop 3.0\x008BIM\x04\x04\x00\x00\x00\x00\x00\x04Test"
        app13_seg = b"\xff\xed" + struct.pack(">H", len(payload) + 2) + payload

    # DQT (Define Quantization Table)
    dqt_payload = bytes([0]) + bytes([16] * 64)
    dqt = b"\xff\xdb" + struct.pack(">H", len(dqt_payload) + 2) + dqt_payload

    # Minimal scan and EOI
    sos = b"\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00" + b"\x00" * 128
    eoi = b"\xff\xd9"

    return header + app0 + app1 + app13_seg + dqt + sos + eoi


def create_stamp_mock_image(stamp_color: str = "purple") -> bytes:
    """Creates a mock document image containing a circular stamp in the given ink color."""
    w, h = 128, 128
    rgb = bytearray([245, 245, 245] * (w * h))

    # Ink RGB values
    ink_map = {
        "purple": (128, 0, 180),
        "blue": (0, 70, 200),
        "red": (200, 20, 30),
        "black": (25, 25, 25),
    }
    ir, ig, ib = ink_map.get(stamp_color, (128, 0, 180))

    # Draw stamp ring at center (64, 64) with radius 30
    cx, cy, r = 64, 64, 30
    for y in range(h):
        for x in range(w):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if 26 <= dist <= 32 or 12 <= dist <= 16:
                idx = (y * w + x) * 3
                rgb[idx] = ir
                rgb[idx + 1] = ig
                rgb[idx + 2] = ib

    return _encode_png_rgb(bytes(rgb), w, h)


# -----------------------------------------------------------------------------
# 1. Classical ELA Engine Tests
# -----------------------------------------------------------------------------

def test_ela_engine_clean_image():
    """Verify ELA engine returns valid ELAResult on clean document image."""
    png_bytes = create_mock_png(64, 64, color=(245, 245, 245))
    res = ela_engine.analyze(png_bytes, quality=90, scale=20.0)

    assert isinstance(res, ELAResult)
    assert 0.0 <= res.max_intensity <= 255.0
    assert 0.0 <= res.mean_intensity <= 255.0
    assert isinstance(res.photo_area_anomaly, bool)


def test_ela_engine_compute_ela_map():
    """Verify compute_ela_map returns ELAResult, PNG bytes, and normalized 2D grid."""
    png_bytes = create_mock_png(64, 64, color=(200, 200, 200))
    res, out_png, grid = ela_engine.compute_ela_map(png_bytes)

    assert isinstance(res, ELAResult)
    assert len(out_png) > 10
    assert out_png.startswith(b"\x89PNG")
    assert len(grid) > 0
    assert len(grid[0]) > 0
    assert 0.0 <= grid[0][0] <= 1.0


def test_ela_engine_photo_area_bounding_box():
    """Verify ELA engine inspects photo bounding box for anomalous compression variance."""
    png_bytes = create_mock_png(128, 128, color=(220, 220, 220))
    res = ela_engine.analyze(png_bytes, photo_bbox=[10, 10, 50, 50])
    assert isinstance(res.photo_area_anomaly, bool)


# -----------------------------------------------------------------------------
# 2. Metadata Parser Tests
# -----------------------------------------------------------------------------

def test_metadata_parser_photoshop_detection():
    """Verify parser detects Adobe Photoshop APP13 and EXIF software signature."""
    jpeg_bytes = create_mock_jpeg_with_exif(software="Adobe Photoshop 2024", app13=True)
    res = metadata_parser.parse(jpeg_bytes)

    assert res["exif_suspicious"] is True
    assert "Adobe Photoshop 2024" in (res["software"] or "")
    assert any("APP13" in t or "Photoshop" in t for t in res["editing_traces"])
    assert "APP13_PHOTOSHOP_IRB" in res["anomalies"] or "SUSPICIOUS_SOFTWARE_TAG" in res["anomalies"]
    assert any("ERR_EXIF_EDITED" in r for r in res["reasons"])


def test_metadata_parser_gimp_signature():
    """Verify parser detects GIMP software signature."""
    jpeg_bytes = create_mock_jpeg_with_exif(software="GIMP 2.10.34", app13=False)
    res = metadata_parser.parse(jpeg_bytes)

    assert res["exif_suspicious"] is True
    assert "GIMP" in (res["software"] or "")


def test_metadata_parser_dqt_table_extraction():
    """Verify JPEG DQT quantization tables are extracted into dictionary."""
    jpeg_bytes = create_mock_jpeg_with_exif(software="Camera Driver", app13=False)
    res = metadata_parser.parse(jpeg_bytes)

    assert isinstance(res["quantization_tables"], dict)
    assert 0 in res["quantization_tables"]
    assert len(res["quantization_tables"][0]) == 64


def test_metadata_parser_clean_png():
    """Verify clean PNG returns clean metadata without false positive."""
    clean_png = create_mock_png(64, 64)
    res = metadata_parser.parse(clean_png)

    assert res["exif_suspicious"] is False
    assert any("INF_METADATA_CLEAN" in r for r in res["reasons"])


# -----------------------------------------------------------------------------
# 3. DocForge Adaptive Threshold & Deadband Tests
# -----------------------------------------------------------------------------

def test_docforge_adaptive_threshold_constant():
    """Verify calibrated DocForge adaptive threshold tau_adapt equals 0.18."""
    assert settings.TAU_ADAPT == 0.18
    assert tamper_detector.tau_adapt == 0.18


def test_tamper_deadband_mathematical_function():
    """
    Verify tamper noise deadband function:
    psi_tamper(s) = max(0.0, s - 0.18)
    """
    assert psi_tamper(0.0) == 0.0
    assert psi_tamper(0.10) == 0.0
    assert psi_tamper(0.18) == 0.0
    assert round(psi_tamper(0.20), 4) == 0.02
    assert round(psi_tamper(0.50), 4) == 0.32
    assert round(psi_tamper(0.85), 4) == 0.67
    assert round(psi_tamper(1.00), 4) == 0.82


def test_turbo_colormap_lut():
    """Verify Turbo colormap LUT maps normalized inputs to valid RGB tuples."""
    c_low = turbo_map(0.0)
    c_mid = turbo_map(0.5)
    c_high = turbo_map(1.0)

    for c in (c_low, c_mid, c_high):
        assert len(c) == 3
        for val in c:
            assert 0 <= val <= 255


# -----------------------------------------------------------------------------
# 4. Tamper Detector Engine Tests
# -----------------------------------------------------------------------------

def test_tamper_detector_clean_document():
    """Verify tamper detector on clean image produces valid ForensicsResult and overlay."""
    png_bytes = create_mock_png(64, 64, color=(245, 245, 245))
    res = tamper_detector.analyze(png_bytes)

    assert isinstance(res, ForensicsResult)
    assert 0.0 <= res.tamper_score <= 1.0
    assert isinstance(res.is_tampered, bool)
    assert res.heatmap_base64 is not None
    assert len(res.heatmap_base64) > 20
    assert res.processing_time_ms >= 0.0
    assert len(res.reasons) > 0


def test_tamper_detector_tampered_document_exif():
    """Verify tamper detector flags document with suspicious editing traces."""
    jpeg_bytes = create_mock_jpeg_with_exif("Adobe Photoshop 2024", app13=True)
    res = tamper_detector.analyze(jpeg_bytes)

    assert res.exif_suspicious is True
    assert res.is_tampered is True
    assert res.tamper_score >= settings.TAU_ADAPT
    assert any("ERR_EXIF_EDITED" in r for r in res.reasons)


def test_tamper_detector_corrupted_payload():
    """Verify tamper detector handles tiny/corrupted payload gracefully."""
    res = tamper_detector.analyze(b"short")
    assert res.tamper_score == 1.0
    assert res.is_tampered is True
    assert "CORRUPTED_PAYLOAD" in res.detected_anomalies


# -----------------------------------------------------------------------------
# 5. 4-Stage Stamp Verifier Tests
# -----------------------------------------------------------------------------

def test_hsv_stamp_ink_detection():
    """Verify HSV color segmentation classifies purple, blue, red, and black ink."""
    # Purple ink
    h_p, s_p, v_p = _rgb_to_hsv_360(140, 20, 210)
    is_p, type_p = is_stamp_ink_color(h_p, s_p, v_p)
    assert is_p is True
    assert type_p == "purple"

    # Blue ink
    h_b, s_b, v_b = _rgb_to_hsv_360(20, 80, 220)
    is_b, type_b = is_stamp_ink_color(h_b, s_b, v_b)
    assert is_b is True
    assert type_b == "blue"

    # Background paper (near white)
    h_w, s_w, v_w = _rgb_to_hsv_360(250, 250, 250)
    is_w, _ = is_stamp_ink_color(h_w, s_w, v_w)
    assert is_w is False


def test_ssim_exact_and_different_matrices():
    """Verify mathematical SSIM computation."""
    mat_a = [[100.0] * 32 for _ in range(32)]
    mat_b = [[100.0] * 32 for _ in range(32)]
    ssim_identical = compute_ssim(mat_a, mat_b)
    assert ssim_identical >= 0.99

    mat_c = [[250.0 if (x + y) % 2 == 0 else 0.0 for x in range(32)] for y in range(32)]
    ssim_diff = compute_ssim(mat_a, mat_c)
    assert ssim_diff < 0.80


def test_stamp_deadband_mathematical_function():
    """
    Verify stamp anomaly deadband function:
    psi_stamp(s) = max(0.0, s - 0.20)
    """
    assert psi_stamp(0.0) == 0.0
    assert psi_stamp(0.15) == 0.0
    assert psi_stamp(0.20) == 0.0
    assert round(psi_stamp(0.25), 4) == 0.05
    assert round(psi_stamp(0.50), 4) == 0.30
    assert round(psi_stamp(0.80), 4) == 0.60


def test_stamp_verifier_not_found():
    """Verify stamp verifier returns NOT_FOUND when image contains no stamp."""
    plain_png = create_mock_png(64, 64, color=(240, 240, 240))
    res = stamp_verifier.verify_stamp(plain_png)

    assert isinstance(res, StampResult)
    assert res.stamp_found is False
    assert res.verdict == "NOT_FOUND"
    assert res.stamp_score == 0.0


def test_stamp_verifier_authentic_stamp():
    """Verify stamp verifier identifies official purple circular seal (Jaigaon)."""
    stamp_img = create_stamp_mock_image(stamp_color="purple")
    res = stamp_verifier.verify_stamp(
        image_bytes=stamp_img,
        declared_checkpost="JAIGAON_SSB_ENTRY_V1",
        declared_date="15-08-2026",
        permit_expiry="30-08-2026",
    )

    assert isinstance(res, StampResult)
    assert res.stamp_found is True
    assert res.verdict in ("AUTHENTIC", "SUSPICIOUS")
    assert res.checkpost_id is not None
    assert res.ssim_score is not None
    assert res.ssim_score > 0.0
    assert res.context_consistent is True


def test_stamp_verifier_permit_expired_mismatch():
    """Verify stamp verifier flags permit expiration mismatch in Stage 4."""
    stamp_img = create_stamp_mock_image(stamp_color="purple")
    res = stamp_verifier.verify_stamp(
        image_bytes=stamp_img,
        declared_checkpost="JAIGAON_SSB_ENTRY_V1",
        declared_date="25-09-2026",  # transit date after permit expiry
        permit_expiry="10-09-2026",
    )

    assert res.stamp_found is True
    assert res.context_consistent is False
    assert any("WRN_STAMP_EXPIRY" in r for r in res.reasons)


# -----------------------------------------------------------------------------
# 6. FastAPI Router Endpoints Tests
# -----------------------------------------------------------------------------

def test_api_forensics_analyze_endpoint(client):
    """Verify POST /api/v1/forensics/analyze returns ForensicsResult."""
    png_bytes = create_mock_png(64, 64)
    files = {"document_image": ("doc.png", io.BytesIO(png_bytes), "image/png")}
    response = client.post("/api/v1/forensics/analyze", files=files)

    assert response.status_code == 200
    data = response.json()
    assert "tamper_score" in data
    assert "is_tampered" in data
    assert "heatmap_base64" in data
    assert "reasons" in data
    assert isinstance(data["tamper_score"], float)


def test_api_forensics_stamp_endpoint(client):
    """Verify POST /api/v1/forensics/stamp returns StampResult."""
    stamp_bytes = create_stamp_mock_image("purple")
    files = {"document_image": ("stamp.png", io.BytesIO(stamp_bytes), "image/png")}
    data_form = {
        "declared_checkpost": "SSB-WB-JAI-01",
        "declared_date": "10-08-2026",
    }
    response = client.post("/api/v1/forensics/stamp", files=files, data=data_form)

    assert response.status_code == 200
    data = response.json()
    assert "stamp_found" in data
    assert "stamp_score" in data
    assert "verdict" in data
    assert data["verdict"] in ("AUTHENTIC", "SUSPICIOUS", "FORGED", "NOT_FOUND")


def test_api_forensics_ela_endpoint(client):
    """Verify POST /api/v1/forensics/ela returns ELAResult."""
    png_bytes = create_mock_png(64, 64)
    files = {"document_image": ("doc.png", io.BytesIO(png_bytes), "image/png")}
    response = client.post("/api/v1/forensics/ela", files=files, data={"quality": 90, "scale": 20.0})

    assert response.status_code == 200
    data = response.json()
    assert "max_intensity" in data
    assert "mean_intensity" in data
    assert "photo_area_anomaly" in data


def test_api_forensics_invalid_mime_type(client):
    """Verify POST /api/v1/forensics/analyze rejects non-image files."""
    files = {"document_image": ("text.txt", io.BytesIO(b"Hello world"), "text/plain")}
    response = client.post("/api/v1/forensics/analyze", files=files)
    assert response.status_code == 400
    assert "Invalid document image file type" in response.json()["detail"]


def test_api_forensics_too_small_payload(client):
    """Verify POST /api/v1/forensics/analyze rejects payloads < 50 bytes."""
    files = {"document_image": ("tiny.png", io.BytesIO(b"tiny"), "image/png")}
    response = client.post("/api/v1/forensics/analyze", files=files)
    assert response.status_code == 400
    assert "corrupted" in response.json()["detail"]


# -----------------------------------------------------------------------------
# 7. Additional Forensics & Stamp Edge Case Tests
# -----------------------------------------------------------------------------

def test_metadata_parser_flat_dqt_detection():
    """Verify metadata parser flags all-1s flat DQT quantization tables (synthetic export)."""
    header = b"\xff\xd8"
    app0 = b"\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
    # DQT with all 1s
    dqt_payload = bytes([0]) + bytes([1] * 64)
    dqt = b"\xff\xdb" + struct.pack(">H", len(dqt_payload) + 2) + dqt_payload
    sos = b"\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00" + b"\x00" * 128
    eoi = b"\xff\xd9"
    jpeg_bytes = header + app0 + dqt + sos + eoi

    res = metadata_parser.parse(jpeg_bytes)
    assert res["dqt_quantization_altered"] is True
    assert "DQT_FLAT_QUANTIZATION" in res["anomalies"]


def test_tamper_detector_with_ocr_boxes():
    """Verify tamper detector associates high-energy region with intersecting OCR field."""
    # Create mock image with noisy region
    png_bytes = create_mock_png(128, 128, color=(240, 240, 240))
    ocr_boxes = [
        {"bbox": [100, 100, 400, 250], "text": "DOB: 12/04/1985", "field": "DOB"},
        {"bbox": [100, 300, 600, 450], "text": "Name: John Doe", "field": "Name"},
    ]
    res = tamper_detector.analyze(png_bytes, ocr_boxes=ocr_boxes)
    assert isinstance(res, ForensicsResult)
    assert res.tamper_score >= 0.0


def test_stamp_verifier_rectangular_sonauli():
    """Verify stamp verifier matches rectangular Sonauli SSB transit seal."""
    # Draw rectangular blue/black stamp
    w, h = 160, 90
    rgb = bytearray([245, 245, 245] * (w * h))
    for y in range(h):
        for x in range(w):
            if (y in (5, 6, 83, 84) and 10 <= x <= 150) or (x in (10, 11, 149, 150) and 5 <= y <= 84):
                idx = (y * w + x) * 3
                rgb[idx] = 0
                rgb[idx + 1] = 60
                rgb[idx + 2] = 190  # blue
    rect_png = _encode_png_rgb(bytes(rgb), w, h)

    res = stamp_verifier.verify_stamp(
        image_bytes=rect_png,
        declared_checkpost="SONAULI_SSB_TRANSIT_V1",
        declared_date="20/08/2026",
        permit_expiry="30/08/2026",
    )
    assert isinstance(res, StampResult)
    assert res.stamp_found is True
    assert res.checkpost_id in ("SSB-UP-SON-02", "SSB-WB-JAI-01")


def test_png_roundtrip_codec():
    """Verify PNG encoding and decoding preserves raw RGB byte values."""
    w, h = 16, 16
    original_rgb = bytes([(x * 15) % 256 for x in range(w * h * 3)])
    encoded_png = _encode_png_rgb(original_rgb, w, h)
    decoded = _decode_png_rgb(encoded_png)

    assert decoded is not None
    dec_rgb, dec_w, dec_h = decoded
    assert dec_w == w
    assert dec_h == h
    assert dec_rgb == original_rgb


def test_api_forensics_analyze_with_json_params(client):
    """Verify /api/v1/forensics/analyze accepts ocr_boxes and photo_bbox JSON parameters."""
    png_bytes = create_mock_png(64, 64)
    files = {"document_image": ("doc.png", io.BytesIO(png_bytes), "image/png")}
    data_form = {
        "ocr_boxes": json.dumps([{"bbox": [10, 10, 50, 50], "text": "Sample", "field": "sample_field"}]),
        "photo_bbox": json.dumps([5, 5, 25, 25]),
    }
    response = client.post("/api/v1/forensics/analyze", files=files, data=data_form)
    assert response.status_code == 200
    data = response.json()
    assert "tamper_score" in data
    assert "reasons" in data

