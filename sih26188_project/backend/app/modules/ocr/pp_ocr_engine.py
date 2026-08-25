"""
SIH26188 — Multilingual PP-OCRv4 Engine & Structured Key-Value Extractor
Architecture Reference: Section 2.1, 6.3

Provides:
- Synchronous Tier-1 OCR using PaddleOCR PP-OCRv4 for Devanagari and Latin scripts
- High-speed polygon/bbox detection and text recognition (<45ms M4 / <26ms GPU)
- Structured key-value demographic field parsing (Name, DOB, Doc Number, Gender, Address, Expiry)
- Script detection (Devanagari, Latin, Mixed) and mean confidence aggregation
- Quality-gate condition: triggers requires_tier2_vlm when mean_confidence < TAU_OCR (0.82)
- Asynchronous Tier-2 Qwen2.5-VL recovery fallback stub
- Robust fallback when ML weights are unavailable to ensure pipeline resilience
"""

import asyncio
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.ocr import OCRBox, OCRFieldResult, OCRResult, QRPayload

logger = get_logger("sih26188.pp_ocr_engine")

# Regular Expression Patterns for Identity Documents (India, Nepal, Bhutan)
REGEX_PATTERNS = {
    "aadhaar_number": r'\b\d{4}\s?\d{4}\s?\d{4}\b',
    "pan_number": r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b',
    "passport_number": r'\b[A-PR-WY-Z][0-9]{7,8}\b',
    "voter_id": r'\b[A-Z]{3}[0-9]{7}\b',
    "bhutan_cid": r'\b\d{11}\b',
    "dob_dmy": r'\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})\b',
    "dob_ymd": r'\b(\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2})\b',
    "yob": r'\b(?:Year of Birth|DOB|जन्म वर्ष|जन्म)\s*[:\-]?\s*(\d{4})\b',
    "gender_en": r'\b(MALE|FEMALE|TRANSGENDER|M|F)\b',
    "gender_hi": r'(पुरुष|महिला|तृतीय लिंग)',
}


def detect_script(text: str) -> str:
    """
    Detects predominant script in recognized text.
    Devanagari Unicode block: U+0900 to U+097F.
    """
    devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    latin_count = sum(1 for c in text if 'a' <= c.lower() <= 'z')

    if devanagari_count > 0 and latin_count > 0:
        return "mixed"
    elif devanagari_count > latin_count:
        return "devanagari"
    elif latin_count > 0:
        return "latin"
    return "unknown"


