# Deep Technical Survey Report: ML & Algorithmic Defects (ML-01 to ML-20)
**Document Version**: 1.0  
**Surveyor Agent**: `teamwork_preview_explorer_s4_ml`  
**Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_ml`  
**Project Root**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project`  
**Inspection Date**: 2026-09-09  

---

## 1. Executive Summary & Defect Registry Matrix

This survey provides an exhaustive read-only inspection of all 20 Machine Learning and Algorithmic defects (ML-01 through ML-20) specified in the master bug specification (`bug_report.md`) across the SIH26188 SSB Edge Screening Gateway codebase.

| Defect ID | Severity | Affected Component & Target File | Current Lines | Status in Codebase | Primary Impact / Risk |
|---|---|---|---|---|---|
| **ML-01** | CRITICAL | MRZ Engine (`backend/app/modules/mrz/mrz_engine.py`) | 439–448 | Remediated in Code | False TRIPWIRE_1 RED Alert (95.0) on valid passports with `<` filler in CD4 |
| **ML-02** | CRITICAL | Cross-Validator (`backend/app/modules/mrz/cross_validator.py`) | 80–99 | Remediated in Code | False `ERR_DOB_MISMATCH` (+3.50 penalty) for birthdays on 19th/20th |
| **ML-03** | CRITICAL | Fraud Edge Cases (`backend/app/modules/forensics/fraud_edge_cases.py`) | 95–126 | Remediated in Code | False `ERR_LOG_DATE_PARADOX_05` (4.50 weight) on hyphenated `DD-MM-YYYY` |
| **ML-04** | HIGH | Biometrics Face Detector (`backend/app/modules/biometrics/face_detector.py`) | 361–372, 498–524 | Remediated in Code | Zero-byte/corrupted image hallucinating detected face (0.55 conf) |
| **ML-05** | HIGH | Biometrics Face Detector (`backend/app/modules/biometrics/face_detector.py`) | 532–539 | Remediated in Code | OpenCV C++ crash when passing `PIL.Image` into YuNet |
| **ML-06** | HIGH | Forensics Tamper Detector (`backend/app/modules/forensics/tamper_detector.py`) | 100–122 | Remediated in Code | Insecure `torch.load` deserialization and 150MB dead code VRAM allocation |
| **ML-07** | HIGH | Forensics Tamper Detector (`backend/app/modules/forensics/tamper_detector.py`) | 414–421 | Remediated in Code | Text tampering probability clamped to <=0.12, below threshold `tau=0.18` |
| **ML-08** | HIGH | Cross-Validator (`backend/app/modules/mrz/cross_validator.py`) | 101–114 | Remediated in Code | Centenary heuristic calculating age 0 for elderly travelers born 1927–1940 |
| **ML-09** | HIGH | Biometrics Face Matcher (`backend/app/modules/biometrics/face_matcher.py`) | 367–377 | Remediated in Code | Arbitrary embedding 32-D slice averaging predicting age 19–20 for all adults |
| **ML-10** | HIGH | Stamp Verifier (`backend/app/modules/stamp_verifier.py`) | 434–483 | Remediated in Code | Global ink bounding box spanning entire page without spatial clustering |
| **ML-11** | HIGH | Liveness Detector (`backend/app/modules/biometrics/liveness_detector.py`) | 85–88 | Remediated in Code | Property `is_model_loaded` returning `True` when ONNX checkpoints missing |
| **ML-12** | MEDIUM | Models Router (`backend/app/api/routers/models.py`) | 160–186 | Remediated in Code | Hardcoded `or True` masking missing model checkpoints |
| **ML-13** | MEDIUM | ELA Forensics Engine (`backend/app/modules/forensics/ela_engine.py`) | 208–238 | Remediated in Code | Deprecated Pillow `.getdata()` calls scheduled for removal in Pillow 14 |
| **ML-14** | MEDIUM | ELA Forensics Engine (`backend/app/modules/forensics/ela_engine.py`) | 205–206, 250–251 | Remediated in Code | Visual scaling factor 2x vs numerical metric 20x amplification discrepancy |
| **ML-15** | MEDIUM | Photo Splicing Detector (`backend/app/modules/forensics/photo_splicing_detector.py`) | 243–266 | Remediated in Code | Photo border proximity substrate empty crop causing division-by-zero / `r_noise=1.0` |
| **ML-16** | MEDIUM | QR Decoder (`backend/app/modules/ocr/qr_decoder.py`) | 258–282 | Remediated in Code | Big-integer decompression fallback slicing raw ASCII string instead of binary bytes |
| **ML-17** | LOW | Biometrics Face Detector (`backend/app/modules/biometrics/face_detector.py`) | 561–567 | Remediated in Code | SCRFD-10GF feeding BGR instead of RGB channels into neural network |
| **ML-18** | LOW | OCR Engine (`backend/app/modules/ocr/pp_ocr_engine.py`) | 268, 560–563 | Remediated in Code | EasyOCR Reader re-instantiated on every fallback request (2–4s latency penalty) |
| **ML-19** | LOW | Biometrics Face Matcher (`backend/app/modules/biometrics/face_matcher.py`) | 80–125 | Remediated in Code | Piecewise confidence calibration ignoring `model_type` (AdaFace vs SFace) |
| **ML-20** | INFO | Master Scan Router (`backend/app/api/routers/scan.py`) | 352–368 | Remediated in Code | Static hardcoded verification date `2026-08-20` and fixed permit window |

---

## 2. Detailed Technical Audit: Defect-by-Defect

