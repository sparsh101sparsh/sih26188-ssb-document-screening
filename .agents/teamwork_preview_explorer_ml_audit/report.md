# Track 2: ML & Algorithmic Modules Comprehensive Audit Report
**SIH26188 — Sovereign Edge Screening Gateway**
**Audit Date:** 2026-09-09 | **Status:** Complete | **Mode:** Strict Read-Only

---

## 1. Executive Summary

This report delivers an exhaustive, read-only algorithmic and machine learning audit of the SIH26188 Edge Screening Gateway backend (`backend/app/modules/` and dependent router execution paths). The audit systematically evaluated six operational focus areas:
1. **Fallback Chain Robustness When Weights Are Missing**: Graceful degradation vs unhandled exceptions across InsightFace SCRFD-10GF, YuNet, AdaFace-ResNet100, SFace, MiniFASNetV2, DocTamper, TruFor, PP-OCRv4, and OmniMRZ.
2. **OCR / MRZ Parsing & Modulo-10 Check Digit Edge Cases**: TD1, TD2, and TD3 ICAO Doc 9303 compliance, check digit calculation with 7-3-1 weights, filler character `<` handling, optional field CD4 verification, and transliteration consistency.
3. **Facial Matching Baseline Drift & Canonical Alignment**: Umeyama 5-point affine alignment, cosine similarity piece-wise calibration, lighting/contrast enhancement (CLAHE), demographic apparent age heuristics, and bounding box clipping.
4. **Error Level Analysis (ELA) & Forensic Tamper Scoring**: Re-compression quality factor differences, JPEG quantization tables (DQT), edge gradient noise, deadband threshold suppression (`tau_adapt = 0.18`), and text vs photo tampering flags.
5. **Stamp Verification Bounding Logic & Contour Extraction**: HSV ink pigment segmentation, geometric aspect ratio heuristics, lack of connected-component clustering, false positives on non-travel identity cards, and bounding box out-of-bounds slicing.
6. **Input Image Validation & Numerical Edge Cases**: Zero-byte images, unhandled PIL Image objects causing OpenCV C++ exceptions, transparent PNG alpha channel stripping, division by zero in variance ratios, and year-parsing string slicing bugs.

A total of **20 unique algorithmic and ML defects** were discovered and verified through static inspection, source trace analysis, and reproducible Python diagnostic runs.

### Bug Count by Severity

| Severity | Count | Definition |
| :--- | :---: | :--- |
| **CRITICAL** | 3 | Immediate false-positive RED alert / detention on valid documents, or fatal parsing failure |
| **HIGH** | 8 | Undetected text tampering, model hallucination on empty data, crash on PIL inputs, dead code |
| **MEDIUM** | 5 | Masked model health status, deprecated third-party APIs, visual scaling discrepancies, edge sampling |
| **LOW** | 3 | Color space inversion (BGR vs RGB), redundant object re-instantiation, unused parameters |
| **INFO** | 1 | Hardcoded static fallback values for dates and permit windows |
| **TOTAL** | **20** | **All active, verified defects across ML modules** |

### Bug Count by Component Area

| Component Area | Primary Source Files | Critical | High | Medium | Low | Info | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **MRZ Engine & Parser** | `backend/app/modules/mrz/mrz_engine.py` | 1 | 0 | 0 | 0 | 0 | 1 |
| **Cross-Validation Matrix** | `backend/app/modules/mrz/cross_validator.py` | 1 | 2 | 0 | 0 | 0 | 3 |
| **Fraud Edge Cases** | `backend/app/modules/forensics/fraud_edge_cases.py` | 1 | 0 | 0 | 0 | 0 | 1 |
| **Biometrics: Detection & Alignment** | `backend/app/modules/biometrics/face_detector.py` | 0 | 2 | 0 | 1 | 0 | 3 |
| **Biometrics: Verification & Age** | `backend/app/modules/biometrics/face_matcher.py` | 0 | 1 | 0 | 1 | 0 | 2 |
| **Biometrics: Anti-Spoofing** | `backend/app/modules/biometrics/liveness_detector.py` | 0 | 1 | 0 | 0 | 0 | 1 |
| **Visual Forensics: Tamper Detection**| `backend/app/modules/forensics/tamper_detector.py` | 0 | 2 | 0 | 0 | 0 | 2 |
| **Visual Forensics: ELA Engine** | `backend/app/modules/forensics/ela_engine.py` | 0 | 0 | 2 | 0 | 0 | 2 |
| **Visual Forensics: Photo Splicing** | `backend/app/modules/forensics/photo_splicing_detector.py` | 0 | 0 | 1 | 0 | 0 | 1 |
| **Stamp Verification Engine** | `backend/app/modules/stamp_verifier.py` | 0 | 1 | 0 | 0 | 0 | 1 |
| **OCR & QR Decoding** | `backend/app/modules/ocr/pp_ocr_engine.py`, `qr_decoder.py` | 0 | 0 | 1 | 1 | 0 | 2 |
| **Model Management & Telemetry Router**| `backend/app/api/routers/models.py`, `scan.py` | 0 | 0 | 1 | 0 | 1 | 2 |
| **TOTAL** | | **3** | **8** | **5** | **3** | **1** | **20** |

---

## 2. Comprehensive Bug Registry

### ML-01: ICAO Doc 9303 TD3 Check Digit False-Positive on Valid Passports with `<` Filler in CD4
- **Severity**: **CRITICAL**
- **Affected Component & Exact File Path**: `backend/app/modules/mrz/mrz_engine.py`
- **Exact Line Numbers**: Lines 439–445
- **Detailed Description**:
  In standard ICAO Doc 9303 Part 4 (Machine Readable Passports — TD3 format, 2 lines x 44 chars), line 2 characters 29–42 represent optional data (e.g. personal identification number), and character 43 is CD4 (the check digit over the optional field). According to ICAO Doc 9303 Part 4, Section 4.2.2: *"If a personal number or other optional data is used without a check digit, the check digit position (character 43) shall be completed with the filler character (<)."*
  
  In `mrz_engine.py`:
  ```python
  # CD4: Optional personal number checksum
  cd4_valid = verify_check_digit(optional_raw, cd4)
  if not cd4_valid and not (optional_raw.strip('<') == '' and cd4 in ['<', '0']):
      failures.append(f"Optional Personal Number Check Digit (CD4) mismatch: expected {cd4}, calculated {calculate_mrz_check_digit(optional_raw)}")
      cd4_valid = False
  else:
      cd4_valid = True
  ```
  When a passport has a non-empty personal number in `optional_raw` (e.g. `"ZE184226B<<<<<"`) but does not use an optional check digit, character 43 is `<`.
  `verify_check_digit` calculates the modulo-10 checksum over `optional_raw` (e.g. `'1'`), sees that `'1' != '<'`, and returns `False`.
  Then line 441 evaluates: `not cd4_valid` is `True`, but `optional_raw.strip('<') == ''` is `False`. The guard condition passes, appending a checksum failure and setting `cd4_valid = False` and `overall_valid = False`.
