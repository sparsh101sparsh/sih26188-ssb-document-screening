# Handoff Report: Track 2 — ML & Algorithmic Modules Audit
**Target System:** SIH26188 Sovereign Edge Screening Gateway  
**Audited Subsystem:** `backend/app/modules/` and dependent execution paths  
**Date:** 2026-09-09  
**Handoff Type:** Hard (Task Complete)  
**Agent ID:** teamwork_preview_explorer_ml_audit  
**Parent Agent:** 96092e8e-b395-4269-b233-10aadbfda772  

---

## 1. Observation

Direct, verbatim findings observed across `backend/app/modules/` and related routers via static code inspection, AST tracing, and diagnostic test executions under Python 3.11 (`backend/.venv311/bin/python`).

### Summary Table of Audited Defects

| Bug ID | Component / File Path | Exact Lines | Severity | Verbatim Observation / Code Snippet |
| :--- | :--- | :--- | :---: | :--- |
| **ML-01** | `backend/app/modules/mrz/mrz_engine.py` | 439–445 | **CRITICAL** | `if not cd4_valid and not (optional_raw.strip('<') == '' and cd4 in ['<', '0']): failures.append(...)` — Fails valid TD3 passport lines (e.g. Swedish `L898902C36UTO7408122F1204159ZE184226B<<<<<<9`) when optional personal number is provided without a check digit (`cd4 == '<'`). Causes `res.valid = False`, triggering `TRIPWIRE_1` RED alert (Risk Score 95.0). |
| **ML-02** | `backend/app/modules/mrz/cross_validator.py` | 80–99 | **CRITICAL** | `cleaned = re.sub(r'[^0-9]', '', date_str.strip()); if cleaned.startswith("19") or cleaned.startswith("20"): yyyy, mm, dd = cleaned[0:4], cleaned[4:6], cleaned[6:8]` — For `19/08/1995`, strips `/` to `"19081995"`, assumes year is `1908`, producing `"081995"` instead of `"950819"`. Fails CV-01 with `ERR_DOB_MISMATCH` (+3.50 log-odds risk penalty) for anyone born on the 19th or 20th. |
| **ML-03** | `backend/app/modules/forensics/fraud_edge_cases.py` | 95–113 | **CRITICAL** | `issue_str.split("/")[-1].split("-")[0]` on hyphenated date `"01-01-2020"` splits `/` first (yielding `"01-01-2020"`), then splits `-` and selects index `0` (`"01"`). Evaluates `issue_year = 1 < dob_year = 1995`, triggering false `ERR_LOG_DATE_PARADOX_05` (weight 4.5, CRITICAL flag). |
| **ML-04** | `backend/app/modules/biometrics/face_detector.py` | 31–73, 484–518, 857–907 | **HIGH** | For empty bytes `b""`, `parse_image_dimensions` defaults to `(200, 200)`. Fallback Attempt 3 crafts a synthetic bounding box `[30, 20, 170, 180]` with `confidence=0.55`, returning `faces_found=1` on a zero-byte corrupt payload. |
| **ML-05** | `backend/app/modules/biometrics/face_detector.py` | 381–410, 513–516 | **HIGH** | `_preprocess_input_image` returns a `PIL.Image.Image` object. When passed to `yunet.detect(img_array)`, OpenCV C++ engine throws: `cv2.error: OpenCV(4.11.0) ... (-5:Bad argument) Overload resolution failed: image is not a numpy array`. |
| **ML-06** | `backend/app/modules/forensics/tamper_detector.py` | 101, 119–130, 286–305, 334 | **HIGH** | `self.trufor_model` is instantiated via insecure `torch.load(weights_path)` without `weights_only=True`. The model is completely dead code: never invoked in `detect_tampering` or `_run_inference`. `tf_score` is fabricated as `np.mean(prob_map)` from DocTamper. |
| **ML-07** | `backend/app/modules/forensics/tamper_detector.py` | 397–440 | **HIGH** | Fallback `_algorithmic_tamper_detection` clamps text tamper probability to `min(0.12, ...)` whenever `photo_tampered` is False. Because decision threshold `tau_adapt = 0.18`, documents with tampered text and authentic photos can never be flagged as tampered. |
| **ML-08** | `backend/app/modules/mrz/cross_validator.py` | 101–114 | **HIGH** | `yy = int(mrz_dob[:2]); year = 2000 + yy if yy <= 40 else 1900 + yy; age = 2026 - year`. For born in 1935 (`yy=35`), assumes year 2035 and age `max(0, 2026-2035) = 0`, triggering false-positive CV-04 age anomaly (`ERR_AGE_ANOMALY`). |
| **ML-09** | `backend/app/modules/biometrics/face_matcher.py` | 350–371 | **HIGH** | `_estimate_apparent_age` computes `energy = np.mean(np.abs(emb[:32]))`. For L2-normalized 512-D vectors, `mean(|emb[:32]|) ≈ 0.035`. `(0.035 - 0.04) * 200 ≈ -1.0`, clamping predicted age to `20 + (-1.0) ≈ 19` for all adults regardless of age. |
| **ML-10** | `backend/app/modules/stamp_verifier.py` | 427–437 | **HIGH** | Segmented stamp ink pixels are bounded using global `min/max` coordinates across the entire document without contour or connected-component clustering. Merges disparate stamps and signatures into a massive distorted crop, causing SSIM comparison failure and false `SUSPICIOUS/FORGED` verdict. |
| **ML-11** | `backend/app/modules/biometrics/liveness_detector.py` | 85–87 | **HIGH** | `is_model_loaded()` unconditionally returns `True` even when both MiniFASNet ONNX models fail to load or are absent from disk, reporting false operational readiness. |
| **ML-12** | `backend/app/api/routers/models.py` | 171, 175, 176 | **MEDIUM** | Health router overrides model health checks with hardcoded `or True` (`"mrz_omnimrz": omni_ready or True`, `"liveness_minifasnet": liveness_ready or True`), hiding missing model weights from telemetry dashboards. |
| **ML-13** | `backend/app/modules/forensics/ela_engine.py` | 207, 220, 238 | **MEDIUM** | Uses `Image.getdata()` to iterate over pixel buffers, which is officially deprecated and scheduled for removal in Pillow 14.0.0. Throws deprecation warnings and risks runtime failure on package upgrade. |
| **ML-14** | `backend/app/modules/forensics/ela_engine.py` | 203–204, 253–254 | **MEDIUM** | Inconsistent ELA amplification scaling: raw ELA map uses `scale = 20` for metric calculation, but visualization divides the array by `10.0` (effectively `scale = 2`), producing visual output that does not match numeric anomaly metrics. |
| **ML-15** | `backend/app/modules/forensics/photo_splicing_detector.py` | 242–252, 270 | **MEDIUM** | Documents where photo is flush against the left border (`photo_box[0] <= 10`) cause substrate crop `img[y0:y1, max(0, x0-100):x0]` to have width 0. Resulting `var_substrate = 0.0` forces `r_noise = 1.0`, falsely flagging clean edge photos as spliced. |
| **ML-16** | `backend/app/modules/ocr/qr_decoder.py` | 258–285 | **MEDIUM** | When decompressing integer-encoded Indian Aadhaar QR codes, exception fallback slices the raw input string `raw_text[:256]` instead of the decompressed byte payload, corrupting binary demographic data. |
| **ML-17** | `backend/app/modules/biometrics/face_detector.py` | 490, 538–543 | **LOW** | SCRFD-10GF ONNX inference passes BGR-ordered images directly into normalization (`(img - 127.5) / 128.0`) without `cv2.cvtColor(img, cv2.COLOR_BGR2RGB)`, inverting color channels and degrading facial feature detection accuracy under non-neutral lighting. |
| **ML-18** | `backend/app/modules/ocr/pp_ocr_engine.py` | 556–560 | **LOW** | Fallback OCR creates a new instance of `easyocr.Reader(['en'])` inside the per-request execution path, incurring heavy multi-second model loading overhead on every fallback invocation. |
| **ML-19** | `backend/app/modules/biometrics/face_matcher.py` | 80–111 | **LOW** | `calibrate_match_confidence(raw_cosine, model_type="adaface")` ignores the `model_type` argument entirely, applying AdaFace piece-wise linear interpolation curves identically to SFace models. |
| **ML-20** | `backend/app/api/routers/scan.py` | 352, 363 | **INFO** | Stamp detection router hardcodes fallback verification date `"2026-08-20"` and permit window `"2026-01-01"` to `"2026-12-31"`, rather than querying the document metadata or system clock. |

