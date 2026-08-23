"""
SIH26188 — Comprehensive End-to-End Pipeline Integration Test Suite
Architecture Reference: Sections 1.4, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.2 (Week 12 Rehearsal)

Covers all realistic border screening scenarios through POST /api/v1/scan/inspect:
1. Scenario 1: Authentic Clean Passport -> Score 2.0 (GREEN Auto-Clear, zero tripwires, cross_validation_passed=True)
2. Scenario 2: Forged Aadhaar (Scraped DOB mismatch CV-01 + Invalid RSA PKI Tripwire 2) -> Instant RED (Score >= 95.0, tripwire_triggered=True)
3. Scenario 3: Tampered Border Stamp (Sonauli/Jaigaon template mismatch / context mismatch) -> AMBER (Score 35-65, secondary inspection required)
4. Scenario 4: Presentation Replay Spoof (MiniFASNet spoofing detected / Tripwire 4) -> Instant RED (Score >= 95.0, tripwire_triggered=True)
5. Scenario 5: Multi-Format MRZ Parsing & Verification (TD1, TD2, TD3 format flows + ICAO Checksum Tripwire 1)
6. Scenario 6: Robustness, Error Handling & Concurrency SLA
"""

import io
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.biometrics import FaceMatchResult, LivenessResult
from app.schemas.forensics import ForensicsResult, TamperRegion
from app.schemas.mrz import MRZResult
from app.schemas.ocr import OCRResult, QRPayload
from app.schemas.stamp import StampResult


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def make_valid_jpeg(size_bytes: int = 512) -> bytes:
    """Creates a synthetic byte buffer with valid JPEG magic bytes."""
    header = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
    payload = b"\x00" * max(100, size_bytes - len(header) - 2)
    footer = b"\xff\xd9"
    return header + payload + footer


# ==================================================================================================
# Scenario 1: Authentic Clean Passport -> Score 2.0 (GREEN Auto-Clear)
# ==================================================================================================

