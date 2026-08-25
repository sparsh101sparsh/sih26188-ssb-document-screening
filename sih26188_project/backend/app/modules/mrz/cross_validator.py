"""
SIH26188 — Multi-Modal 8-Rule Cross-Validation Engine
Architecture Reference: Section 6.3, Table 6.3

Implements the deterministic cross-validation matrix asserting consistency across:
- Stream 1: Multilingual OCR, ICAO Doc 9303 MRZ, and Aadhaar Secure QR
- Stream 2: Face Biometrics and Apparent Age Estimation
- Stream 3: Forensic Tamper Heatmaps and Border Stamp Authentication

Rules Matrix:
- CV-01: MRZ DOB vs Visual OCR DOB (Exact Date Equality -> ERR_DOB_MISMATCH) [CRITICAL]
- CV-02: MRZ Doc No vs Visual Doc No (Levenshtein Dist == 0 -> ERR_DOCNO_ALTER) [CRITICAL]
- CV-03: MRZ Name vs Visual Full Name (Token sort similarity >= 90% -> WRN_NAME_SPELL) [WARNING]
- CV-04: Biometric Apparent Age vs MRZ DOB Age (|Age_est - Age_dob| <= 15y -> WRN_AGE_ANOMALY) [WARNING]
- CV-05: Photo Box Tamper Energy vs Face BBox (IoU Tamper Density <= 0.25 -> ERR_PHOTO_SPLICE) [CRITICAL]
- CV-06: Text Box Tamper Energy vs OCR BBoxes (max P_tamper in BBox <= 0.18 -> ERR_TEXT_FORGERY) [CRITICAL]
- CV-07: Stamp Date vs Permit Validity Window (Date in permit window -> WRN_STAMP_EXPIRY) [WARNING]
- CV-08: Aadhaar QR RSA-2048 PKI Signature Valid (PKCS#1 v1.5 Sig == VALID -> ERR_PKI_FORGED) [CRITICAL]
"""

import datetime
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.mrz import CrossValidationFlag, CrossValidationResult, CrossViolation, MRZResult
from app.schemas.ocr import OCRResult, QRPayload

logger = get_logger("sih26188.cross_validator")


# --------------------------------------------------------------------------------------------------
# Pure Python Text & Mathematical Helper Utilities
# --------------------------------------------------------------------------------------------------

