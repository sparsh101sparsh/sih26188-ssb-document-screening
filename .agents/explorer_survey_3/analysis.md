# Deep Survey & Analysis: Backend Contracts, Pytest Suite, & Tauri Desktop Build Architecture

**Author**: Explorer 3 (Survey: Backend Contracts & Tauri Build Analyzer)  
**Date**: 2026-08-23  
**Target Repository**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/`

---

## Executive Summary

This investigation analyzed the backend test suite, Pydantic v2 schemas and REST endpoint contracts, and the macOS Tauri 2.0 desktop packaging configuration for Project SIH26188.

**Key Findings:**
1. **Pytest Test Suite (121 Tests passing in ~3.6s)**: Complete test coverage across 7 test modules testing health telemetry, biometric alignment & matching, 8-rule cross-validation matrix, 6 E2E scenarios, classical & deep forensics, ICAO Doc 9303 Modulo-10 checksums, and two-stage hybrid Bayesian risk scoring with continuous deadbands.
2. **Pydantic API Contracts & Frontend Type Alignment**:
   - High degree of structural fidelity between `backend/app/schemas/` and `frontend/src/types/api.ts`.
   - **Critical Integration Finding**: `POST /api/v1/scan/inspect` in FastAPI router `scan.py` expects multipart form fields `document_image` and `live_face_image`, whereas `frontend/src/services/api.ts` was passing `document_file` and `live_photo_file`. This parameter naming discrepancy must be matched to prevent HTTP 422 Unprocessable Entity errors during real live scans.
3. **Tauri Desktop Build & Packaging**:
   - Tauri v2.0 application (`src-tauri/`) configured with `productName: "SSB Screening"`, `identifier: "gov.mha.ssb.screening"`, and macOS bundle targets (`.app`).
   - Official `ssb.webp` source icon located at `/Users/iamsparsh00321/Downloads/ssb.webp` (554x554 RGBA) and mirrored at `frontend/public/ssb.png`.
   - `cargo-tauri` 2.11.4 is installed at `~/.cargo/bin/cargo-tauri`. `src-tauri/icons/` already contains generated `32x32.png`, `128x128.png`, `128x128@2x.png`, `256x256.png`, `512x512.png`, `1024x1024.png`, and `icon.icns` (2.59 MB).
   - Bundled output verified at `src-tauri/target/release/bundle/macos/SSB Screening.app` with `Contents/Info.plist` and `Contents/Resources/icon.icns`.

---

## 1. Backend Test Suite Architecture & Verification (`backend/tests/`)

### 1.1 Running Conventions & Environment
- **Virtual Environment**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/.venv311` (Python 3.11.14)
- **Execution Command**:
  ```bash
  source sih26188_project/.venv311/bin/activate
  cd sih26188_project/backend
  pytest -v
  ```
- **Dependencies**: `pytest==8.3.4`, `pytest-asyncio==0.25.0`, `httpx==0.28.1`, `fastapi.testclient.TestClient`.
- **Test Result**: `121 passed, 32 warnings in 3.64s`.

### 1.2 Breakdown of the 121 Tests Across 7 Modules