---

## 2. Logic Chain

The step-by-step causal chain linking observed code anomalies to operational system impact:

1. **ICAO CD4 Failure (ML-01) -> Immediate Passenger False Detention:**
   - *Observation:* `mrz_engine.py:441` requires `optional_raw.strip('<') == ''` when `cd4 == '<'`.
   - *Logic:* Passports with optional personal numbers without check digits (common in EU/Asia-Pacific TD3 passports) place `<` at character 43.
   - *Consequence:* The checksum verification returns `False`, setting `mrz_result.valid = False`. In `risk_scorer.py:175`, an invalid MRZ triggers `TRIPWIRE_1` with risk score 95.0 (RED Alert), preventing automated clearance and detaining valid travelers.

2. **Date Parser Heuristic Failure (ML-02) -> Systematic Risk Penalty for 6.7% of Population:**
   - *Observation:* `cross_validator.py:113` checks `if cleaned.startswith("19") or cleaned.startswith("20")` after stripping all non-digits.
   - *Logic:* In `DD/MM/YYYY` format (standard in India, UK, Commonwealth, Europe), birthdays on the 19th or 20th begin with `"19"` or `"20"`. `parse_date_to_yymmdd("19/08/1995")` treats `"1908"` as the year, outputting `"081995"`.
   - *Consequence:* The cross-validator compares MRZ DOB `"950819"` with parsed visual DOB `"081995"`, failing rule CV-01 (`ERR_DOB_MISMATCH`) and adding a +3.50 log-odds penalty to the traveler's risk score.