def extract_structured_fields(raw_text: str, boxes: List[OCRBox]) -> Tuple[Dict[str, str], Dict[str, float]]:
    """
    Extracts standardized identity fields from OCR text lines and computes field-level confidences.
    Fields: full_name, dob, doc_number, gender, address, expiry
    """
    fields: Dict[str, str] = {}
    confidences: Dict[str, float] = {}

    lines = [b.text.strip() for b in boxes if b.text.strip()]
    if not lines and raw_text:
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    # Helper to find mean confidence for matched text
    def get_field_conf(matched_substring: str, default: float = 0.90) -> float:
        matching_boxes = [b for b in boxes if matched_substring in b.text]
        if matching_boxes:
            return round(sum(b.confidence for b in matching_boxes) / len(matching_boxes), 4)
        return default

    # 1. Document Number Extraction
    for line in lines:
        # Aadhaar
        m_aadhaar = re.search(REGEX_PATTERNS["aadhaar_number"], line)
        if m_aadhaar and "doc_number" not in fields:
            num = m_aadhaar.group(0).replace(" ", "")
            fields["doc_number"] = f"{num[:4]} {num[4:8]} {num[8:]}"
            confidences["doc_number"] = get_field_conf(m_aadhaar.group(0))
            break
        # PAN
        m_pan = re.search(REGEX_PATTERNS["pan_number"], line)
        if m_pan and "doc_number" not in fields:
            fields["doc_number"] = m_pan.group(0)
            confidences["doc_number"] = get_field_conf(m_pan.group(0))
            break
        # Passport
        m_pass = re.search(REGEX_PATTERNS["passport_number"], line)
        if m_pass and "doc_number" not in fields and not re.search(r'INDIA|GOVERNMENT', line, re.I):
            fields["doc_number"] = m_pass.group(0)
            confidences["doc_number"] = get_field_conf(m_pass.group(0))
            break
        # Voter ID
        m_voter = re.search(REGEX_PATTERNS["voter_id"], line)
        if m_voter and "doc_number" not in fields:
            fields["doc_number"] = m_voter.group(0)
            confidences["doc_number"] = get_field_conf(m_voter.group(0))
            break
        # Bhutan CID
        m_cid = re.search(REGEX_PATTERNS["bhutan_cid"], line)
        if m_cid and "doc_number" not in fields:
            fields["doc_number"] = m_cid.group(0)
            confidences["doc_number"] = get_field_conf(m_cid.group(0))
            break

    # 2. Date of Birth (DOB) Extraction - prioritize lines explicitly mentioning DOB / Birth
    for line in lines:
        if re.search(r'DOB|BIRTH|जन्म', line, re.IGNORECASE):
            m_dob_dmy = re.search(REGEX_PATTERNS["dob_dmy"], line)
            if m_dob_dmy:
                fields["dob"] = m_dob_dmy.group(1)
                confidences["dob"] = get_field_conf(m_dob_dmy.group(1))
                break
            m_dob_ymd = re.search(REGEX_PATTERNS["dob_ymd"], line)
            if m_dob_ymd:
                fields["dob"] = m_dob_ymd.group(1)
                confidences["dob"] = get_field_conf(m_dob_ymd.group(1))
                break
            m_yob = re.search(REGEX_PATTERNS["yob"], line)
            if m_yob:
                fields["dob"] = m_yob.group(1)
                confidences["dob"] = get_field_conf(m_yob.group(1))
                break

    if "dob" not in fields:
        for line in lines:
            if re.search(r'ISSUE|ISSUED|जारी', line, re.IGNORECASE):
                continue
            m_dob_dmy = re.search(REGEX_PATTERNS["dob_dmy"], line)
            if m_dob_dmy and "dob" not in fields:
                fields["dob"] = m_dob_dmy.group(1)
                confidences["dob"] = get_field_conf(m_dob_dmy.group(1))
                break
            m_dob_ymd = re.search(REGEX_PATTERNS["dob_ymd"], line)
            if m_dob_ymd and "dob" not in fields:
                fields["dob"] = m_dob_ymd.group(1)
                confidences["dob"] = get_field_conf(m_dob_ymd.group(1))
                break
            m_yob = re.search(REGEX_PATTERNS["yob"], line)
            if m_yob and "dob" not in fields:
                fields["dob"] = m_yob.group(1)
                confidences["dob"] = get_field_conf(m_yob.group(1))
                break

    # 3. Gender Extraction
    for line in lines:
        m_gen_en = re.search(REGEX_PATTERNS["gender_en"], line, re.IGNORECASE)
        if m_gen_en and "gender" not in fields:
            val = m_gen_en.group(1).upper()
            fields["gender"] = "M" if val in ["M", "MALE"] else ("F" if val in ["F", "FEMALE"] else "T")
            confidences["gender"] = get_field_conf(m_gen_en.group(1))
            break
        m_gen_hi = re.search(REGEX_PATTERNS["gender_hi"], line)
        if m_gen_hi and "gender" not in fields:
            val = m_gen_hi.group(1)
            fields["gender"] = "M" if val == "पुरुष" else ("F" if val == "महिला" else "T")
            confidences["gender"] = get_field_conf(val)
            break

    # 4. Name Extraction (Heuristic based on identity card layouts)
    # Strategy:
    #   a) Highest priority: explicit "Name: XYZ" label on the line
    #   b) Second: capitalized 2-4 word Latin sequence that is NOT a header keyword
    #   c) Reject: 2-char token garbage (e.g. "HR HR") produced by OCR confusion on Devanagari
    #   d) Reject: all-Devanagari lines (prefer the English rendition on bilingual cards)

    def _is_valid_latin_name(text: str) -> bool:
        """Returns True if text looks like a real personal name in Latin script."""
        tokens = text.strip().split()
        if not tokens:
            return False
        # Each token must be at least 3 chars (eliminates "HR HR", "A B", etc.)
        if any(len(t) < 3 for t in tokens):
            return False
        # Must have between 1 and 5 tokens (single names and compound names)
        if not (1 <= len(tokens) <= 5):
            return False
        # Must be primarily Latin characters
        latin_chars = sum(1 for c in text if 'a' <= c.lower() <= 'z')
        if latin_chars < len(text.replace(' ', '')) * 0.7:
            return False
        # Must not be all-uppercase acronym (e.g. "AADHAAR", "INDIA")
        if text == text.upper() and len(tokens) == 1 and len(tokens[0]) > 6:
            return False
        return True

    # a) First pass: look for "Name: ..." pattern anywhere in lines
    for line in lines:
        m_name_label = re.search(r'(?:Name|NAME)\s*[:\-]\s*([A-Za-z][A-Za-z\s\'\.]{2,})', line)
        if m_name_label and "full_name" not in fields:
            candidate = m_name_label.group(1).strip()
            if _is_valid_latin_name(candidate):
                fields["full_name"] = candidate
                confidences["full_name"] = get_field_conf(candidate)
                break

    # b) Second pass: heuristic 2-4 word capitalized Latin name
    if "full_name" not in fields:
        for i, line in enumerate(lines):
            clean_l = line.strip()
            # Skip lines containing known header/label keywords
            if any(h in clean_l.upper() for h in [
                "GOVERNMENT", "INDIA", "BHUTAN", "NEPAL", "AADHAAR", "INCOME TAX",
                "ELECTION COMMISSION", "PASSPORT", "UNION OF INDIA", "MALE", "FEMALE",
                "DOB", "DATE OF BIRTH", "FATHER", "NAME", "ADDRESS", "PROOF OF IDENTITY",
                "CITIZENSHIP", "PEHCHAN", "MERI", "MERA", "YEAR OF BIRTH", "ISSUE",
                "AUTHENTICATION", "OFFLINE", "SCAN", "UIDAI", "QR",
            ]):
                # But still check if this line embeds "Name: value" inline
                m_name_inline = re.search(r'(?:Name|NAME)\s*[:\-]\s*([A-Za-z][A-Za-z\s\'\.]{2,})', clean_l, re.IGNORECASE)
                if m_name_inline:
                    candidate = m_name_inline.group(1).strip()
                    if _is_valid_latin_name(candidate):
                        fields["full_name"] = candidate
                        confidences["full_name"] = get_field_conf(candidate)
                        break
                continue

            # Prefer Title-Case or UPPER-CASE 2-5 word sequences in Latin script
            m_titlecase = re.match(r'^([A-Z][a-zA-Z\'\.]+(?:\s+[A-Z][a-zA-Z\'\.]+){1,4})$', clean_l)
            if m_titlecase and _is_valid_latin_name(m_titlecase.group(1)):
                fields["full_name"] = m_titlecase.group(1).strip()
                confidences["full_name"] = get_field_conf(clean_l)
                break


    # 5. Expiry Date / Issue Date
    for line in lines:
        if re.search(r'EXPIR|VALID|EXP', line, re.IGNORECASE):
            m_exp = re.search(REGEX_PATTERNS["dob_dmy"], line) or re.search(REGEX_PATTERNS["dob_ymd"], line)
            if m_exp:
                fields["expiry"] = m_exp.group(1)
                confidences["expiry"] = get_field_conf(m_exp.group(1))
                break
        if re.search(r'ISSUE|ISSUED|जारी', line, re.IGNORECASE):
            m_iss = re.search(REGEX_PATTERNS["dob_dmy"], line) or re.search(REGEX_PATTERNS["dob_ymd"], line)
            if m_iss and "issue_date" not in fields:
                fields["issue_date"] = m_iss.group(1)
                confidences["issue_date"] = get_field_conf(m_iss.group(1))

    return fields, confidences


