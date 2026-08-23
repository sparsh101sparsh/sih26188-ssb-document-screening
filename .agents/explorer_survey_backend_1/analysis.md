# Backend & Integration Specialist Survey Report
**Project**: SSB / SSF Field Identity & Document Screening System  
**Date**: 2026-08-23  
**Status**: Comprehensive Survey Completed  
**Author**: Explorer 3 (Backend & Integration Specialist)  

---

## 1. Backend Architecture & Location Inventory

### 1.1 Directory & Codebase Layout
- **Backend Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend`
- **Application Core**: `sih26188_project/backend/app/`
  - `main.py`: FastAPI application entry point, lifespan initialization, CORS, `track_device_activity_middleware`, `/health`, `/api/v1/health`, `/api/v1/devices`, and `/api/v1/inspect` alias route.
  - `core/`:
    - `config.py`: Application settings (`HOST = "0.0.0.0"`, `PORT = 8000`, thresholds $\tau_{adapt}=0.18$, $\tau_{face}=0.35$, $\tau_{live}=0.85$).
    - `backend_selector.py`: Hardware acceleration detection (MPS, CoreML, CUDA, CPU ONNX runtime).
    - `device_tracker.py`: Thread-safe active device registry (`DeviceTracker`).
    - `logging.py`: Structured JSON logger configuration.
  - `api/routers/`:
    - `scan.py`: Master inspection router (`POST /api/v1/scan/inspect`, `GET /api/v1/scan/status`).
    - `ocr.py`: Modality OCR endpoints (`/api/v1/ocr/extract`, `/api/v1/ocr/qr/decode`).
    - `biometrics.py`: Biometrics endpoints (`/api/v1/biometrics/detect`, `/api/v1/biometrics/match`, `/api/v1/biometrics/liveness`).
    - `forensics.py`: Forensics endpoints (`/api/v1/forensics/analyze`, `/api/v1/forensics/stamp/verify`, `/api/v1/forensics/ela`).
  - `modules/`:
    - `ocr/`: `pp_ocr_engine.py` (PP-OCRv4 ONNX), `qr_decoder.py` (ZXing/PyLibDMTX + RSA-2048 PKI validator).
    - `biometrics/`: `face_detector.py` (SCRFD-10GF), `face_matcher.py` (AdaFace-ResNet100 + apparent age), `liveness_detector.py` (MiniFASNetV2-SE dual-scale).
    - `forensics/`: `tamper_detector.py` (DocTamper DTD + TruFor + Turbo heatmap overlay), `ela_engine.py` (classical ELA), `metadata_parser.py` (EXIF/DQT quantization).
    - `stamp_verifier.py`: 4-stage SSB border stamp matcher (ORB keypoints + SSIM).
    - `mrz/`: `mrz_engine.py` (ICAO Doc 9303 Modulo-10 checksum parser), `cross_validator.py` (8-rule deterministic cross-validation matrix).
    - `risk_engine/`: `risk_scorer.py` (Two-stage hybrid risk engine: Stage 1 Hard Tripwires + Stage 2 Bayesian Log-Odds Fusion).
  - `schemas/`: Pydantic v2 schemas (`scan.py`, `risk.py`, `biometrics.py`, `forensics.py`, `mrz.py`, `ocr.py`, `stamp.py`, `screening.py`).
  - `tests/`: Pytest test suite (11 test files, 242 test cases).

---

## 2. Python Environment & Test Execution Verification

### 2.1 Virtual Environment Setup
- **Python Version**: CPython 3.11.16 (`/opt/homebrew/opt/python@3.11/bin/python3.11`)
- **Virtual Environment Path**: `sih26188_project/backend/.venv311`
- **Installed Packages**:
  - `pytest==9.1.1`, `pytest-asyncio==1.4.0`
  - `fastapi==0.141.1`, `pydantic==2.13.4`, `pydantic-settings==2.15.0`
  - `python-multipart==0.0.32`, `httpx==0.28.1`
  - `pillow==12.3.0`, `scikit-image==0.26.0`, `scipy==1.17.1`, `numpy==2.4.6`
  - `opencv-python-headless==5.0.0.93`
  - `cryptography==50.0.0`, `rsa==4.9.1`, `pyopenssl==26.4.0`

### 2.2 Pytest Execution & Test Coverage
- **Execution Command**:
  ```bash
  cd sih26188_project/backend
  .venv311/bin/pytest tests/
  ```
- **Test Results**:
  ```
  ====================== 242 passed, 31 warnings in 44.34s =======================
  ```
- **Test File Breakdown**:
  | Test File | Test Count | Key Scenarios Covered |
  |---|---|---|
  | `test_api_health.py` | 13 | GET /health, GET /api/v1/health, GET /api/v1/devices, POST /api/v1/inspect alias, invalid payload rejection |
  | `test_biometrics.py` | 23 | Umeyama 5-point alignment, 1:1 Cosine similarity, $\psi_{face}$ and $\psi_{live}$ deadbands, SCRFD detector, AdaFace matcher, MiniFASNet PAD |
  | `test_challenger_m1.py` | 14 | Kotlin Moshi schema compatibility, multipart fields (`document_image`, `live_photo`, `checkpoint_id`, `transit_date`), fuzzing & edge cases |
  | `test_challenger_m1_stress.py` | 89 | Concurrency, payload stress testing, unusual characters, boundary values |
  | `test_challenger_m4_m5_backend.py` | 11 | DeviceTracker unit mechanics, `X-Forwarded-For`/`X-Real-IP` IP resolution, Qwen-VL/OmniMRZ stubs, `HOST="0.0.0.0"` config |
  | `test_cross_validation.py` | 14 | All 8 cross-validation rules (CV-01 through CV-08) under clean & adversarial/tampered inputs |
  | `test_e2e_pipeline.py` | 11 | 6 End-to-end multi-stream scenarios: Clean passport (2.0 GREEN), Forged Aadhaar (RED), Tampered stamp (AMBER), Screen replay spoof (RED), TD1/TD2/TD3 MRZ |
  | `test_forensics.py` | 29 | DocTamper DTD, TruFor splicing, Turbo heatmap overlay, ELA, EXIF/DQT quantization, stamp verifier |
  | `test_mrz_checksum.py` | 15 | ICAO Doc 9303 7-3-1 weighting, Modulo-10 checksums on CD1, CD2, CD3, CD4, composite |
  | `test_risk_engine.py` | 23 | Stage 1 Hard Tripwires (1-6), Stage 2 Bayesian log-odds decomposition, zero-false-positive property, multi-threat compounding |

---

## 3. Data Flow & Metric Calculation Analysis

### 3.1 3-Stream Concurrency Flow
1. Client uploads `document_image` (required) and `live_face_image` / `live_photo` (optional) via multipart form.
2. An ephemeral SHA-256 audit hash is generated over image payloads and UUID session ID.
3. Concurrently dispatches 3 worker threads via `asyncio.gather`:
   - **Stream 1**: `_execute_stream_1_text_and_mrz` $\to$ `(OCRResult, MRZResult, QRPayload)`
   - **Stream 2**: `_execute_stream_2_biometrics` $\to$ `(FaceMatchResult, LivenessResult, bbox, apparent_age)`
   - **Stream 3**: `_execute_stream_3_forensics_and_stamps` $\to$ `(ForensicsResult, StampResult)`
4. Evaluates `CrossValidator.validate_all` against 8 deterministic rules.
5. Evaluates `RiskScorer.evaluate` (Stage 1 Hard Tripwires $\to$ Stage 2 Bayesian Fusion).
6. Assembles `DocumentInspectResponse` returned to client.

### 3.2 Risk Engine & Threat Risk Level Calculation
- **Stage 1 Deterministic Hard Tripwires (Instant RED = 95.0)**:
  - `TRIPWIRE_1`: ICAO 9303 Checksum failure on critical digits (CD1, CD2, CD3, CD4, composite).
  - `TRIPWIRE_2`: Aadhaar RSA-2048 PKI QR digital signature verification failed / forged.
  - `TRIPWIRE_3`: TruFor splicing score $> 0.75$ or portrait tamper density $> 0.25$.
  - `TRIPWIRE_4`: MiniFASNet presentation attack detected (`is_live == False` or confidence $< 0.50$).
  - `TRIPWIRE_5`: Biometric face cosine similarity $< 0.20$ (severe facial mismatch).
  - `TRIPWIRE_6`: High-risk border security watchlist vector match (distance $< 0.28$).
- **Stage 2 Multi-Factor Log-Odds Bayesian Fusion**:
  - Prior: $\Lambda_0 = \ln(0.02 / 0.98) = -3.8918$
  - Continuous Noise Deadbands:
    - $\psi_{tamper}(s) = \max(0.0, s - 0.18)$
    - $\psi_{live}(s) = \max(0.0, 0.85 - s)$
    - $\psi_{stamp}(s) = \max(0.0, s - 0.20)$
    - $\psi_{face}(s) = \max(0.0, 0.70 - s)$
  - Posterior: $\Lambda_{post} = \Lambda_0 + \sum \Delta$
  - Threat Risk Level: $\text{RiskScore} = \frac{100.0}{1.0 + e^{-\Lambda_{post}}}$
  - **Decision Tiers**:
    - **GREEN (0 - 30)**: Low Risk, Auto-Clear Pass (Clean baseline = 2.0).
    - **AMBER (31 - 69)**: Moderate Risk, Secondary Officer Inspection Required.
    - **RED (70 - 100)**: Critical Threat, Detain & Interdict Mandate.

---

## 4. Operational Bullet Points: Generation & Derivation

### 4.1 Backend Generated Explanations (`assessment.reasons`)
The backend `RiskScorer` synthesizes explanatory bullet strings directly into `assessment.reasons`:
- **Tripwire Alerts**: e.g., `"[CRITICAL TRIPWIRE] TRIPWIRE_1: ICAO Doc 9303 MRZ Checksum Failure (Document Number CD1 failed)"`
- **Cross-Validation Discrepancies**: e.g., `"[CRITICAL VIOLATION] CV-01: Document Date of Birth mismatch (+3.50 log-odds)"`, `"[CRITICAL VIOLATION] CV-02: Document Serial Number alteration (+4.00 log-odds)"`
- **Biometric Observations**: e.g., `"[WARNING] Facial biometric similarity (0.45) below 0.70 deadband (+0.88 log-odds)"`, `"[INFO] Facial biometric verification confirmed (Similarity=0.88 >= 0.70)"`
- **Forensics & Splicing**: e.g., `"[WARNING] TruFor splicing anomaly (0.40) exceeds 0.18 deadband (+0.70 log-odds)"`, `"[INFO] Forensic pixel tamper analysis clear. No splicing or inpainting detected."`
- **Decision Action**: e.g., `"[DECISION GREEN] Low Risk (2.0/100). Fast-path clearance authorized."`

### 4.2 Frontend / Client Derived Explanations
In addition to rendering `assessment.reasons`, the Web frontend and Android application derive specific, contextual operational bullet points from structured payload fields:
- **Discrepancy Inspector (`DiffTable.tsx` & `DiscrepancyDiffTable.kt`)**: compares `details.ocr.fields` vs `details.mrz.parsed_fields` vs `details.ocr.qr_payload.demographics` to generate specific field diff bullets (e.g. "Visual digit was altered; MRZ Modulo-10 7-3-1 check digit CD1 confirms genuine sequence").
- **Forensic Regions (`ForensicsViewer.tsx`)**: maps `details.forensics.tampered_regions` bounding boxes to document fields (e.g. "Portrait photo shows signs of replacement in ID window", "Text scraping detected in DOB field").
- **Cross-Validation Matrix (`FilterTable.tsx` & `CrossValidationMatrix.kt`)**: maps `details.cross_validation.flags` and `violations` to plain-text operational descriptions.

---

## 5. Metric Rename & Schema Coordination Matrix

| Operational Language Requirement (R1) | Existing REST API Schema Field (Backend / Kotlin / TypeScript) | Action / Layer Responsible | Rationale / Coordination Strategy |
|---|---|---|---|
| **Threat Risk Level** ("Threat Level: X / 100", GREEN/AMBER/RED) | `assessment.risk_score` (Double), `assessment.risk_level` (String) | **UI Presentation Layer** (Compose & React) | Keep REST key `risk_score` to prevent breaking Kotlin Moshi & TypeScript deserialization; format as "Threat Risk Level: X / 100" in UI. |
| **Critical Verification Trigger** (Instant RED Override) | `assessment.tripwire_triggered` (Boolean), `assessment.tripwire_codes` (List[String]) | **UI Presentation Layer** | Replace "Stage 1 Hard Tripwire" label in UI with "Critical Verification Trigger". |
| **Face Match Confidence** | `details.biometrics.similarity` (Double), `details.biometrics.match` (Boolean) | **UI Presentation Layer** | Convert similarity float (0.0 to 1.0) to percentage "XX%" labeled "Face Match Confidence". |
| **Selfie Liveness Check** | `details.liveness.is_live` (Boolean), `details.liveness.confidence` (Double) | **UI Presentation Layer** | Replace "Anti-Spoofing / MiniFASNet" technical labels with "Selfie Liveness Check: Verified / Spoof Detected". |
| **Age Validation** | `details.biometrics.apparent_age_id` (Int), `details.biometrics.apparent_age_live` (Int), `age_drift_years` (Int) | **UI Presentation Layer** | Group into "Age Validation: Document X yrs / Live Y yrs (Drift: Z yrs)" in collapsed technical accordion. |
| **Screening Duration: X.X seconds** | `assessment.processing_time_ms` (Double) | **UI Presentation Layer** | Compute `(processing_time_ms / 1000).toFixed(1) + " seconds"` on main view; hide individual sub-second model latencies in collapsed accordion. |
| **Technical Jargon Removal** (`PP-OCRv4`, `AdaFace`, `MiniFASNet`, `DocTamper`, `TruFor`, `ELA`) | `model_versions`, `details.*.embedding_model_used` | **UI Presentation & Backend Reasons** | Replace technical model names on primary dashboard with plain-text operational descriptions; keep technical model names in Level 3 Advanced Audit Accordion. |

---

## 6. Test Suite Safety & Assertion Dependency Audit

### 6.1 Structured vs String Assertions in Backend Tests
- **Strict Structured Code Assertions** (MUST NOT CHANGE SCHEMA KEYS):
  - `test_challenger_m1.py`: Asserts exact existence and types of all Kotlin Moshi model keys in `DocumentInspectResponse`, `Assessment`, `InspectionDetails`, `HealthResponse`, `ModelsLoadedMap`.
  - `test_api_health.py`: Asserts exact keys in `/health`, `/api/v1/health`, `/api/v1/devices`.
  - `test_cross_validation.py`: Asserts on deterministic telemetry codes (`ERR_DOB_MISMATCH`, `ERR_DOCNO_ALTER`, `WRN_NAME_SPELL`, `WRN_AGE_ANOMALY`, `ERR_PHOTO_SPLICE`, `ERR_TEXT_FORGERY`, `WRN_STAMP_EXPIRY`, `ERR_PKI_FORGED`) and rule IDs (`CV-01` through `CV-08`).
  - `test_risk_engine.py`: Asserts on enum codes in `tripwire_codes` (`TRIPWIRE_1` through `TRIPWIRE_6`).
- **String Substring Assertions in Tests**:
  - `test_risk_engine.py` line 134: `assert any("TRIPWIRE_1" in reason for reason in assessment.reasons)`
  - `test_e2e_pipeline.py` line 299: `assert "TRIPWIRE_2" in reasons_str or "RSA" in reasons_str or "PKI" in reasons_str`
  - `test_e2e_pipeline.py` line 403: `assert "Stamp" in reasons_str or "seal" in reasons_str or "stamp" in reasons_str.lower()`
  - `test_e2e_pipeline.py` line 494: `assert "TRIPWIRE_4" in reasons_str or "Spoof" in reasons_str or "spoof" in reasons_str.lower()`

### 6.2 Safe Modification Guidelines
1. **Never rename backend REST JSON keys**: `risk_score`, `risk_level`, `tripwire_triggered`, `tripwire_codes`, `similarity`, `is_live`, `processing_time_ms`, `cross_validation_violations`, etc. must remain unchanged.
2. **Preserve keyword tokens in backend reasons**: If refining reason strings in `risk_scorer.py`, ensure they retain essential substring identifiers (`TRIPWIRE_1`, `TRIPWIRE_2`, `TRIPWIRE_3`, `TRIPWIRE_4`, `TRIPWIRE_5`, `TRIPWIRE_6`, `CV-01`, `CV-02`, `Stamp`, `PKI`, `Spoof`).
3. **Keep Telemetry Codes Intact**: `ERR_DOB_MISMATCH`, `ERR_DOCNO_ALTER`, etc., are machine codes consumed by automated rules and tested in unit tests.
4. **All UI Re-labeling should be executed in Frontend (React/TypeScript) and Android (Jetpack Compose)**.
