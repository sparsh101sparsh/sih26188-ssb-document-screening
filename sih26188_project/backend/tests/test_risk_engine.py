"""
SIH26188 — Two-Stage Hybrid Risk Engine & Master Scan Router Test Suite
Architecture Reference: Section 5.2, 5.3, 6.1, 6.2, 6.3, 6.4

Comprehensive Test Suite Verifying:
1. Stage 1 Deterministic Hard Tripwires (TRIPWIRE_1 through TRIPWIRE_6 -> Instant RED = 95.0)
2. Stage 2 Multi-Factor Log-Odds Bayesian Fusion (Zero false-positive baseline = 2.0 GREEN)
3. Noise Deadband Mathematical Calibration (psi_tamper, psi_live, psi_stamp, psi_face)
4. Multi-Threat Compounding & Decision Tiers (GREEN, AMBER, RED)
5. Log-Odds Sigmoid Boundary Handling & Numerical Stability
6. Explainable Bullet Reason Generation across all Decision Bands
7. Full /api/v1/scan/inspect Master Endpoint & 3-Stream Concurrency
"""

import io
import math
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.modules.risk_engine.risk_scorer import (
    BASE_PRIOR_LOG_ODDS,
    compute_log_odds_risk,
    compute_name_levenshtein_similarity,
    psi_face,
    psi_live,
    psi_stamp,
    psi_tamper,
    risk_scorer,
)
from app.schemas.biometrics import FaceBBox, FaceMatchResult, LivenessResult
from app.schemas.forensics import ELAResult, ForensicsResult, TamperRegion
from app.schemas.mrz import CrossValidationFlag, CrossValidationResult, CrossViolation, MRZResult
from app.schemas.ocr import OCRBox, OCRResult, QRPayload
from app.schemas.risk import RiskAssessment, RiskLevel, RiskScoreBreakdown, TripwireCode
from app.schemas.stamp import StampResult


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


# ==================================================================================================
# 1. Noise Deadband Mathematical Functions Test Suite
# ==================================================================================================

class TestNoiseDeadbands:
    """Verifies continuous mathematical deadbands for scanner noise and paper texture filtering."""

    def test_psi_tamper_noise_suppression(self):
        """psi_tamper(s) = max(0.0, s - 0.18). Below 0.18 evaluates to strictly 0.0."""
        assert psi_tamper(0.0) == 0.0
        assert psi_tamper(0.05) == 0.0
        assert psi_tamper(0.10) == 0.0
        assert psi_tamper(0.15) == 0.0
        assert psi_tamper(0.18) == 0.0
        assert round(psi_tamper(0.28), 4) == 0.10
        assert round(psi_tamper(0.68), 4) == 0.50

    def test_psi_live_anti_spoofing_deadband(self):
        """psi_live(s) = max(0.0, 0.85 - s). Liveness >= 0.85 evaluates to strictly 0.0."""
        assert psi_live(1.0) == 0.0
        assert psi_live(0.95) == 0.0
        assert psi_live(0.90) == 0.0
        assert psi_live(0.85) == 0.0
        assert round(psi_live(0.70), 4) == 0.15
        assert round(psi_live(0.50), 4) == 0.35

    def test_psi_stamp_seal_noise_deadband(self):
        """psi_stamp(s) = max(0.0, s - 0.20). Stamp score <= 0.20 evaluates to strictly 0.0."""
        assert psi_stamp(0.0) == 0.0
        assert psi_stamp(0.10) == 0.0
        assert psi_stamp(0.15) == 0.0
        assert psi_stamp(0.20) == 0.0
        assert round(psi_stamp(0.35), 4) == 0.15
        assert round(psi_stamp(0.70), 4) == 0.50

    def test_psi_face_biometric_deadband(self):
        """psi_face(s) = max(0.0, 0.70 - s). Facial similarity >= 0.70 evaluates to strictly 0.0."""
        assert psi_face(1.0) == 0.0
        assert psi_face(0.88) == 0.0
        assert psi_face(0.75) == 0.0
        assert psi_face(0.70) == 0.0
        assert round(psi_face(0.55), 4) == 0.15
        assert round(psi_face(0.35), 4) == 0.35

    def test_name_levenshtein_similarity(self):
        """Verifies normalized name string similarity metric."""
        assert compute_name_levenshtein_similarity("KUMAR SPARSH", "KUMAR SPARSH") == 1.0
        assert compute_name_levenshtein_similarity("SPARSH", "SPARSH") == 1.0
        assert compute_name_levenshtein_similarity("", "") == 1.0
        sim = compute_name_levenshtein_similarity("MOHAMMAD", "MOHAMED")
        assert 0.70 <= sim <= 0.95

    def test_log_odds_numerical_stability(self):
        """Verifies sigmoid conversion handles extreme log-odds smoothly without overflow."""
        assert compute_log_odds_risk(100.0) == 100.0
        assert compute_log_odds_risk(-100.0) == 0.0
        assert compute_log_odds_risk(0.0) == 50.0
        assert compute_log_odds_risk(-3.8918) == pytest.approx(2.0, abs=0.01)


