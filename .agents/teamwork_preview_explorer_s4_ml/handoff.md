# Handoff Report: ML & Algorithmic Modules Deep Survey (ML-01 to ML-20)
**Agent**: `teamwork_preview_explorer_s4_ml`  
**Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_ml`  
**Report Target**: `handoff.md`  
**Type**: Hard Handoff (Investigation Complete)  
**Survey Report Artifact**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_ml/survey_report.md`  

---

## 1. Observation

A complete read-only source and diagnostic audit was executed across all 20 ML and algorithmic issues (ML-01 through ML-20) identified in `/Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md`.

### Direct Source Code Observations:
1. **ML-01 (`backend/app/modules/mrz/mrz_engine.py:439-448`)**:
   Line 442 implements `if cd4 in ('<', ''): cd4_valid = True else: cd4_valid = verify_check_digit(...)`. Bypasses modulo-10 check when filler `<` is used in CD4 optional personal number field.
2. **ML-02 (`backend/app/modules/mrz/cross_validator.py:80-99`)**:
   Lines 88-93 use `datetime.datetime.strptime` across `("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d", "%Y/%m/%d", "%y%m%d", "%d%m%Y")` before fallback digit stripping. `19/08/1995` parses to `"950819"` and `20/03/1988` parses to `"880320"`.
3. **ML-03 (`backend/app/modules/forensics/fraud_edge_cases.py:95-126`)**:
   Lines 103-116 use `_extract_year` parsing with `strptime` formats and regex `r'\b(19|20)\d{2}\b'`. `dob="1995-05-12"` and `issue_date="01-01-2020"` yields 0 violations. Genuine paradox (`issue_date="01-01-1990"`) flags `EC-05` (weight 4.5).
4. **ML-04 (`backend/app/modules/biometrics/face_detector.py:361-372, 498-524`)**:
   `_preprocess_input_image` guards empty bytes `b""` returning `(None, 0, 0)`. `detect_faces` checks `if img_array is None or img_h < 10 or img_w < 10: return FaceDetectionResult(faces_found=0, ...), []`. Zero-byte payloads return `faces_found=0`.
5. **ML-05 (`backend/app/modules/biometrics/face_detector.py:532-539`)**:
   `hasattr(image_input, "size") and hasattr(image_input, "convert")` converts `PIL.Image` via `np.array(image_input.convert("RGB"))` and `cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)`. YuNet executes without OpenCV C++ bad argument exceptions.
6. **ML-06 (`backend/app/modules/forensics/tamper_detector.py:100-122`)**:
   `self.trufor_model = None` replaces unverified, dead `torch.load` calls, eliminating insecure deserialization and saving 150MB+ VRAM/RAM.
7. **ML-07 (`backend/app/modules/forensics/tamper_detector.py:414-421`)**:
   Lines 415-416 set `if is_clean_capture: prob = min(1.0, anomaly_signal * 0.60)`. Removed artificial 0.12 ceiling so text tampering above `tau_adapt = 0.18` is detected.
8. **ML-08 (`backend/app/modules/mrz/cross_validator.py:101-114`)**:
   Lines 110-111 use `current_yy = reference_year % 100` and `(2000 + yy) if yy <= current_yy else (1900 + yy)`. `calculate_age_from_yymmdd("350512", reference_year=2026)` outputs 91 years (instead of 0).
9. **ML-09 (`backend/app/modules/biometrics/face_matcher.py:367-377`)**:
   `_estimate_apparent_age` returns `None, None, None`. Removed 32-D unit sphere slice averaging that forced age ~19 on all faces.
10. **ML-10 (`backend/app/modules/stamp_verifier.py:434-483`)**:
    Morphological ellipse closing and `cv2.findContours` filter out page-spanning bounding boxes (>85% width/height) and cluster stamp ink by circularity, aspect ratio, and area.
11. **ML-11 (`backend/app/modules/biometrics/liveness_detector.py:85-88`)**:
    `is_model_loaded` property returns `self.session_2_7x is not None or self.session_4_0x is not None`. Evaluates to `False` when weights are missing.
12. **ML-12 (`backend/app/api/routers/models.py:160-186`)**:
    Removed `or True` masks on `paddle_ocrv4`, `doctamper_trufor`, and default return. Deep models verify session/path existence; pure algorithmic engines legitimately return `True`.
13. **ML-13 (`backend/app/modules/forensics/ela_engine.py:208-238`)**:
    Replaced deprecated `diff.getdata()` with `np.asarray(diff, dtype=np.float32)`. Zero deprecation warnings emitted.
14. **ML-14 (`backend/app/modules/forensics/ela_engine.py:205-206, 250-251`)**:
    `diff_scaled = ImageEnhance.Brightness(diff).enhance(scale_factor)` aligns visual scaling directly with metric amplification (`s = 20.0`).
15. **ML-15 (`backend/app/modules/forensics/photo_splicing_detector.py:243-266`)**:
    4-direction candidate search (right, left, above, below) for substrate sampling. If all unavailable, returns `r_noise = 0.0, noise_tamper_flag = False` instead of division-by-zero.
16. **ML-16 (`backend/app/modules/ocr/qr_decoder.py:258-282`)**:
    Fallback logic uses `elif int_bytes is not None: payload_bytes = int_bytes`, preventing raw ASCII decimal string slicing.
17. **ML-17 (`backend/app/modules/biometrics/face_detector.py:561-567`)**:
    `cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)` converts OpenCV BGR buffers to RGB before SCRFD-10GF neural tensor normalization.
18. **ML-18 (`backend/app/modules/ocr/pp_ocr_engine.py:268, 560-563`)**:
    Lazy caching via `self._easyocr_reader = easyocr.Reader(["en", "hi"], ...)` prevents 2–4s re-instantiation per request.