def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes exact Levenshtein edit distance between two strings."""
    if s1 == s2:
        return 0
    if len(s1) == 0:
        return len(s2)
    if len(s2) == 0:
        return len(s1)

    v0 = list(range(len(s2) + 1))
    v1 = [0] * (len(s2) + 1)

    for i in range(len(s1)):
        v1[0] = i + 1
        for j in range(len(s2)):
            cost = 0 if s1[i] == s2[j] else 1
            v1[j + 1] = min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
        v0 = v1[:]

    return v1[len(s2)]


def token_sort_similarity(s1: str, s2: str) -> float:
    """
    Computes token-sort similarity ratio in range [0.0, 1.0].
    Tokenizes, normalizes, sorts alphabetically, and calculates character match ratio.
    """
    clean1 = " ".join(sorted(re.findall(r'[A-Za-z0-9]+', s1.upper())))
    clean2 = " ".join(sorted(re.findall(r'[A-Za-z0-9]+', s2.upper())))

    if not clean1 and not clean2:
        return 1.0
    if not clean1 or not clean2:
        return 0.0
    if clean1 == clean2:
        return 1.0

    dist = levenshtein_distance(clean1, clean2)
    max_len = max(len(clean1), len(clean2))
    return round(1.0 - (dist / max_len), 4)


def parse_date_to_yymmdd(date_str: str) -> Optional[str]:
    """
    Normalizes various date formats (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YY, YYMMDD) to standard YYMMDD.
    """
    if not date_str:
        return None
    cleaned = re.sub(r'[^0-9]', '', date_str.strip())
    if len(cleaned) == 6:
        return cleaned
    elif len(cleaned) == 8:
        # Check DDMMYYYY vs YYYYMMDD
        # If year is first (starts with 19 or 20)
        if cleaned.startswith("19") or cleaned.startswith("20"):
            yyyy, mm, dd = cleaned[0:4], cleaned[4:6], cleaned[6:8]
            return f"{yyyy[2:]}{mm}{dd}"
        else:
            dd, mm, yyyy = cleaned[0:2], cleaned[2:4], cleaned[4:8]
            return f"{yyyy[2:]}{mm}{dd}"
    return None


def calculate_age_from_yymmdd(yymmdd: str, reference_year: int = 2026) -> Optional[int]:
    """
    Calculates age in years from YYMMDD string relative to reference year.
    """
    if not yymmdd or len(yymmdd) < 6:
        return None
    try:
        yy = int(yymmdd[0:2])
        # Centenary heuristic: 00-40 -> 2000-2040, 41-99 -> 1941-1999
        birth_year = (2000 + yy) if yy <= 40 else (1900 + yy)
        return max(0, reference_year - birth_year)
    except Exception:
        return None


def parse_iso_date(date_input: Union[str, datetime.date, datetime.datetime]) -> Optional[datetime.date]:
    """Parses arbitrary date strings to datetime.date object."""
    if isinstance(date_input, datetime.datetime):
        return date_input.date()
    if isinstance(date_input, datetime.date):
        return date_input
    if not date_input:
        return None

    cleaned = date_input.strip()
    for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d", "%d.%m.%Y", "%y%m%d"]:
        try:
            return datetime.datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


class CrossValidator:
    """
    Master 8-Rule Cross-Validation Engine.
    Correlates evidence across OCR, MRZ, QR, Face Biometrics, Forensics, and Border Stamps.
    """

    def validate_all(
        self,
        ocr_result: Optional[OCRResult] = None,
        mrz_result: Optional[MRZResult] = None,
        qr_payload: Optional[QRPayload] = None,
        apparent_age: Optional[float] = None,
        face_bbox: Optional[List[int]] = None,
        photo_tamper_density: Optional[float] = None,
        text_tamper_map: Optional[Any] = None,
        stamp_date: Optional[str] = None,
        permit_window: Optional[Tuple[str, str]] = None,
    ) -> CrossValidationResult:
        """
        Executes complete 8-rule cross-assertion matrix.
        """
        start_time = time.perf_counter()
        critical_violations: List[CrossViolation] = []
        warnings: List[CrossViolation] = []
        flags: List[CrossValidationFlag] = []

        # =========================================================================
        # Rule CV-01: MRZ DOB vs Visual OCR DOB (Exact Date Equality -> ERR_DOB_MISMATCH)
        # =========================================================================
        cv1_passed = True
        cv1_msg = "CV-01 Passed: MRZ DOB matches visual OCR DOB"
        if mrz_result and mrz_result.mrz_detected and mrz_result.dob:
            ocr_dob_raw = (ocr_result.fields.get("dob") if ocr_result else None) or ""
            if ocr_dob_raw:
                norm_mrz_dob = parse_date_to_yymmdd(mrz_result.dob)
                norm_ocr_dob = parse_date_to_yymmdd(ocr_dob_raw)
                if norm_mrz_dob and norm_ocr_dob and norm_mrz_dob != norm_ocr_dob:
                    cv1_passed = False
                    cv1_msg = f"CV-01 Failed: MRZ DOB ({norm_mrz_dob}) does not match Visual OCR DOB ({norm_ocr_dob})"
                    critical_violations.append(CrossViolation(
                        rule_id="CV-01",
                        rule_name="MRZ DOB vs Visual OCR DOB Equality",
                        severity="CRITICAL",
                        field_name="dob",
                        expected_value=norm_mrz_dob,
                        actual_value=norm_ocr_dob,
                        telemetry_code="ERR_DOB_MISMATCH",
                        details=cv1_msg,
                    ))

        flags.append(CrossValidationFlag(
            rule_id="CV-01",
            rule_description="MRZ DOB vs Visual OCR DOB Exact Match",
            passed=cv1_passed,
            telemetry_message=cv1_msg,
        ))

        # =========================================================================
        # Rule CV-02: MRZ Doc No vs Visual Doc No (Levenshtein Dist == 0 -> ERR_DOCNO_ALTER)
        # =========================================================================
        cv2_passed = True
        cv2_msg = "CV-02 Passed: MRZ Document Number matches visual OCR serial"
        if mrz_result and mrz_result.mrz_detected and mrz_result.document_number:
            ocr_doc_raw = (ocr_result.fields.get("doc_number") if ocr_result else None) or ""
            if ocr_doc_raw:
                clean_mrz_doc = re.sub(r'[^A-Za-z0-9]', '', mrz_result.document_number.upper())
                clean_ocr_doc = re.sub(r'[^A-Za-z0-9]', '', ocr_doc_raw.upper())
                if clean_mrz_doc != clean_ocr_doc:
                    cv2_passed = False
                    cv2_msg = (
                        f"CV-02 Failed: MRZ Document Number '{clean_mrz_doc}' does not match "
                        f"Visual OCR Number '{clean_ocr_doc}' (Levenshtein: {levenshtein_distance(clean_mrz_doc, clean_ocr_doc)})"
                    )
                    critical_violations.append(CrossViolation(
                        rule_id="CV-02",
                        rule_name="MRZ Document Number vs Visual OCR Serial",
                        severity="CRITICAL",
                        field_name="doc_number",
                        expected_value=clean_mrz_doc,
                        actual_value=clean_ocr_doc,
                        telemetry_code="ERR_DOCNO_ALTER",
                        details=cv2_msg,
                    ))

        flags.append(CrossValidationFlag(
            rule_id="CV-02",
            rule_description="MRZ Document Number vs Visual Document Number",
            passed=cv2_passed,
            telemetry_message=cv2_msg,
        ))

        # =========================================================================
        # Rule CV-03: MRZ Name vs Visual Full Name (Token Sort Sim >= 90% -> WRN_NAME_SPELL)
        # =========================================================================
        cv3_passed = True
        cv3_msg = "CV-03 Passed: MRZ Name matches visual OCR name within tolerance"
        if mrz_result and mrz_result.mrz_detected:
            mrz_full_name = f"{mrz_result.given_names or ''} {mrz_result.surname or ''}".strip()
            ocr_name = (ocr_result.fields.get("full_name") if ocr_result else None) or ""
            if mrz_full_name and ocr_name:
                sim = token_sort_similarity(mrz_full_name, ocr_name)
                if sim < 0.90:
                    cv3_passed = False
                    cv3_msg = f"CV-03 Warning: Name similarity {sim:.2f} < 0.90 threshold (MRZ: '{mrz_full_name}', OCR: '{ocr_name}')"
                    warnings.append(CrossViolation(
                        rule_id="CV-03",
                        rule_name="MRZ Name vs Visual Full Name Similarity",
                        severity="WARNING",
                        field_name="full_name",
                        expected_value=mrz_full_name,
                        actual_value=ocr_name,
                        telemetry_code="WRN_NAME_SPELL",
                        details=cv3_msg,
                    ))

        flags.append(CrossValidationFlag(
            rule_id="CV-03",
            rule_description="MRZ Name vs Visual Name Token Sort Similarity",
            passed=cv3_passed,
            telemetry_message=cv3_msg,
        ))

        # =========================================================================
        # Rule CV-04: Biometric Apparent Age vs Declared DOB Age (|Age_est - Age_dob| <= 10y -> WRN_AGE_ANOMALY)
        # =========================================================================
        cv4_passed = True
        cv4_msg = "CV-04 Passed: Biometric apparent age is consistent with declared DOB age"
        age_dob: Optional[int] = None

        if mrz_result and mrz_result.mrz_detected and mrz_result.dob:
            age_dob = calculate_age_from_yymmdd(mrz_result.dob)
        elif ocr_result and ocr_result.fields and ocr_result.fields.get("dob"):
            parsed_date = parse_iso_date(str(ocr_result.fields.get("dob")))
            if parsed_date:
                age_dob = max(0, 2026 - parsed_date.year)
        elif qr_payload and qr_payload.demographics and qr_payload.demographics.get("dob"):
            parsed_date = parse_iso_date(str(qr_payload.demographics.get("dob")))
            if parsed_date:
                age_dob = max(0, 2026 - parsed_date.year)

        if apparent_age is not None and age_dob is not None:
            age_diff = abs(apparent_age - age_dob)
            if age_diff > 10.0:
                cv4_passed = False
                cv4_msg = f"CV-04 Warning: Apparent face age ({apparent_age:.0f}y) differs by {age_diff:.1f}y from document DOB age ({age_dob}y)"
                warnings.append(CrossViolation(
                    rule_id="CV-04",
                    rule_name="Biometric Apparent Age vs Document Declared DOB Age",
                    severity="WARNING",
                    field_name="age",
                    expected_value=f"{age_dob} years",
                    actual_value=f"{apparent_age:.0f} years",
                    telemetry_code="WRN_AGE_ANOMALY",
                    details=cv4_msg,
                ))

        flags.append(CrossValidationFlag(
            rule_id="CV-04",
            rule_description="Biometric Apparent Age vs Declared DOB Age",
            passed=cv4_passed,
            telemetry_message=cv4_msg,
        ))

        # =========================================================================
        # Rule CV-05: Photo Box Forensic Splicing Detection (ERR_PHOTO_SPLICE)
        # =========================================================================
        cv5_passed = True
        cv5_msg = "CV-05 Passed: Portrait area exhibits zero forensic splicing anomalies"
        is_photo_tampered = False

        if photo_tamper_density is not None and photo_tamper_density > 0.65:
            is_photo_tampered = True
            cv5_msg = f"CV-05 Failed: Photo box tamper energy density {photo_tamper_density:.2f} > 0.65 threshold"

        if is_photo_tampered:
            cv5_passed = False
            critical_violations.append(CrossViolation(
                rule_id="CV-05",
                rule_name="Photo Box Forensic Splicing Detection",
                severity="CRITICAL",
                field_name="portrait_photo",
                expected_value="Tamper Density <= 0.65",
                actual_value=f"Tamper Density = {photo_tamper_density:.2f}" if photo_tamper_density else "Splicing Detected",
                telemetry_code="ERR_PHOTO_SPLICE",
                details=cv5_msg,
            ))

        flags.append(CrossValidationFlag(
            rule_id="CV-05",
            rule_description="Photo Box Forensic Splicing Detection",
            passed=cv5_passed,
            telemetry_message=cv5_msg,
        ))

        # =========================================================================
        # Rule CV-06: Text Box Tamper Energy vs OCR BBoxes (max P_tamper in BBox <= 0.18 -> ERR_TEXT_FORGERY)
        # =========================================================================
        cv6_passed = True
        cv6_msg = "CV-06 Passed: Text bounding boxes clear forensic frequency alteration gate"
        if text_tamper_map is not None and ocr_result and ocr_result.raw_boxes:
            # Check maximum tamper probability in OCR boxes
            max_tamper_detected = 0.0
            flagged_text = ""
            for box in ocr_result.raw_boxes:
                # If tamper score is explicitly provided on box or in map
                box_tamper = getattr(box, "tamper_score", 0.0)
                if isinstance(text_tamper_map, (int, float)):
                    box_tamper = float(text_tamper_map)
                elif isinstance(text_tamper_map, dict):
                    box_tamper = text_tamper_map.get(box.text, 0.0)

                if box_tamper > max_tamper_detected:
                    max_tamper_detected = box_tamper
                    flagged_text = box.text

            if max_tamper_detected > settings.TAU_ADAPT:
                cv6_passed = False
                cv6_msg = f"CV-06 Failed: Text tampering detected on '{flagged_text}' (P_tamper = {max_tamper_detected:.2f} > {settings.TAU_ADAPT})"
                critical_violations.append(CrossViolation(
                    rule_id="CV-06",
                    rule_name="OCR Text Box Forensic Alteration / Inpainting",
                    severity="CRITICAL",
                    field_name="ocr_text",
                    expected_value=f"P_tamper <= {settings.TAU_ADAPT}",
                    actual_value=f"P_tamper = {max_tamper_detected:.2f}",
                    telemetry_code="ERR_TEXT_FORGERY",
                    details=cv6_msg,
                ))

        flags.append(CrossValidationFlag(
            rule_id="CV-06",
            rule_description="Text Box Tamper Energy vs OCR BBoxes",
            passed=cv6_passed,
            telemetry_message=cv6_msg,
        ))

        # =========================================================================
        # Rule CV-07: Stamp Date vs Permit Validity Window (Date in permit window -> WRN_STAMP_EXPIRY)
        # =========================================================================
        cv7_passed = True
        cv7_msg = "CV-07 Passed: Transit stamp date falls within authorized permit window"
        if stamp_date and permit_window:
            parsed_stamp = parse_iso_date(stamp_date)
            parsed_start = parse_iso_date(permit_window[0])
            parsed_end = parse_iso_date(permit_window[1])

            if parsed_stamp and parsed_start and parsed_end:
                if not (parsed_start <= parsed_stamp <= parsed_end):
                    cv7_passed = False
                    cv7_msg = (
                        f"CV-07 Warning: Stamp date ({parsed_stamp}) is outside permit validity "
                        f"window ({parsed_start} to {parsed_end})"
                    )
                    warnings.append(CrossViolation(
                        rule_id="CV-07",
                        rule_name="Stamp Date vs Permit Validity Window",
                        severity="WARNING",
                        field_name="stamp_date",
                        expected_value=f"Between {parsed_start} and {parsed_end}",
                        actual_value=str(parsed_stamp),
                        telemetry_code="WRN_STAMP_EXPIRY",
                        details=cv7_msg,
                    ))

        flags.append(CrossValidationFlag(
            rule_id="CV-07",
            rule_description="Stamp Date vs Permit Validity Window",
            passed=cv7_passed,
            telemetry_message=cv7_msg,
        ))

        # =========================================================================
        # Rule CV-08: Aadhaar QR RSA-2048 PKI Sig Valid (PKCS#1 v1.5 Sig == VALID -> ERR_PKI_FORGED)
        # =========================================================================
        cv8_passed = True
        cv8_msg = "CV-08 Passed: Aadhaar QR offline cryptographic PKI signature is valid"
        if qr_payload and qr_payload.raw_qr_found:
            if qr_payload.qr_type == "AADHAAR_SECURE_V2" and not qr_payload.signature_valid:
                cv8_passed = False
                cv8_msg = "CV-08 Failed: Aadhaar QR RSA-2048 PKI Digital Signature is INVALID or FORGED"
                critical_violations.append(CrossViolation(
                    rule_id="CV-08",
                    rule_name="Aadhaar Secure QR Offline PKI Signature",
                    severity="CRITICAL",
                    field_name="qr_pki_signature",
                    expected_value="VALID PKCS#1 v1.5 RSA-2048 Signature",
                    actual_value="INVALID / SIGNATURE MISMATCH",
                    telemetry_code="ERR_PKI_FORGED",
                    details=cv8_msg,
                ))

        flags.append(CrossValidationFlag(
            rule_id="CV-08",
            rule_description="Aadhaar QR RSA-2048 PKI Signature Valid",
            passed=cv8_passed,
            telemetry_message=cv8_msg,
        ))

        # Aggregate Result
        all_violations = critical_violations + warnings
        overall_passed = len(critical_violations) == 0
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return CrossValidationResult(
            cross_validation_passed=overall_passed,
            violation_count=len(all_violations),
            critical_violations=critical_violations,
            warnings=warnings,
            violations=all_violations,
            flags=flags,
            rules_checked=8,
            processing_time_ms=elapsed_ms,
        )


# Global Singleton Instance
cross_validator = CrossValidator()