3. **Date Delimiter Split Bug (ML-03) -> False Temporal Paradox Flags:**
   - *Observation:* `fraud_edge_cases.py:102` executes `issue_str.split("/")[-1].split("-")[0]`.
   - *Logic:* For hyphenated dates (e.g. `"01-01-2020"`), splitting on `/` leaves the string intact. Splitting on `-` and taking index `0` extracts the day `"01"`, yielding `issue_year = 1`.
   - *Consequence:* `1 < dob_year (e.g. 1995)` triggers `ERR_LOG_DATE_PARADOX_05` (Critical severity, weight 4.5), falsely flagging genuine documents as fraudulent.

4. **Empty Byte Hallucination & PIL Image Crash (ML-04, ML-05) -> Unstable Biometric Pipeline:**
   - *Observation:* `face_detector.py:513` generates synthetic bboxes `[30, 20, 170, 180]` on fallback attempt 3, and `_preprocess_input_image` yields `PIL.Image.Image`.
   - *Logic:* When passed zero-byte or corrupt images, the pipeline reports `faces_found=1` with 0.55 confidence instead of raising a bad-input error. If YuNet fallback is triggered, passing a PIL image directly into `yunet.detect()` raises an unhandled C++ exception.
   - *Consequence:* System fails silently on corrupt inputs and crashes on legitimate YuNet invocations.

5. **Insecure Deserialization & Dead Forensics Model (ML-06, ML-07) -> Undetectable Text Tampering:**
   - *Observation:* `tamper_detector.py:126` calls `torch.load` without `weights_only=True`, but `trufor_model` is never called. `_algorithmic_tamper_detection:412` caps text tampering probability at `0.12` when `photo_tampered is False`.
   - *Logic:* The system exposes an RCE vulnerability during weight loading while gaining zero inference benefit. Furthermore, because `tau_adapt = 0.18`, any document where only textual data (names, dates, passport numbers) was altered will register a text tamper score <= 0.12 < 0.18.
   - *Consequence:* Text document tampering on valid photo backgrounds is mathematically impossible to detect in algorithmic fallback mode.

6. **Global Ink Coordinate Bounding (ML-10) -> Stamp Verification False Alarms:**
   - *Observation:* `stamp_verifier.py:431` takes `min(xs), min(ys), max(xs), max(ys)` across all blue/red/purple pixels.
   - *Logic:* When a document contains a border stamp at the top and an official's signature at the bottom, the bounding box encompasses the entire page.
   - *Consequence:* Template matching and SSIM comparison fail against the reference circular stamp, causing validly stamped documents to be branded `SUSPICIOUS` or `FORGED`.

---

## 3. Caveats

1. **Strict Read-Only Enforcement:** No production source code, configuration files, or tests in `sih26188_project/` were modified. All defects remain active in the source tree awaiting authorized remediation by implementation agents.
2. **Environment & Hardware:** Diagnostics were conducted on macOS Darwin (Apple Silicon, ARM64) using CPU execution under `backend/.venv311`. Performance characteristics on Linux x86_64 edge hardware (e.g. NVIDIA Jetson Orin) may differ, though algorithmic logic defects are architecture-independent.
3. **Model Weight Availability:** Tests were executed in the repository's native state where large ONNX/PyTorch model weights (`models_cache/`) may not be pre-downloaded, specifically validating that fallback and degradation paths trigger correctly.
4. **Out of Scope:** Frontend UI components (`frontend/`), database migrations, and edge hardware peripheral drivers were excluded from this ML/algorithmic audit scope.

---

## 4. Conclusion

The SIH26188 Edge Screening Gateway exhibits strong architectural design—including fallback cascades, multi-factor biometric pipelines, and comprehensive risk aggregation. However, the audited ML and algorithmic modules suffer from **critical boundary logic defects** that severely compromise edge screening reliability:

1. **High False-Positive Rate on Legitimate Documents:** Valid passports and IDs are routinely rejected or flagged for detention due to:
   - ICAO TD3 CD4 `<` rejection (ML-01)
   - Commonwealth/European `DD/MM/YYYY` birthday parsing failures on days 19 and 20 (ML-02)
   - Hyphenated date parsing paradoxes (ML-03)
   - Centenary age calculation overflow for elderly travelers (ML-08)
   - Global ink bounding box distortion on stamps/signatures (ML-10)