- **Root Cause Analysis**:
  The conditional in line 441 only permits `cd4 == '<'` if `optional_raw` is 100% filler characters (`optional_raw.strip('<') == ''`). It fails to recognize that under ICAO Doc 9303, character 43 can be `<` even when personal data is present if the issuing state chooses not to apply an optional check digit.
- **Reproduction Steps / Scenario**:
  Execute Python diagnostic with valid Swedish/French passport line 2:
  ```python
  from app.modules.mrz.mrz_engine import mrz_engine
  l1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
  l2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<<9"
  res = mrz_engine.parse_mrz_lines([l1, l2])
  assert res.valid is True # FAILS: res.valid evaluates to False with checksum_failures=['Optional Personal Number Check Digit (CD4) mismatch: expected <, calculated 1']
  ```
- **Consequence / Impact**:
  In `backend/app/modules/risk_engine/risk_scorer.py:175`, `mrz_result.valid is False` immediately triggers **TRIPWIRE_1**, forcing an instant **RED ALERT** (Risk Score 95.0, `auto_clear=False`). Legitimate travelers with valid international passports are flagged for immediate detention and secondary officer physical inspection.
- **Potential Remediation Notes**:
  Update line 441 to recognize that if `cd4 == '<'`, no check digit is asserted for the optional field:
  ```python
  if cd4 in ('<', ''):
      cd4_valid = True
  else:
      cd4_valid = verify_check_digit(optional_raw, cd4)
      if not cd4_valid:
          failures.append(f"Optional Personal Number Check Digit (CD4) mismatch: expected {cd4}, calculated {calculate_mrz_check_digit(optional_raw)}")
  ```

---

### ML-02: CV-01 Date Parser Misidentifies Birthdays on 19th and 20th of Any Month as Year 19xx/20xx
- **Severity**: **CRITICAL**
- **Affected Component & Exact File Path**: `backend/app/modules/mrz/cross_validator.py`
- **Exact Line Numbers**: Lines 80–99
- **Detailed Description**:
  Rule CV-01 compares the date of birth extracted from the MRZ against the visual OCR date of birth. To do so, `parse_date_to_yymmdd(date_str)` normalizes dates to `YYMMDD`.
  In `cross_validator.py`:
  ```python
  def parse_date_to_yymmdd(date_str: str) -> Optional[str]:
      if not date_str:
          return None
      cleaned = re.sub(r'[^0-9]', '', date_str.strip())
      if len(cleaned) == 6:
          return cleaned
      elif len(cleaned) == 8:
          if cleaned.startswith("19") or cleaned.startswith("20"):
              yyyy, mm, dd = cleaned[0:4], cleaned[4:6], cleaned[6:8]
              return f"{yyyy[2:]}{mm}{dd}"
          else:
              dd, mm, yyyy = cleaned[0:2], cleaned[2:4], cleaned[4:8]
              return f"{yyyy[2:]}{mm}{dd}"
      return None
  ```
  When the visual OCR date is formatted in standard Indian/British notation `DD/MM/YYYY` (e.g. `19/08/1995` or `20/03/1988`), stripping punctuation results in `19081995` or `20031988`.
  Line 92 checks `if cleaned.startswith("19") or cleaned.startswith("20"):`. Because the day is `19` or `20`, the condition evaluates to `True`!
  It extracts `yyyy = "1908"`, `mm = "19"`, `dd = "95"`, returning normalized string `"081995"` instead of `"950819"`!
- **Root Cause Analysis**:
  Stripping delimiters before determining field order destroys the token boundary information. Checking `startswith("19")` or `startswith("20")` on unsegmented digit strings falsely assumes any date starting with 19 or 20 is in `YYYY-MM-DD` format.
- **Reproduction Steps / Scenario**:
  ```python
  from app.modules.mrz.cross_validator import parse_date_to_yymmdd
  print(parse_date_to_yymmdd("19/08/1995")) # Outputs: "081995" (Expected: "950819")
  print(parse_date_to_yymmdd("20/03/1988")) # Outputs: "031988" (Expected: "880320")
  ```
- **Consequence / Impact**:
  In Rule CV-01, `norm_mrz_dob` (`"950819"`) is compared with `norm_ocr_dob` (`"081995"`). The check fails, triggering a critical violation:
  `ERR_DOB_MISMATCH: MRZ DOB (950819) does not match Visual OCR DOB (081995)`.
  This injects a deterministic `+3.50 log-odds` penalty into the Bayesian risk score, pushing authentic documents from GREEN into AMBER/RED for approximately **6.7% of the global population** (anyone born on the 19th or 20th day of any month).
- **Potential Remediation Notes**:
  Parse the date using delimiter tokens or explicit formats before stripping non-digits:
  ```python
  def parse_date_to_yymmdd(date_str: str) -> Optional[str]:
      if not date_str:
          return None
      for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d", "%d.%m.%Y", "%y%m%d"):
          try:
              dt = datetime.datetime.strptime(date_str.strip(), fmt)
              return dt.strftime("%y%m%d")
          except ValueError:
              continue
      return None
  ```

---