### ML-01: ICAO Doc 9303 TD3 Check Digit Filler `<` Support
- **Severity**: CRITICAL
- **Affected File**: `backend/app/modules/mrz/mrz_engine.py`
- **Current Line Numbers**: Lines 439–448
- **Current Codebase Logic**:
```python
        # CD4: Optional personal number checksum
        # ICAO TD3: when personal number is absent the field and its check digit are both < (filler).
        # Filler check digits must NOT be validated against the check-digit algorithm.
        if cd4 in ('<', ''):
            cd4_valid = True
        else:
            cd4_valid = verify_check_digit(optional_raw, cd4)
            if not cd4_valid:
                failures.append(f"Optional Personal Number Check Digit (CD4) mismatch: expected {cd4}, calculated {calculate_mrz_check_digit(optional_raw)}")
```
- **Original Root Cause**:
The previous implementation attempted to validate `cd4` with `verify_check_digit(optional_raw, cd4)` and only allowed `cd4 in ['<', '0']` if `optional_raw.strip('<') == ''`. In ICAO Doc 9303 Part 4, issuing states that include optional personal identification numbers without a check digit set CD4 to `<`. The old code calculated the modulo-10 checksum over `optional_raw`, observed that the digit did not match `<`, and raised a checksum failure, setting `overall_valid = False` and triggering TRIPWIRE_1 RED Alert (Risk Score 95.0).
- **Exact Recommended Remediation**:
Verify `cd4 in ('<', '')` as an immediate pass prior to calling `verify_check_digit(optional_raw, cd4)`.
- **Test Coverage Impact**:
`tests/test_mrz_checksum.py` has extensive TD1, TD2, and TD3 tests (88-char joined strings, corrupted CD1, CD2, CD3, composite), but lacks an explicit test with non-empty optional personal number where `cd4 == '<'`. Adding `test_td3_optional_personal_number_with_filler_cd4` ensures regression protection.

---

### ML-02: Format-Aware Parsing in `parse_date_to_yymmdd` (Birthdays on 19th/20th)
- **Severity**: CRITICAL
- **Affected File**: `backend/app/modules/mrz/cross_validator.py`
- **Current Line Numbers**: Lines 80–99
- **Current Codebase Logic**:
```python
def parse_date_to_yymmdd(date_str: str) -> Optional[str]:
    """
    Normalizes various date formats (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, YYMMDD, etc.) to YYMMDD.
    Uses format-aware strptime parsing first to correctly handle separators before digit stripping.
    """
    if not date_str:
        return None
    import datetime
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d", "%Y/%m/%d", "%y%m%d", "%d%m%Y"):
        try:
            dt = datetime.datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%y%m%d")
        except ValueError:
            continue
    # Fallback: strip non-digits
    cleaned = re.sub(r'[^0-9]', '', date_str.strip())
    if len(cleaned) == 6:
        return cleaned
    return None
```
- **Original Root Cause**:
The original logic stripped all non-digit characters first, then checked `if cleaned.startswith("19") or cleaned.startswith("20"):`. For Indian/British formatted dates `DD/MM/YYYY` where the day was 19 or 20 (e.g., `19/08/1995` -> `19081995`), the string started with `"19"`. The parser extracted `yyyy="1908"`, `mm="19"`, `dd="95"`, outputting `"081995"` instead of `"950819"`. This triggered `ERR_DOB_MISMATCH` and added +3.50 log-odds penalty for ~6.7% of travelers.
- **Exact Recommended Remediation**:
Employ delimiter-aware `datetime.datetime.strptime` across standard formats (`%d/%m/%Y`, `%d-%m-%Y`, `%d.%m.%Y`, `%Y-%m-%d`, `%Y/%m/%d`, `%y%m%d`, `%d%m%Y`) before any digit stripping.
- **Test Coverage Impact**:
`tests/test_cross_validation.py::TestCrossValidationHelpers::test_parse_date_to_yymmdd` currently verifies `12/08/1974`, `1974-08-12`, `740812`, and `15-05-2001`. Expand test coverage to include `19/08/1995` -> `"950819"` and `20/03/1988` -> `"880320"`.

---

### ML-03: Robust Year Extraction in Temporal Paradox Rule (`DD-MM-YYYY`)
- **Severity**: CRITICAL
- **Affected File**: `backend/app/modules/forensics/fraud_edge_cases.py`
- **Current Line Numbers**: Lines 95–126
- **Current Codebase Logic**:
```python
        # Edge Case 05: Date Chronological Impossibility / Temporal Paradox
        if ocr_fields:
            dob_str = str(ocr_fields.get("dob") or "")
            issue_str = str(ocr_fields.get("issue_date") or "")
            if dob_str and issue_str:
                try:
                    import datetime as _dt
                    import re as _re

                    def _extract_year(date_str: str):
                        """Robustly extract 4-digit year from a date string."""
                        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d", "%Y/%m/%d"):
                            try:
                                return _dt.datetime.strptime(date_str.strip(), fmt).year
                            except ValueError:
                                continue
                        # Last resort: find a 4-digit number
                        m = _re.search(r'\b(19|20)\d{2}\b', date_str)
                        return int(m.group()) if m else None

                    dob_year = _extract_year(dob_str) if dob_str else None
                    issue_year = _extract_year(issue_str) if issue_str else None
                    if dob_year and issue_year and issue_year < dob_year:
                        violations.append({
                            "case_id": "EC-05",
                            "name": "Temporal Paradox (Issue Date Prior to Birth Date)",
                            "telemetry_code": "ERR_LOG_DATE_PARADOX_05",
                            "severity": "CRITICAL",
                            "weight": 4.5,
                            "details": f"Card issue year ({issue_year}) is earlier than resident birth year ({dob_year})",
                        })
                except Exception:
                    pass
```
- **Original Root Cause**:
The original extraction used:
`issue_year = int(issue_str.split("/")[-1].split("-")[0])`
For standard Indian dates like `01-01-2020`, `.split("/")[-1]` returned `"01-01-2020"`, and `.split("-")[0]` took `"01"`, leading to `issue_year = 1`. If `dob_year = 1995`, `1 < 1995` triggered a false `ERR_LOG_DATE_PARADOX_05` critical violation (weight 4.5).
- **Exact Recommended Remediation**:
Use `_extract_year` parsing with `strptime` format list followed by regex boundary search `r'\b(19|20)\d{2}\b'`.
- **Test Coverage Impact**:
Add test case in `tests/test_forensics.py` verifying that `dob="1995-05-12"` and `issue_date="01-01-2020"` yields zero violations, while `dob="1995-05-12"` and `issue_date="01-01-1990"` yields violation `EC-05`.