# ==================================================================================================
# 2. Stage 1: Deterministic Hard Tripwire Override Tests (Instant RED = 95.0)
# ==================================================================================================

class TestStage1HardTripwires:
    """Verifies all 6 deterministic hard tripwires bypass Stage 2 Bayesian accumulation to force instant RED."""

    def test_tripwire_1_mrz_critical_checksum_fail(self):
        """TRIPWIRE_1: MRZ checksum failure on document number, DOB, expiry, or composite."""
        mrz_fail = MRZResult(
            mrz_detected=True,
            mrz_type="TD3",
            valid=False,
            document_number="A1234567",
            doc_number_checksum_valid=False,
            dob="950512",
            dob_checksum_valid=True,
            expiry="280512",
            expiry_checksum_valid=True,
            composite_checksum_valid=False,
            checksum_failures=["Document Number CD1 mismatch", "Composite checksum failure"],
        )
        assessment = risk_scorer.evaluate(mrz_result=mrz_fail)
        assert assessment.tripwire_triggered is True
        assert assessment.risk_score == 95.0
        assert assessment.risk_level == RiskLevel.RED
        assert assessment.auto_clear is False
        assert any("TRIPWIRE_1" in code for code in assessment.tripwire_codes)
        assert any("TRIPWIRE_1" in reason for reason in assessment.reasons)

    def test_tripwire_2_aadhaar_pki_signature_forged(self):
        """TRIPWIRE_2: UIDAI RSA-2048 digital signature invalid or forged."""
        qr_forged = QRPayload(
            raw_qr_found=True,
            qr_type="AADHAAR_SECURE_V2",
            signature_valid=False,
            demographics={"name": "Sparsh Kumar", "dob": "12/05/1995"},
            photo_jp2_extracted=True,
            error_message="RSA PKCS#1 v1.5 verification failed against root cert",
        )
        ocr_res = OCRResult(qr_payload=qr_forged)
        assessment = risk_scorer.evaluate(ocr_result=ocr_res)
        assert assessment.tripwire_triggered is True
        assert assessment.risk_score == 95.0
        assert assessment.risk_level == RiskLevel.RED
        assert assessment.auto_clear is False
        assert any("TRIPWIRE_2" in code for code in assessment.tripwire_codes)

    def test_tripwire_3_photo_splicing_detected(self):
        """TRIPWIRE_3: Portrait photo splicing detected via TruFor (>0.75) or tamper density (>0.65)."""
        # Case A: photo_tamper_density > 0.65
        assessment_a = risk_scorer.evaluate(photo_tamper_density=0.75)
        assert assessment_a.tripwire_triggered is True
        assert assessment_a.risk_score == 95.0
        assert assessment_a.risk_level == RiskLevel.RED
        assert any("TRIPWIRE_3" in code for code in assessment_a.tripwire_codes)

        # Case B: TruFor score > 0.75 in portrait photo region
        forensics_res = ForensicsResult(
            tamper_score=0.82,
            is_tampered=True,
            photo_region_tampered=True,
            trufor_score=0.88,
            doctamper_score=0.15,
            tampered_regions=[
                TamperRegion(bbox=[50, 50, 150, 180], peak_tamper_probability=0.88, tamper_type="PHOTO_SPLICING")
            ],
        )
        assessment_b = risk_scorer.evaluate(forensics_result=forensics_res)
        assert assessment_b.tripwire_triggered is True
        assert assessment_b.risk_score == 95.0
        assert any("TRIPWIRE_3" in code for code in assessment_b.tripwire_codes)

    def test_tripwire_4_presentation_attack_spoof(self):
        """TRIPWIRE_4: MiniFASNet anti-spoofing detects replay screen or printed photo."""
        live_spoof = LivenessResult(
            is_live=False,
            confidence=0.12,
            attack_type="SCREEN_REPLAY",
            fourier_anomaly_score=0.78,
        )
        assessment = risk_scorer.evaluate(liveness_result=live_spoof)
        assert assessment.tripwire_triggered is True
        assert assessment.risk_score == 95.0
        assert assessment.risk_level == RiskLevel.RED
        assert assessment.auto_clear is False
        assert any("TRIPWIRE_4" in code for code in assessment.tripwire_codes)

    def test_tripwire_5_face_severe_mismatch(self):
        """TRIPWIRE_5: Biometric face cosine similarity < 0.20 (completely different traveler)."""
        face_mismatch = FaceMatchResult(
            similarity=0.08,
            match=False,
            threshold=0.35,
            embedding_model_used="AdaFace-ResNet100",
        )
        assessment = risk_scorer.evaluate(face_match_result=face_mismatch)
        assert assessment.tripwire_triggered is True
        assert assessment.risk_score == 95.0
        assert assessment.risk_level == RiskLevel.RED
        assert any("TRIPWIRE_5" in code for code in assessment.tripwire_codes)

    def test_tripwire_6_watchlist_hit(self):
        """TRIPWIRE_6: High-risk border watchlist vector match (distance < 0.28)."""
        face_watchlist = FaceMatchResult(
            similarity=0.91,
            match=True,
            threshold=0.35,
            watchlist_hit=True,
            watchlist_distance=0.14,
        )
        assessment = risk_scorer.evaluate(face_match_result=face_watchlist)
        assert assessment.tripwire_triggered is True
        assert assessment.risk_score == 95.0
        assert assessment.risk_level == RiskLevel.RED
        assert any("TRIPWIRE_6" in code for code in assessment.tripwire_codes)


