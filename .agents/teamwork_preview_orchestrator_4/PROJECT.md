# Project: SIH26188 SSB Edge Screening Gateway — 61 Defect Remediation

## Architecture
The system is an air-gapped sovereign border screening gateway with three primary operational sub-systems:
1. **Backend Core & Routers (`backend/app/`)**: FastAPI async gateway handling real-time inspection requests, camera companion pairing and telemetry, SSE broadcasting, SQLite verdict and capture storage, and multi-interface LAN binding.
2. **Machine Learning & Algorithmic Modules (`backend/app/modules/`)**: High-throughput forensic inference pipeline comprising:
   - OCR & Document parsing (Tesseract, PaddleOCR fallback, EasyOCR, QR decoders)
   - ICAO Doc 9303 MRZ parser and cross-validation rule engine (TD1, TD2, TD3)
   - Facial detection, alignment & matching (YuNet, SCRFD, AdaFace, SFace)
   - Anti-spoofing and liveness (MiniFASNet ONNX)
   - Visual document forensics, ELA analysis, copy-move/splicing detection, and stamp ink verification
   - Two-Stage Multi-Factor Risk Assessment Engine
3. **Clients**:
   - **Frontend Web/Desktop Client (`frontend/src/`)**: React 19 / TypeScript / Vite / Tailwind / Tauri desktop workstation dashboard with live companion polling, side-by-side biometric comparison, and operator verdict workflow.
   - **Android Companion App (`android-screening/`)**: Jetpack Compose / CameraX / Retrofit / Moshi / Room handheld mobile client with offline outbox, mDNS auto-discovery, SSBPAIR QR pairing, and 5-stage exponential backoff.

## Code Layout
- `backend/app/main.py`: Gateway lifecycle, telemetry, hardware engine mode reporting, reverse-tethered device tracking.
- `backend/app/core/`: `device_tracker.py` (thread-safe device tracking with RLock), `network.py` (LAN interface selection and routing table parsing).
- `backend/app/schemas/`: `scan.py`, `stamp.py`, `biometrics.py`, `mrz.py`, `screening.py` (API data transfer objects and Moshi-compatible schemas).
- `backend/app/api/routers/`: `biometrics.py`, `forensics.py`, `ocr.py`, `companion.py`, `scan.py`, `models.py`.
- `backend/app/modules/`: ML algorithms (`mrz/`, `biometrics/`, `forensics/`, `ocr/`, `stamp_verifier.py`).
- `frontend/src/`: `App.tsx`, `components/` (`Header.tsx`, `Dropzone.tsx`, `ModelDiagnosticsModal.tsx`), `services/api.ts`, `types/api.ts`.
- `android-screening/app/src/main/java/com/ssb/fieldscreening/`:
  - `models/InspectionModels.kt`: Moshi DTOs.
  - `viewmodels/SsbScreeningViewModel.kt`: Offline queuing and gateway connection logic.
  - `data/SsbRepository.kt`: Networking, retry loops, outbox sync.
  - `utils/WifiUtils.kt`: MulticastLock, discovery tiers.
  - `ui/DualCameraCaptureView.kt`, `QrScannerView.kt`: CameraX lifecycle and background thread dispatch.
  - `AndroidManifest.xml`, `res/xml/network_security_config.xml`: Network security and permissions.
- `backend/tests/`: Pytest suite (`conftest.py`, `test_challenger_m5_e2e_4tier.py`, `test_network_interface.py`, etc.).
- `android-screening/app/src/test/java/`: Unit tests (`RepositoryNetworkRobustnessTest.kt`).