---

### ML-04: Zero-Byte Image Guard in Face Detector
- **Severity**: HIGH
- **Affected File**: `backend/app/modules/biometrics/face_detector.py`
- **Current Line Numbers**: Lines 361–372, 498–524
- **Current Codebase Logic**:
```python
        # In _preprocess_input_image:
        if isinstance(image_input, (bytes, bytearray)):
            # Guard: empty payload — do not construct a dummy array
            if not image_input:
                return None, 0, 0
            try:
                import cv2
                import numpy as np
                nparr = np.frombuffer(image_input, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is not None:
                    return img, img.shape[0], img.shape[1]
            except Exception:
                pass
            ...
            # Decode failed — do not hallucinate a geometric face from raw bytes
            return None, 0, 0

        # In detect_faces:
        if img_array is None or img_h < 10 or img_w < 10:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return (
                FaceDetectionResult(
                    faces_found=0,
                    faces=[],
                    primary_face=None,
                    aligned_face_extracted=False,
                    processing_time_ms=elapsed_ms,
                ),
                [],
            )
```
- **Original Root Cause**:
Empty bytes `b""` fell through to `parse_image_dimensions(b"")`, which defaulted to `(200, 200)`. Because Attempt 1 and Attempt 2 failed on `None`, Attempt 3 (geometric fallback) ran unconditionally, manufacturing a fake bounding box `[30, 20, 170, 180]` with confidence `0.55`, returning `faces_found=1`.
- **Exact Recommended Remediation**:
Check `if not image_input: return None, 0, 0` and return `(None, 0, 0)` when decoders fail. In `detect_faces`, guard `if img_array is None or img_h < 10 or img_w < 10: return FaceDetectionResult(faces_found=0, ...), []`.
- **Test Coverage Impact**:
`test_face_detector_with_png_payload` in `tests/test_biometrics.py` previously expected `result.faces_found >= 1` on corrupted PNG header bytes (`create_synthetic_png_header`). That test was asserting buggy behavior and must be updated to `assert result.faces_found == 0` for non-decodable bytes. Add dedicated test `face_detector.detect_faces(b"")` returning `faces_found == 0`.

---

### ML-05: PIL Image to NumPy BGR Conversion before YuNet
- **Severity**: HIGH
- **Affected File**: `backend/app/modules/biometrics/face_detector.py`
- **Current Line Numbers**: Lines 532–539
- **Current Codebase Logic**:
```python
        # 3. If PIL Image — convert to BGR numpy array (required by cv2 detectors)
        if hasattr(image_input, "size") and hasattr(image_input, "convert"):
            import numpy as np
            import cv2
            rgb_arr = np.array(image_input.convert("RGB"))
            bgr_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
            return bgr_arr, int(image_input.height), int(image_input.width)
```
- **Original Root Cause**:
`_preprocess_input_image` previously returned `image_input` directly for PIL images. When passed to OpenCV C++ wrapper `yunet.detect(img_array)`, it crashed with `cv2.error: Overload resolution failed: image is not a numpy array`. The exception forced failover to geometric fallback.
- **Exact Recommended Remediation**:
Convert `image_input` to RGB numpy array, convert to BGR via `cv2.cvtColor`, and return `(bgr_arr, height, width)`.
- **Test Coverage Impact**:
Verified operational: `face_detector.detect_faces(Image.new("RGB", (300, 300), color=(200, 150, 100)))` executes cleanly with zero exceptions and produces valid detection results.

---