# ==================================================================================================
# 3. Stage 2: Multi-Factor Log-Odds Bayesian Fusion Tests
# ==================================================================================================

class TestStage2BayesianFusion:
    """Verifies calibrated Bayesian evidence accumulation and zero false-positive baseline."""

    def test_clean_authentic_document_baseline_green(self):
        """
        Zero False-Positive Property:
        On authentic input with zero anomalies, all deadbands evaluate to 0.
        Posterior Lambda_post = Lambda_0 = -3.8918 -> Risk Score = 2.0 (GREEN Auto-Clear).
        """
        clean_mrz = MRZResult(
            mrz_detected=True,
            valid=True,
            surname="SHARMA",
            given_names="RAHUL",
            document_number="Z1234567",
            doc_number_checksum_valid=True,
            dob="900101",
            dob_checksum_valid=True,
            expiry="300101",
            expiry_checksum_valid=True,
            composite_checksum_valid=True,
            checksum_failures=[],
        )
        clean_ocr = OCRResult(
            status="success",
            fields={"full_name": "RAHUL SHARMA", "dob": "01/01/1990", "doc_number": "Z1234567"},
            qr_payload=QRPayload(raw_qr_found=True, qr_type="AADHAAR_SECURE_V2", signature_valid=True),
        )
        clean_face = FaceMatchResult(similarity=0.88, match=True)  # >= 0.70 deadband -> delta = 0
        clean_live = LivenessResult(is_live=True, confidence=0.96)  # >= 0.85 deadband -> delta = 0
        clean_forensics = ForensicsResult(
            tamper_score=0.04,
            is_tampered=False,
            trufor_score=0.03,  # <= 0.18 deadband -> delta = 0
            doctamper_score=0.05,  # <= 0.18 deadband -> delta = 0
        )
        clean_stamp = StampResult(stamp_found=True, stamp_score=0.08, verdict="AUTHENTIC")  # <= 0.20 deadband -> delta = 0
        clean_cv = CrossValidationResult(cross_validation_passed=True, violation_count=0, critical_violations=[])

        assessment = risk_scorer.evaluate(
            ocr_result=clean_ocr,
            mrz_result=clean_mrz,
            face_match_result=clean_face,
            liveness_result=clean_live,
            forensics_result=clean_forensics,
            stamp_result=clean_stamp,
            cross_validation_result=clean_cv,
        )

        assert assessment.tripwire_triggered is False
        assert assessment.risk_level == RiskLevel.GREEN
        assert assessment.auto_clear is True
        assert assessment.risk_score == pytest.approx(2.0, abs=0.1)
        assert assessment.score_breakdown.posterior_log_odds == pytest.approx(BASE_PRIOR_LOG_ODDS, abs=0.01)
        assert assessment.score_breakdown.tamper_log_odds_delta == 0.0
        assert assessment.score_breakdown.face_log_odds_delta == 0.0
        assert assessment.score_breakdown.mrz_log_odds_delta == 0.0
        assert assessment.score_breakdown.cross_val_log_odds_delta == 0.0

    def test_single_minor_anomaly_transitions_to_amber(self):
        """A single non-critical anomaly (e.g. CV-07 stamp date outside window +2.20) elevates score to AMBER (31-69)."""
        cv_stamp_expired = CrossValidationResult(
            cross_validation_passed=True,
            violation_count=1,
            critical_violations=[],
            warnings=[
                CrossViolation(
                    rule_id="CV-07",
                    rule_name="Stamp Date Window",
                    severity="WARNING",
                    field_name="stamp_date",
                    telemetry_code="WRN_STAMP_EXPIRY",
                    details="Stamp date outside valid transit window",
                )
            ],
            violations=[
                CrossViolation(
                    rule_id="CV-07",
                    rule_name="Stamp Date Window",
                    severity="WARNING",
                    field_name="stamp_date",
                    telemetry_code="WRN_STAMP_EXPIRY",
                    details="Stamp date outside valid transit window",
                )
            ],
        )

        # Moderate face: similarity = 0.45 -> psi_face = (0.70 - 0.45) * 3.5 = +0.875
        face_moderate = FaceMatchResult(similarity=0.45, match=True)
        # Moderate tamper: doctamper = 0.48 -> psi_tamper = (0.48 - 0.18) * 3.0 = +0.90
        forensics_mod = ForensicsResult(tamper_score=0.45, is_tampered=True, doctamper_score=0.48, trufor_score=0.10)

        assessment_amber = risk_scorer.evaluate(
            cross_validation_result=cv_stamp_expired,
            face_match_result=face_moderate,
            forensics_result=forensics_mod,
        )

        assert assessment_amber.tripwire_triggered is False
        assert assessment_amber.risk_level == RiskLevel.AMBER
        assert 31.0 <= assessment_amber.risk_score <= 69.0
        assert assessment_amber.auto_clear is False

    def test_compounding_multi_threat_accumulates_to_red(self):
        """Compounding anomalies across streams (CV-01 DOB mismatch + CV-02 Doc No alteration) accumulate into RED."""
        cv_multi_threat = CrossValidationResult(
            cross_validation_passed=False,
            violation_count=2,
            critical_violations=[
                CrossViolation(
                    rule_id="CV-01",
                    rule_name="DOB Mismatch",
                    severity="CRITICAL",
                    field_name="dob",
                    telemetry_code="ERR_DOB_MISMATCH",
                    details="MRZ DOB does not match Visual OCR DOB",
                ),
                CrossViolation(
                    rule_id="CV-02",
                    rule_name="Doc No Alteration",
                    severity="CRITICAL",
                    field_name="doc_number",
                    telemetry_code="ERR_DOCNO_ALTER",
                    details="MRZ Document Number does not match Visual OCR Number",
                ),
            ],
            violations=[
                CrossViolation(
                    rule_id="CV-01",
                    rule_name="DOB Mismatch",
                    severity="CRITICAL",
                    field_name="dob",
                    telemetry_code="ERR_DOB_MISMATCH",
                    details="MRZ DOB does not match Visual OCR DOB",
                ),
                CrossViolation(
                    rule_id="CV-02",
                    rule_name="Doc No Alteration",
                    severity="CRITICAL",
                    field_name="doc_number",
                    telemetry_code="ERR_DOCNO_ALTER",
                    details="MRZ Document Number does not match Visual OCR Number",
                ),
            ],
        )
        assessment = risk_scorer.evaluate(cross_validation_result=cv_multi_threat)
        assert assessment.tripwire_triggered is False  # Stage 2 Bayesian accumulation
        assert assessment.risk_level == RiskLevel.RED
        assert assessment.risk_score >= 70.0
        assert assessment.auto_clear is False
        assert assessment.score_breakdown.cross_val_log_odds_delta == 7.5  # 3.5 + 4.0

    def test_sensor_noise_remains_below_deadband(self):
        """Sensor noise (tamper=0.12, face=0.78, liveness=0.91, stamp=0.14) produces 0 penalty and score=2.0."""
        face = FaceMatchResult(similarity=0.78, match=True)
        live = LivenessResult(is_live=True, confidence=0.91)
        forensics = ForensicsResult(tamper_score=0.12, is_tampered=False, doctamper_score=0.12, trufor_score=0.11)
        stamp = StampResult(stamp_found=True, stamp_score=0.14, verdict="AUTHENTIC")

        assessment = risk_scorer.evaluate(
            face_match_result=face,
            liveness_result=live,
            forensics_result=forensics,
            stamp_result=stamp,
        )

        assert assessment.risk_score == pytest.approx(2.0, abs=0.1)
        assert assessment.risk_level == RiskLevel.GREEN
        assert assessment.auto_clear is True

    def test_exif_metadata_suspicious_penalty(self):
        """EXIF suspicious flag adds calibrated +0.50 log-odds penalty."""
        forensics = ForensicsResult(
            tamper_score=0.10,
            is_tampered=False,
            exif_suspicious=True,
        )
        assessment = risk_scorer.evaluate(forensics_result=forensics)
        assert assessment.score_breakdown.metadata_log_odds_delta == 0.50
        assert assessment.score_breakdown.posterior_log_odds == pytest.approx(BASE_PRIOR_LOG_ODDS + 0.50, abs=0.01)

    def test_mrz_name_ocr_discrepancy_penalty(self):
        """Name transliteration divergence between OCR and MRZ adds calibrated log-odds penalty."""
        mrz = MRZResult(
            mrz_detected=True,
            valid=True,
            given_names="VIKRAM",
            surname="SINGH",
        )
        ocr = OCRResult(
            status="success",
            fields={"full_name": "VIJAY KUMAR"},
        )
        assessment = risk_scorer.evaluate(ocr_result=ocr, mrz_result=mrz)
        assert assessment.score_breakdown.mrz_log_odds_delta > 0.0