19. **ML-19 (`backend/app/modules/biometrics/face_matcher.py:80-125`)**:
    Piecewise calibration branches on `model_type`: dedicated AdaFace curve (0.40–0.75 cosine range) vs SFace curve.
20. **ML-20 (`backend/app/api/routers/scan.py:352-368`)**:
    Replaced static `2026-08-20` with `today = datetime.now().date()` and `permit_window=(f"{year}-01-01", f"{year}-12-31")`.

### Test Execution Observations:
- `.venv311/bin/pytest tests/test_risk_engine.py`: **23/23 tests PASSED (100%)**.
- `.venv311/bin/pytest tests/test_models.py`: **5/5 tests PASSED (100%)**.
- `.venv311/bin/pytest tests/test_cross_validation.py`: **14/14 tests PASSED (100%)**.
- `.venv311/bin/pytest tests/test_mrz_checksum.py`: **15/15 tests PASSED (100%)**.
- `.venv311/bin/pytest tests/test_forensics.py`: **29/29 tests PASSED (100%)**.
- `.venv311/bin/pytest tests/test_biometrics.py`: **21/23 tests PASSED**.
  - 2 legacy test failures observed:
    1. `test_face_detector_with_png_payload` line 268: `assert result.faces_found >= 1` failed (`0 >= 1`) because the test expects invalid dummy PNG bytes to produce a hallucinated face (the pre-remediation ML-04 behavior).
    2. `test_face_matcher_embedding_and_match` line 292: `assert match_res.apparent_age_id is not None` failed (`None is not None`) because the test expects apparent age to be populated (the pre-remediation ML-09 fake age behavior).

---

## 2. Logic Chain

1. **Premise**: In an automated border control / document screening gateway, algorithmic false alarms on authentic documents directly lock travelers out via TRIPWIRE alerts (e.g. TRIPWIRE_1 on MRZ, TRIPWIRE_2 on Aadhaar PKI), while algorithmic deadbands allow forged documents to bypass inspection.
2. **Observation Step 1**: All 20 ML bug remediations have been implemented in the active codebase files in `backend/app/modules/` and routers `scan.py` and `models.py`.
3. **Observation Step 2**: Execution of the risk engine (`test_risk_engine.py`), models router (`test_models.py`), MRZ engine (`test_mrz_checksum.py`), forensics suite (`test_forensics.py`), and cross-validator (`test_cross_validation.py`) yielded 100% pass rates across 86 core test cases.
4. **Observation Step 3**: The only 2 test failures in `test_biometrics.py` originate from test assertions that codified the old buggy behaviors:
   - Test 1 asserted that unparseable bytes hallucinate a detected face (ML-04).
   - Test 2 asserted that face matcher outputs an apparent age integer (ML-09).
5. **Deduction**: The core ML/algorithmic modules are structurally sound, performant, and correctly aligned with the master bug specification. Test suite assertions in `test_biometrics.py` must be aligned with the remediated reality.

---

## 3. Caveats

1. **Hardware / Weights Availability**: Heavy neural weights (`scrfd_10gf.onnx`, `adaface_ir100_ms1mv2.onnx`, `2.7_80x80_MiniFASNetV2.onnx`, `doctamper.onnx`) may not be pre-downloaded in CPU-only development environments. The pipeline was tested and confirmed operational in fallback mode.
2. **Test File Adjustments**: Because this explorer is strictly read-only, no modifications were made to `tests/test_biometrics.py` to fix lines 268 and 292; this task is documented for the implementer/challenger agent.
3. **Scope Boundary**: Frontend TypeScript types (`FE-01: calibrated_confidence`) and Android companion models (`AND-01 to AND-12`) are outside the ML module scope and are tracked in client explorer reports.

---

## 4. Conclusion

All 20 Machine Learning and Algorithmic defects (ML-01 through ML-20) are fully analyzed, mapped to exact current file locations and line numbers, and documented in detail in `survey_report.md`.
The implementation logic in `sih26188_project/backend/app/` adheres to ICAO Doc 9303 specifications, ISO date standards, secure deserialization rules, spatial contour clustering, and multi-model piecewise confidence calibration.
Two legacy assertions in `tests/test_biometrics.py` (lines 268 and 292) must be adjusted to reflect ML-04 (no face hallucination on corrupt payloads) and ML-09 (apparent age is None without dedicated model).

---

## 5. Verification Method

To independently verify all findings and reproduce test results:

1. **MRZ Engine & Checksum Verification**:
   ```bash
   cd sih26188_project/backend
   .venv311/bin/pytest tests/test_mrz_checksum.py -v
   ```
   *Expected: 15 passed in ~0.2s.*

2. **Cross-Validation Matrix & Date Parsing**:
   ```bash
   .venv311/bin/pytest tests/test_cross_validation.py -v
   ```
   *Expected: 14 passed in ~0.3s.*

3. **Forensics, Stamp Verifier & ELA Engine**:
   ```bash
   .venv311/bin/pytest tests/test_forensics.py -v
   ```
   *Expected: 29 passed in ~0.8s.*

4. **Risk Engine Hard Tripwires & Bayesian Fusion**:
   ```bash
   .venv311/bin/pytest tests/test_risk_engine.py -v
   ```
   *Expected: 23 passed in ~106s.*

5. **Models Status & Diagnostic Router**:
   ```bash
   .venv311/bin/pytest tests/test_models.py -v
   ```
   *Expected: 5 passed in ~0.8s.*

6. **Biometrics Diagnostics & Legacy Assertion Demonstration**:
   ```bash
   .venv311/bin/pytest tests/test_biometrics.py -v
   ```
   *Expected: 21 passed, 2 failed at lines 268 (ML-04) and 292 (ML-09).*