### ML-06: Insecure `torch.load` and TruFor Memory Optimization
- **Severity**: HIGH
- **Affected File**: `backend/app/modules/forensics/tamper_detector.py`
- **Current Line Numbers**: Lines 100–122
- **Current Codebase Logic**:
```python
        self.doctamper_session = None
        self.trufor_model = None

        self._init_models()

    def _init_models(self):
        """Attempts to load DocTamper ONNX and TruFor PyTorch models if files and libraries exist."""
        # 1. DocTamper ONNX Runner
        dt_path = settings.get_model_path(settings.DOCTAMPER_MODEL)
        if dt_path.exists():
            try:
                import onnxruntime as ort  # type: ignore
                providers = get_optimal_execution_providers()
                self.doctamper_session = ort.InferenceSession(str(dt_path), providers=providers)
                logger.info(f"Loaded DocTamper DTD ONNX model from {dt_path} with {providers}")
            except Exception as e:
                logger.warning(f"Could not initialize DocTamper ONNX session: {e}")

        # 2. TruFor is not loaded: no verified inference graph is implemented.
        # Loading a raw checkpoint into VRAM without a forward pass would either
        # waste memory or fake a TruFor score from DocTamper/ELA means.
        self.trufor_model = None
```
- **Original Root Cause**:
The previous code invoked `torch.load(str(tf_path), map_location=device)` without `weights_only=True` (insecure deserialization warning/vulnerability). Furthermore, `self.trufor_model` was never executed for inference anywhere in the codebase; the TruFor score was faked by averaging DocTamper probability maps while wasting 150MB+ VRAM/RAM.
- **Exact Recommended Remediation**:
Eliminate the dead `torch.load` code path, set `self.trufor_model = None`, delegate splicing analysis to `photo_splicing_detector.py`, and ensure any future PyTorch checkpoint loading specifies `weights_only=True`.
- **Test Coverage Impact**:
`tests/test_forensics.py::test_tamper_detector_clean_document` passes in fallback and ONNX modes without loading unverified checkpoints.

---

### ML-07: Text Tampering Clamping Deadband Fix
- **Severity**: HIGH
- **Affected File**: `backend/app/modules/forensics/tamper_detector.py`
- **Current Line Numbers**: Lines 414–421
- **Current Codebase Logic**:
```python
                # Probabilistic model for tampering anomaly
                anomaly_signal = (ela_val * 0.4) + (math.sqrt(local_var) * 1.0)

                # Do not clamp clean-capture text anomalies below tau_adapt (0.18)
                if is_clean_capture:
                    prob = min(1.0, anomaly_signal * 0.60)
                elif not photo_tampered and mean_intensity < 100.0:
                    prob = min(0.50, anomaly_signal * 0.60)
                else:
                    prob = min(1.0, anomaly_signal * 0.85)
```
- **Original Root Cause**:
The previous implementation clamped `prob = min(0.12, anomaly_signal * 0.30)` whenever `is_clean_capture` was `True`. Because the adaptive threshold was `self.tau_adapt = 0.18`, every cell was capped at 0.12, making text forgeries (modified DOB, name, serial number) on clean cards completely undetectable.
- **Exact Recommended Remediation**:
Allow `is_clean_capture` probability to scale up to `min(1.0, anomaly_signal * 0.60)`, relying on spatial cluster thresholding (`len(high_cells) >= 6`) to prevent isolated noise false alarms.
- **Test Coverage Impact**:
`tests/test_forensics.py::test_tamper_detector_with_ocr_boxes` passes and confirms that text alterations in OCR regions are detected.

---

### ML-08: Centenary Year Heuristic Dynamic Pivot
- **Severity**: HIGH
- **Affected File**: `backend/app/modules/mrz/cross_validator.py`
- **Current Line Numbers**: Lines 101–114
- **Current Codebase Logic**:
```python
def calculate_age_from_yymmdd(yymmdd: str, reference_year: int = 2026) -> Optional[int]:
    """
    Calculates age in years from YYMMDD string relative to reference year.
    """
    if not yymmdd or len(yymmdd) < 6:
        return None
    try:
        yy = int(yymmdd[0:2])
        # Centenary heuristic: 00-40 -> 2000-2040, 41-99 -> 1941-1999
        current_yy = reference_year % 100
        birth_year = (2000 + yy) if yy <= current_yy else (1900 + yy)
        return max(0, reference_year - birth_year)
    except Exception:
        return None
```
- **Original Root Cause**:
The static condition `birth_year = (2000 + yy) if yy <= 40 else (1900 + yy)` treated any YY <= 40 as belonging to the 2000s. In 2026, an elderly traveler born in 1935 (`yy=35`) was assigned birth year `2035`, resulting in age `max(0, 2026 - 2035) = 0`. This caused Rule CV-04 to raise a false `WRN_AGE_ANOMALY` (+1.80 penalty).
- **Exact Recommended Remediation**:
Define `current_yy = reference_year % 100` and use `(2000 + yy) if yy <= current_yy else (1900 + yy)`.
- **Test Coverage Impact**:
`tests/test_cross_validation.py::TestCrossValidationHelpers::test_calculate_age_from_yymmdd` should include `calculate_age_from_yymmdd("350512", 2026) == 91`.

---

### ML-09: Apparent Age Heuristic Elimination
- **Severity**: HIGH
- **Affected File**: `backend/app/modules/biometrics/face_matcher.py`
- **Current Line Numbers**: Lines 367–377
- **Current Codebase Logic**:
```python
    def _estimate_apparent_age(
        self,
        doc_emb: List[float],
        live_emb: List[float],
    ) -> Tuple[Optional[int], Optional[int], Optional[int]]:
        """
        Apparent-age estimation requires a dedicated age model.
        Embedding energy is not a valid age signal — do not invent ages.
        """
        return None, None, None
```
- **Original Root Cause**:
The code previously computed `doc_energy = sum(abs(x) for x in doc_emb[:32]) / 32.0` and predicted age via `20 + (doc_energy - 0.04) * 200`. Because normalized 512-D embeddings have an expected coordinate magnitude of ~0.0353, the formula yielded ~19 years old for every face on Earth, generating false age anomalies for anyone younger than 10 or older than 31.
- **Exact Recommended Remediation**:
Return `None, None, None` until a dedicated deep demographic age model is integrated.
- **Test Coverage Impact**:
In `tests/test_biometrics.py`, `test_face_matcher_embedding_and_match` line 292 had `assert match_res.apparent_age_id is not None`. Because `apparent_age_id` is now correctly `None`, this legacy test assertion must be updated to `assert match_res.apparent_age_id is None`.