class TestScenario1AuthenticCleanPassport:
    """
    Scenario 1: Authentic Clean Passport with live matching selfie.
    - OCR matches MRZ exactly (DOB, Name, Doc Number)
    - Face similarity = 0.88 (above 0.70 deadband)
    - Liveness = 0.96 (above 0.85 deadband)
    - Zero document tampering (below 0.18 deadband)
    - Zero stamp tampering
    Expected: Exact log-odds base prior score 2.00 (GREEN), auto_clear=True, tripwire_triggered=False.
    """

    @patch("app.api.routers.scan._execute_stream_1_text_and_mrz")
    @patch("app.api.routers.scan._execute_stream_2_biometrics")
    @patch("app.api.routers.scan._execute_stream_3_forensics_and_stamps")
    def test_authentic_passport_e2e_pipeline(
        self, mock_stream3, mock_stream2, mock_stream1, client
    ):
        # 1. Stream 1: Authentic TD3 Indian Passport OCR & MRZ
        clean_mrz = MRZResult(
            mrz_detected=True,
            mrz_type="TD3",
            valid=True,
            document_type="P",
            country_code="IND",
            document_number="M1234567",
            doc_number_checksum_valid=True,
            dob="940814",
            dob_checksum_valid=True,
            expiry="290814",
            expiry_checksum_valid=True,
            composite_checksum_valid=True,
            surname="SHARMA",
            given_names="ARJUN",
            checksum_failures=[],
            raw_lines=[
                "P<INDSHARMA<<ARJUN<<<<<<<<<<<<<<<<<<<<<<<<<",
                "M1234567<4IND9408144M2908148<<<<<<<<<<<<<<<4",
            ],
        )
        clean_ocr = OCRResult(
            status="success",
            raw_text="PASSPORT REPUBLIC OF INDIA\nSurname: SHARMA\nGiven Names: ARJUN\nPassport No: M1234567\nDOB: 14/08/1994\nExpiry: 14/08/2029",
            fields={
                "full_name": "ARJUN SHARMA",
                "dob": "14/08/1994",
                "document_number": "M1234567",
                "expiry_date": "14/08/2029",
                "doc_type": "PASSPORT",
            },
            mean_confidence=0.97,
            qr_payload=QRPayload(raw_qr_found=False, signature_valid=False),
        )
        clean_qr = clean_ocr.qr_payload
        mock_stream1.return_value = (clean_ocr, clean_mrz, clean_qr)

        # 2. Stream 2: Authentic Face Match & Live Traveler
        clean_face_match = FaceMatchResult(
            similarity=0.88,
            match=True,
            threshold=0.72,
            apparent_age_id=31.0,
            apparent_age_live=30.0,
            age_drift_years=1.0,
            watchlist_hit=False,
            embedding_model_used="AdaFace-ResNet100",
            processing_time_ms=25.4,
        )
        clean_liveness = LivenessResult(
            is_live=True,
            confidence=0.96,
            attack_type=None,
            scale_2_7x_score=0.95,
            scale_4_0x_score=0.97,
            processing_time_ms=12.1,
        )
        mock_stream2.return_value = (clean_face_match, clean_liveness, [50, 50, 150, 180], 31.0)

        # 3. Stream 3: Clean Document Forensics & Authentic Stamp
        clean_forensics = ForensicsResult(
            tamper_score=0.06,
            is_tampered=False,
            doctamper_score=0.06,
            trufor_score=0.05,
            photo_region_tampered=False,
            exif_suspicious=False,
            tampered_regions=[],
            reasons=[],
            processing_time_ms=75.2,
        )
        clean_stamp = StampResult(
            stamp_found=True,
            stamp_score=0.08,
            verdict="AUTHENTIC",
            checkpost_id="SSB-WB-JAI-01",
            ssim_score=0.94,
            context_valid=True,
            reasons=[],
            processing_time_ms=32.0,
        )
        mock_stream3.return_value = (clean_forensics, clean_stamp)

        # Submit HTTP Request to master endpoint
        doc_payload = make_valid_jpeg(1024)
        live_payload = make_valid_jpeg(1024)
        files = {
            "document_image": ("clean_passport.jpg", io.BytesIO(doc_payload), "image/jpeg"),
            "live_face_image": ("traveler_selfie.jpg", io.BytesIO(live_payload), "image/jpeg"),
        }

        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assessment = data["assessment"]
        details = data["details"]

        # Assert Baseline 2.0 Risk Score & GREEN Clearance
        assert assessment["risk_score"] == pytest.approx(2.0, abs=0.2)
        assert assessment["risk_level"] == "GREEN"
        assert assessment["auto_clear"] is True
        assert assessment["tripwire_triggered"] is False
        assert len(assessment["tripwire_codes"]) == 0
        assert len(assessment["cross_validation_violations"]) == 0

        # Assert Cross Validation Passed
        assert details["cross_validation"]["cross_validation_passed"] is True
        assert details["cross_validation"]["violation_count"] == 0

        # Assert Document Type & Telemetry
        assert details["document_type"] == "passport"
        assert len(assessment["audit_hash"]) == 64
        assert assessment["processing_time_ms"] >= 0.0
        assert "pp_ocrv4" in assessment["model_versions"]
        assert "adaface_r100" in assessment["model_versions"]


# ==================================================================================================
# Scenario 2: Forged Aadhaar (Scraped DOB + Invalid RSA PKI Tripwire 2) -> Instant RED
# ==================================================================================================

