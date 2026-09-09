"""
Adversarial Empirical Stress-Test Suite for Milestone 1 Remediation.
Author: teamwork_preview_challenger_m1_1_s4 (Adversarial Verification Agent)

Stress-tests:
- ML-01: ICAO Doc 9303 TD3 Check Digit Filler '<' in CD4 Optional Personal Number.
- ML-02: Format-Aware Date Parsing for Birthdays on the 19th/20th of all months.
- ML-03: Hyphenated Date Parsing and Temporal Paradox Detection in FraudEdgeCaseEngine.
- BE-03: Event Loop Concurrency (asyncio.to_thread non-blocking inference).
- BE-01 / BE-02: Schema Nullability and Cross-Validation Violation Models.
"""

import asyncio
import io
import time
from unittest.mock import patch
import pytest
from PIL import Image

from app.modules.mrz.mrz_engine import mrz_engine, calculate_mrz_check_digit, verify_check_digit
from app.modules.mrz.cross_validator import parse_date_to_yymmdd, cross_validator
from app.modules.forensics.fraud_edge_cases import fraud_edge_case_engine
from app.modules.risk_engine.risk_scorer import risk_scorer
from app.schemas.scan import ScanResponse, DocumentInspectResponse
from app.schemas.risk import RiskAssessment, RiskLevel
from app.schemas.mrz import MRZResult, CrossValidationResult, CrossViolation
from app.schemas.ocr import OCRResult
from app.schemas.forensics import ForensicsResult


# ============================================================================
# 1. ML-01: ICAO Doc 9303 TD3 Check Digit Filler '<' in CD4 Checksum
# ============================================================================

class TestML01AdversarialMRZChecksum:
    """Stress-tests ICAO Doc 9303 TD3 CD4 optional data check digit handling."""

    def test_swedish_french_passport_with_filler_cd4(self):
        """Standard TD3 passport with non-empty personal number and '<' CD4 filler."""
        l1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
        l2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<<9"
        res = mrz_engine.parse_mrz_lines([l1, l2])
        assert res.valid is True, f"Expected MRZ valid=True, got False with failures: {res.checksum_failures}"
        assert res.optional_data_checksum_valid is True
        assert len(res.checksum_failures) == 0

    def test_all_filler_optional_data_with_filler_cd4(self):
        """TD3 passport with no optional data ('<' * 14) and '<' CD4 filler."""
        doc_num = "A12345678"
        cd1 = calculate_mrz_check_digit(doc_num)
        dob = "850101"
        cd2 = calculate_mrz_check_digit(dob)
        exp = "300101"
        cd3 = calculate_mrz_check_digit(exp)
        opt = "<" * 14
        cd4 = "<"
        comp_data = f"{doc_num}{cd1}{dob}{cd2}{exp}{cd3}{opt}{cd4}"
        cd_comp = calculate_mrz_check_digit(comp_data)

        l1 = "P<UTO<<TESTER<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
        l2 = f"{doc_num}{cd1}UTO{dob}{cd2}M{exp}{cd3}{opt}{cd4}{cd_comp}"
        res = mrz_engine.parse_mrz_lines([l1, l2])
        assert res.valid is True
        assert res.optional_data_checksum_valid is True

    def test_optional_data_with_valid_numeric_check_digit(self):
        """When issuing state uses a numeric check digit for CD4, valid digit passes."""
        doc_num = "B98765432"
        cd1 = calculate_mrz_check_digit(doc_num)
        dob = "900515"
        cd2 = calculate_mrz_check_digit(dob)
        exp = "281010"
        cd3 = calculate_mrz_check_digit(exp)
        opt = "1234567890<<<<"
        cd4 = calculate_mrz_check_digit(opt)
        comp_data = f"{doc_num}{cd1}{dob}{cd2}{exp}{cd3}{opt}{cd4}"
        cd_comp = calculate_mrz_check_digit(comp_data)

        l1 = "P<UTO<<SAMPLE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
        l2 = f"{doc_num}{cd1}UTO{dob}{cd2}F{exp}{cd3}{opt}{cd4}{cd_comp}"
        res = mrz_engine.parse_mrz_lines([l1, l2])
        assert res.valid is True
        assert res.optional_data_checksum_valid is True

    def test_optional_data_with_corrupted_numeric_check_digit_fails(self):
        """When issuing state provides a numeric check digit that does NOT match, it MUST fail."""
        doc_num = "B98765432"
        cd1 = calculate_mrz_check_digit(doc_num)
        dob = "900515"
        cd2 = calculate_mrz_check_digit(dob)
        exp = "281010"
        cd3 = calculate_mrz_check_digit(exp)
        opt = "1234567890<<<<"
        valid_cd4 = calculate_mrz_check_digit(opt)
        corrupt_cd4 = str((int(valid_cd4) + 1) % 10)
        comp_data = f"{doc_num}{cd1}{dob}{cd2}{exp}{cd3}{opt}{corrupt_cd4}"
        cd_comp = calculate_mrz_check_digit(comp_data)

        l1 = "P<UTO<<SAMPLE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
        l2 = f"{doc_num}{cd1}UTO{dob}{cd2}F{exp}{cd3}{opt}{corrupt_cd4}{cd_comp}"
        res = mrz_engine.parse_mrz_lines([l1, l2])
        assert res.valid is False
        assert res.optional_data_checksum_valid is False
        assert any("CD4" in f for f in res.checksum_failures)

    def test_tripwire_1_does_not_fire_on_filler_cd4(self):
        """Ensure risk scorer does NOT trigger TRIPWIRE_1 when CD4 is filler '<'."""
        l1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
        l2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<<9"
        res = mrz_engine.parse_mrz_lines([l1, l2])
        assert res.valid is True
        tripwire_triggered, codes, reasons = risk_scorer.check_stage1_tripwires(mrz_result=res)
        assert tripwire_triggered is False
        assert not any("TRIPWIRE_1" in c for c in codes)