### ML-03: Temporal Paradox Rule Uses Flawed String Split Taking Day Instead of Year for `DD-MM-YYYY` Dates
- **Severity**: **CRITICAL**
- **Affected Component & Exact File Path**: `backend/app/modules/forensics/fraud_edge_cases.py`
- **Exact Line Numbers**: Lines 95–113
- **Detailed Description**:
  Edge Case 05 (`Temporal Paradox: Issue Date Prior to Birth Date`) checks whether an ID card's issue date precedes the holder's date of birth.
  Lines 101–102 extract the years:
  ```python
  dob_year = int(dob_str.split("/")[-1].split("-")[0]) if "/" in dob_str or "-" in dob_str else None
  issue_year = int(issue_str.split("/")[-1].split("-")[0]) if "/" in issue_str or "-" in issue_str else None
  ```
  When a document has `dob_str = "1995-05-12"` (`YYYY-MM-DD`) and `issue_str = "01-01-2020"` (`DD-MM-YYYY`, standard format across India):
  - For `dob_str`: `"1995-05-12".split("/")[-1]` is `"1995-05-12"`. Then `.split("-")[0]` is `"1995"`. `dob_year = 1995`.
  - For `issue_str`: `"01-01-2020".split("/")[-1]` is `"01-01-2020"`. Then `.split("-")[0]` takes the first token, which is the day `"01"`. `issue_year = int("01") = 1`!
  Line 103 checks `if dob_year and issue_year and issue_year < dob_year:`.
  `1 < 1995` evaluates to `True`!
- **Root Cause Analysis**:
  Chaining `.split("/")[-1]` followed by `.split("-")[0]` naively presumes that slash-separated dates put the year at the end (`DD/MM/YYYY`) while hyphen-separated dates always put the year at the beginning (`YYYY-MM-DD`). In India, hyphenated `DD-MM-YYYY` (e.g. `01-01-2020`) is ubiquitous.
- **Reproduction Steps / Scenario**:
  ```python
  from app.modules.forensics.fraud_edge_cases import fraud_edge_case_engine
  violations = fraud_edge_case_engine.evaluate_edge_cases(
      ocr_fields={'dob': '1995-05-12', 'issue_date': '01-01-2020'}
  )
  assert len(violations) == 0 # FAILS: returns violation EC-05
  ```
  Output:
  `{'case_id': 'EC-05', 'name': 'Temporal Paradox (Issue Date Prior to Birth Date)', 'telemetry_code': 'ERR_LOG_DATE_PARADOX_05', 'severity': 'CRITICAL', 'weight': 4.5, 'details': 'Card issue year (1) is earlier than resident birth year (1995)'}`
- **Consequence / Impact**:
  Injects a **CRITICAL** violation (`weight=4.5`) on valid cards with mixed ISO and Indian date formats, falsely asserting a temporal impossibility.
- **Potential Remediation Notes**:
  Use `parse_iso_date` or robust regex date matching to extract the actual 4-digit year regardless of delimiter.

---

### ML-04: Zero-Byte / Corrupted Image Payload Hallucinates Detected Face in Fallback Mode
- **Severity**: **HIGH**
- **Affected Component & Exact File Path**: `backend/app/modules/biometrics/face_detector.py`
- **Exact Line Numbers**: Lines 31–73, 484–518, 857–907
- **Detailed Description**:
  When `detect_faces` is passed empty bytes (`b""`), `_preprocess_input_image` fails to decode with OpenCV and PIL. It then invokes `parse_image_dimensions(data: bytes)`.
  Line 33:
  ```python
  if not data or len(data) < 8:
      return 200, 200
  ```
  `parse_image_dimensions` returns dummy dimensions `(200, 200)`. Line 504 returns `(bytes(b""), 200, 200)`.
  Inside `detect_faces`, `self._run_fallback_detector(b"", 200, 200)` is invoked.
  Attempt 1 (YuNet) is skipped (`img_array is None`).
  Attempt 2 (Skin-tone) is skipped (`img_array is None`).
  Attempt 3 (Geometric fallback) executes lines 857–890:
  Because `aspect_ratio = 200 / 200 = 1.0 < 1.2`, it calculates:
  `x1 = 30, y1 = 20, x2 = 170, y2 = 180`.
  It constructs a valid `FaceBBox(bbox=[30, 20, 170, 180], confidence=0.55)` and landmarks.
  Line 900 attempts `align_face_112x112(b"", landmarks)`, which returns `b""`.
  `detect_faces` returns `FaceDetectionResult(faces_found=1, primary_face=FaceBBox(confidence=0.55), ...)` with crops `[b""]`.
- **Root Cause Analysis**:
  Attempt 3 in `_run_fallback_detector` blindly invents a face bounding box whenever Attempts 1 and 2 fail, without checking if `image` actually contains valid decoded pixels or non-zero bytes.
- **Reproduction Steps / Scenario**:
  ```python
  from app.modules.biometrics.face_detector import face_detector
  res, crops = face_detector.detect_faces(b"")
  print("Faces found:", res.faces_found) # Outputs: 1
  print("Primary face:", res.primary_face) # Outputs: FaceBBox(bbox=[30, 20, 170, 180], confidence=0.55)
  print("Crops:", crops) # Outputs: [b'']
  ```
- **Consequence / Impact**:
  Any corrupted, 0-byte, or unparseable image upload is recorded by the biometric pipeline as having successfully passed face detection with a valid human face. Downstream modules (`face_matcher`, `liveness_detector`) then attempt to extract embeddings or run FFT on empty buffers.
- **Potential Remediation Notes**:
  In `_preprocess_input_image`, return `(None, 0, 0)` when bytes cannot be decoded. In `detect_faces` and `_run_fallback_detector`, guard at entry:
  ```python
  if img_array is None or img_w < 10 or img_h < 10:
      return [], [], []
  ```

---

### ML-05: Passing PIL.Image to `detect_faces` Causes YuNet ONNX to Crash with Bad Argument
- **Severity**: **HIGH**
- **Affected Component & Exact File Path**: `backend/app/modules/biometrics/face_detector.py`
- **Exact Line Numbers**: Lines 381–410, 480–518
- **Detailed Description**:
  The docstring for `detect_faces` states: *"image_input: Numpy array (BGR/RGB), raw image bytes, PIL Image, or file path."*
  However, in `_preprocess_input_image`:
  ```python
  # 3. If PIL Image
  if hasattr(image_input, "size") and hasattr(image_input, "convert"):
      return image_input, int(image_input.height), int(image_input.width)
  ```
  `img_array` is returned as the original `PIL.Image` object.
  When `self._yunet_loaded` is True, `detect_faces` calls:
  `faces, landmarks_list, crops = self._run_yunet_onnx(img_array, img_h, img_w, ...)`
  In `_run_yunet_onnx`, line 410 calls:
  `_, detections = yunet.detect(img_array)`
  OpenCV's `FaceDetectorYN.detect` is a C++ wrapper that requires a `cv::Mat` (numpy ndarray). It throws:
  `cv2.error: OpenCV(5.0.0) :-1: error: (-5:Bad argument) in function 'detect' > Overload resolution failed: image is not a numpy array, neither a scalar`.