---

### ML-10: Spatial Contour Clustering for Stamp Ink Pixels
- **Severity**: HIGH
- **Affected File**: `backend/app/modules/stamp_verifier.py`
- **Current Line Numbers**: Lines 434–483
- **Current Codebase Logic**:
```python
        # Cluster ink pixels via contours instead of a global min/max bbox
        try:
            import cv2  # type: ignore
            import numpy as np  # type: ignore

            mask = np.zeros((height, width), dtype=np.uint8)
            for x, y, _ink in ink_pixels:
                if 0 <= y < height and 0 <= x < width:
                    mask[y, x] = 255
            k = max(3, int(grid_step) * 2 + 1)
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
            mask = cv2.dilate(mask, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            best_cnt = None
            best_score = -1.0
            min_dim = min(width, height)
            for cnt in contours:
                area = float(cv2.contourArea(cnt))
                if area < 400.0:
                    continue
                x, y, cw, ch = cv2.boundingRect(cnt)
                if cw < 20 or ch < 20:
                    continue
                if width > 400 and (cw > int(width * 0.85) or ch > int(height * 0.85)):
                    continue
                peri = float(cv2.arcLength(cnt, True))
                circularity = (4.0 * math.pi * area / (peri * peri)) if peri > 1e-6 else 0.0
                aspect = cw / float(max(1, ch))
                aspect_score = 1.0 - min(1.0, abs(aspect - 1.0))
                max_side = max(cw, ch)
                stamp_sized = 0.04 * min_dim <= max_side <= 0.55 * max(width, height)
                score = area * (0.4 + 0.6 * circularity) * (0.5 + 0.5 * aspect_score)
                if stamp_sized:
                    score *= 1.5
                if score > best_score:
                    best_score = score
                    best_cnt = (x, y, cw, ch)

            if best_cnt is not None:
                x, y, cw, ch = best_cnt
                min_x = max(0, x - pad)
                min_y = max(0, y - pad)
                max_x = min(width, x + cw + pad)
                max_y = min(height, y + ch + pad)
                clustered = True
        except Exception:
            clustered = False

        if not clustered:
            xs = [p[0] for p in ink_pixels]
            ys = [p[1] for p in ink_pixels]
            min_x = max(0, min(xs) - pad)
            max_x = min(width, max(xs) + pad)
            min_y = max(0, min(ys) - pad)
            max_y = min(height, max(ys) + pad)
```
- **Original Root Cause**:
The engine previously took global `min(xs)`, `max(xs)`, `min(ys)`, `max(ys)` across all ink pixels. Any document with signatures or blue stamps in different corners produced a huge bounding box covering the entire page, resulting in low SSIM and a false `FORGED` stamp alert (+2.80 penalty).
- **Exact Recommended Remediation**:
Morphologically close and dilate ink masks, extract candidate contours via `cv2.findContours`, and score by circularity, aspect ratio, and stamp-like size while rejecting document-spanning bounding boxes.
- **Test Coverage Impact**:
`tests/test_forensics.py::test_stamp_verifier_authentic_stamp` and `test_stamp_verifier_rectangular_sonauli` pass with 100% success.

---

### ML-11: Liveness Detector Real Readiness Property
- **Severity**: HIGH
- **Affected File**: `backend/app/modules/biometrics/liveness_detector.py`
- **Current Line Numbers**: Lines 85–88
- **Current Codebase Logic**:
```python
    @property
    def is_model_loaded(self) -> bool:
        return self.session_2_7x is not None or self.session_4_0x is not None
```
- **Original Root Cause**:
Hardcoded `return True` masked absent MiniFASNet ONNX checkpoints, reporting the neural model as loaded even when running purely in passive 2D FFT frequency/texture analysis fallback.
- **Exact Recommended Remediation**:
Check `self.session_2_7x is not None or self.session_4_0x is not None`.
- **Test Coverage Impact**:
Verified: `liveness_detector.is_model_loaded` returns `False` when weights are absent and `True` when initialized.

---

### ML-12: Diagnostic Router Checkpoint Masking Removal
- **Severity**: MEDIUM
- **Affected File**: `backend/app/api/routers/models.py`
- **Current Line Numbers**: Lines 160–186
- **Current Codebase Logic**:
```python
def check_model_is_connected(model_id: str) -> bool:
    """Checks whether the given model engine is actively loaded in memory."""
    if MANUAL_CONNECTED_MODELS.get(model_id) is True:
        return True

    if model_id == "insightface_scrfd":
        return bool(face_detector.is_model_loaded or face_detector.session is not None or settings.get_model_path(settings.SCRFD_MODEL).exists())
    elif model_id == "adaface_resnet100":
        return bool(face_matcher.is_model_loaded or face_matcher.session is not None or settings.get_model_path(settings.ADAFACE_MODEL).exists())
    elif model_id == "minifasnet_liveness":
        return bool(liveness_detector.is_model_loaded or settings.get_model_path(settings.MINIFASNET_2_7X_MODEL).exists())
    elif model_id == "paddle_ocrv4":
        return bool(
            getattr(pp_ocr_engine, "_rapid_ocr", None) is not None
            or pp_ocr_engine._paddle_ocr_en is not None
            or pp_ocr_engine._paddle_ocr_dev is not None
        )
    elif model_id in ("omnimrz_engine", "verhoeff_checksum", "ela_forensic_engine", "stamp_seal_verifier", "cross_validation_matrix"):
        return True
    elif model_id == "doctamper_trufor":
        return bool(
            tamper_detector.doctamper_session is not None
            or tamper_detector.trufor_model is not None
            or settings.get_model_path(settings.DOCTAMPER_MODEL).exists()
        )
    return False
```
- **Original Root Cause**:
Lines 171 and 175 ended in `or True` and line 176 unconditionally returned `True`, masking offline and missing models on gateway diagnostic dashboards.
- **Exact Recommended Remediation**:
Remove `or True` and fallback `return False`, explicitly distinguishing pure algorithmic engines from deep neural models.
- **Test Coverage Impact**:
All 5 tests in `tests/test_models.py` pass.

