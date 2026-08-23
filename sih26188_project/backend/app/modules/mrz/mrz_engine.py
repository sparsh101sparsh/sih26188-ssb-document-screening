"""
SIH26188 — ICAO Doc 9303 Machine Readable Zone (MRZ) Engine
Architecture Reference: Section 2.5, 6.3

Provides:
- Pure Python ICAO Doc 9303 Modulo-10 (7-3-1) mathematical checksum computation
- Check digit validation across CD1, CD2, CD3, CD4 and Composite Check Digit
- Full structural parser for TD1 (3x30), TD2 (2x36), and TD3 (2x44) travel documents
- OmniMRZ ONNX inference runner stub for image-based MRZ detection and recognition
"""

import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.mrz import MRZResult

logger = get_logger("sih26188.mrz_engine")

# ICAO Doc 9303 Modulo-10 Weights
ICAO_WEIGHTS = [7, 3, 1]


def icao_char_value(char: str) -> int:
    """
    Maps an MRZ character to its integer value according to ICAO Doc 9303:
    - '0'-'9' -> 0-9
    - 'A'-'Z' (or 'a'-'z') -> 10-35
    - '<' or filler/other -> 0
    """
    if not char:
        return 0
    c = char.upper()
    if '0' <= c <= '9':
        return ord(c) - ord('0')
    elif 'A' <= c <= 'Z':
        return ord(c) - ord('A') + 10
    elif c == '<':
        return 0
    else:
        return 0


def calculate_mrz_check_digit(data: str) -> str:
    """
    Calculates the ICAO Doc 9303 Modulo-10 check digit for a string of characters.
    Formula: CheckDigit(S) = sum(V(s_i) * W[(i) mod 3]) mod 10
    where W = [7, 3, 1].
    """
    total = 0
    for i, char in enumerate(data):
        val = icao_char_value(char)
        weight = ICAO_WEIGHTS[i % 3]
        total += val * weight
    return str(total % 10)


def verify_check_digit(data: str, expected_digit: str) -> bool:
    """
    Verifies if the check digit of `data` matches `expected_digit`.
    In ICAO 9303, if the optional field is empty ('<'), check digit '<' or '0' can be valid.
    """
    if not expected_digit:
        return False
    computed = calculate_mrz_check_digit(data)
    if expected_digit == computed:
        return True
    # Special handling for optional filler data where check digit might be '<' representing 0
    if expected_digit == '<' and computed == '0':
        return True
    return False


def clean_mrz_field(text: str) -> str:
    """Removes trailing and internal filler '<' characters, returning clean text."""
    if not text:
        return ""
    return text.replace("<", " ").strip()


def parse_mrz_names(name_string: str) -> Tuple[str, str]:
    """
    Parses primary identifier (surname) and secondary identifier (given names)
    separated by '<<' in standard ICAO MRZ string.
    """
    parts = name_string.split("<<")
    surname = clean_mrz_field(parts[0]) if len(parts) > 0 else ""
    given_names = ""
    if len(parts) > 1:
        # Join any further tokens with spaces
        given_tokens = [clean_mrz_field(p) for p in parts[1:] if clean_mrz_field(p)]
        given_names = " ".join(given_tokens)
    return surname, given_names