2. **Security & Tamper Blind Spots:**
   - Algorithmic fallback is incapable of flagging text-only document tampering (ML-07)
   - TruFor model weights are loaded unsafely and never executed (ML-06)
   - Empty/corrupted images hallucinate face detections rather than rejecting input (ML-04)
   - Telemetry health endpoints mask missing weights by hardcoding `or True` (ML-11, ML-12)

Remediating these 20 issues is critical prior to sovereign operational deployment. The comprehensive technical report at `.agents/teamwork_preview_explorer_ml_audit/report.md` provides detailed line-level remediation blueprints for each defect.

---

## 5. Verification Method

To independently verify and reproduce each finding, execute the following commands from the repository root (`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project`):

### A. Run Existing Backend Test Suite
```bash
PYTHONPATH=backend ./backend/.venv311/bin/pytest backend/tests/test_risk_engine.py backend/tests/test_mrz_checksum.py backend/tests/test_biometrics.py backend/tests/test_forensics.py
```
*(Confirms 90/90 baseline tests pass, demonstrating that existing test suites lack coverage for these 20 edge cases).*

### B. Reproduce Critical MRZ & Date Parsing Defects (ML-01, ML-02, ML-03)
```bash
PYTHONPATH=backend ./backend/.venv311/bin/python -c '
from app.modules.mrz.mrz_engine import mrz_engine
from app.modules.mrz.cross_validator import parse_date_to_yymmdd
from app.modules.forensics.fraud_edge_cases import FraudEdgeCaseDetector

# ML-01: Valid TD3 passport with < in CD4
l1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
l2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<<9"
res = mrz_engine.parse_mrz_lines([l1, l2])
print("ML-01 MRZ Valid (Expected True):", res.valid, "Failures:", res.checksum_failures)

# ML-02: DD/MM/YYYY date parsing on 19th
dob_parsed = parse_date_to_yymmdd("19/08/1995")
print("ML-02 Parsed DOB (Expected 950819):", dob_parsed)

# ML-03: Hyphenated date temporal paradox
detector = FraudEdgeCaseDetector()
anomaly = detector._check_date_paradoxes({"dob": "15-08-1995", "issue_date": "01-01-2020", "expiry_date": "01-01-2030"})
print("ML-03 Date Paradox Anomalies (Expected None):", anomaly)
'
```
**Expected Reproduction Output:**
- `ML-01 MRZ Valid (Expected True): False Failures: ['Optional Personal Number Check Digit (CD4) mismatch: expected <, calculated 1']`
- `ML-02 Parsed DOB (Expected 950819): 081995` *(Failed: year parsed as 1908)*
- `ML-03 Date Paradox Anomalies (Expected None): [RiskFactor(code='ERR_LOG_DATE_PARADOX_05', ...)]` *(Failed: issue year parsed as 1)*

### C. Reproduce Face Detector Zero-Byte Hallucination (ML-04)
```bash
PYTHONPATH=backend ./backend/.venv311/bin/python -c '
from app.modules.biometrics.face_detector import face_detector
res = face_detector.detect_faces(b"")
print("ML-04 Zero-byte Detection Faces Found (Expected 0 or Error):", res.faces_found, "Confidence:", res.faces[0].confidence if res.faces else None)
'
```
**Expected Reproduction Output:**
- `ML-04 Zero-byte Detection Faces Found (Expected 0 or Error): 1 Confidence: 0.55` *(Hallucinated face)*

### D. Reproduce Algorithmic Text Tampering Suppression (ML-07)
```bash
PYTHONPATH=backend ./backend/.venv311/bin/python -c '
import numpy as np
from app.modules.forensics.tamper_detector import DocumentTamperDetector
detector = DocumentTamperDetector()
img = np.ones((600, 800, 3), dtype=np.uint8) * 200
# Tamper text area in bottom half
img[400:500, 200:600] = np.random.randint(0, 255, (100, 400, 3), dtype=np.uint8)
res = detector._algorithmic_tamper_detection(img)
print("ML-07 Text Tamper Prob:", res["text_tamper_prob"], "Tampered Flag (tau=0.18):", res["tampered"])
'
```
**Expected Reproduction Output:**
- `ML-07 Text Tamper Prob: 0.12 Tampered Flag (tau=0.18): False` *(Artificially clamped below threshold)*

### Invalidation Conditions
This handoff report and its conclusions would be invalidated if:
1. Production code is updated to replace naive string split logic with robust ISO-8601/locale-aware datetime parsing.
2. `mrz_engine.py` is patched to accept `<` as a valid absent check digit for TD3 optional personal data fields.
3. Input validation layers are deployed at API boundaries rejecting empty byte arrays and enforcing numpy ndarray conversion.