| Test File | Test Count | Scope & Key Behaviors Verified |
|---|---|---|
| `test_api_health.py` | 6 | `/health`, `/api/v1/health`, valid image scan, scan with live selfie, invalid MIME type rejection (400), corrupted payload rejection (<100 bytes). |
| `test_biometrics.py` | 23 | Umeyama 5-point canonical affine transform & rotation recovery, cosine similarity & L2 normalization, facial deadband math ($\psi_{\text{face}}(s) = \max(0, 0.70-s)$), liveness deadband math ($\psi_{\text{live}}(s) = \max(0, 0.85-s)$), SCRFD face detector, AdaFace 512-D matcher, MiniFASNetV2-SE anti-spoofing, and `/api/v1/biometrics/` endpoints (`/status`, `/detect`, `/liveness`, `/match`). |
| `test_cross_validation.py` | 14 | String/date helpers (Levenshtein distance, token sort ratio, YYMMDD parser, age calculation), clean baseline passing all 8 rules, individual failure tests for CV-01 through CV-08, and compounding multi-threat scenario. |
| `test_e2e_pipeline.py` | 11 | 6 realistic border screening scenarios through `POST /api/v1/scan/inspect`: Authentic Clean Passport (Score 2.0 GREEN auto-clear), Forged Aadhaar with scraped DOB and invalid RSA PKI (Instant RED Tripwire 2), Tampered Border Stamp (AMBER 35-65), Presentation Replay Spoof (Instant RED Tripwire 4), Multi-format MRZ flows (TD1, TD2, TD3 checksum failure Tripwire 1), and Robustness/SLA tests (missing doc 422, invalid MIME 400, empty payload 400, SHA-256 audit hash uniqueness). |
| `test_forensics.py` | 29 | Classical ELA engine (JPEG Q90 20x error calculation), EXIF & DQT metadata parser (APP13 Photoshop segment, GIMP signatures, flat DQT tables), DocForge adaptive threshold ($\tau_{\text{adapt}} = 0.18$), tamper deadband $\psi_{\text{tamper}}(s)$, Turbo colormap LUT & 55% alpha overlay, TamperDetector, HSV stamp ink detection, SSIM template matching, stamp deadband $\psi_{\text{stamp}}(s)$, StampVerifier authentic/mismatch/expired cases, and `/api/v1/forensics/` endpoints (`/analyze`, `/stamp`, `/ela`). |
| `test_mrz_checksum.py` | 15 | Pure Python ICAO Doc 9303 Modulo-10 (7-3-1) checksum calculator, character mapping (0-9 $\to$ 0-9, A-Z $\to$ 10-35, `<` $\to$ 0), TD3 Passport parsing & CD1/CD2/CD3/composite corruption tests, TD1 ID card parsing, TD2 travel document parsing, single-string parsing, and edge cases. |
| `test_risk_engine.py` | 23 | Noise deadbands for scanner/substrate noise filtering, normalized name Levenshtein similarity, sigmoid log-odds numerical stability, Stage 1 Hard Tripwires 1-6 forcing Instant RED (95.0), Stage 2 Multi-Factor Log-Odds Bayesian Fusion, and `/api/v1/scan/` master endpoint integration. |
| **Total** | **121** | **100% Passing** |

---

## 2. Pydantic Models & API Contracts (`backend/app/schemas/`)

### 2.1 Master Scan Endpoint: `POST /api/v1/scan/inspect`
Defined in `backend/app/api/routers/scan.py` lines 225–367:
- **HTTP Method & Path**: `POST /api/v1/scan/inspect`
- **Request Format**: `multipart/form-data`
  - `document_image`: `UploadFile` (Required) — Target document image (JPEG/PNG)
  - `live_face_image`: `UploadFile` (Optional) — Live traveler selfie (JPEG/PNG)
- **Response Model**: `DocumentInspectResponse` (`backend/app/schemas/scan.py`):
  ```python
  class DocumentInspectResponse(BaseModel):
      session_id: str
      status: str = "completed"
      assessment: RiskAssessment
      details: Optional[ScanResponse] = None
  ```

### 2.2 Complete Schema Hierarchy