- **Root Cause Analysis**:
  `_preprocess_input_image` does not convert `PIL.Image` instances to `np.ndarray` before passing them to OpenCV DNN routines.
- **Reproduction Steps / Scenario**:
  ```python
  from PIL import Image
  from app.modules.biometrics.face_detector import face_detector
  pil_img = Image.new("RGB", (300, 300), color=(200, 150, 100))
  res, crops = face_detector.detect_faces(pil_img)
  # YuNet throws OpenCV exception and fails over to Attempt 3 geometric guess
  ```
- **Consequence / Impact**:
  Whenever a PIL Image is passed (e.g. from FastAPI endpoints or image processing utilities), the primary neural face detector crashes. Furthermore, fallback Attempt 2 (`cv2.cvtColor(search_roi)`) also crashes for the same reason, causing all PIL images to degrade to the lowest-quality geometric coordinate box.
- **Potential Remediation Notes**:
  In `_preprocess_input_image`:
  ```python
  if hasattr(image_input, "size") and hasattr(image_input, "convert"):
      import numpy as np
      import cv2
      rgb_arr = np.array(image_input.convert("RGB"))
      bgr_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
      return bgr_arr, int(image_input.height), int(image_input.width)
  ```

---

### ML-06: TruFor PyTorch Model Is Loaded into Memory but Completely Unused in Inference (Dead Code & Wasteful VRAM)
- **Severity**: **HIGH**
- **Affected Component & Exact File Path**: `backend/app/modules/forensics/tamper_detector.py`
- **Exact Line Numbers**: Lines 101, 119–130, 286–305, 334
- **Detailed Description**:
  In `TamperDetector._init_models`, the engine checks for `settings.TRUFOR_MODEL` (`trufor_general.pth.tar`) and loads the PyTorch model onto the target device (`self.trufor_model = torch.load(str(tf_path), map_location=device)`).
  However, in `_run_inference_or_fallback`, the engine only ever checks:
  ```python
  if self.doctamper_session is not None:
      return self._run_onnx_doctamper(...)
  return self._run_algorithmic_fallback(...)
  ```
  `self.trufor_model` is NEVER called for forward inference anywhere in `tamper_detector.py`.
  Inside `_run_onnx_doctamper`:
  `tf_score = float(np.mean(prob_map))`
  It assigns `tf_score` (TruFor score) to the mean value of DocTamper's probability map!
  Additionally, `torch.load` is called without `weights_only=True`, exposing the service to arbitrary pickle execution warnings/vulnerabilities.
- **Root Cause Analysis**:
  The developer stubbed in the TruFor weights loader, but never authored the PyTorch forward pass, tensor normalization, or noiseprint post-processing code, leaving the model in memory as dead code while faking the score via DocTamper's average.
- **Reproduction Steps / Scenario**:
  Inspect all occurrences of `self.trufor_model` in `tamper_detector.py`. It is referenced on lines 101, 125, 126, 127 and nowhere else.
- **Consequence / Impact**:
  Large binary weights (~150MB+) are loaded into GPU/RAM at boot time with zero operational utility. TruFor RGB-noiseprint splicing localization claimed in architecture Section 2.3 does not exist in production runtime.
- **Potential Remediation Notes**:
  Implement the genuine TruFor PyTorch forward pass, or remove the dead PyTorch loader and explicitly document that splicing analysis is delegated to `photo_splicing_detector.py`. Always specify `weights_only=True` in `torch.load`.

---

### ML-07: ELA Fallback Clamps Text Tamper Probability Below Deadband, Making Text Forgery Undetectable
- **Severity**: **HIGH**
- **Affected Component & Exact File Path**: `backend/app/modules/forensics/tamper_detector.py`
- **Exact Line Numbers**: Lines 397–440
- **Detailed Description**:
  In `_run_algorithmic_fallback`, line 402 defines:
  `is_clean_capture = (mean_intensity < 140.0) and not photo_tampered`
  In the pixel loop (line 424):
  ```python
  if is_clean_capture:
      prob = min(0.12, anomaly_signal * 0.30)
  elif not photo_tampered and mean_intensity < 100.0:
      prob = min(0.14, anomaly_signal * 0.40)
  else:
      prob = min(1.0, anomaly_signal * 0.85)
  ```
  When a document image has a clean capture (`mean_intensity < 140.0`) and the photo area is untouched (`not photo_tampered`), `prob` for EVERY cell in the 64x64 grid is capped at `0.12`.
  The tamper detection threshold is `self.tau_adapt = 0.18`.
  Line 436: `if prob >= self.tau_adapt: high_cells.append(...)`.
- **Root Cause Analysis**:
  The developer attempted to prevent false-positive tamper alarms on clean documents by artificially hard-capping the probability at `0.12` whenever `photo_tampered` is False.
- **Reproduction Steps / Scenario**:
  Generate an image with an authentic photo and a heavily tampered text box (e.g. modified date of birth). Run `tamper_detector.analyze` in fallback mode.
  `dt_score` is capped at `0.12`, `tampered_regions` is empty, and `is_tampered` returns `False`.
- **Consequence / Impact**:
  Digital forgery of text fields (resident names, document numbers, dates of birth, issuing authorities) is **impossible to detect** in fallback mode if the attacker leaves the photo region unchanged.
- **Potential Remediation Notes**:
  Evaluate the anomaly signal dynamically against local text bounding box statistics rather than imposing an unconditional global ceiling of 0.12.

---