class MRZEngine:
    """
    High-speed ICAO Doc 9303 MRZ parser and validation engine.
    Supports TD1, TD2, TD3 formats with full cryptographic/mathematical check digit validation.
    """

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or settings.get_model_path(settings.OMNIMRZ_MODEL)
        self._onnx_session = None
        self._init_omnimrz_session()

    def _init_omnimrz_session(self) -> None:
        """
        Initializes OmniMRZ ONNX session if weights are present.
        If weights are not found, logs info for offline fallback.
        """
        if self.model_path and self.model_path.exists():
            try:
                import onnxruntime as ort
                from app.core.backend_selector import get_optimal_execution_providers

                providers = get_optimal_execution_providers()
                self._onnx_session = ort.InferenceSession(str(self.model_path), providers=providers)
                logger.info(f"OmniMRZ ONNX session initialized successfully from {self.model_path}")
            except Exception as e:
                logger.warning(f"Could not initialize OmniMRZ ONNX session: {e}")
                self._onnx_session = None
        else:
            logger.debug(f"OmniMRZ ONNX model checkpoint not present at {self.model_path}. Text parser active.")

    def run_omnimrz_inference(self, image_np_or_pil: Any) -> List[str]:
        """
        Executes direct visual OmniMRZ ONNX inference on document crop using OCR-B recognition.

        Pipeline Steps:
        1. Crop lower 20% / MRZ band from document image.
        2. Resize to fixed resolution (64x512) and normalize RGB to [-1.0, 1.0].
        3. Run ONNX forward pass using omnimrz_ppocr_v4.onnx.
        4. CTC beam search decode raw logits into sanitized ICAO MRZ character strings.

        Raises:
            NotImplementedError: OmniMRZ weights checkpoint 'omnimrz_ppocr_v4.onnx' must be loaded.
            When session is None, the system falls back to PP-OCRv4 text lines + regex line extractor.
        """
        if self._onnx_session is None:
            logger.debug("OmniMRZ ONNX model not loaded. Direct visual ONNX inference unavailable.")
            raise NotImplementedError(
                "OmniMRZ ONNX model weights ('omnimrz_ppocr_v4.onnx') are not loaded into memory. "
                "Ensure weights are downloaded via backend/scripts/download_weights.sh into models directory. "
                "The pipeline will fall back to PP-OCRv4 text line parsing and Modulo-10 checksum validation."
            )

        # When ONNX session is loaded:
        # input_tensor = self._preprocess_mrz_crop(image_np_or_pil)
        # logits = self._onnx_session.run(None, {self._onnx_session.get_inputs()[0].name: input_tensor})[0]
        # return self._ctc_decode(logits)
        return []

    def parse_mrz_lines(self, lines: List[str]) -> MRZResult:
        """
        Parses raw MRZ text lines into structured MRZResult with strict Modulo-10 checksum validation.
        Auto-detects TD1 (3x30), TD2 (2x36), or TD3 (2x44) format based on line count and lengths.
        """
        start_time = time.perf_counter()

        # Sanitize and uppercase lines
        sanitized_lines = [
            re.sub(r'[^A-Z0-9<]', '', line.upper().strip())
            for line in lines
            if line and line.strip()
        ]

        if not sanitized_lines:
            return MRZResult(
                mrz_detected=False,
                valid=False,
                raw_lines=[],
                checksum_failures=["No valid MRZ lines provided"],
                processing_time_ms=0.0,
            )

        # Detect TD format
        num_lines = len(sanitized_lines)
        line_lengths = [len(l) for l in sanitized_lines]

        if num_lines == 3:
            # TD1 format (3 lines of 30 chars)
            return self._parse_td1(sanitized_lines, start_time)
        elif num_lines == 2:
            max_len = max(line_lengths)
            if max_len >= 40:
                # TD3 format (2 lines of 44 chars)
                return self._parse_td3(sanitized_lines, start_time)
            else:
                # TD2 format (2 lines of 36 chars)
                return self._parse_td2(sanitized_lines, start_time)
        else:
            # Check if all lines are joined or improperly split
            joined = "".join(sanitized_lines)
            if len(joined) == 90:
                return self._parse_td1([joined[0:30], joined[30:60], joined[60:90]], start_time)
            elif len(joined) == 88:
                return self._parse_td3([joined[0:44], joined[44:88]], start_time)
            elif len(joined) == 72:
                return self._parse_td2([joined[0:36], joined[36:72]], start_time)

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return MRZResult(
                mrz_detected=True,
                mrz_type="UNKNOWN",
                valid=False,
                raw_lines=sanitized_lines,
                checksum_failures=[f"Unrecognized MRZ layout: {num_lines} lines of lengths {line_lengths}"],
                processing_time_ms=elapsed_ms,
            )

    def _parse_td1(self, lines: List[str], start_time: float) -> MRZResult:
        """
        Parses TD1 format (3 lines x 30 characters).
        Standard: ICAO Doc 9303 Part 5.
        Line 1: Doc Type (0:2), Issuing State (2:5), Doc Number (5:14), CD1 (14:15), Optional 1 (15:30)
        Line 2: DOB (0:6), CD2 (6:7), Sex (7:8), Expiry (8:14), CD3 (14:15), Nationality (15:18), Optional 2 (18:29), Composite CD (29:30)
        Line 3: Name: Surname << Given Names (0:30)
        """
        l1 = lines[0].ljust(30, '<')[:30]
        l2 = lines[1].ljust(30, '<')[:30]
        l3 = lines[2].ljust(30, '<')[:30]

        failures: List[str] = []

        doc_type = clean_mrz_field(l1[0:2])
        country_code = clean_mrz_field(l1[2:5])
        doc_number_raw = l1[5:14]
        doc_number = clean_mrz_field(doc_number_raw)
        cd1 = l1[14]
        opt1 = l1[15:30]

        dob_raw = l2[0:6]
        cd2 = l2[6]
        sex = l2[7]
        expiry_raw = l2[8:14]
        cd3 = l2[14]
        nationality = clean_mrz_field(l2[15:18])
        opt2 = l2[18:29]
        composite_cd = l2[29]

        surname, given_names = parse_mrz_names(l3)

        # Checksum validations
        cd1_valid = verify_check_digit(doc_number_raw, cd1)
        if not cd1_valid:
            failures.append(f"Document Number Check Digit (CD1) mismatch: expected {cd1}, calculated {calculate_mrz_check_digit(doc_number_raw)}")

        cd2_valid = verify_check_digit(dob_raw, cd2)
        if not cd2_valid:
            failures.append(f"Date of Birth Check Digit (CD2) mismatch: expected {cd2}, calculated {calculate_mrz_check_digit(dob_raw)}")

        cd3_valid = verify_check_digit(expiry_raw, cd3)
        if not cd3_valid:
            failures.append(f"Expiry Date Check Digit (CD3) mismatch: expected {cd3}, calculated {calculate_mrz_check_digit(expiry_raw)}")

        # TD1 Composite Check Digit:
        # Computed over: Line 1 chars 5-30 (doc_num + cd1 + opt1), Line 2 chars 0-7 (dob + cd2), Line 2 chars 8-15 (expiry + cd3), Line 2 chars 18-29 (opt2)
        composite_string = l1[5:30] + l2[0:7] + l2[8:15] + l2[18:29]
        composite_valid = verify_check_digit(composite_string, composite_cd)
        if not composite_valid:
            failures.append(f"Composite Check Digit mismatch: expected {composite_cd}, calculated {calculate_mrz_check_digit(composite_string)}")

        overall_valid = (cd1_valid and cd2_valid and cd3_valid and composite_valid)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        parsed_fields = {
            "document_type": doc_type,
            "country_code": country_code,
            "document_number": doc_number,
            "surname": surname,
            "given_names": given_names,
            "dob": dob_raw,
            "sex": sex if sex in ['M', 'F'] else 'X',
            "expiry": expiry_raw,
            "nationality": nationality,
            "optional_data": clean_mrz_field(opt1 + opt2),
        }

        return MRZResult(
            mrz_detected=True,
            mrz_type="TD1",
            valid=overall_valid,
            raw_lines=[l1, l2, l3],
            document_type=doc_type,
            country_code=country_code,
            surname=surname,
            given_names=given_names,
            document_number=doc_number,
            doc_number_checksum_valid=cd1_valid,
            nationality=nationality,
            dob=dob_raw,
            dob_checksum_valid=cd2_valid,
            sex=sex if sex in ['M', 'F'] else 'X',
            expiry=expiry_raw,
            expiry_checksum_valid=cd3_valid,
            optional_data=clean_mrz_field(opt1 + opt2),
            optional_data_checksum_valid=True,
            composite_checksum_valid=composite_valid,
            checksum_failures=failures,
            parsed_fields=parsed_fields,
            processing_time_ms=elapsed_ms,
        )

    def _parse_td2(self, lines: List[str], start_time: float) -> MRZResult:
        """
        Parses TD2 format (2 lines x 36 characters).
        Standard: ICAO Doc 9303 Part 6.
        Line 1: Doc Type (0:2), Issuing State (2:5), Name: Surname << Given Names (5:36)
        Line 2: Doc Number (0:9), CD1 (9:10), Nationality (10:13), DOB (13:19), CD2 (19:20), Sex (20:21), Expiry (21:27), CD3 (27:28), Optional (28:35), Composite CD (35:36)
        """
        l1 = lines[0].ljust(36, '<')[:36]
        l2 = lines[1].ljust(36, '<')[:36]

        failures: List[str] = []

        doc_type = clean_mrz_field(l1[0:2])
        country_code = clean_mrz_field(l1[2:5])
        surname, given_names = parse_mrz_names(l1[5:36])

        doc_number_raw = l2[0:9]
        doc_number = clean_mrz_field(doc_number_raw)
        cd1 = l2[9]
        nationality = clean_mrz_field(l2[10:13])
        dob_raw = l2[13:19]
        cd2 = l2[19]
        sex = l2[20]
        expiry_raw = l2[21:27]
        cd3 = l2[27]
        optional_raw = l2[28:35]
        composite_cd = l2[35]

        # Checksum validations
        cd1_valid = verify_check_digit(doc_number_raw, cd1)
        if not cd1_valid:
            failures.append(f"Document Number Check Digit (CD1) mismatch: expected {cd1}, calculated {calculate_mrz_check_digit(doc_number_raw)}")

        cd2_valid = verify_check_digit(dob_raw, cd2)
        if not cd2_valid:
            failures.append(f"Date of Birth Check Digit (CD2) mismatch: expected {cd2}, calculated {calculate_mrz_check_digit(dob_raw)}")

        cd3_valid = verify_check_digit(expiry_raw, cd3)
        if not cd3_valid:
            failures.append(f"Expiry Date Check Digit (CD3) mismatch: expected {cd3}, calculated {calculate_mrz_check_digit(expiry_raw)}")

        # TD2 Composite Check Digit:
        # Line 2 chars 0-10 (doc_num + cd1) + chars 13-20 (dob + cd2) + chars 21-28 (expiry + cd3) + chars 28-35 (optional)
        composite_string = l2[0:10] + l2[13:20] + l2[21:28] + l2[28:35]
        composite_valid = verify_check_digit(composite_string, composite_cd)
        if not composite_valid:
            failures.append(f"Composite Check Digit mismatch: expected {composite_cd}, calculated {calculate_mrz_check_digit(composite_string)}")

        overall_valid = (cd1_valid and cd2_valid and cd3_valid and composite_valid)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        parsed_fields = {
            "document_type": doc_type,
            "country_code": country_code,
            "document_number": doc_number,
            "surname": surname,
            "given_names": given_names,
            "dob": dob_raw,
            "sex": sex if sex in ['M', 'F'] else 'X',
            "expiry": expiry_raw,
            "nationality": nationality,
            "optional_data": clean_mrz_field(optional_raw),
        }

        return MRZResult(
            mrz_detected=True,
            mrz_type="TD2",
            valid=overall_valid,
            raw_lines=[l1, l2],
            document_type=doc_type,
            country_code=country_code,
            surname=surname,
            given_names=given_names,
            document_number=doc_number,
            doc_number_checksum_valid=cd1_valid,
            nationality=nationality,
            dob=dob_raw,
            dob_checksum_valid=cd2_valid,
            sex=sex if sex in ['M', 'F'] else 'X',
            expiry=expiry_raw,
            expiry_checksum_valid=cd3_valid,
            optional_data=clean_mrz_field(optional_raw),
            optional_data_checksum_valid=True,
            composite_checksum_valid=composite_valid,
            checksum_failures=failures,
            parsed_fields=parsed_fields,
            processing_time_ms=elapsed_ms,
        )

    def _parse_td3(self, lines: List[str], start_time: float) -> MRZResult:
        """
        Parses TD3 format (2 lines x 44 characters) — Standard Machine Readable Passport (MRP).
        Standard: ICAO Doc 9303 Part 4.
        Line 1: Doc Type (0:2), Issuing State (2:5), Name: Surname << Given Names (5:44)
        Line 2: Doc Number (0:9), CD1 (9:10), Nationality (10:13), DOB (13:19), CD2 (19:20), Sex (20:21), Expiry (21:27), CD3 (27:28), Personal/Optional (28:42), CD4 (42:43), Composite CD (43:44)
        """
        l1 = lines[0].ljust(44, '<')[:44]
        l2 = lines[1].ljust(44, '<')[:44]

        failures: List[str] = []

        doc_type = clean_mrz_field(l1[0:2])
        country_code = clean_mrz_field(l1[2:5])
        surname, given_names = parse_mrz_names(l1[5:44])

        doc_number_raw = l2[0:9]
        doc_number = clean_mrz_field(doc_number_raw)
        cd1 = l2[9]
        nationality = clean_mrz_field(l2[10:13])
        dob_raw = l2[13:19]
        cd2 = l2[19]
        sex = l2[20]
        expiry_raw = l2[21:27]
        cd3 = l2[27]
        optional_raw = l2[28:42]
        cd4 = l2[42]
        composite_cd = l2[43]

        # Checksum validations
        cd1_valid = verify_check_digit(doc_number_raw, cd1)
        if not cd1_valid:
            failures.append(f"Passport Number Check Digit (CD1) mismatch: expected {cd1}, calculated {calculate_mrz_check_digit(doc_number_raw)}")

        cd2_valid = verify_check_digit(dob_raw, cd2)
        if not cd2_valid:
            failures.append(f"Date of Birth Check Digit (CD2) mismatch: expected {cd2}, calculated {calculate_mrz_check_digit(dob_raw)}")

        cd3_valid = verify_check_digit(expiry_raw, cd3)
        if not cd3_valid:
            failures.append(f"Expiry Date Check Digit (CD3) mismatch: expected {cd3}, calculated {calculate_mrz_check_digit(expiry_raw)}")

        # CD4: Optional personal number checksum
        cd4_valid = verify_check_digit(optional_raw, cd4)
        if not cd4_valid and not (optional_raw.strip('<') == '' and cd4 in ['<', '0']):
            failures.append(f"Optional Personal Number Check Digit (CD4) mismatch: expected {cd4}, calculated {calculate_mrz_check_digit(optional_raw)}")
            cd4_valid = False
        else:
            cd4_valid = True

        # TD3 Composite Check Digit:
        # Line 2 chars 0-10 (doc_num + cd1) + chars 13-20 (dob + cd2) + chars 21-28 (expiry + cd3) + chars 28-43 (optional + cd4)
        composite_string = l2[0:10] + l2[13:20] + l2[21:28] + l2[28:43]
        composite_valid = verify_check_digit(composite_string, composite_cd)
        if not composite_valid:
            failures.append(f"Composite Check Digit mismatch: expected {composite_cd}, calculated {calculate_mrz_check_digit(composite_string)}")

        overall_valid = (cd1_valid and cd2_valid and cd3_valid and cd4_valid and composite_valid)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        parsed_fields = {
            "document_type": doc_type,
            "country_code": country_code,
            "document_number": doc_number,
            "surname": surname,
            "given_names": given_names,
            "dob": dob_raw,
            "sex": sex if sex in ['M', 'F'] else 'X',
            "expiry": expiry_raw,
            "nationality": nationality,
            "optional_data": clean_mrz_field(optional_raw),
        }

        return MRZResult(
            mrz_detected=True,
            mrz_type="TD3",
            valid=overall_valid,
            raw_lines=[l1, l2],
            document_type=doc_type,
            country_code=country_code,
            surname=surname,
            given_names=given_names,
            document_number=doc_number,
            doc_number_checksum_valid=cd1_valid,
            nationality=nationality,
            dob=dob_raw,
            dob_checksum_valid=cd2_valid,
            sex=sex if sex in ['M', 'F'] else 'X',
            expiry=expiry_raw,
            expiry_checksum_valid=cd3_valid,
            optional_data=clean_mrz_field(optional_raw),
            optional_data_checksum_valid=cd4_valid,
            composite_checksum_valid=composite_valid,
            checksum_failures=failures,
            parsed_fields=parsed_fields,
            processing_time_ms=elapsed_ms,
        )


# Global Singleton Instance
mrz_engine = MRZEngine()