---

### ML-13: Deprecated `Image.getdata()` Replacement in ELA Engine
- **Severity**: MEDIUM
- **Affected File**: `backend/app/modules/forensics/ela_engine.py`
- **Current Line Numbers**: Lines 208–238
- **Current Codebase Logic**:
```python
            # Compute pixel-level stats from numpy arrays
            diff_np = np.asarray(diff, dtype=np.float32)
            if diff_np.size == 0:
                mean_err = 0.0
                max_err = 0.0
            else:
                intensity = diff_np.mean(axis=2) if diff_np.ndim == 3 else diff_np
                mean_err = float(intensity.mean())
                max_err = float(intensity.max())

            # Generate 2D normalized grid [0.0, 1.0]
            grid_h = min(height, 64)
            grid_w = min(width, 64)
            diff_small = diff.resize((grid_w, grid_h), Image.Resampling.BILINEAR)
            small_np = np.asarray(diff_small, dtype=np.float32)
            small_int = small_np.mean(axis=2) if small_np.ndim == 3 else small_np
            norm_grid = np.minimum(1.0, (small_int * s) / 255.0).round(4).tolist()

            # Check photo region anomaly
            photo_anomaly = False
            if photo_bbox and len(photo_bbox) == 4:
                x1, y1, x2, y2 = photo_bbox
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(width, x2), min(height, y2)
                if x2 > x1 and y2 > y1:
                    photo_crop = diff.crop((x1, y1, x2, y2))
                    photo_np = np.asarray(photo_crop, dtype=np.float32)
                    if photo_np.size > 0:
                        photo_int = photo_np.mean(axis=2) if photo_np.ndim == 3 else photo_np
                        photo_mean = float(photo_int.mean())
                        if photo_mean > mean_err * 1.6 and (photo_mean - mean_err) > 8.0:
                            photo_anomaly = True
```
- **Original Root Cause**:
Pillow `.getdata()` emits 24+ `DeprecationWarning`s per test run and is scheduled for complete removal in Pillow 14.
- **Exact Recommended Remediation**:
Use `np.asarray(...)` for modern vectorized array processing.
- **Test Coverage Impact**:
All ELA tests in `tests/test_forensics.py` pass cleanly with 0 deprecation warnings.

---

### ML-14: ELA Visual Scaling Consistency
- **Severity**: MEDIUM
- **Affected File**: `backend/app/modules/forensics/ela_engine.py`
- **Current Line Numbers**: Lines 205–206, 250–251
- **Current Codebase Logic**:
```python
            scale_factor = s
            diff_scaled = ImageEnhance.Brightness(diff).enhance(scale_factor)
            ...
            ela_result = ELAResult(
                max_intensity=round(min(255.0, max_err * s), 2),
                mean_intensity=round(min(255.0, mean_err * s), 2),
                photo_area_anomaly=photo_anomaly,
            )
```
- **Original Root Cause**:
The visual map was enhanced with `scale_factor / 10.0` (2x default amplification) while numeric metrics used `max_err * s` (20x amplification), resulting in dim visual maps for border screening operators.
- **Exact Recommended Remediation**:
Remove `/ 10.0` to ensure visual enhancement aligns directly with `scale_factor` (`s = 20.0`).
- **Test Coverage Impact**:
Verified in `tests/test_forensics.py::test_ela_engine_compute_ela_map`.

---

### ML-15: Photo Splicing Substrate Search & Division-by-Zero Guard
- **Severity**: MEDIUM
- **Affected File**: `backend/app/modules/forensics/photo_splicing_detector.py`
- **Current Line Numbers**: Lines 243–266
- **Current Codebase Logic**:
```python
        candidates = [
            (ymin, min(w - 10, xmax + 10), ymax, min(w, xmax + 90)),  # right
            (ymin, max(0, xmin - 90), ymax, max(0, xmin - 10)),  # left
            (max(0, ymin - 90), xmin, max(0, ymin - 10), xmax),  # above
            (min(h, ymax + 10), xmin, min(h, ymax + 90), xmax),  # below
        ]
        sub_box = None
        substrate_crop = None
        for sy1, sx1, sy2, sx2 in candidates:
            crop = doc_bgr[sy1:sy2, sx1:sx2]
            if crop.size > 0 and min(crop.shape[:2]) >= 10:
                sub_box = (sy1, sx1, sy2, sx2)
                substrate_crop = crop
                break

        if substrate_crop is None or sub_box is None:
            # Empty substrate must not force r_noise≈1.0 and trip splicing
            return {
                "r_noise": 0.0,
                "r_ela": 0.0,
                "delta_illum_deg": 0.0,
                "noise_tamper_flag": False,
            }
```
- **Original Root Cause**:
Substrate sampling only checked left and right margins; border-flush photos resulted in empty substrate crops with `var_substrate = 0.0`, triggering `r_noise = 1.0` and a false splicing alarm.
- **Exact Recommended Remediation**:
Search all 4 directions (right, left, above, below) with minimum size validation, returning `r_noise = 0.0, noise_tamper_flag = False` if no valid substrate exists.
- **Test Coverage Impact**:
Protects border-aligned photos across all ID formats. Add dedicated unit test in `tests/test_forensics.py`.