### ML-08: Centenary Heuristic in `calculate_age_from_yymmdd` Produces Zero Age and Critical CV-04 Warning for Elderly Travelers
- **Severity**: **HIGH**
- **Affected Component & Exact File Path**: `backend/app/modules/mrz/cross_validator.py`
- **Exact Line Numbers**: Lines 101–114
- **Detailed Description**:
  `calculate_age_from_yymmdd` computes traveler age from a 6-character `YYMMDD` birthdate:
  ```python
  def calculate_age_from_yymmdd(yymmdd: str, reference_year: int = 2026) -> Optional[int]:
      ...
      yy = int(yymmdd[0:2])
      birth_year = (2000 + yy) if yy <= 40 else (1900 + yy)
      return max(0, reference_year - birth_year)
  ```
  For an elderly traveler born in 1935 (currently 91 years old in 2026), `yy = 35`.
  Because `35 <= 40`, line 110 sets `birth_year = 2000 + 35 = 2035`!
  `reference_year - birth_year = 2026 - 2035 = -9`.
  `max(0, -9)` evaluates to `0`!
- **Root Cause Analysis**:
  The heuristic `yy <= 40` hardcodes an assumption that birth years up to `YY=40` belong to the 2000s. In the year 2026, nobody born in 2027–2040 exists. All birth years with `yy > 26` must belong to the 1900s.
- **Reproduction Steps / Scenario**:
  ```python
  from app.modules.mrz.cross_validator import calculate_age_from_yymmdd
  print(calculate_age_from_yymmdd("350512", reference_year=2026)) # Outputs: 0 (Expected: 91)
  ```
- **Consequence / Impact**:
  Any senior citizen born between 1927 and 1940 (ages 86 to 99) is evaluated as having an age of 0 years. When Rule CV-04 evaluates their biometric facial age (e.g. 85 years) against their document age (0 years), `|85 - 0| = 85 > 10.0`, triggering `WRN_AGE_ANOMALY` (+1.8 log-odds penalty) on legitimate elderly travelers.
- **Potential Remediation Notes**:
  Set the centenary pivot dynamically to `reference_year % 100`:
  ```python
  current_yy = reference_year % 100
  birth_year = (2000 + yy) if yy <= current_yy else (1900 + yy)
  ```

---

### ML-09: Biometric Apparent Age Extractor Sums Arbitrary Unit-Sphere Dimensions, Always Predicting Age ~19–20
- **Severity**: **HIGH**
- **Affected Component & Exact File Path**: `backend/app/modules/biometrics/face_matcher.py`
- **Exact Line Numbers**: Lines 350–371
- **Detailed Description**:
  In `AdaFaceMatcher._estimate_apparent_age`:
  ```python
  doc_energy = sum(abs(x) for x in doc_emb[:32]) / 32.0
  live_energy = sum(abs(x) for x in live_emb[:32]) / 32.0

  age_id = int(max(18, min(75, round(20 + (doc_energy - 0.04) * 200))))
  age_live = int(max(18, min(75, round(20 + (live_energy - 0.04) * 200))))
  age_drift = abs(age_live - age_id)
  ```
  AdaFace and SFace embedding vectors are 512-dimensional points on a unit hypersphere (`||v||_2 = 1.0`). Dimensions 0–31 have no correlation with biological age.
  On a 512-D unit sphere, the expected value of `|x_i|` for any random dimension is `\sqrt{2 / (512 \cdot \pi)} \approx 0.0353`.
  Therefore, `(doc_energy - 0.04) * 200 \approx (0.0353 - 0.04) * 200 = -0.94`.
  `age_id = round(20 - 0.94) = 19`.
- **Root Cause Analysis**:
  Mathematical fallacy attempting to derive facial demographic age by averaging the first 32 dimensions of a metric learning embedding space.
- **Reproduction Steps / Scenario**:
  Pass any 512-D normalized embedding vector into `_estimate_apparent_age`. The predicted age is consistently 18, 19, 20, or 21, regardless of whether the person is 8 or 80 years old.
- **Consequence / Impact**:
  Because every person on Earth is estimated to be ~20 years old, Rule CV-04 (`|apparent_age - age_dob| > 10.0`) consistently fails for any traveler older than 31 or younger than 10, adding an unjustified `+1.80 log-odds` penalty to their risk assessment.
- **Potential Remediation Notes**:
  Remove the arbitrary embedding slice heuristic. Use an actual age estimation model (e.g. MobileNet or InsightFace age/gender model) or omit the apparent age penalty from the cross-validation score until a true demographic estimator is deployed.

---

### ML-10: Stamp Verifier Has No Spatial Clustering; Extrapolates Single BBox Across Disconnected Ink Artifacts
- **Severity**: **HIGH**
- **Affected Component & Exact File Path**: `backend/app/modules/stamp_verifier.py`
- **Exact Line Numbers**: Lines 410–440
- **Detailed Description**:
  In `StampVerifier._locate_stamp_region`, pixels matching official stamp ink colors (purple, blue, red) are identified. When 15 or more ink hits are found:
  ```python
  xs = [p[0] for p in ink_pixels]
  ys = [p[1] for p in ink_pixels]
  min_x = max(0, min(xs) - pad)
  max_x = min(width, max(xs) + pad)
  min_y = max(0, min(ys) - pad)
  max_y = min(height, max(ys) + pad)
  ```
  The engine takes the global `min` and `max` across all matching ink pixels on the entire document.
  There is no contour extraction, connected components analysis, or spatial clustering.
- **Root Cause Analysis**:
  Assuming all ink-colored pixels belong to a single contiguous stamp.
- **Reproduction Steps / Scenario**:
  Provide an image with a blue signature at the top-left and a blue stamp or pen mark at the bottom-right.
  The bounding box stretches across the entire document page (e.g. from x=10, y=10 to x=580, y=390).
- **Consequence / Impact**:
  The gigantic multi-signature bounding box is downsampled to 32x32 and compared against the SSB circular stamp registry. It predictably fails SSIM (<0.20). Because the engine believes an immigration stamp was found, it assigns a `SUSPICIOUS` or `FORGED` verdict, adding `+2.80 log-odds` penalty to the traveler's risk score.
- **Potential Remediation Notes**:
  Implement contour extraction:
  ```python
  mask = cv2.inRange(...)
  contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
  # Filter by contourArea and circularity (4 * pi * Area / Perimeter^2)
  ```

---