# ============================================================================
# 2. ML-02: Format-Aware Date Parsing (Birthdays on 19th and 20th)
# ============================================================================

class TestML02AdversarialDateParsing:
    """Stress-tests date normalization across all months for days 19 and 20."""

    @pytest.mark.parametrize("day", ["19", "20"])
    @pytest.mark.parametrize("month", [f"{m:02d}" for m in range(1, 13)])
    @pytest.mark.parametrize("year", ["1975", "1988", "1995", "2000", "2012"])
    def test_all_months_19th_and_20th_slash_format(self, day, month, year):
        """DD/MM/YYYY dates on 19th/20th must produce YYMMDD without century inversion."""
        date_str = f"{day}/{month}/{year}"
        expected_yymmdd = f"{year[2:]}{month}{day}"
        result = parse_date_to_yymmdd(date_str)
        assert result == expected_yymmdd, f"Failed for {date_str}: expected {expected_yymmdd}, got {result}"

    @pytest.mark.parametrize("day", ["19", "20"])
    @pytest.mark.parametrize("month", [f"{m:02d}" for m in range(1, 13)])
    def test_hyphen_and_dot_separators(self, day, month):
        """DD-MM-YYYY and DD.MM.YYYY must parse accurately."""
        year = "1992"
        expected = f"92{month}{day}"
        assert parse_date_to_yymmdd(f"{day}-{month}-{year}") == expected
        assert parse_date_to_yymmdd(f"{day}.{month}.{year}") == expected

    def test_iso_format_with_19_and_20(self):
        """YYYY-MM-DD format must parse correctly regardless of year or day."""
        assert parse_date_to_yymmdd("1995-08-19") == "950819"
        assert parse_date_to_yymmdd("1988-03-20") == "880320"
        assert parse_date_to_yymmdd("2020-01-19") == "200119"

    def test_cross_validation_rule_cv01_with_19th_birthday(self):
        """Full cross-validation between MRZ (950819) and OCR DOB ('19/08/1995')."""
        ocr_res = OCRResult(
            document_number="A12345678",
            name="JOHN DOE",
            date_of_birth="19/08/1995",
            expiry_date="01/01/2030",
            nationality="IND"
        )
        mrz_res = MRZResult(
            document_number="A12345678",
            surname="DOE",
            given_names="JOHN",
            dob="950819",
            expiry_date="300101",
            nationality="IND",
            valid=True
        )
        res = cross_validator.validate_all(ocr_result=ocr_res, mrz_result=mrz_res)
        dob_violations = [v for v in res.critical_violations if v.rule_id == "CV-01"]
        assert len(dob_violations) == 0, f"CV-01 falsely flagged: {dob_violations}"


# ============================================================================
# 3. ML-03: Hyphenated Date Parsing in FraudEdgeCaseEngine (Temporal Paradox)
# ============================================================================

class TestML03AdversarialFraudEdgeCases:
    """Stress-tests temporal paradox detection with varied date formats."""

    def test_hyphenated_dd_mm_yyyy_issue_date_after_dob(self):
        """DOB: 1995-05-12, Issue: 01-01-2020. 2020 > 1995 -> Must NOT flag EC-05."""
        violations = fraud_edge_case_engine.evaluate_edge_cases(
            ocr_fields={"dob": "1995-05-12", "issue_date": "01-01-2020"}
        )
        ec05 = [v for v in violations if v.get("case_id") == "EC-05"]
        assert len(ec05) == 0, f"False positive EC-05: {ec05}"

    def test_slash_dd_mm_yyyy_issue_date_after_dob(self):
        """DOB: 19/08/1995, Issue: 20/03/2021. 2021 > 1995 -> Must NOT flag EC-05."""
        violations = fraud_edge_case_engine.evaluate_edge_cases(
            ocr_fields={"dob": "19/08/1995", "issue_date": "20/03/2021"}
        )
        ec05 = [v for v in violations if v.get("case_id") == "EC-05"]
        assert len(ec05) == 0, f"False positive EC-05: {ec05}"

    def test_temporal_paradox_true_positive(self):
        """DOB: 1995-05-12, Issue: 01-01-1990. 1990 < 1995 -> MUST flag EC-05."""
        violations = fraud_edge_case_engine.evaluate_edge_cases(
            ocr_fields={"dob": "1995-05-12", "issue_date": "01-01-1990"}
        )
        ec05 = [v for v in violations if v.get("case_id") == "EC-05"]
        assert len(ec05) == 1, "Expected true positive EC-05 temporal paradox violation!"
        assert ec05[0]["severity"] == "CRITICAL"
        assert "1990" in ec05[0]["details"] and "1995" in ec05[0]["details"]