## Feature Inventory (Master 61 Defects)
| # | Bug ID | Feature / Component | Description | Milestone | Source |
|---|--------|---------------------|-------------|-----------|--------|
| 1 | BE-01 | Backend Schemas | Nullable defaults for biometrics, liveness, stamp | M1 | bug_report.md |
| 2 | AND-01 | Android Deserialization | Moshi null-safety for optional scan objects | M1 | bug_report.md |
| 3 | BE-02 | Backend Schemas | Cross-validation warnings type consistency | M1 | bug_report.md |
| 4 | AND-02 | Android Deserialization | Moshi cross-validation warnings type consistency | M1 | bug_report.md |
| 5 | BE-03 | Backend Routers | Offload sync ML inference to asyncio.to_thread | M1 | bug_report.md |
| 6 | ML-01 | ML: MRZ Engine | Support TD3 filler '<' in CD4 checksum | M1 | bug_report.md |
| 7 | ML-02 | ML: Cross-Validator | Format-aware parsing in parse_date_to_yymmdd | M1 | bug_report.md |
| 8 | ML-03 | ML: Fraud Detection | Year extraction for hyphenated DD-MM-YYYY | M1 | bug_report.md |
| 9 | FE-02 | Frontend Network | Prepend API_BASE_URL to companion gallery, SSE, devices | M1 | bug_report.md |
| 10 | FE-03 | Frontend Sync | Max sequence ID in companion polling in App.tsx | M1 | bug_report.md |
| 11 | AND-04 | Android Outbox | Enqueue offline scans into Room outboxDao | M1 | bug_report.md |
| 12 | BE-04 | Backend Routers | Polyglot Form/JSON parsing in ocr.py | M2 | bug_report.md |
| 13 | BE-05 | Backend Core | RLock concurrency protection in DeviceTracker | M2 | bug_report.md |
| 14 | BE-06 | Backend Routers | Async disk reads & base64 in companion.py gallery | M2 | bug_report.md |
| 15 | BE-07 | Backend Core | Thread-safe SSEBroadcaster event loop scheduling | M2 | bug_report.md |
| 16 | BE-08 | Backend State | SQLite persistence for officer verdicts | M2 | bug_report.md |
| 17 | BE-09 | Backend Telemetry | Reverse-tethered 127.0.0.1 device tracking | M2 | bug_report.md |
| 18 | BE-10 | Backend Telemetry | Accurate hardware engine mode in health | M2 | bug_report.md |
| 19 | ML-04 | ML: Biometrics | Zero-byte image payload guard in face detector | M2 | bug_report.md |
| 20 | ML-05 | ML: Biometrics | PIL to OpenCV NumPy BGR conversion before YuNet | M2 | bug_report.md |
| 21 | ML-06 | ML: Forensics | weights_only=True in torch.load | M2 | bug_report.md |
| 22 | ML-07 | ML: Forensics | Fix text tampering probability clamping deadband | M2 | bug_report.md |
| 23 | ML-08 | ML: Cross-Validator | Centenary year pivot reference_year % 100 | M2 | bug_report.md |
| 24 | ML-09 | ML: Biometrics | Correct demographic apparent age heuristic | M2 | bug_report.md |
| 25 | ML-10 | ML: Stamp Verifier | Spatial contour/clustering for stamp ink pixels | M2 | bug_report.md |
| 26 | ML-11 | ML: Biometrics | is_model_loaded reflects actual ONNX session state | M2 | bug_report.md |
| 27 | FE-05 | Frontend Verdicts | Wire postScreeningVerdict in App.tsx | M2 | bug_report.md |
| 28 | AND-03 | Android Deserialization | Nullable expectedValue/actualValue in CriticalViolation | M2 | bug_report.md |
| 29 | AND-05 | Android Threading | Dispatch CameraX frame processing to background executor | M2 | bug_report.md |
| 30 | AND-06 | Android Lifecycle | cameraProvider.unbindAll() prior to shutdown in QrScannerView | M2 | bug_report.md |
| 31 | AND-07 | Android Discovery | Pass valid application context in SsbRepository | M2 | bug_report.md |
| 32 | BE-11 | Backend Schemas | Clean up unmounted schemas in screening.py | M3 | bug_report.md |
| 33 | BE-12 | Backend Ingestion | Monotonic sequence persistence across restarts | M3 | bug_report.md |
| 34 | BE-13 | Backend Networking | mDNS .local. hostname suffix deduplication | M3 | bug_report.md |
| 35 | BE-14 | Backend Networking | Routing table regex parsing robustness | M3 | bug_report.md |
| 36 | BE-15 | Backend Architecture | Dead unmounted router cleanup in api/v1/api.py | M3 | bug_report.md |
| 37 | BE-16 | Backend Architecture | Dedicated backend/app/services layer organization | M3 | bug_report.md |
| 38 | BE-17 | Backend Storage | Prune empty date directories on companion disk | M3 | bug_report.md |
| 39 | BE-18 | Backend HTTP | Return HTTP 201 Created on companion upload | M3 | bug_report.md |
| 40 | BE-19 | Backend Errors | Replace bare excepts with structured logging | M3 | bug_report.md |
| 41 | ML-12 | ML: Health Router | Remove 'or True' masks in models.py | M3 | bug_report.md |
| 42 | ML-13 | ML: Forensics | Replace deprecated Image.getdata() in ELA engine | M3 | bug_report.md |
| 43 | ML-14 | ML: Forensics | Align ELA visual map brightness scaling | M3 | bug_report.md |
| 44 | ML-15 | ML: Forensics | Photo border proximity division-by-zero fix | M3 | bug_report.md |
| 45 | ML-16 | ML: OCR/QR | Big-int decompression fallback demographic slicing | M3 | bug_report.md |
| 46 | ML-17 | ML: Biometrics | SCRFD face detector BGR-to-RGB channel order | M3 | bug_report.md |
| 47 | ML-18 | ML: OCR | Lazily cache EasyOCR reader in pp_ocr_engine.py | M3 | bug_report.md |
| 48 | ML-19 | ML: Biometrics | Confidence calibration curve selection for SFace | M3 | bug_report.md |
| 49 | ML-20 | ML: Scan Router | Dynamic dates in scan.py | M3 | bug_report.md |
| 50 | FE-01 | Frontend Schemas | Add calibrated_confidence to BiometricsDetails | M3 | bug_report.md |
| 51 | FE-04 | Frontend Errors | Error propagation in clearCompanionCapture | M3 | bug_report.md |
| 52 | FE-06 | Frontend Lifecycle | URL.revokeObjectURL cleanup in Dropzone.tsx | M3 | bug_report.md |
| 53 | FE-07 | Frontend Lifecycle | Unmount cancellation in ModelDiagnosticsModal.tsx | M3 | bug_report.md |
| 54 | AND-08 | Android Wi-Fi | Acquire MulticastLock in WifiUtils.kt | M3 | bug_report.md |
| 55 | AND-09 | Android Retries | R7 exponential backoff retry loop in SsbRepository | M3 | bug_report.md |
| 56 | AND-10 | Android Outbox | Route companion photos to /companion/upload | M3 | bug_report.md |
| 57 | AND-11 | Android Security | Restrict cleartext network security config | M3 | bug_report.md |
| 58 | AND-12 | Android Idempotency | Maintain stable capture UUID across retries | M3 | bug_report.md |
| 59 | TEST-01 | Test Suite | SQLite table truncate fixture for test isolation | M3 | bug_report.md |
| 60 | TEST-02 | Test Suite | Mock loopback probe in RepositoryNetworkRobustnessTest | M3 | bug_report.md |
| 61 | TEST-03 | Host Environment | Document host filesystem symlink requirements | M3 | bug_report.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Diagnostic Baseline | Map all 61 defects across 3 sub-systems, establish test baseline | none | IN_PROGRESS |
| M1 | Phase 1: Critical Operational Blockers | 11 Critical defects: BE-01..03, ML-01..03, FE-02..03, AND-01,02,04 | M0 | PLANNED |
| M2 | Phase 2: High Severity Hardening | 20 High defects: BE-04..10, ML-04..11, FE-05, AND-03,05..07 | M1 | PLANNED |
| M3 | Phase 3: Medium, Low & Info Polish | 30 defects: BE-11..19, ML-12..20, FE-01,04,06,07, AND-08..12, TEST-01..03 | M2 | PLANNED |
| M4 | Comprehensive Multi-Platform Verification | Compile checks, 100% pytest (336 tests), tsc, npm test, npm build, gradlew test | M1, M2, M3 | PLANNED |