### ML-11: Unconditional Hardcoded `is_model_loaded = True` in MiniFASNet Anti-Spoofing Detector Masks Missing Checkpoints
- **Severity**: **HIGH**
- **Affected Component & Exact File Path**: `backend/app/modules/biometrics/liveness_detector.py`
- **Exact Line Numbers**: Lines 85–87
- **Detailed Description**:
  `MiniFASNetLivenessDetector` declares an `is_model_loaded` property:
  ```python
  @property
  def is_model_loaded(self) -> bool:
      return True
  ```
  Even when both `2.7_80x80_MiniFASNetV2.onnx` and `4_0_0_80x80_MiniFASNet.onnx` are completely missing from disk, `self.session_2_7x is None`, `self.session_4_0x is None`, and `self._is_loaded is False`, calling `liveness_detector.is_model_loaded` unconditionally returns `True`.
- **Root Cause Analysis**:
  Developer hardcoded `return True` as a temporary bypass during testing and never replaced it with the actual loading state.
- **Reproduction Steps / Scenario**:
  ```python
  from app.modules.biometrics.liveness_detector import liveness_detector
  # Ensure weights are absent
  print("Is loaded:", liveness_detector.is_model_loaded) # Returns True
  print("Internal session:", liveness_detector.session_2_7x) # Returns None
  ```
- **Consequence / Impact**:
  Monitoring health endpoints (`/api/v1/models/status`, `/api/v1/health`) report the anti-spoofing neural network as fully loaded and operational when it is actually running in fallback mode.
- **Potential Remediation Notes**:
  Change to:
  ```python
  @property
  def is_model_loaded(self) -> bool:
      return self._is_loaded and (self.session_2_7x is not None or self.session_4_0x is not None)
  ```

---

### ML-12: Model Diagnostics Router Hardcodes `or True`, Masking Offline and Missing Models
- **Severity**: **MEDIUM**
- **Affected Component & Exact File Path**: `backend/app/api/routers/models.py`
- **Exact Line Numbers**: Lines 171, 175, 176
- **Detailed Description**:
  In `models.py`, `check_model_is_connected(model_id: str)` contains:
  ```python
  elif model_id == "paddle_ocrv4":
      return bool(pp_ocr_engine._paddle_ocr_en is not None or pp_ocr_engine._paddle_ocr_dev is not None or True)
  ...
  elif model_id == "doctamper_trufor":
      return bool(tamper_detector.doctamper_session is not None or tamper_detector.trufor_model is not None or settings.get_model_path(settings.DOCTAMPER_MODEL).exists() or True)
  return True
  ```
  Lines 171 and 175 end in `or True`, and line 176 returns `True` for all other models.
- **Root Cause Analysis**:
  Hardcoded `or True` to ensure that model status tests passed in development environments without downloading large ONNX weight checkpoints.
- **Reproduction Steps / Scenario**:
  Query `GET /api/v1/models/status`. All 10 models are reported as `"status": "ONLINE"`, even with zero models in `/backend/models/`.
- **Consequence / Impact**:
  System administrators and companion apps have no genuine visibility into whether neural models are actually running or in fallback mode.
- **Potential Remediation Notes**:
  Remove `or True` and query the real session/model loaded state for each engine.

---

### ML-13: Deprecated Pillow `.getdata()` Calls in ELA Engine Face Imminent Removal in Pillow 14
- **Severity**: **MEDIUM**
- **Affected Component & Exact File Path**: `backend/app/modules/forensics/ela_engine.py`
- **Exact Line Numbers**: Lines 207, 220, 238
- **Detailed Description**:
  `ela_engine.py` executes:
  `pixels = list(diff.getdata())`
  `small_pixels = list(diff_small.getdata())`
  `photo_px = list(photo_crop.getdata())`
  In Pillow 11.0+, these calls raise `DeprecationWarning: Image.Image.getdata is deprecated and will be removed in Pillow 14 (2027-10-15). Use get_flattened_data instead.`
- **Root Cause Analysis**:
  Use of deprecated Pillow 1.x legacy API.
- **Reproduction Steps / Scenario**:
  Run pytest on `backend/tests/test_forensics.py`. 24 warnings are emitted: `DeprecationWarning: Image.Image.getdata is deprecated`.
- **Consequence / Impact**:
  Upon the next major release of Pillow, these lines will fail with an `AttributeError`, completely breaking the ELA analysis pipeline.
- **Potential Remediation Notes**:
  Use `np.asarray(diff)` or `diff.get_flattened_data()` for modern Pillow compatibility.

---

### ML-14: ELA Visual Scaling Amplification Discrepancy (2x Visual vs 20x Metrics)
- **Severity**: **MEDIUM**
- **Affected Component & Exact File Path**: `backend/app/modules/forensics/ela_engine.py`
- **Exact Line Numbers**: Lines 203–204, 253–254
- **Detailed Description**:
  In `compute_ela_map`:
  `diff_scaled = ImageEnhance.Brightness(diff).enhance(scale_factor / 10.0)`
  Given default `scale_factor = 20.0`, `scale_factor / 10.0` equals `2.0`.
  Meanwhile, the numerical metrics use `max_err * s` (amplified by `20.0`).
- **Root Cause Analysis**:
  Erroneous division by `10.0` in the visual enhancement call.
- **Reproduction Steps / Scenario**:
  Inspect the generated PNG bytes from `compute_ela_map`. The error pixels are amplified only 2x, resulting in an essentially black image, while numerical intensity reports values up to 255.0.
- **Consequence / Impact**:
  The visual ELA artifact provided to border screening officers is 10x dimmer than expected and fails to highlight tampered regions visually.
- **Potential Remediation Notes**:
  Remove the `/ 10.0` divisor: `ImageEnhance.Brightness(diff).enhance(scale_factor)`.

---

### ML-15: Photo Splicing Noise Ratio Division by Zero / Substrate Zero Variance Edge Case
- **Severity**: **MEDIUM**
- **Affected Component & Exact File Path**: `backend/app/modules/forensics/photo_splicing_detector.py`
- **Exact Line Numbers**: Lines 242–252, 270
- **Detailed Description**:
  When extracting the substrate reference crop adjacent to the photo:
  ```python
  if substrate_crop.shape[1] < 15:
      substrate_crop = doc_bgr[ymin:ymax, max(0, xmin - 90):max(0, xmin - 10)]
  ```
  If the photo box is flush against the left boundary of the image (`xmin <= 10`), `max(0, xmin - 10)` is `0`. `substrate_crop` is empty (`0:0` slice, `size == 0`).
  `var_substrate = self._estimate_noise_variance(substrate_crop)` returns `0.0`.
  Line 252 calculates:
  `r_noise = round(float(abs(var_photo - 0.0) / (var_photo + 0.0 + 1e-6)), 4) = 1.0`.
  Line 270 flags: `noise_tamper_flag = r_noise > 0.55` (`1.0 > 0.55 = True`).