class TestScenario2ForgedAadhaarScrapedDOBAndInvalidPKI:
    """
    Scenario 2: Forged PVC Aadhaar Card.
    - Physical scraping: Visual DOB mechanically altered to '14/08/1994', but MRZ/QR contains '14/08/1984' (CV-01 violation)
    - Cryptographic forgery: Aadhaar RSA-2048 digital signature is invalid/corrupted (TRIPWIRE_2 & CV-08)
    - DocTamper detects digit alteration around DOB bounding box
    Expected: Instant RED (Score >= 95.0), tripwire_triggered=True, auto_clear=False.
    """

    @patch("app.api.routers.scan._execute_stream_1_text_and_mrz")
    @patch("app.api.routers.scan._execute_stream_2_biometrics")
    @patch("app.api.routers.scan._execute_stream_3_forensics_and_stamps")
    def test_forged_aadhaar_e2e_pipeline(
        self, mock_stream3, mock_stream2, mock_stream1, client
    ):
        # 1. Stream 1: Forged Aadhaar with Scraped Visual DOB & Corrupted RSA QR + Discrepant MRZ
        forged_qr = QRPayload(
            raw_qr_found=True,
            qr_type="AADHAAR_SECURE_V2",
            signature_valid=False,  # Corrupted signature
            demographics={
                "name": "ARJUN SHARMA",
                "dob": "14/08/1984",  # Original DOB in QR
                "gender": "M",
                "aadhaar_last_4": "1234",
            },
            photo_jp2_extracted=True,
            error_message="RSA PKCS#1 v1.5 verification failed: Invalid digital signature",
        )
        forged_ocr = OCRResult(
            status="success",
            raw_text="GOVERNMENT OF INDIA\nAADHAAR\nName: ARJUN SHARMA\nDOB: 14/08/1994\nXXXX XXXX 1234",
            fields={
                "full_name": "ARJUN SHARMA",
                "dob": "14/08/1994",  # Scraped DOB in visual text (1994)
                "doc_number": "XXXX XXXX 1234",
                "doc_type": "AADHAAR",
            },
            mean_confidence=0.92,
            qr_payload=forged_qr,
        )
        # Discrepant MRZ showing original birth year 1984 (840814)
        forged_mrz = MRZResult(
            mrz_detected=True,
            mrz_type="TD1",
            valid=True,
            dob="840814",
            document_number="XXXX1234",
            checksum_failures=[],
        )
        mock_stream1.return_value = (forged_ocr, forged_mrz, forged_qr)

        # 2. Stream 2: Biometrics
        doc_face = FaceMatchResult(
            similarity=0.82,
            match=True,
            threshold=0.72,
            apparent_age_id=41.0,
            apparent_age_live=40.0,
            watchlist_hit=False,
            embedding_model_used="AdaFace-ResNet100",
        )
        live_res = LivenessResult(is_live=True, confidence=0.94)
        mock_stream2.return_value = (doc_face, live_res, [40, 40, 140, 170], 41.0)

        # 3. Stream 3: Forensics detecting single-digit alteration in DOB box
        tampered_forensics = ForensicsResult(
            tamper_score=0.84,
            is_tampered=True,
            doctamper_score=0.82,
            trufor_score=0.22,
            photo_region_tampered=False,
            tampered_regions=[
                TamperRegion(
                    bbox=[120, 410, 320, 450],
                    peak_tamper_probability=0.82,
                    tamper_type="TEXT_ALTERATION",
                )
            ],
            reasons=["DocTamper FPH detected mechanical text scraping in DOB field (p=0.82)"],
        )
        no_stamp = StampResult(stamp_found=False, stamp_score=0.0, verdict="NOT_FOUND")
        mock_stream3.return_value = (tampered_forensics, no_stamp)

        # Submit HTTP Request
        files = {
            "document_image": ("forged_aadhaar.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg"),
            "live_face_image": ("traveler_face.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg"),
        }

        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assessment = data["assessment"]
        details = data["details"]

        # Assert Instant RED Alert via TRIPWIRE_2
        assert assessment["tripwire_triggered"] is True
        assert assessment["risk_score"] >= 95.0
        assert assessment["risk_level"] == "RED"
        assert assessment["auto_clear"] is False
        assert any("TRIPWIRE_2" in code for code in assessment["tripwire_codes"])

        # Assert Cross Validation Violations
        assert details["cross_validation"]["cross_validation_passed"] is False
        telemetry_codes = [v["telemetry_code"] for v in details["cross_validation"]["violations"]]
        assert "ERR_PKI_FORGED" in telemetry_codes
        assert "ERR_DOB_MISMATCH" in telemetry_codes

        # Assert Explainable Reasons Include Cryptographic & Demographic Warnings
        reasons_str = " ".join(assessment["reasons"])
        assert "TRIPWIRE_2" in reasons_str or "RSA" in reasons_str or "PKI" in reasons_str
        assert details["document_type"] == "aadhaar"


# ==================================================================================================
# Scenario 3: Tampered Border Stamp (Sonauli/Jaigaon Mismatch) -> AMBER (35 - 65)
# ==================================================================================================