# ============================================================================
# 4. BE-03: Concurrency & Event Loop Non-Blocking Execution
# ============================================================================

class TestBE03AsyncEventLoopNonBlocking:
    """Verifies that heavy inference wrapped in asyncio.to_thread preserves loop liveness."""

    @pytest.mark.asyncio
    async def test_ocr_and_forensics_do_not_starve_event_loop(self):
        """Mock synchronous heavy CPU work and verify asyncio.to_thread does NOT block concurrent coroutines."""
        from app.api.routers.ocr import validate_mrz
        from app.api.routers.forensics import analyze_ela
        from unittest.mock import MagicMock

        original_parse = mrz_engine.parse_mrz_lines

        def slow_mrz(lines):
            time.sleep(0.08)
            return original_parse(lines)

        ticker_ticks = 0
        keep_ticking = True

        async def loop_heartbeat():
            nonlocal ticker_ticks
            while keep_ticking:
                await asyncio.sleep(0.01)  # 10ms tick
                ticker_ticks += 1

        ticker_task = asyncio.create_task(loop_heartbeat())

        # Construct dummy request for validate_mrz
        mock_request = MagicMock()
        mock_request.headers = {"content-type": "application/json"}
        mock_request.json = MagicMock(return_value=asyncio.sleep(0, result={
            "lines": [
                "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
                "L898902C36UTO7408122F1204159ZE184226B<<<<<<9"
            ]
        }))

        with patch.object(mrz_engine, "parse_mrz_lines", side_effect=slow_mrz):
            # Calling validate_mrz which internally invokes `await asyncio.to_thread(mrz_engine.parse_mrz_lines, mrz_lines)`
            mrz_result = await validate_mrz(mock_request)
            assert mrz_result.valid is True

        keep_ticking = False
        await ticker_task

        # If validate_mrz ran synchronously on the event loop, ticker_ticks would be 0!
        # Because it ran via asyncio.to_thread, ticker_ticks will have incremented several times (~5-8 ticks)
        assert ticker_ticks >= 3, f"Event loop was blocked by validate_mrz! Ticks: {ticker_ticks}"


# ============================================================================
# 5. BE-01 & BE-02: Schema Nullability & Warning Serialization
# ============================================================================

class TestBE01AndBE02Schemas:
    """Verifies that backend schemas permit null optional sub-objects and violation structures."""

    def test_scan_response_null_sub_objects(self):
        """ScanResponse with null biometrics, liveness, and stamp must serialize cleanly."""
        risk = RiskAssessment(
            risk_score=15.0,
            risk_level=RiskLevel.GREEN,
            auto_clear=True,
            tripwire_triggered=False
        )
        res = ScanResponse(
            session_id="SCAN-TEST-01",
            document_type="passport",
            ocr=OCRResult(document_number="A12345678", name="TEST"),
            mrz=MRZResult(document_number="A12345678", surname="TEST", valid=True),
            forensics=ForensicsResult(tamper_score=0.05, is_tampered=False, verdict="CLEAN"),
            cross_validation=CrossValidationResult(cross_validation_passed=True),
            biometrics=None,
            liveness=None,
            stamp=None,
            risk=risk,
            processing_time_ms=120.5
        )
        dumped = res.model_dump(mode="json")
        assert dumped["biometrics"] is None
        assert dumped["liveness"] is None
        assert dumped["stamp"] is None

        inspect_res = DocumentInspectResponse(
            session_id="SCAN-TEST-01",
            status="completed",
            assessment=risk,
            details=res
        )
        dumped_inspect = inspect_res.model_dump(mode="json")
        assert dumped_inspect["details"]["biometrics"] is None
        assert dumped_inspect["details"]["liveness"] is None
        assert dumped_inspect["details"]["stamp"] is None

    def test_cross_validation_warnings_are_structured_objects(self):
        """CrossValidationResult.warnings must be a list of CrossViolation objects, not strings."""
        violation = CrossViolation(
            rule_id="WARN-01",
            rule_name="Transliteration Difference",
            severity="WARNING",
            field_name="name",
            expected_value=None,
            actual_value=None,
            telemetry_code="WARN_NAME_DIFF",
            details="Minor spelling variation"
        )
        res = CrossValidationResult(
            cross_validation_passed=True,
            critical_violations=[],
            warnings=[violation],
            flags=[]
        )
        dumped = res.model_dump(mode="json")
        assert len(dumped["warnings"]) == 1
        assert isinstance(dumped["warnings"][0], dict)
        assert dumped["warnings"][0]["rule_id"] == "WARN-01"
        assert dumped["warnings"][0]["expected_value"] is None
        assert dumped["warnings"][0]["actual_value"] is None