- **Root Cause Analysis**:
  Substrate sampling only tries left or right margins; if both margins are within 10px of the image borders, `substrate_crop` collapses to 0 pixels.
- **Reproduction Steps / Scenario**:
  Run `photo_splicing_detector.analyze_document_photo_integrity` on an image where `primary_photo_bbox` has `xmin = 5`.
  `r_noise` evaluates to `1.0`, triggering `noise_tamper_flag`.
- **Consequence / Impact**:
  Border-aligned ID card portraits are falsely flagged for noise inconsistency.
- **Potential Remediation Notes**:
  If lateral margins are insufficient, extract substrate sample above or below the photo box (`ymin - 80 : ymin - 10` or `ymax + 10 : ymax + 80`).

---

### ML-16: Big-Integer Decoding in `qr_decoder.py` Slices ASCII String Instead of Decoded Binary
- **Severity**: **MEDIUM**
- **Affected Component & Exact File Path**: `backend/app/modules/ocr/qr_decoder.py`
- **Exact Line Numbers**: Lines 258–285
- **Detailed Description**:
  In `parse_aadhaar_secure_payload`:
  ```python
  if decompressed is None:
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
  payload_bytes = decompressed if decompressed is not None else raw_bytes
  ```
  If `int_bytes` is raw uncompressed binary data (or compressed with non-standard parameters), `decompressed` remains `None`.
  `payload_bytes` falls back to `raw_bytes` (which is the ASCII decimal digit string).
  Line 283 then executes:
  `signed_data = payload_bytes[:-256]`
  `signature = payload_bytes[-256:]`
  It slices 256 ASCII digits instead of 256 raw signature bytes!
- **Root Cause Analysis**:
  Fallback assigns `raw_bytes` instead of `int_bytes` when integer conversion succeeds but decompression fails.
- **Reproduction Steps / Scenario**:
  Pass a numeric string representing an uncompressed big-integer payload.
  `signature` contains 256 ASCII digits, failing PKCS#1 v1.5 verification.
- **Consequence / Impact**:
  Legitimate uncompressed or custom-compressed Aadhaar Secure QR codes fail PKI verification and trigger TRIPWIRE_2.
- **Potential Remediation Notes**:
  Set `payload_bytes = decompressed if decompressed is not None else (int_bytes if 'int_bytes' in locals() else raw_bytes)`.

---

### ML-17: BGR to RGB Color Channel Inversion in SCRFD-10GF Input Preparation
- **Severity**: **LOW**
- **Affected Component & Exact File Path**: `backend/app/modules/biometrics/face_detector.py`
- **Exact Line Numbers**: Lines 490, 538–543
- **Detailed Description**:
  `_preprocess_input_image` uses `cv2.imdecode`, which outputs BGR color channel order. In `_run_scrfd_onnx`:
  `resized = cv2.resize(image, (new_w, new_h))`
  `blob[:new_h, :new_w, :] = resized`
  `blob = (blob - 127.5) / 128.0`
  `input_tensor = np.transpose(blob, (2, 0, 1))[np.newaxis, ...]`
  The channels are transposed from HWC to CHW, but Blue and Red channels remain reversed. SCRFD-10GF is trained on RGB images.
- **Root Cause Analysis**:
  Omission of `cv2.cvtColor(image, cv2.COLOR_BGR2RGB)` prior to blob normalization.
- **Reproduction Steps / Scenario**:
  Pass a high-contrast blue/red-tinted image. Landmark detection confidence on SCRFD is measurably lower due to channel inversion.
- **Consequence / Impact**:
  Sub-optimal face detection accuracy and landmark drift under colored border inspection lighting.
- **Potential Remediation Notes**:
  Insert `image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)` before resizing.

---

### ML-18: Uninstantiated EasyOCR Reader on Every Fallback Invocation Causing Heavy Disk I/O
- **Severity**: **LOW**
- **Affected Component & Exact File Path**: `backend/app/modules/ocr/pp_ocr_engine.py`
- **Exact Line Numbers**: Lines 556–560
- **Detailed Description**:
  In `PPOCREngine._run_easyocr_fallback`:
  `reader = easyocr.Reader(["en", "hi"], gpu=False, verbose=False)`
  The `easyocr.Reader` class is instantiated inside the function scope on every call.
- **Root Cause Analysis**:
  Failure to store the initialized reader on `self._easyocr_reader`.
- **Reproduction Steps / Scenario**:
  Call `_run_easyocr_fallback` multiple times. Each call incurs a 2–4 second initialization latency.
- **Consequence / Impact**:
  Severe throughput bottleneck (2000–4000ms latency per request) whenever RapidOCR and Tesseract are unavailable.
- **Potential Remediation Notes**:
  Cache `self._easyocr_reader` lazily upon first use.

---

### ML-19: Calibrate Match Confidence Function Ignores `model_type` Parameter
- **Severity**: **LOW**
- **Affected Component & Exact File Path**: `backend/app/modules/biometrics/face_matcher.py`
- **Exact Line Numbers**: Lines 80–111
- **Detailed Description**:
  `calibrate_match_confidence(similarity: float, model_type: str = "SFace")` defines a `model_type` parameter, but the parameter is never used within the function body. The piecewise mapping is hardcoded strictly for OpenCV SFace (`s < 0.363`), even when callers specify `model_type="AdaFace"`.
- **Root Cause Analysis**:
  Function signature was updated, but the model-specific calibration curves for AdaFace and Fallback HOG were never implemented.
- **Reproduction Steps / Scenario**:
  Call `calibrate_match_confidence(0.50, model_type="AdaFace")` vs `calibrate_match_confidence(0.50, model_type="SFace")`. Both return identical outputs (`0.8624`).
