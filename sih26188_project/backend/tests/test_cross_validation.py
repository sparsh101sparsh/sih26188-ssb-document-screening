"""
SIH26188 — Cross-Validation Matrix Pytest Suite (Section 6.3)
Architecture Reference: Section 6.3, Table 6.3

Tests all 8 multi-modal cross-validation rules under clean and adversarial/tampered scenarios:
- CV-01: MRZ DOB vs Visual OCR DOB (ERR_DOB_MISMATCH)
- CV-02: MRZ Doc No vs Visual Doc No (ERR_DOCNO_ALTER)
- CV-03: MRZ Name vs Visual Full Name (WRN_NAME_SPELL)
- CV-04: Biometric Apparent Age vs MRZ DOB Age (WRN_AGE_ANOMALY)
- CV-05: Photo Box Tamper Energy vs Face BBox (ERR_PHOTO_SPLICE)
- CV-06: Text Box Tamper Energy vs OCR BBoxes (ERR_TEXT_FORGERY)
- CV-07: Stamp Date vs Permit Validity Window (WRN_STAMP_EXPIRY)
- CV-08: Aadhaar QR RSA-2048 PKI Signature Valid (ERR_PKI_FORGED)
"""

import pytest
from app.modules.mrz.cross_validator import (
    calculate_age_from_yymmdd,
    cross_validator,
    levenshtein_distance,
    parse_date_to_yymmdd,
    token_sort_similarity,
)
from app.schemas.mrz import MRZResult
from app.schemas.ocr import OCRBox, OCRResult, QRPayload


class TestCrossValidationHelpers:
    """Unit tests for string and date normalization helper algorithms."""

    def test_levenshtein_distance(self):
        assert levenshtein_distance("SAME", "SAME") == 0
        assert levenshtein_distance("A1234567", "A1234568") == 1
        assert levenshtein_distance("", "TEST") == 4
        assert levenshtein_distance("TEST", "") == 4

    def test_token_sort_similarity(self):
        # Exact match with different word order
        assert token_sort_similarity("ERIKSSON ANNA MARIA", "Anna Maria Eriksson") == 1.0
        # High similarity with minor typo
        assert token_sort_similarity("RAMESH KUMAR", "RAMESH KUMARR") >= 0.90
        # Low similarity
        assert token_sort_similarity("JOHN DOE", "RAMESH SHARMA") < 0.50

    def test_parse_date_to_yymmdd(self):
        assert parse_date_to_yymmdd("12/08/1974") == "740812"
        assert parse_date_to_yymmdd("1974-08-12") == "740812"
        assert parse_date_to_yymmdd("740812") == "740812"
        assert parse_date_to_yymmdd("15-05-2001") == "010515"

    def test_calculate_age_from_yymmdd(self):
        # 1974 birth year relative to 2026 -> 52 years
        assert calculate_age_from_yymmdd("740812", reference_year=2026) == 52
        # 2005 birth year relative to 2026 -> 21 years
        assert calculate_age_from_yymmdd("050101", reference_year=2026) == 21