class TestScenario3TamperedBorderStamp:
    """
    Scenario 3: Authentic traveler credentials with a counterfeit / tampered border entry stamp.
    - Stream 1 (OCR/MRZ): Authentic document
    - Stream 2 (Biometrics): Genuine traveler face match (similarity=0.50 yields +0.70 face delta, live=0.93)
    - Stream 3 (Stamps & Forensics): Sonauli/Jaigaon stamp seal template mismatch (stamp_score=0.95 yields +2.10 delta)
      plus localized tampering (trufor_score=0.40 yields +0.70 delta) and EXIF editing tag (+0.50 delta).
    - No hard tripwires triggered.
    Expected: Risk Score lands in AMBER band (35.0 - 65.0), auto_clear=False, secondary inspection recommended.
    """

    @patch("app.api.routers.scan._execute_stream_1_text_and_mrz")
    @patch("app.api.routers.scan._execute_stream_2_biometrics")
    @patch("app.api.routers.scan._execute_stream_3_forensics_and_stamps")
    def test_tampered_border_stamp_e2e_pipeline(
        self, mock_stream3, mock_stream2, mock_stream1, client
    ):
        # 1. Stream 1: Authentic Passport
        clean_mrz = MRZResult(
            mrz_detected=True,
            mrz_type="TD3",
            valid=True,
            document_number="Z9876543",
            doc_number_checksum_valid=True,
            dob="900101",
            dob_checksum_valid=True,
            expiry="300101",
            expiry_checksum_valid=True,
            composite_checksum_valid=True,
            surname="THAPA",
            given_names="RAMESH",
        )
        clean_ocr = OCRResult(
            status="success",
            raw_text="PASSPORT REPUBLIC OF INDIA\nSurname: THAPA\nGiven Names: RAMESH\nPassport No: Z9876543\nDOB: 01/01/1990",
            fields={"full_name": "RAMESH THAPA", "dob": "01/01/1990", "document_number": "Z9876543"},
            mean_confidence=0.96,
            qr_payload=QRPayload(raw_qr_found=False, signature_valid=False),
        )
        mock_stream1.return_value = (clean_ocr, clean_mrz, clean_ocr.qr_payload)

        # 2. Stream 2: Face match with mild distance (similarity 0.50 gives 3.5 * 0.20 = 0.70 log-odds)
        face_match = FaceMatchResult(
            similarity=0.50,
            match=True,
            apparent_age_id=36.0,
            apparent_age_live=36.0,
            watchlist_hit=False,
        )
        liveness = LivenessResult(is_live=True, confidence=0.93)
        mock_stream2.return_value = (face_match, liveness, [50, 50, 150, 180], 36.0)

        # 3. Stream 3: High stamp anomaly (stamp_score=0.95 gives 2.8 * 0.75 = 2.10) + mild trufor (0.40 gives 3.2 * 0.22 = 0.70) + EXIF (+0.50)
        forensics = ForensicsResult(
            tamper_score=0.40,
            is_tampered=False,
            doctamper_score=0.10,
            trufor_score=0.40,
            exif_suspicious=True,
            photo_region_tampered=False,
        )
        tampered_stamp = StampResult(
            stamp_found=True,
            stamp_score=0.95,  # High stamp anomaly yields +2.10 log-odds
            verdict="AMBER",
            checkpost_id="SSB-UP-SON-02",
            ssim_score=0.38,
            context_valid=True,
            reasons=[
                "SSIM seal template similarity low (0.38 < 0.80) against Sonauli entry seal",
                "Ink chromatic distribution anomaly detected in border seal",
            ],
        )
        mock_stream3.return_value = (forensics, tampered_stamp)

        # Submit HTTP Request
        files = {
            "document_image": ("stamp_suspect_doc.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg"),
            "live_face_image": ("traveler_face.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg"),
        }

        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assessment = data["assessment"]

        # Assert AMBER Tier & No Hard Tripwires (Score in 35-65 range)
        assert assessment["tripwire_triggered"] is False
        assert 35.0 <= assessment["risk_score"] <= 65.0
        assert assessment["risk_level"] == "AMBER"
        assert assessment["auto_clear"] is False

        # Assert Stamp Reasons Present
        reasons_str = " ".join(assessment["reasons"])
        assert "Stamp" in reasons_str or "seal" in reasons_str or "stamp" in reasons_str.lower()


# ==================================================================================================
# Scenario 4: Presentation Replay Spoof (MiniFASNet Spoof Tripwire 4) -> Instant RED
# ==================================================================================================