---

### ML-16: Aadhaar QR Big-Integer Payload Slicing Fallback
- **Severity**: MEDIUM
- **Affected File**: `backend/app/modules/ocr/qr_decoder.py`
- **Current Line Numbers**: Lines 258–282
- **Current Codebase Logic**:
```python
        # If decompression did not succeed, check if payload is already uncompressed binary or big-integer string
        int_bytes: Optional[bytes] = None
        if decompressed is None:
            # Check if payload is big integer string
            try:
                text = raw_bytes.decode("utf-8", errors="ignore").strip()
                if text.isdigit() and len(text) > 100:
                    big_int = int(text)
                    byte_len = (big_int.bit_length() + 7) // 8
                    int_bytes = big_int.to_bytes(byte_len, byteorder="big")
                    for df in [lambda b: gzip.decompress(b), lambda b: zlib.decompress(b)]:
                        try:
                            decompressed = df(int_bytes)
                            break
                        except Exception:
                            continue
            except Exception:
                pass

        if decompressed is not None:
            payload_bytes = decompressed
        elif int_bytes is not None:
            payload_bytes = int_bytes
        else:
            payload_bytes = raw_bytes
```
- **Original Root Cause**:
The fallback assigned `raw_bytes` (the ASCII decimal digit string) when `decompressed` was `None`, resulting in slicing 256 ASCII digits instead of the 256-byte RSA signature.
- **Exact Recommended Remediation**:
Fall back to `int_bytes` when decompression fails on valid big integers.
- **Test Coverage Impact**:
Verified in Aadhaar QR parsing and `test_cv08_aadhaar_pki_signature_forgery`.

---

### ML-17: SCRFD BGR-to-RGB Channel Order Normalization
- **Severity**: LOW
- **Affected File**: `backend/app/modules/biometrics/face_detector.py`
- **Current Line Numbers**: Lines 561–567
- **Current Codebase Logic**:
```python
            resized = cv2.resize(image, (new_w, new_h))
            # SCRFD blob is RGB; OpenCV decode / YuNet path is BGR
            if len(resized.shape) == 3 and resized.shape[2] == 3:
                resized = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            blob = np.zeros((640, 640, 3), dtype=np.float32)
            blob[:new_h, :new_w, :] = resized

            blob = (blob - 127.5) / 128.0
            input_tensor = np.transpose(blob, (2, 0, 1))[np.newaxis, ...].astype(np.float32)
```
- **Original Root Cause**:
OpenCV decodes in BGR order, but SCRFD-10GF was trained on RGB images. Normalizing BGR directly degraded face landmark extraction precision under colored illumination.
- **Exact Recommended Remediation**:
Convert `cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)` prior to normalization.
- **Test Coverage Impact**:
Prevents color-channel degradation in biometric screening.

---

### ML-18: Lazy Caching of EasyOCR Multilingual Reader
- **Severity**: LOW
- **Affected File**: `backend/app/modules/ocr/pp_ocr_engine.py`
- **Current Line Numbers**: Line 268, Lines 560–563
- **Current Codebase Logic**:
```python
# In __init__:
self._easyocr_reader = None

# In _run_easyocr_fallback:
if self._easyocr_reader is None:
    self._easyocr_reader = easyocr.Reader(["en", "hi"], gpu=False, verbose=False)
reader = self._easyocr_reader
```
- **Original Root Cause**:
`easyocr.Reader` was re-instantiated on every fallback OCR call, causing 2000–4000ms latency on repeated requests.
- **Exact Recommended Remediation**:
Initialize `self._easyocr_reader = None` on instance and lazily instantiate once.
- **Test Coverage Impact**:
Subsequent OCR fallback calls execute without weight re-instantiation delays.

---

### ML-19: Confidence Calibration Model-Type Selection
- **Severity**: LOW
- **Affected File**: `backend/app/modules/biometrics/face_matcher.py`
- **Current Line Numbers**: Lines 80–125
- **Current Codebase Logic**:
```python
def calibrate_match_confidence(similarity: float, model_type: str = "SFace") -> float:
    s = float(similarity)
    if s <= 0.0:
        return 0.0

    model_key = (model_type or "SFace").lower()
    if "adaface" in model_key:
        # AdaFace-ResNet100: genuine cross-domain pairs typically 0.40–0.75 cosine
        if s < 0.40:
            return round(max(0.0, (s / 0.40) * 0.70), 4)
        elif s < 0.60:
            frac = (s - 0.40) / (0.60 - 0.40)
            return round(0.70 + frac * 0.22, 4)
        elif s < 0.80:
            frac = (s - 0.60) / (0.80 - 0.60)
            return round(0.92 + frac * 0.065, 4)
        else:
            frac = min(1.0, (s - 0.80) / 0.20)
            return round(0.985 + frac * 0.015, 4)

    # SFace: s_thresh = 0.363 (FAR = 0.1%)
    if s < 0.363:
        return round(max(0.0, (s / 0.363) * 0.70), 4)
    elif s < 0.55:
        frac = (s - 0.363) / (0.55 - 0.363)
        return round(0.70 + frac * 0.22, 4)
    elif s < 0.75:
        frac = (s - 0.55) / (0.75 - 0.55)
        return round(0.92 + frac * 0.065, 4)
    else:
        frac = min(1.0, (s - 0.75) / 0.25)
        return round(0.985 + frac * 0.015, 4)
```
- **Original Root Cause**:
The function accepted `model_type` but completely ignored it, forcing SFace thresholds on AdaFace embeddings.
- **Exact Recommended Remediation**:
Implement distinct piecewise calibration curves branching on `adaface` vs `sface`.
- **Test Coverage Impact**:
Enables accurate operational match confidence for deep AdaFace embeddings.