class TestCrossValidationRules:
    """Comprehensive tests for all 8 cross-validation rules (CV-01 through CV-08)."""

    @pytest.fixture
    def clean_baseline(self):
        mrz = MRZResult(
            mrz_detected=True,
            mrz_type="TD3",
            valid=True,
            document_number="L898902C3",
            surname="ERIKSSON",
            given_names="ANNA MARIA",
            dob="740812",
            expiry="300101",
        )
        ocr = OCRResult(
            status="success",
            fields={
                "doc_number": "L898902C3",
                "full_name": "Anna Maria Eriksson",
                "dob": "12/08/1974",
                "expiry": "01/01/2030",
            },
            raw_boxes=[
                OCRBox(text="L898902C3", confidence=0.95, polygon=[[0,0],[100,0],[100,20],[0,20]]),
                OCRBox(text="Anna Maria Eriksson", confidence=0.96, polygon=[[0,30],[100,30],[100,50],[0,50]]),
                OCRBox(text="12/08/1974", confidence=0.94, polygon=[[0,60],[100,60],[100,80],[0,80]]),
            ],
            mean_confidence=0.95,
        )
        qr = QRPayload(
            raw_qr_found=True,
            qr_type="AADHAAR_SECURE_V2",
            signature_valid=True,
            demographics={"full_name": "Anna Maria Eriksson", "dob": "12-08-1974"},
        )
        return {"mrz": mrz, "ocr": ocr, "qr": qr}

    def test_full_clean_document_passes_all_rules(self, clean_baseline):
        """Clean authentic document passes all 8 rules with zero critical violations."""
        result = cross_validator.validate_all(
            ocr_result=clean_baseline["ocr"],
            mrz_result=clean_baseline["mrz"],
            qr_payload=clean_baseline["qr"],
            apparent_age=50.0,  # DOB 1974 -> ~52y (diff 2 <= 15)
            photo_tamper_density=0.04,  # <= 0.25
            text_tamper_map={"L898902C3": 0.05, "12/08/1974": 0.04},  # <= 0.18
            stamp_date="2026-06-15",
            permit_window=("2026-01-01", "2026-12-31"),
        )
        assert result.cross_validation_passed is True
        assert result.violation_count == 0
        assert len(result.critical_violations) == 0
        assert len(result.warnings) == 0
        assert all(f.passed for f in result.flags)

    def test_cv01_mrz_dob_mismatch(self, clean_baseline):
        """CV-01: Altered visual DOB (e.g. 1984 vs 1974) triggers ERR_DOB_MISMATCH."""
        tampered_ocr = clean_baseline["ocr"]
        tampered_ocr.fields["dob"] = "12/08/1984"  # Changed from 1974

        result = cross_validator.validate_all(
            ocr_result=tampered_ocr,
            mrz_result=clean_baseline["mrz"],
        )
        assert result.cross_validation_passed is False
        assert any(v.telemetry_code == "ERR_DOB_MISMATCH" for v in result.critical_violations)
        cv1_flag = next(f for f in result.flags if f.rule_id == "CV-01")
        assert cv1_flag.passed is False

    def test_cv02_mrz_doc_number_alteration(self, clean_baseline):
        """CV-02: Altered document serial triggers ERR_DOCNO_ALTER."""
        tampered_ocr = clean_baseline["ocr"]
        tampered_ocr.fields["doc_number"] = "L898902C9"  # Changed last digit

        result = cross_validator.validate_all(
            ocr_result=tampered_ocr,
            mrz_result=clean_baseline["mrz"],
        )
        assert result.cross_validation_passed is False
        assert any(v.telemetry_code == "ERR_DOCNO_ALTER" for v in result.critical_violations)
        cv2_flag = next(f for f in result.flags if f.rule_id == "CV-02")
        assert cv2_flag.passed is False

    def test_cv03_name_transliteration_warning(self, clean_baseline):
        """CV-03: Mismatched name spelling triggers WRN_NAME_SPELL warning."""
        tampered_ocr = clean_baseline["ocr"]
        tampered_ocr.fields["full_name"] = "Vikram Aditya Singh"  # Completely different name

        result = cross_validator.validate_all(
            ocr_result=tampered_ocr,
            mrz_result=clean_baseline["mrz"],
        )
        # CV-03 is a WARNING (severity=WARNING), so critical violations list does not include it
        assert any(v.telemetry_code == "WRN_NAME_SPELL" for v in result.warnings)
        cv3_flag = next(f for f in result.flags if f.rule_id == "CV-03")
        assert cv3_flag.passed is False

    def test_cv04_biometric_age_anomaly(self, clean_baseline):
        """CV-04: Facial apparent age (20y) vs MRZ DOB (1974 -> 52y) triggers WRN_AGE_ANOMALY."""
        result = cross_validator.validate_all(
            mrz_result=clean_baseline["mrz"],
            apparent_age=20.0,  # 32 years age drift (> 15y)
        )
        assert any(v.telemetry_code == "WRN_AGE_ANOMALY" for v in result.warnings)
        cv4_flag = next(f for f in result.flags if f.rule_id == "CV-04")
        assert cv4_flag.passed is False

    def test_cv05_photo_splicing_detection(self, clean_baseline):
        """CV-05: High forensic tamper energy in portrait box triggers ERR_PHOTO_SPLICE."""
        result = cross_validator.validate_all(
            ocr_result=clean_baseline["ocr"],
            photo_tamper_density=0.68,  # > 0.25
        )
        assert result.cross_validation_passed is False
        assert any(v.telemetry_code == "ERR_PHOTO_SPLICE" for v in result.critical_violations)
        cv5_flag = next(f for f in result.flags if f.rule_id == "CV-05")
        assert cv5_flag.passed is False

    def test_cv06_text_forgery_detection(self, clean_baseline):
        """CV-06: Text box tamper probability > 0.18 triggers ERR_TEXT_FORGERY."""
        tamper_map = {"12/08/1974": 0.42}  # Altered birth date box
        result = cross_validator.validate_all(
            ocr_result=clean_baseline["ocr"],
            text_tamper_map=tamper_map,
        )
        assert result.cross_validation_passed is False
        assert any(v.telemetry_code == "ERR_TEXT_FORGERY" for v in result.critical_violations)
        cv6_flag = next(f for f in result.flags if f.rule_id == "CV-06")
        assert cv6_flag.passed is False

    def test_cv07_stamp_expiry_mismatch(self):
        """CV-07: Border stamp date outside permit window triggers WRN_STAMP_EXPIRY."""
        result = cross_validator.validate_all(
            stamp_date="2027-03-10",
            permit_window=("2026-01-01", "2026-12-31"),
        )
        assert any(v.telemetry_code == "WRN_STAMP_EXPIRY" for v in result.warnings)
        cv7_flag = next(f for f in result.flags if f.rule_id == "CV-07")
        assert cv7_flag.passed is False

    def test_cv08_aadhaar_pki_signature_forgery(self, clean_baseline):
        """CV-08: Invalid RSA PKI signature triggers ERR_PKI_FORGED."""
        forged_qr = QRPayload(
            raw_qr_found=True,
            qr_type="AADHAAR_SECURE_V2",
            signature_valid=False,  # Forged PKI
            demographics={"full_name": "Counterfeit User"},
        )
        result = cross_validator.validate_all(
            ocr_result=clean_baseline["ocr"],
            qr_payload=forged_qr,
        )
        assert result.cross_validation_passed is False
        assert any(v.telemetry_code == "ERR_PKI_FORGED" for v in result.critical_violations)
        cv8_flag = next(f for f in result.flags if f.rule_id == "CV-08")
        assert cv8_flag.passed is False

    def test_compounding_multi_threat_scenario(self, clean_baseline):
        """Multiple simultaneous attacks trigger compounding critical violations and warnings."""
        tampered_ocr = clean_baseline["ocr"]
        tampered_ocr.fields["dob"] = "01/01/2005"  # CV-01
        tampered_ocr.fields["doc_number"] = "X999999"  # CV-02

        forged_qr = QRPayload(
            raw_qr_found=True,
            qr_type="AADHAAR_SECURE_V2",
            signature_valid=False,  # CV-08
        )

        result = cross_validator.validate_all(
            ocr_result=tampered_ocr,
            mrz_result=clean_baseline["mrz"],
            qr_payload=forged_qr,
            apparent_age=65.0,  # CV-04 (diff > 15y)
            photo_tamper_density=0.55,  # CV-05
            text_tamper_map={"12/08/1974": 0.85},  # CV-06
            stamp_date="2028-01-01",  # CV-07
            permit_window=("2026-01-01", "2026-12-31"),
        )

        assert result.cross_validation_passed is False
        assert result.violation_count >= 5
        critical_codes = [v.telemetry_code for v in result.critical_violations]
        assert "ERR_DOB_MISMATCH" in critical_codes
        assert "ERR_DOCNO_ALTER" in critical_codes
        assert "ERR_PHOTO_SPLICE" in critical_codes
        assert "ERR_TEXT_FORGERY" in critical_codes
        assert "ERR_PKI_FORGED" in critical_codes