# ==================================================================================================
# 4. Master Scan Endpoint & 3-Stream Concurrency Integration Tests
# ==================================================================================================

class TestScanEndpointIntegration:
    """Verifies POST /api/v1/scan/inspect executes 3-stream parallel screening and returns full telemetry."""

    def test_scan_inspect_clean_document(self, client):
        """Verifies full inspection pipeline on valid document image."""
        fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
        files = {
            "document_image": ("clean_passport.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
        }
        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "completed"
        assert "session_id" in data
        assert "assessment" in data
        assert "details" in data

        assessment = data["assessment"]
        assert assessment["risk_score"] >= 0.0
        assert assessment["risk_level"] in ("GREEN", "AMBER", "RED")
        assert len(assessment["audit_hash"]) == 64
        assert assessment["processing_time_ms"] >= 0.0
        assert len(assessment["reasons"]) > 0

        details = data["details"]
        assert "ocr" in details
        assert "mrz" in details
        assert "forensics" in details
        assert "cross_validation" in details

    def test_scan_inspect_with_live_face(self, client):
        """Verifies full inspection pipeline with dual document and live selfie uploads."""
        fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 300 + b"\xff\xd9"
        files = {
            "document_image": ("id_doc.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
            "live_face_image": ("traveler_live.jpg", io.BytesIO(fake_jpeg), "image/jpeg"),
        }
        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["details"]["biometrics"] is not None

    def test_scan_status_endpoint(self, client):
        """Verifies GET /api/v1/scan/status returns 3-stream telemetry and hardware backend info."""
        response = client.get("/api/v1/scan/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert len(data["streams"]) == 3
        assert "hardware" in data

    def test_scan_inspect_invalid_mime_type(self, client):
        """Verifies rejection of non-image MIME types."""
        files = {
            "document_image": ("payload.pdf", io.BytesIO(b"%PDF-1.4 mock pdf"), "application/pdf"),
        }
        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 400
        assert "Invalid document image file type" in response.json()["detail"]

    def test_scan_inspect_too_small_payload(self, client):
        """Verifies rejection of undersized payloads (<100 bytes)."""
        files = {
            "document_image": ("small.jpg", io.BytesIO(b"\xff\xd8\xff\xd9"), "image/jpeg"),
        }
        response = client.post("/api/v1/scan/inspect", files=files)
        assert response.status_code == 400
        assert "empty or corrupted" in response.json()["detail"]
