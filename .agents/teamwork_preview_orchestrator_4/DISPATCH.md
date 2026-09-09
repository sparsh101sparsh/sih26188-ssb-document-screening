## 2026-09-09T14:32:55Z

You are the Project Orchestrator for the SIH26188 document screening system.

Your working directory is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_orchestrator_4
The project root is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project
The user's original request is recorded in: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
The master bug specification is at: /Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md

Your mission:
Fix all 61 documented software defects across Backend Core & Routers, Machine Learning & Algorithmic Modules, Frontend Web/Desktop Client, Android Companion Mobile App, and Automated Test Suites according to the master specification.

Requirements Summary:
1. R1. Phase 1 — Critical Operational Blocker Remediation (11 Critical defects):
   - BE-01 / AND-01: Moshi null-safety deserialization crash on `biometrics`, `liveness`, `stamp` across `InspectionModels.kt` and backend schemas (`scan.py`, `stamp.py`, `biometrics.py`).
   - BE-02 / AND-02: Cross-validation `warnings` type mismatch (`List<CriticalViolation>` vs `List<String>`) in `InspectionModels.kt:202` and `mrz.py:69`.
   - BE-03: Wrap heavy synchronous ML inference calls (`face_detector`, `face_matcher`, `liveness_detector`, `tamper_detector`, `stamp_verifier`, `pp_ocr_engine`) in `await asyncio.to_thread(...)` across `biometrics.py`, `forensics.py`, and `ocr.py`.
   - ML-01: Support ICAO Doc 9303 TD3 check digit filler character `<` in CD4 optional personal number checksum in `mrz_engine.py:439-445`.
   - ML-02: Fix `parse_date_to_yymmdd` in `cross_validator.py:80-99` format-aware parsing.
   - ML-03: Rectify year extraction in `fraud_edge_cases.py:95-113` for hyphenated `DD-MM-YYYY` dates.
   - FE-02: Prepend `API_BASE_URL` to companion gallery, SSE stream, and devices endpoint in `App.tsx` and `Header.tsx`.
   - FE-03: Fix inverted sequence comparison in `App.tsx:289-291` with max sequence ID in `data.items`.
   - AND-04: Enqueue offline scans into Room `outboxDao` before returning in `SsbScreeningViewModel.kt:253-266`.

2. R2. Phase 2 — High Severity Concurrency, Hardware & Security Hardening (20 High defects):
   - BE-04 to BE-10: Polyglot Form/JSON parsing in `ocr.py`, `threading.RLock` in `device_tracker.py`, async offload disk reads/base64 in `companion.py`, thread-safe event loop scheduling for `SSEBroadcaster`, SQLite verdict persistence, reverse-tethered Android `127.0.0.1` device tracking, hardware engine mode reporting.
   - ML-04 to ML-11: Zero-byte image guards in `face_detector.py`, PIL to BGR conversion before YuNet, `weights_only=True` in `tamper_detector.py`, text tampering deadband fix, centenary year pivot in `cross_validator.py`, remove arbitrary embedding averaging in `face_matcher.py`, spatial contour/clustering for stamp ink in `stamp_verifier.py`, `is_model_loaded` property in `liveness_detector.py`.
   - FE-05: Wire `postScreeningVerdict` in `App.tsx`.
   - AND-03: Nullable `expectedValue` and `actualValue` in `CriticalViolation`.
   - AND-05 to AND-07: CameraX background executor dispatch, `unbindAll()` before shutdown in `QrScannerView.kt`, valid context to `WifiUtils.discoverGatewayOnSubnet()` in `SsbRepository.kt`.

3. R3. Phase 3 — Medium, Low & Info Architectural Polish & Test Stabilization (30 defects):
   - BE-11 to BE-19: Unmounted schemas, monotonic sequence persistence, mDNS deduplication, network interface regex, empty dir removal, upload HTTP 201 status, structured logging.
   - ML-12 to ML-20: Remove `or True` masks, replace deprecated `getdata()`, align ELA visual scaling, photo border proximity, big-int payload slicing, SCRFD BGR-to-RGB channel order, EasyOCR reader lazy cache, AdaFace calibration curve, dynamic dates in `scan.py`.
   - FE-01, FE-04, FE-06, FE-07: `calibrated_confidence` in types, error propagation in `clearCompanionCapture`, blob URL cleanup in `Dropzone.tsx`, unmount cancellation in `ModelDiagnosticsModal.tsx`.
   - AND-08 to AND-12: `MulticastLock`, exponential backoff retry in `SsbRepository.kt`, companion photo route `/companion/upload`, cleartext network config, stable capture UUID.
   - TEST-01 & TEST-02: SQLite table truncate fixture in `conftest.py` / `test_challenger_m5_e2e_4tier.py`, mock loopback probe in `RepositoryNetworkRobustnessTest.kt`.

Acceptance Criteria:
- Backend compile check passes: `.venv311/bin/python -m compileall app/`
- Backend full pytest suite passes with 0 failures: `.venv311/bin/pytest tests/ -v` (all 336 tests passing)
- Frontend typecheck passes with 0 errors: `npx tsc --noEmit`
- Frontend unit tests pass with 0 failures: `npm test`
- Frontend production build succeeds: `npm run build`
- Android unit tests pass with 0 failures: `./gradlew testDebugUnitTest`

Remember to maintain your BRIEFING.md and progress.md in your working directory. Report back when all requirements are fully implemented and verified.