```
DocumentInspectResponse
├── session_id: str
├── status: str ("completed")
├── assessment: RiskAssessment
│   ├── risk_score: float (0.0 - 100.0)
│   ├── risk_level: RiskLevel ("GREEN" | "AMBER" | "RED")
│   ├── auto_clear: bool
│   ├── tripwire_triggered: bool
│   ├── tripwire_codes: List[str]
│   ├── reasons: List[str]
│   ├── cross_validation_violations: List[str]
│   ├── heatmap_url: Optional[str]
│   ├── heatmap_base64: Optional[str]
│   ├── score_breakdown: Optional[RiskScoreBreakdown]
│   │   ├── base_prior_log_odds: float (-3.8918)
│   │   ├── tamper_log_odds_delta: float
│   │   ├── face_log_odds_delta: float
│   │   ├── mrz_log_odds_delta: float
│   │   ├── cross_val_log_odds_delta: float
│   │   ├── stamp_log_odds_delta: float
│   │   ├── metadata_log_odds_delta: float
│   │   ├── posterior_log_odds: float
│   │   └── raw_posterior_probability: float
│   ├── model_versions: Dict[str, str]
│   ├── processing_time_ms: float
│   └── audit_hash: Optional[str] (64-char SHA-256 hex)
└── details: Optional[ScanResponse]
    ├── session_id: str
    ├── document_type: str ("aadhaar" | "passport" | "voter_id" | "citizenship" | "pan" | "unknown")
    ├── ocr: OCRResult
    │   ├── status: str ("success" | "low_confidence" | "unavailable" | "failed")
    │   ├── script_detected: str ("latin" | "devanagari" | "mixed" | "unknown")
    │   ├── fields: Dict[str, str]
    │   ├── field_confidences: Dict[str, float]
    │   ├── raw_boxes: List[OCRBox] (text, confidence, polygon, bbox)
    │   ├── mean_confidence: float
    │   ├── requires_tier2_vlm: bool
    │   ├── raw_text: str
    │   ├── qr_payload: Optional[QRPayload]
    │   │   ├── raw_qr_found: bool
    │   │   ├── qr_type: Optional[str] ("AADHAAR_SECURE_V2" | etc.)
    │   │   ├── signature_valid: bool
    │   │   ├── signature_algorithm: Optional[str]
    │   │   ├── demographics: Dict[str, Any]
    │   │   ├── photo_jp2_extracted: bool
    │   │   └── error_message: Optional[str]
    │   └── processing_time_ms: float
    ├── mrz: MRZResult
    │   ├── mrz_detected: bool
    │   ├── mrz_type: Optional[str] ("TD1" | "TD2" | "TD3")
    │   ├── valid: bool
    │   ├── raw_lines: List[str]
    │   ├── document_type: Optional[str]
    │   ├── country_code: Optional[str]
    │   ├── surname: Optional[str]
    │   ├── given_names: Optional[str]
    │   ├── document_number: Optional[str]
    │   ├── doc_number_checksum_valid: Optional[bool]
    │   ├── nationality: Optional[str]
    │   ├── dob: Optional[str]
    │   ├── dob_checksum_valid: Optional[bool]
    │   ├── sex: Optional[str]
    │   ├── expiry: Optional[str]
    │   ├── expiry_checksum_valid: Optional[bool]
    │   ├── optional_data: Optional[str]
    │   ├── optional_data_checksum_valid: Optional[bool]
    │   ├── composite_checksum_valid: Optional[bool]
    │   ├── checksum_failures: List[str]
    │   ├── parsed_fields: Dict[str, Any]
    │   └── processing_time_ms: float
    ├── biometrics: Optional[FaceMatchResult]
    │   ├── similarity: float (-1.0 to 1.0)
    │   ├── match: bool
    │   ├── threshold: float (0.35)
    │   ├── embedding_model_used: str
    │   ├── apparent_age_id: Optional[int]
    │   ├── apparent_age_live: Optional[int]
    │   ├── age_drift_years: Optional[int]
    │   ├── watchlist_hit: bool
    │   ├── watchlist_distance: Optional[float]
    │   └── processing_time_ms: float
    ├── liveness: Optional[LivenessResult]
    │   ├── is_live: bool
    │   ├── confidence: float (0.0 to 1.0)
    │   ├── attack_type: Optional[str]
    │   ├── score_2_7x: Optional[float]
    │   ├── score_4_0x: Optional[float]
    │   ├── fourier_anomaly_score: Optional[float]
    │   └── processing_time_ms: float
    ├── forensics: ForensicsResult
    │   ├── tamper_score: float (0.0 to 1.0)
    │   ├── is_tampered: bool (>= 0.18)
    │   ├── photo_region_tampered: bool
    │   ├── heatmap_base64: Optional[str]
    │   ├── reasons: List[str]
    │   ├── detected_anomalies: List[str]
    │   ├── tampered_regions: List[TamperRegion] (bbox, peak_tamper_probability, tamper_type, affected_field)
    │   ├── doctamper_score: float
    │   ├── trufor_score: float
    │   ├── ela_result: Optional[ELAResult] (max_intensity, mean_intensity, photo_area_anomaly)
    │   ├── exif_suspicious: bool
    │   ├── dqt_quantization_altered: bool
    │   └── processing_time_ms: float
    ├── stamp: Optional[StampResult]
    │   ├── stamp_found: bool
    │   ├── stamp_score: float (0.0 to 1.0)
    │   ├── verdict: str ("AUTHENTIC" | "SUSPICIOUS" | "FORGED" | "NOT_FOUND")
    │   ├── checkpost_id: Optional[str]
    │   ├── location_name: Optional[str]
    │   ├── ssim_score: Optional[float]
    │   ├── orb_match_count: Optional[int]
    │   ├── tamper_energy: Optional[float]
    │   ├── context_consistent: Optional[bool]
    │   ├── stamp_bbox: Optional[List[int]]
    │   ├── reasons: List[str]
    │   └── processing_time_ms: float
    ├── cross_validation: CrossValidationResult
    │   ├── cross_validation_passed: bool
    │   ├── violation_count: int
    │   ├── critical_violations: List[CrossViolation]
    │   ├── warnings: List[CrossViolation]
    │   ├── violations: List[CrossViolation]
    │   ├── flags: List[CrossValidationFlag] (rule_id, rule_description, passed, telemetry_message)
    │   ├── rules_checked: int (8)
    │   └── processing_time_ms: float
    ├── risk: RiskAssessment (same as above)
    └── processing_time_ms: float
```