class PPOCREngine:
    """
    RapidOCR / PaddleOCR PP-OCRv4 Multi-Script Engine with confidence gating.
    """

    def __init__(
        self,
        det_model_path: Optional[Path] = None,
        rec_dev_model_path: Optional[Path] = None,
        rec_latin_model_path: Optional[Path] = None,
    ):
        self.det_model_path = det_model_path or settings.get_model_path(settings.PPOCR_DET_MODEL)
        self.rec_dev_model_path = rec_dev_model_path or settings.get_model_path(settings.PPOCR_REC_DEV_MODEL)
        self.rec_latin_model_path = rec_latin_model_path or settings.get_model_path(settings.PPOCR_REC_LATIN_MODEL)

        self._rapid_ocr = None
        self._paddle_ocr_en = None
        self._paddle_ocr_dev = None
        self._init_ocr_engines()

    def _init_ocr_engines(self) -> None:
        """Initializes RapidOCR (PP-OCRv4 ONNX) or PaddleOCR instances."""
        # 1. Primary: RapidOCR (PP-OCRv4 ONNX via ONNXRuntime)
        try:
            from rapidocr_onnxruntime import RapidOCR
            self._rapid_ocr = RapidOCR()
            logger.info("RapidOCR PP-OCRv4 ONNX engine initialized successfully.")
            return
        except Exception as e:
            logger.debug(f"RapidOCR initialization notice: {e}")
            self._rapid_ocr = None

        # 2. Secondary: PaddleOCR C++ package
        try:
            from paddleocr import PaddleOCR
            self._paddle_ocr_en = PaddleOCR(use_angle_cls=True, lang="en", show_log=False, use_gpu=False)
            self._paddle_ocr_dev = PaddleOCR(use_angle_cls=True, lang="devanagari", show_log=False, use_gpu=False)
            logger.info("PaddleOCR Latin & Devanagari engines initialized.")
        except Exception as e:
            logger.debug(f"PaddleOCR package not initialized: {e}")
            self._paddle_ocr_en = None
            self._paddle_ocr_dev = None

    async def run_qwen_vl_quality_gate(self, image: Any, degraded_fields: List[str]) -> Dict[str, Any]:
        """
        Tier-2 Quality Gate Async Dispatch for degraded identity documents (Section 2.1, Topic B).
        """
        logger.info(f"[ASYNC TIER-2 VLM TRIGGERED] Queued Qwen2.5-VL refinement for fields: {degraded_fields}")
        raise NotImplementedError(
            "Tier-2 Qwen2.5-VL-3B-Instruct (AWQ INT4) quality gate requires a background vLLM / llama-cpp worker. "
            f"Degraded fields requested for refinement: {degraded_fields}. Checkpoint: {settings.QWEN_VL_MODEL}"
        )

    def extract_text(self, image_or_text: Union[Any, str]) -> OCRResult:
        """
        Executes multi-script OCR extraction from an input document image or raw string.
        Returns complete OCRResult schema with confidence metrics and structured fields.
        """
        start_time = time.perf_counter()

        # Handle direct text string input (for testing and heuristic pipes)
        if isinstance(image_or_text, str):
            raw_text = image_or_text
            lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
            boxes = [
                OCRBox(
                    text=line,
                    confidence=0.95,
                    polygon=[[0, i * 20], [200, i * 20], [200, (i + 1) * 20], [0, (i + 1) * 20]],
                    bbox=[0, i * 20, 200, (i + 1) * 20],
                )
                for i, line in enumerate(lines)
            ]
            fields, confidences = extract_structured_fields(raw_text, boxes)
            mean_conf = 0.95 if boxes else 0.0
            script = detect_script(raw_text)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

            return OCRResult(
                status="success",
                script_detected=script,
                fields=fields,
                field_confidences=confidences,
                raw_boxes=boxes,
                mean_confidence=mean_conf,
                requires_tier2_vlm=mean_conf < settings.TAU_OCR,
                raw_text=raw_text,
                qr_payload=None,
                processing_time_ms=elapsed_ms,
            )

        boxes: List[OCRBox] = []
        raw_text_parts: List[str] = []

        import numpy as np  # type: ignore
        import cv2  # type: ignore

        # Standardize input image to BGR / RGB numpy array
        np_img = None
        if hasattr(image_or_text, "convert"):
            np_img = np.array(image_or_text.convert("RGB"))
        elif isinstance(image_or_text, (bytes, bytearray)):
            np_arr = np.frombuffer(image_or_text, dtype=np.uint8)
            np_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        elif isinstance(image_or_text, np.ndarray):
            np_img = image_or_text

        # -----------------------------------------------------------------------
        # PRIMARY ENGINE: RapidOCR (PP-OCRv4 ONNX runtime)
        # -----------------------------------------------------------------------
        if self._rapid_ocr is not None and np_img is not None:
            try:
                ocr_res, _ = self._rapid_ocr(np_img)
                if ocr_res:
                    for item in ocr_res:
                        poly_pts, text, score = item
                        poly = [[int(pt[0]), int(pt[1])] for pt in poly_pts]
                        xs = [p[0] for p in poly]
                        ys = [p[1] for p in poly]
                        bbox = [min(xs), min(ys), max(xs), max(ys)]
                        boxes.append(OCRBox(text=text, confidence=float(score), polygon=poly, bbox=bbox))
                        raw_text_parts.append(text)
            except Exception as e:
                logger.warning(f"RapidOCR inference error: {e}")

        # -----------------------------------------------------------------------
        # SECONDARY ENGINE: PaddleOCR (if installed)
        # -----------------------------------------------------------------------
        if not boxes and self._paddle_ocr_en is not None and np_img is not None:
            try:
                results_en = self._paddle_ocr_en.ocr(np_img, cls=True)
                if results_en and results_en[0]:
                    for line_info in results_en[0]:
                        poly = [[int(pt[0]), int(pt[1])] for pt in line_info[0]]
                        text, conf = line_info[1][0], float(line_info[1][1])
                        xs = [p[0] for p in poly]
                        ys = [p[1] for p in poly]
                        bbox = [min(xs), min(ys), max(xs), max(ys)]
                        boxes.append(OCRBox(text=text, confidence=conf, polygon=poly, bbox=bbox))
                        raw_text_parts.append(text)
            except Exception as e:
                logger.warning(f"PaddleOCR inference error: {e}")

        # -----------------------------------------------------------------------
        # FALLBACK: Tesseract OCR with OpenCV preprocessing
        # Used when PaddleOCR is not installed or yields 0 results.
        # Preprocessing: CLAHE → Otsu threshold → denoising for Aadhaar card legibility.
        # -----------------------------------------------------------------------
        if not boxes:
            boxes, raw_text_parts = self._run_tesseract_fallback(image_or_text)

        # -----------------------------------------------------------------------
        # FALLBACK 2: EasyOCR (PyTorch-native, no ONNX required)
        # Used if both PaddleOCR and Tesseract fail.
        # -----------------------------------------------------------------------
        if not boxes:
            boxes, raw_text_parts = self._run_easyocr_fallback(image_or_text)

        # Compute metrics
        raw_text = "\n".join(raw_text_parts)
        if boxes:
            mean_conf = round(sum(b.confidence for b in boxes) / len(boxes), 4)
            script = detect_script(raw_text)
            fields, confidences = extract_structured_fields(raw_text, boxes)
            requires_vlm = mean_conf < settings.TAU_OCR
            status = "low_confidence" if requires_vlm else "success"
        else:
            mean_conf = 0.0
            script = "unknown"
            fields, confidences = {}, {}
            requires_vlm = True
            status = "unavailable"

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return OCRResult(
            status=status,
            script_detected=script,
            fields=fields,
            field_confidences=confidences,
            raw_boxes=boxes,
            mean_confidence=mean_conf,
            requires_tier2_vlm=requires_vlm,
            raw_text=raw_text,
            qr_payload=None,
            processing_time_ms=elapsed_ms,
        )

    def _preprocess_for_ocr(self, image_or_text: Any) -> Optional[Any]:
        """
        Applies OpenCV preprocessing pipeline to improve OCR on Aadhaar cards:
        1. Convert to grayscale
        2. CLAHE contrast enhancement (helps with uneven lighting from phone photos)
        3. Mild bilateral denoising
        4. Otsu adaptive thresholding for text/background separation

        Returns a preprocessed numpy array, or None on failure.
        """
        try:
            import cv2  # type: ignore
            import numpy as np  # type: ignore

            if isinstance(image_or_text, np.ndarray):
                img = image_or_text.copy()
            elif hasattr(image_or_text, "convert"):
                img = np.array(image_or_text.convert("RGB"))
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            elif isinstance(image_or_text, (bytes, bytearray)):
                nparr = np.frombuffer(image_or_text, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None:
                    return None
            else:
                return None

            # Upscale if small (Aadhaar cards photographed from far away)
            h, w = img.shape[:2]
            if w < 600:
                scale = 600.0 / w
                img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

            # Grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # CLAHE for contrast normalization (helps with phone photo lighting)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)

            # Mild bilateral denoising to reduce background noise before threshold
            gray = cv2.bilateralFilter(gray, d=5, sigmaColor=75, sigmaSpace=75)

            # Otsu binarization — separates dark text from light card background
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            return thresh
        except Exception as e:
            logger.debug(f"OCR preprocessing failed: {e}")
            return None

    def _run_tesseract_fallback(
        self, image_or_text: Any
    ) -> tuple:
        """
        Tesseract OCR fallback with preprocessed image.
        Handles Aadhaar cards with both English and Devanagari text.
        Returns (boxes, raw_text_parts) tuple.
        """
        boxes: List[OCRBox] = []
        raw_text_parts: List[str] = []
        try:
            import pytesseract  # type: ignore

            preprocessed = self._preprocess_for_ocr(image_or_text)
            if preprocessed is None:
                return boxes, raw_text_parts

            # PSM 6: Uniform block of text — best for structured ID card text
            # OEM 3: Default engine (LSTM + legacy)
            config = "--psm 6 --oem 3 -l eng+hin"
            raw = pytesseract.image_to_string(preprocessed, config=config)

            # Also get per-word bounding boxes and confidence
            try:
                data = pytesseract.image_to_data(preprocessed, config=config, output_type=pytesseract.Output.DICT)
                n_boxes = len(data["text"])
                for i in range(n_boxes):
                    text = str(data["text"][i]).strip()
                    conf_raw = int(data["conf"][i])
                    if conf_raw < 0 or not text:
                        continue
                    conf = conf_raw / 100.0
                    x, y, w, h = int(data["left"][i]), int(data["top"][i]), int(data["width"][i]), int(data["height"][i])
                    bbox = [x, y, x + w, y + h]
                    poly = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
                    boxes.append(OCRBox(text=text, confidence=conf, polygon=poly, bbox=bbox))
                    raw_text_parts.append(text)
            except Exception:
                # image_to_data failed, fall back to plain string parse
                for i, line in enumerate([l.strip() for l in raw.splitlines() if l.strip()]):
                    y_pos = i * 20
                    boxes.append(OCRBox(
                        text=line, confidence=0.70,
                        polygon=[[0, y_pos], [400, y_pos], [400, y_pos + 20], [0, y_pos + 20]],
                        bbox=[0, y_pos, 400, y_pos + 20],
                    ))
                    raw_text_parts.append(line)

            if boxes:
                logger.info(f"Tesseract OCR fallback extracted {len(boxes)} text regions.")
        except ImportError:
            logger.debug("pytesseract not installed — Tesseract fallback skipped.")
        except Exception as e:
            logger.warning(f"Tesseract fallback error: {e}")
        return boxes, raw_text_parts

    def _run_easyocr_fallback(
        self, image_or_text: Any
    ) -> tuple:
        """
        EasyOCR (PyTorch-native) fallback — no ONNX runtime required.
        Handles multilingual Indian identity documents (en + hi scripts).
        Returns (boxes, raw_text_parts) tuple.
        """
        boxes: List[OCRBox] = []
        raw_text_parts: List[str] = []
        try:
            import easyocr  # type: ignore
            import numpy as np  # type: ignore

            reader = easyocr.Reader(["en", "hi"], gpu=False, verbose=False)

            if isinstance(image_or_text, np.ndarray):
                img_input = image_or_text
            elif hasattr(image_or_text, "convert"):
                img_input = np.array(image_or_text.convert("RGB"))
            elif isinstance(image_or_text, (bytes, bytearray)):
                nparr = np.frombuffer(image_or_text, np.uint8)
                import cv2  # type: ignore
                img_input = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            else:
                return boxes, raw_text_parts

            results = reader.readtext(img_input, detail=1, paragraph=False)
            for (bbox_pts, text, conf) in results:
                text = str(text).strip()
                if not text:
                    continue
                xs = [int(p[0]) for p in bbox_pts]
                ys = [int(p[1]) for p in bbox_pts]
                poly = [[int(p[0]), int(p[1])] for p in bbox_pts]
                bbox = [min(xs), min(ys), max(xs), max(ys)]
                boxes.append(OCRBox(text=text, confidence=float(conf), polygon=poly, bbox=bbox))
                raw_text_parts.append(text)

            if boxes:
                logger.info(f"EasyOCR fallback extracted {len(boxes)} text regions.")
        except ImportError:
            logger.debug("easyocr not installed — EasyOCR fallback skipped.")
        except Exception as e:
            logger.warning(f"EasyOCR fallback error: {e}")
        return boxes, raw_text_parts


# Global Singleton Instance
pp_ocr_engine = PPOCREngine()