- **Consequence / Impact**:
  Reported calibrated confidence is inaccurate for deep AdaFace embeddings (where genuine matches are typically 0.70–0.90).
- **Potential Remediation Notes**:
  Implement model-specific threshold branching based on `model_type`.

---

### ML-20: Hardcoded Stamp Transit Date and Validity Window Fallbacks in Master Scan Router
- **Severity**: **INFO**
- **Affected Component & Exact File Path**: `backend/app/api/routers/scan.py`
- **Exact Line Numbers**: Lines 352, 363
- **Detailed Description**:
  In `inspect_document`:
  ```python
  if not stamp_date_str and stamp_res and stamp_res.stamp_found:
      stamp_date_str = "2026-08-20"
  ...
  permit_window=("2026-01-01", "2026-12-31")
  ```
  `stamp_date_str` defaults to `"2026-08-20"` and the permit window is hardcoded to calendar year 2026.
- **Root Cause Analysis**:
  Placeholder values left behind in production router code.
- **Reproduction Steps / Scenario**:
  Submit an inspection request without `transit_date`. The cross-validator checks against the hardcoded date `"2026-08-20"`.
- **Consequence / Impact**:
  Verification results depend on arbitrary static date constants if the companion app does not pass a timestamp.
- **Potential Remediation Notes**:
  Extract the date from OCR/MRZ metadata or require `transit_date` as a mandatory form field.

---

## 3. Demarcation: Previously Known vs Newly Discovered Bugs

| Bug ID | Title | Status | Discovery Classification |
| :--- | :--- | :---: | :--- |
| **ML-01** | TD3 MRZ Check Digit False-Positive on `<` Filler CD4 | **Active Bug** | **Newly Discovered** (Affects all international passports with unchecksummed optional numbers) |
| **ML-02** | CV-01 Date Parser Misidentifies Days 19 & 20 as Year 19xx/20xx | **Active Bug** | **Newly Discovered** (Affects ~6.7% of travelers worldwide) |
| **ML-03** | Temporal Paradox String Split Error on `DD-MM-YYYY` | **Active Bug** | **Newly Discovered** (Fatal logic flaw in fraud edge case 05) |
| **ML-04** | Zero-Byte Image Hallucinates Detected Face | **Active Bug** | **Newly Discovered** (Missing input guard in fallback detector) |
| **ML-05** | PIL.Image Crashes YuNet ONNX with Bad Argument | **Active Bug** | **Newly Discovered** (OpenCV C++ type mismatch) |
| **ML-06** | TruFor PyTorch Model Loaded but Unused in Inference | **Active Bug** | **Newly Discovered** (Dead code & VRAM waste) |
| **ML-07** | ELA Fallback Clamps Text Tamper Probability to 0.12 | **Active Bug** | **Newly Discovered** (Renders text forgery undetectable in fallback) |
| **ML-08** | Centenary Heuristic Generates Zero Age for 86+ Year Olds | **Active Bug** | **Newly Discovered** (Centenary pivot year flaw) |
| **ML-09** | Apparent Age Regressor Arbitrarily Sums Hypersphere Slices | **Active Bug** | **Newly Discovered** (Pseudoscience age heuristic) |
| **ML-10** | Stamp Verifier Has No Spatial Clustering | **Active Bug** | **Newly Discovered** (Stretches single bbox across distant signatures) |
| **ML-11** | MiniFASNet `is_model_loaded` Hardcoded to True | **Active Bug** | **Newly Discovered** (Masks missing anti-spoofing weights) |
| **ML-12** | Model Diagnostics Router Uses `or True` Masking Offline Status | **Active Bug** | **Newly Discovered** (Hardcoded mock bypass) |
| **ML-13** | Deprecated Pillow `.getdata()` Calls Facing Removal | **Active Bug** | **Newly Discovered** (Technical debt in ELA engine) |
| **ML-14** | ELA Scaling Amplification Discrepancy (2x vs 20x) | **Active Bug** | **Newly Discovered** (Heatmap visualization 10x too dark) |
| **ML-15** | Photo Splicing Noise Ratio Division by Zero on Edge Photos | **Active Bug** | **Newly Discovered** (Boundary substrate sampling flaw) |
| **ML-16** | Big-Integer Decoding Slices ASCII String on Decompress Fail | **Active Bug** | **Newly Discovered** (QR binary parsing type error) |
| **ML-17** | BGR vs RGB Channel Inversion in SCRFD-10GF | **Active Bug** | **Newly Discovered** (OpenCV color space omission) |
| **ML-18** | EasyOCR Reader Instantiated Inside Function Scope | **Active Bug** | **Newly Discovered** (Severe disk I/O latency spike) |
| **ML-19** | `calibrate_match_confidence` Ignores `model_type` Parameter | **Active Bug** | **Newly Discovered** (Unused parameter) |
| **ML-20** | Hardcoded Stamp Date & Permit Window in Scan Router | **Active Bug** | **Newly Discovered** (Placeholder static constants) |

---

## 4. Architectural Verification & Recommendations

1. **Strict ICAO Compliance in MRZ Engine**:
   Remove the check digit assertion on CD4 when `cd4 == '<'` in `mrz_engine.py:441`. Character 43 must be treated as optional filler when the issuing authority does not compute a personal number check digit.
2. **Robust Multi-Format Date Normalizer**:
   Replace `parse_date_to_yymmdd` and `fraud_edge_cases.py` custom string splitting with a centralized, deterministic date parsing utility that splits on delimiters (`/`, `-`, `.`) to identify `DD/MM/YYYY` vs `YYYY-MM-DD` unambiguously.
3. **Pillow to NumPy Image Conversion Gateway**:
   In `_preprocess_input_image`, convert all input images (PIL Images, bytes, arrays) into a unified NumPy BGR array for OpenCV and RGB for ONNX/PyTorch models. Never pass raw PIL objects directly to OpenCV C++ methods.
4. **Remove Hardcoded Diagnostic Overrides**:
   Purge all `or True` and hardcoded `return True` statements in `models.py` and `liveness_detector.py` so that telemetry routers honestly reflect actual model checkpoint availability.
5. **Real Age Estimation Integration**:
   De-link Rule CV-04 until a validated deep convolutional age regressor is incorporated, preventing false-positive age anomalies on adult travelers.