### 2.3 Sub-Endpoints Specification

| Endpoint | Method | Input Parameters / Body | Response Schema | Description |
|---|---|---|---|---|
| `/health` | `GET` | None | Dict (`status`, `models_loaded`, `hardware`, `uptime_seconds`, etc.) | System telemetry & active model flags |
| `/api/v1/health` | `GET` | None | Dict (`status`, `engine_mode`, `models_loaded`, `uptime_seconds`) | Client/Tauri health contract |
| `/api/v1/scan/status` | `GET` | None | Dict (`status`, `streams`, `cross_validator`, `risk_engine`, `hardware`) | Telemetry for 3-stream orchestrator |
| `/api/v1/ocr/extract` | `POST` | Multipart `document_image` OR Form `raw_text` OR JSON `{"raw_text": "..."}` | `OCRResult` | Multi-script PP-OCRv4 + QR decoding |
| `/api/v1/mrz/validate` | `POST` | JSON `{"lines": [...]}` OR Form `line1`, `line2`, `line3` | `MRZResult` | ICAO 9303 Modulo-10 checksum validation |
| `/api/v1/qr/decode` | `POST` | Multipart `document_image` OR JSON `{"raw_payload": "..."}` | `QRPayload` | Aadhaar Secure QR RSA-2048 PKI decoding |
| `/api/v1/biometrics/detect` | `POST` | Multipart `image`, Query `conf_threshold=0.50` | `FaceDetectionResult` | SCRFD-10GF face detection & Umeyama crop |
| `/api/v1/biometrics/liveness` | `POST` | Multipart `face_image` | `LivenessResult` | MiniFASNetV2-SE passive anti-spoofing |
| `/api/v1/biometrics/match` | `POST` | Multipart `document_image`, `live_image`, Form `threshold=0.35`, `check_liveness=true` | `BiometricMatchResponse` | AdaFace 1:1 Cosine match + live PAD |
| `/api/v1/forensics/analyze` | `POST` | Multipart `document_image`, Form `ocr_boxes`, `photo_bbox` | `ForensicsResult` | DocTamper + TruFor + ELA + EXIF/DQT |
| `/api/v1/forensics/stamp` | `POST` | Multipart `document_image`, Form `declared_checkpost`, `declared_date`, `permit_expiry` | `StampResult` | 4-Stage SSB Stamp verification |
| `/api/v1/forensics/ela` | `POST` | Multipart `document_image`, Form `quality=90`, `scale=20.0` | `ELAResult` | Classical JPEG Error Level Analysis |

### 2.4 Frontend TypeScript Type Alignment Audit
- File: `sih26188_project/frontend/src/types/api.ts`
- **Audit Result**: All 18 interfaces and type definitions (`RiskLevel`, `RiskScoreBreakdown`, `RiskAssessment`, `OCRBox`, `QRPayload`, `OCRResult`, `MRZResult`, `CrossViolation`, `CrossValidationFlag`, `CrossValidationResult`, `FaceBBox`, `FaceDetectionResult`, `LivenessResult`, `FaceMatchResult`, `TamperRegion`, `ELAResult`, `ForensicsResult`, `StampResult`, `ScanResponse`, `DocumentInspectResponse`) 100% mirror the Pydantic v2 schemas.
- **Form Data Field Discrepancy Note**:
  - `backend/app/api/routers/scan.py`: `document_image`, `live_face_image`
  - `frontend/src/services/api.ts`: `document_file`, `live_photo_file`
  - *Recommendation*: Update `frontend/src/services/api.ts` to append `'document_image'` and `'live_face_image'` to align directly with FastAPI's parameter names.