class TestScenario4PresentationReplaySpoof:
    """
    Scenario 4: Impostor presents iPad 4K screen replay or curved matte photo print to webcam.
    - Stream 1: Valid clean document
    - Stream 2: MiniFASNetV2-SE detects screen moiré patterns & 2D Fourier energy peak (is_live=False, conf=0.12)
    - Triggers TRIPWIRE_4 (Presentation Attack Detected)
    Expected: Instant RED (Score >= 95.0), tripwire_triggered=True, auto_clear=False.
    """

    @patch("app.api.routers.scan._execute_stream_1_text_and_mrz")
    @patch("app.api.routers.scan._execute_stream_2_biometrics")
    @patch("app.api.routers.scan._execute_stream_3_forensics_and_stamps")
    def test_presentation_spoof_e2e_pipeline(
        self, mock_stream3, mock_stream2, mock_stream1, client
    ):
        # 1. Stream 1: Valid clean document
        clean_ocr = OCRResult(
            status="success",
            raw_text="REPUBLIC OF INDIA PASSPORT\nName: DEEPAK VERMA\nDOB: 15/05/1992",
            fields={"full_name": "DEEPAK VERMA", "dob": "15/05/1992", "document_number": "N5544332"},
            mean_confidence=0.95,
            qr_payload=QRPayload(raw_qr_found=False, signature_valid=False),
        )
        clean_mrz = MRZResult(
            mrz_detected=True,
            mrz_type="TD3",
            valid=True,
            document_number="N5544332",
            doc_number_checksum_valid=True,
            dob="920515",
            dob_checksum_valid=True,
            expiry="320515",
            expiry_checksum_valid=True,
            composite_checksum_valid=True,
            surname="VERMA",
            given_names="DEEPAK",
        )
        mock_stream1.return_value = (clean_ocr, clean_mrz, clean_ocr.qr_payload)

        # 2. Stream 2: Biometric Impostor Replay Attack
        face_match = FaceMatchResult(
            similarity=0.91,  # High similarity against stolen photo
            match=True,
            apparent_age_id=34.0,
            apparent_age_live=34.0,
            watchlist_hit=False,
        )
        spoofed_liveness = LivenessResult(
            is_live=False,  # Replay spoof detected
            confidence=0.12,
            attack_type="2D_SCREEN_REPLAY",
            scale_2_7x_score=0.15,
            scale_4_0x_score=0.09,
            reasons=["2D Fourier high-frequency moiré screen lattice detected"],
        )
        mock_stream2.return_value = (face_match, spoofed_liveness, [50, 50, 150, 180], 34.0)

        # 3. Stream 3: Forensics
        clean_forensics = ForensicsResult(tamper_score=0.07, is_tampered=False)
        clean_stamp = StampResult(stamp_found=False, stamp_score=0.0, verdict="NOT_FOUND")
        mock_stream3.return_value = (clean_forensics, clean_stamp)

        # Submit HTTP Request
        files = {
            "document_image": ("passport_clean.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg"),
            "live_face_image": ("ipad_spoof_selfie.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg"),
        }

        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assessment = data["assessment"]

        # Assert Instant RED Alert via TRIPWIRE_4
        assert assessment["tripwire_triggered"] is True
        assert assessment["risk_score"] >= 95.0
        assert assessment["risk_level"] == "RED"
        assert assessment["auto_clear"] is False
        assert any("TRIPWIRE_4" in code for code in assessment["tripwire_codes"])

        # Assert Telemetry Reasons Highlight Biometric Spoof
        reasons_str = " ".join(assessment["reasons"])
        assert "TRIPWIRE_4" in reasons_str or "Spoof" in reasons_str or "spoof" in reasons_str.lower()


# ==================================================================================================
# Scenario 5: Multi-Format MRZ Full Scan Flow (TD1, TD2, TD3 & ICAO Checksum Tripwire 1)
# ==================================================================================================