## Interface Contracts

### Backend Schema Nullability Contract (BE-01, AND-01)
- In `backend/app/schemas/scan.py`:
  - `biometrics: Optional[BiometricsResult] = None`
  - `liveness: Optional[LivenessResult] = None`
  - `stamp: Optional[StampVerificationResult] = None`
- In `android-screening/.../InspectionModels.kt`:
  - `val biometrics: BiometricResult? = null`
  - `val liveness: LivenessResult? = null`
  - `val stamp: StampVerificationResult? = null`

### Cross-Validation Warnings Contract (BE-02, AND-02, AND-03)
- In `backend/app/schemas/mrz.py` and `cross_validator.py`:
  - Warnings emitted as structured violation objects matching `CriticalViolation` (or Android model adapted to receive structured violations with nullable `expectedValue` and `actualValue`).
- In `InspectionModels.kt`:
  - `data class CriticalViolation(val ruleId: String, val severity: String, val message: String, val expectedValue: String? = null, val actualValue: String? = null)`
  - `val warnings: List<CriticalViolation> = emptyList()`

### Async Inference Execution Contract (BE-03)
- All synchronous CPU/GPU intensive inferences (`face_detector.detect_faces`, `face_matcher.compute_similarity`, `liveness_detector.check_liveness`, `tamper_detector.detect_tampering`, `stamp_verifier.verify_stamp`, `pp_ocr_engine.extract_text`) invoked via:
  ```python
  await asyncio.to_thread(func, *args, **kwargs)
  ```