---

## 3. Desktop Build & Packaging Configuration (`src-tauri/`)

### 3.1 Tauri Configuration (`src-tauri/tauri.conf.json`)
- **Schema**: Tauri v2 (`https://schema.tauri.app/config/2`)
- **Product Name**: `"SSB Screening"`
- **App Identifier**: `"gov.mha.ssb.screening"`
- **Version**: `"1.0.0"`
- **Build Hooks**:
  - `beforeBuildCommand`: `"npm --prefix ../frontend run build"`
  - `devUrl`: `"http://localhost:3000"`
  - `frontendDist`: `"../frontend/dist"`
- **Window Specs**:
  - Width: 1400, Height: 900 (minWidth: 1100, minHeight: 700)
  - Resizable, Centered
- **Bundle Specs**:
  - Targets: `["app"]`
  - Icons:
    - `"icons/32x32.png"`
    - `"icons/128x128.png"`
    - `"icons/128x128@2x.png"`
    - `"icons/icon.icns"`
  - macOS minimum system version: `"12.0"`

### 3.2 Cargo & Rust Dependencies (`src-tauri/Cargo.toml`)
- **Rust Edition**: `2021`
- **Dependencies**:
  - `tauri = { version = "2.0", features = [] }`
  - `serde = { version = "1", features = ["derive"] }`
  - `serde_json = "1"`
- **Build Dependencies**:
  - `tauri-build = { version = "2.0", features = [] }`

### 3.3 Icon Assets & Conversion
- **Source Icon Locations**:
  - `/Users/iamsparsh00321/Downloads/ssb.webp` (554x554 WebP, VP8 encoding)
  - `sih26188_project/frontend/public/ssb.png` (554x554 RGBA PNG)
- **Generated Icons in `src-tauri/icons/`**:
  - `32x32.png` (2.8 KB)
  - `128x128.png` (33.7 KB)
  - `128x128@2x.png` (33.7 KB)
  - `256x256.png` (116.3 KB)
  - `256x256@2x.png` (0.8 KB)
  - `512x512.png` (396.5 KB)
  - `1024x1024.png` (1.25 MB)
  - `icon.icns` (2.59 MB)
  - `icon.png` (436.3 KB)
- **Icon Regeneration Tool**:
  - Can be generated at any time via:
    ```bash
    cargo tauri icon /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend/public/ssb.png -o src-tauri/icons
    ```

### 3.4 Desktop Compilation & Verification
- **Compilation Command**:
  ```bash
  # From sih26188_project/
  npm --prefix frontend run build
  source ~/.cargo/env
  cargo-tauri build --project src-tauri
  # or from src-tauri/
  cargo tauri build
  ```
- **Built Artifact**:
  - Path: `sih26188_project/src-tauri/target/release/bundle/macos/SSB Screening.app`
  - Binary: `Contents/MacOS/ssb-screening`
  - Resource: `Contents/Resources/icon.icns`
  - Bundle Identifier: `gov.mha.ssb.screening` in `Contents/Info.plist`

---

## 4. Architectural Synthesis & Recommendations

1. **Test Suite Health**: All 121 tests pass out of the box in 3.64 seconds without external API dependencies, honoring the offline/air-gapped requirement.
2. **Form Data Alignment**: Update `frontend/src/services/api.ts` `inspectDocument()` to append `document_image` and `live_face_image` (matching `backend/app/api/routers/scan.py:233`).
3. **Tauri Sidecar / API Connectivity**: The Rust backend command `get_api_url()` defaults to `http://localhost:8000`. The frontend `.env.local` or fallback defaults to `http://localhost:8000`. Both align cleanly.
4. **Offline Resilience**: Both backend and frontend have comprehensive offline fallback mechanisms (synthetic/mock passes if model weights or server is offline, while full real pipelines run when weights/server are present).