---

### ML-20: Dynamic Date Reading in Master Scan Router
- **Severity**: INFO
- **Affected File**: `backend/app/api/routers/scan.py`
- **Current Line Numbers**: Lines 352–368
- **Current Codebase Logic**:
```python
    stamp_date_str = effective_transit_date
    today = datetime.now().date()
    if not stamp_date_str and stamp_res and stamp_res.stamp_found:
        stamp_date_str = today.isoformat()

    year = today.year
    cv_result = cross_validator.validate_all(
        ocr_result=ocr_res,
        mrz_result=mrz_res,
        qr_payload=qr_res,
        apparent_age=apparent_age,
        face_bbox=photo_bbox,
        photo_tamper_density=photo_tamper_density,
        text_tamper_map=forensics_res.doctamper_score,
        stamp_date=stamp_date_str,
        permit_window=(f"{year}-01-01", f"{year}-12-31"),
    )
```
- **Original Root Cause**:
Static placeholder dates `"2026-08-20"` and fixed permit window `"2026-01-01" to "2026-12-31"` were hardcoded in the router.
- **Exact Recommended Remediation**:
Dynamically query `datetime.now().date()` and `today.year`.
- **Test Coverage Impact**:
Ensures operational longevity regardless of calendar deployment date.

---

## 3. Synthesis & Cross-Module Dependencies

1. **MRZ & Cross-Validation Interlock (ML-01, ML-02, ML-08)**:
   - ML-01 prevents false TRIPWIRE_1 hard stops at Stage 1.
   - ML-02 prevents false `ERR_DOB_MISMATCH` (+3.50 penalty) at Stage 2.
   - ML-08 prevents false `WRN_AGE_ANOMALY` (+1.80 penalty) for elderly travelers at Stage 2.
   Together, these three fixes restore operational accuracy for legitimate travelers.

2. **Biometrics Pipeline Interlock (ML-04, ML-05, ML-09, ML-11, ML-17, ML-19)**:
   - ML-04 guards empty/corrupted uploads from hallucinating detected faces.
   - ML-05 enables FastAPI / PIL image integration without OpenCV C++ crashes.
   - ML-09 eliminates the false apparent age prediction of 19 years old.
   - ML-11 provides honest model readiness reporting to diagnostic dashboards.
   - ML-17 restores color fidelity to SCRFD face detection.
   - ML-19 ensures accurate match confidence calibration between AdaFace and SFace.

3. **Forensics & Fraud Detection Interlock (ML-03, ML-06, ML-07, ML-10, ML-13, ML-14, ML-15)**:
   - ML-03 eliminates false chronological paradoxes on hyphenated dates.
   - ML-06 removes insecure PyTorch deserialization and dead memory allocation.
   - ML-07 enables text forgery detection on clean card backgrounds.
   - ML-10 replaces whole-page bounding boxes with spatial contour clustering for stamps.
   - ML-13 ensures Pillow 14 forward compatibility by replacing deprecated `.getdata()`.
   - ML-14 aligns visual ELA artifacts (20x) with numerical forensics metrics.
   - ML-15 prevents false splicing flags on border-flush photos.

4. **OCR & System Routers (ML-12, ML-16, ML-18, ML-20)**:
   - ML-12 restores true transparency to `/api/v1/models/status`.
   - ML-16 ensures uncompressed Aadhaar QR payloads can be verified via PKI.
   - ML-18 eliminates 2–4 second latency spikes on EasyOCR fallback requests.
   - ML-20 ensures dynamic date awareness across inspection sessions.

---

## 4. Test Suite Audit & Legacy Test Divergence Finding

During test execution with `.venv311/bin/pytest tests/test_biometrics.py`:
- 79 tests passed.
- **2 legacy tests failed due to assertions written against the pre-remediation buggy behavior**:
  1. `test_face_detector_with_png_payload` in `tests/test_biometrics.py:268`:
     The test passed `create_synthetic_png_header(180, 180)` (unparseable header-only byte stream) and asserted `assert result.faces_found >= 1`. This asserted the old ML-04 hallucination behavior! With ML-04 fixed, `result.faces_found` is correctly `0`.
  2. `test_face_matcher_embedding_and_match` in `tests/test_biometrics.py:292`:
     The test asserted `assert match_res.apparent_age_id is not None`. With ML-09 fixed (removal of the arbitrary 32-D slice heuristic that faked age 19 for everyone), `apparent_age_id` is correctly `None`.

**Recommended Test Suite Updates**:
- In `tests/test_biometrics.py:268`: Change to `assert result.faces_found == 0` for non-decodable header payloads.
- In `tests/test_biometrics.py:292`: Change to `assert match_res.apparent_age_id is None` (or `assert match_res.apparent_age_id is None or isinstance(match_res.apparent_age_id, int)`).