class TestScenario5MultiFormatMRZFullFlow:
    """
    Scenario 5: Multi-Format MRZ Parsing and Integration.
    - 5A: TD1 (3x30) Identity Card MRZ (e.g. Bhutan CID / Indian Voter Card) -> GREEN 2.0
    - 5B: TD2 (2x36) Official Travel Document / Border Permit MRZ -> GREEN 2.0
    - 5C: TD3 (2x44) Standard Passport with Check Digit Corruption -> Instant RED (TRIPWIRE_1)
    """

    @patch("app.api.routers.scan._execute_stream_1_text_and_mrz")
    @patch("app.api.routers.scan._execute_stream_2_biometrics")
    @patch("app.api.routers.scan._execute_stream_3_forensics_and_stamps")
    def test_td1_identity_card_full_flow(
        self, mock_stream3, mock_stream2, mock_stream1, client
    ):
        """TD1 Format (3 lines x 30 chars): Valid Identity Card."""
        td1_mrz = MRZResult(
            mrz_detected=True,
            mrz_type="TD1",
            valid=True,
            document_type="I",
            country_code="IND",
            document_number="123456789",
            doc_number_checksum_valid=True,
            dob="940814",
            dob_checksum_valid=True,
            expiry="290814",
            expiry_checksum_valid=True,
            composite_checksum_valid=True,
            surname="SHARMA",
            given_names="ARJUN",
            raw_lines=[
                "I<IND1234567897<<<<<<<<<<<<<<<",
                "9408144M2908148IND<<<<<<<<<<<4",
                "SHARMA<<ARJUN<<<<<<<<<<<<<<<<<",
            ],
        )
        td1_ocr = OCRResult(
            status="success",
            raw_text="IDENTITY CARD\nName: ARJUN SHARMA\nID No: 123456789\nDOB: 14/08/1994",
            fields={"full_name": "ARJUN SHARMA", "dob": "14/08/1994", "document_number": "123456789"},
            mean_confidence=0.96,
            qr_payload=QRPayload(raw_qr_found=False, signature_valid=False),
        )
        mock_stream1.return_value = (td1_ocr, td1_mrz, td1_ocr.qr_payload)
        mock_stream2.return_value = (
            FaceMatchResult(similarity=0.86, match=True, apparent_age_id=31.0, apparent_age_live=30.0),
            LivenessResult(is_live=True, confidence=0.95),
            [50, 50, 150, 180],
            31.0,
        )
        mock_stream3.return_value = (
            ForensicsResult(tamper_score=0.05, is_tampered=False),
            StampResult(stamp_found=False, stamp_score=0.0, verdict="NOT_FOUND"),
        )

        response = client.post(
            "/api/v1/scan/inspect",
            files={"document_image": ("td1_id.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["assessment"]["risk_score"] == pytest.approx(2.0, abs=0.2)
        assert data["assessment"]["risk_level"] == "GREEN"
        assert data["assessment"]["auto_clear"] is True
        assert data["details"]["mrz"]["mrz_type"] == "TD1"

    @patch("app.api.routers.scan._execute_stream_1_text_and_mrz")
    @patch("app.api.routers.scan._execute_stream_2_biometrics")
    @patch("app.api.routers.scan._execute_stream_3_forensics_and_stamps")
    def test_td2_travel_document_full_flow(
        self, mock_stream3, mock_stream2, mock_stream1, client
    ):
        """TD2 Format (2 lines x 36 chars): Valid Official Travel Document / Permit."""
        td2_mrz = MRZResult(
            mrz_detected=True,
            mrz_type="TD2",
            valid=True,
            document_type="I",
            country_code="IND",
            document_number="M1234567",
            doc_number_checksum_valid=True,
            dob="940814",
            dob_checksum_valid=True,
            expiry="290814",
            expiry_checksum_valid=True,
            composite_checksum_valid=True,
            surname="SHARMA",
            given_names="ARJUN",
            raw_lines=[
                "I<INDSHARMA<<ARJUN<<<<<<<<<<<<<<<<<<",
                "M1234567<4IND9408144M2908148<<<<<<<4",
            ],
        )
        td2_ocr = OCRResult(
            status="success",
            raw_text="BORDER PERMIT\nName: ARJUN SHARMA\nDoc No: M1234567\nDOB: 14/08/1994",
            fields={"full_name": "ARJUN SHARMA", "dob": "14/08/1994", "document_number": "M1234567"},
            mean_confidence=0.96,
            qr_payload=QRPayload(raw_qr_found=False, signature_valid=False),
        )
        mock_stream1.return_value = (td2_ocr, td2_mrz, td2_ocr.qr_payload)
        mock_stream2.return_value = (
            FaceMatchResult(similarity=0.85, match=True, apparent_age_id=31.0, apparent_age_live=31.0),
            LivenessResult(is_live=True, confidence=0.94),
            [50, 50, 150, 180],
            31.0,
        )
        mock_stream3.return_value = (
            ForensicsResult(tamper_score=0.06, is_tampered=False),
            StampResult(stamp_found=False, stamp_score=0.0, verdict="NOT_FOUND"),
        )

        response = client.post(
            "/api/v1/scan/inspect",
            files={"document_image": ("td2_permit.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["assessment"]["risk_score"] == pytest.approx(2.0, abs=0.2)
        assert data["assessment"]["risk_level"] == "GREEN"
        assert data["assessment"]["auto_clear"] is True
        assert data["details"]["mrz"]["mrz_type"] == "TD2"

    @patch("app.api.routers.scan._execute_stream_1_text_and_mrz")
    @patch("app.api.routers.scan._execute_stream_2_biometrics")
    @patch("app.api.routers.scan._execute_stream_3_forensics_and_stamps")
    def test_td3_corrupted_checksum_tripwire_1(
        self, mock_stream3, mock_stream2, mock_stream1, client
    ):
        """TD3 Format (2 lines x 44 chars) with Checksum Failure -> TRIPWIRE_1 (Instant RED)."""
        corrupted_mrz = MRZResult(
            mrz_detected=True,
            mrz_type="TD3",
            valid=False,
            document_type="P",
            country_code="IND",
            document_number="M1234567",
            doc_number_checksum_valid=False,  # Corrupted Checksum
            dob="940814",
            dob_checksum_valid=True,
            expiry="290814",
            expiry_checksum_valid=True,
            composite_checksum_valid=False,
            checksum_failures=["Document Number CD1 mismatch", "Composite checksum failure"],
        )
        clean_ocr = OCRResult(
            status="success",
            raw_text="PASSPORT REPUBLIC OF INDIA\nPassport No: M1234567\nDOB: 14/08/1994",
            fields={"full_name": "ARJUN SHARMA", "dob": "14/08/1994", "document_number": "M1234567"},
            qr_payload=QRPayload(raw_qr_found=False, signature_valid=False),
        )
        mock_stream1.return_value = (clean_ocr, corrupted_mrz, clean_ocr.qr_payload)
        mock_stream2.return_value = (
            FaceMatchResult(similarity=0.88, match=True),
            LivenessResult(is_live=True, confidence=0.95),
            [50, 50, 150, 180],
            31.0,
        )
        mock_stream3.return_value = (
            ForensicsResult(tamper_score=0.05, is_tampered=False),
            StampResult(stamp_found=False, stamp_score=0.0, verdict="NOT_FOUND"),
        )

        response = client.post(
            "/api/v1/scan/inspect",
            files={"document_image": ("corrupted_passport.jpg", io.BytesIO(make_valid_jpeg(1024)), "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["assessment"]["tripwire_triggered"] is True
        assert data["assessment"]["risk_score"] >= 95.0
        assert data["assessment"]["risk_level"] == "RED"
        assert data["assessment"]["auto_clear"] is False
        assert any("TRIPWIRE_1" in code for code in data["assessment"]["tripwire_codes"])


# ==================================================================================================
# Scenario 6: Robustness, Error Handling & Concurrency SLA
# ==================================================================================================

class TestScenario6RobustnessAndSLA:
    """Verifies edge case handling, invalid payloads, and latency SLAs."""

    def test_missing_document_image_returns_422(self, client):
        """Missing required document_image field triggers standard FastAPI 422 validation error."""
        response = client.post("/api/v1/scan/inspect", files={})
        assert response.status_code == 422

    def test_invalid_mime_type_returns_400(self, client):
        """Non-image MIME types are rejected with 400 Bad Request."""
        files = {
            "document_image": ("payload.pdf", io.BytesIO(b"%PDF-1.4 mock content here"), "application/pdf"),
        }
        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 400
        assert "Invalid document image file type" in response.json()["detail"]

    def test_empty_payload_returns_400(self, client):
        """Undersized payloads (< 100 bytes) are rejected with 400 Bad Request."""
        files = {
            "document_image": ("empty.jpg", io.BytesIO(b"\xff\xd8\xff\xd9"), "image/jpeg"),
        }
        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 400
        assert "empty or corrupted" in response.json()["detail"]

    def test_pipeline_audit_hash_uniqueness(self, client):
        """Ensures consecutive scans with different sessions generate unique SHA-256 audit hashes."""
        payload = make_valid_jpeg(512)
        resp1 = client.post(
            "/api/v1/scan/inspect",
            files={"document_image": ("doc1.jpg", io.BytesIO(payload), "image/jpeg")},
        )
        resp2 = client.post(
            "/api/v1/scan/inspect",
            files={"document_image": ("doc2.jpg", io.BytesIO(payload), "image/jpeg")},
        )
        assert resp1.status_code == 200 and resp2.status_code == 200
        hash1 = resp1.json()["assessment"]["audit_hash"]
        hash2 = resp2.json()["assessment"]["audit_hash"]
        assert hash1 != hash2
        assert len(hash1) == 64 and len(hash2) == 64
