# Original User Request

## Initial Request — 2026-08-25T05:03:23Z

You are the Project Orchestrator for the SIH26188 document screening system.

Your working directory is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_orchestrator_2
The project root is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project
The user's original request is recorded in: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md

Your mission:
Fix the unreliable Android <-> Laptop local network connection system in the SIH26188 document-screening project so that: pairing happens once via QR scan, Android reconnects automatically on every subsequent launch (including after DHCP IP changes), and captured images upload reliably with no silent loss.

Key Requirements:
1. R1. Fix Backend Interface Selection:
   - In `backend/app/main.py` and `backend/app/api/v1/endpoints/companion.py`, replace `socket.gethostbyname(socket.gethostname())` and UDP probe flaws with a robust LAN interface selector `select_lan_ip(interfaces_dict)`.
   - Identify default-route interface (using `netifaces` or subprocess routing table fallback `route -n get default` on macOS / `ip route show default` on Linux).
   - Prioritize physical interfaces (en0, eth0, wlan0) over VPN tunnels (utun*, tun*, tap*) and virtual bridges/loopback.
   - Do NOT blacklist 10.x.x.x globally — distinguish LAN from VPN by interface name and routing table.
   - Log interface evaluation decisions.
   - Ensure mDNS Zeroconf registration uses the selected LAN IP.
2. R2. Fix Android Auto-Connect on App Launch:
   - In `SsbScreeningViewModel.kt`: On `init`, if saved gateway URL exists in SharedPreferences, immediately try to connect in background coroutine (1.5s timeout).
   - If success -> `connectToGateway(savedUrl)`.
   - If failure -> silently kick off mDNS discovery via `discoverGatewayOnSubnet()` and connect to discovered gateway.
   - Register `ConnectivityManager.NetworkCallback` to detect Wi-Fi changes and trigger re-discovery automatically when active network changes.
3. R3. Fix Android Discovery Tier Order in WifiUtils:
   - In `WifiUtils.kt`, reorder `discoverGatewayOnSubnet()`:
     - Tier 0: Saved gateway URL from SharedPreferences (1s timeout)
     - Tier 1: Emulator 10.0.2.2 (only if `Build.FINGERPRINT.contains("generic")`)
     - Tier 2: mDNS/NSD discovery (3s timeout)
     - Tier 3: Priority subnet probe (only if Tiers 0-2 fail, limited to 13 priority IPs, no full subnet sweep on auto-start).
4. R4. Fix QR Idempotent Pairing with SSBPAIR Protocol:
   - Backend: Add endpoint `GET /api/v1/companion/pairing-qr` returning `qr_payload` ("SSBPAIR://SSBGateway/TOKEN"), `gateway_id`, `pairing_token` (8-char shortened uuid regenerated per restart), `current_lan_ip`, `port`, `fallback_url`.
   - Android `QrCodeAnalyzer.kt`: Handle both `SSBPAIR://` and `http://` (backward compatibility). Save endpoint to SharedPreferences on successful health check.
   - Frontend `ConnectModal.tsx`: Fetch from `/api/v1/companion/pairing-qr` and encode `qr_payload`.
5. R5. Fix Upload Idempotency with `capture_id`:
   - Android `SsbApiService.kt`: Add `capture_id` parameter (`@Part("capture_id") captureId: RequestBody`) to `uploadCompanionCapture()`, passing `sessionId` from `OutboxScreeningRecord`.
   - Backend `companion.py`: Accept `capture_id` form field. If already exists in SQLite, return `{"status": "duplicate", "capture_uuid": "<existing uuid>", "message": "Already received"}` without creating duplicate DB record.
6. R6. Fix Fallback Default URL:
   - `WifiUtils.normalizeGatewayUrl()`: Blank input returns `""`.
   - `ScreeningUiState` in `SsbScreeningViewModel.kt`: Default `customGatewayUrl` to `""`. UI shows "No gateway configured" when empty.
   - Eliminate hardcoded `192.168.1.61` and `10.198.211` everywhere across codebase.
7. R7. Add Upload Retry with Exponential Backoff:
   - In `SsbRepository.kt`, retry upload logic: Attempt 1 immediate, Attempt 2 after 2s, Attempt 3 after 8s, Attempt 4 after 30s, Attempt 5 after 60s. Mark `sync_status = "FAILED"` after 5 failures and keep image. Never delete local image before 200 OK.
8. R8. Improve Desktop Connect Modal UI:
   - `ConnectModal.tsx`: Show clean connection state (CONNECTED: green dot, CONNECTING/DISCOVERING: spinner, DISCONNECTED: QR code prominently shown). Advanced expandable section for manual IP entry.
9. R9. Backend Tests for Interface Selection:
   - Create `backend/tests/test_network_interface.py` covering `select_lan_ip` (VPN+WiFi -> WiFi, WiFi-only, Ethernet-only), `GET /api/v1/companion/pairing-qr` endpoint, and upload deduplication with duplicate `capture_id`.
   - Ensure all existing tests pass (`pytest tests/` in backend, 23/23 in `test_risk_engine.py`).
10. R10. Structured Logging across backend, Android WifiUtils, and Android SsbRepository.
11. Build Health & Delivery:
   - `frontend/`: `npm run build` succeeds.
   - `android-screening/`: `./gradlew assembleDebug` succeeds. Copy resulting APK to `~/Desktop/SSB-FieldScreening.apk`.
   - `backend/`: `pytest tests/` passes.

## 2026-09-09T04:24:23Z

# Teamwork Project Prompt

Perform comprehensive, read-only bug detection, tracking, and documentation across the entire SIH26188 SSB Edge Screening Gateway codebase without modifying any production source files.

Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project
Integrity mode: development

## Requirements

### R1. Comprehensive Multi-Tier Bug Detection
Audit all three primary sub-systems of the project:
1. Backend Core & Routers (backend/app/api/routers/, backend/app/core/, backend/app/services/): API schema validation, Pydantic vs client naming discrepancies, error handling, session lifecycle, and concurrency.
2. ML & Algorithmic Modules (backend/app/modules/): Fallback chain robustness when weights are missing, OCR/MRZ parsing check digit edge cases, facial matching baseline drift, ELA/Tamper scoring calibrations, and stamp verification bounding logic.
3. Frontend & Mobile Clients (frontend/src/, android-screening/): Request payload consistency, WebSocket event subscription/teardown, client state handling, and Android camera/network/permission configurations.

### R2. Read-Only Diagnostic Execution and Reproduction
Execute diagnostic tests and run existing test suites using the project Python 3.11 virtual environment (backend/.venv311/bin/pytest) and frontend test runners (npm test, npx tsc --noEmit). Do NOT modify any existing source or test files to mask bugs. Every detected defect must be verified through static analysis, code inspection, or reproducible command tracebacks.

### R3. Structured Bug Registry and Tracking Documentation
Generate a consolidated, comprehensive bug documentation artifact at /Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md featuring:
- Executive summary table sorted by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO) and component area.
- Detailed entries for each bug containing: Unique ID, Title, Severity, Affected Component & Path, Description, Root Cause, Reproduction Steps / Traceback, and Potential Remediation Notes.
- Clear demarcation of previously identified/fixed items vs newly discovered active bugs.

## Acceptance Criteria

### Coverage & Integrity
- [ ] No production source files are modified during the audit (strict read-only enforcement).
- [ ] All three sub-systems (backend, frontend, android) are evaluated.
- [ ] All test failures encountered during inspection are documented verbatim with tracebacks.

### Documentation Quality
- [ ] Consolidated bug catalog written to /Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md.
- [ ] Each reported issue contains file path, line numbers, root cause, and concrete reproduction steps.
- [ ] Summary counts accurately reflect total unique bugs per severity level.

## 2026-09-09T14:32:00Z

# Teamwork Project Prompt

Fix all 61 documented software defects across Backend Core & Routers, Machine Learning & Algorithmic Modules, Frontend Web/Desktop Client, Android Companion Mobile App, and Automated Test Suites according to the master specification in `/Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md`.

Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project
Integrity mode: development

## Requirements

### R1. Phase 1 — Critical Operational Blocker Remediation
Systematically eliminate all 11 Critical severity defects:
1. **BE-01 / AND-01**: Rectify Moshi null-safety deserialization crash on `biometrics`, `liveness`, `stamp` across `InspectionModels.kt` and backend schemas (`scan.py`, `stamp.py`, `biometrics.py`).
2. **BE-02 / AND-02**: Correct cross-validation `warnings` type mismatch (`List<CriticalViolation>` vs `List<String>`) in `InspectionModels.kt:202` and `mrz.py:69`.
3. **BE-03**: Wrap heavy synchronous ML inference calls (`face_detector`, `face_matcher`, `liveness_detector`, `tamper_detector`, `stamp_verifier`, `pp_ocr_engine`) in `await asyncio.to_thread(...)` across `biometrics.py`, `forensics.py`, and `ocr.py`.
4. **ML-01**: Support ICAO Doc 9303 TD3 check digit filler character `<` in CD4 optional personal number checksum in `mrz_engine.py:439-445` to stop false TRIPWIRE_1 RED alerts.
5. **ML-02**: Fix `parse_date_to_yymmdd` in `cross_validator.py:80-99` to use format-aware parsing so birthdays on the 19th/20th of any month are not mangled into year 19xx/20xx.
6. **ML-03**: Rectify year extraction in `fraud_edge_cases.py:95-113` for hyphenated `DD-MM-YYYY` dates to stop false temporal date paradoxes.
7. **FE-02**: Prepend `API_BASE_URL` to companion gallery (`/api/v1/companion/gallery`), SSE stream (`/api/v1/companion/stream`), and devices endpoint (`/api/v1/devices`) in `App.tsx` and `Header.tsx`.
8. **FE-03**: Fix inverted sequence comparison in `App.tsx:289-291` by finding the maximum sequence ID in `data.items` so companion photo polling does not freeze after capture 1.
9. **AND-04**: Enqueue offline scans into Room `outboxDao` before returning in `SsbScreeningViewModel.kt:253-266` to prevent silent capture data loss.

### R2. Phase 2 — High Severity Concurrency, Hardware & Security Hardening
Resolve all 20 High severity defects:
1. **BE-04**: Implement polyglot Form/JSON parsing in `ocr.py:43-47, 155-158`.
2. **BE-05**: Add `threading.RLock` concurrency protection across all operations in `device_tracker.py:37-163`.
3. **BE-06**: Asynchronously offload disk reads and base64 encoding in `companion.py:395-449` (`get_companion_gallery`).
4. **BE-07**: Ensure thread-safe event loop scheduling for `SSEBroadcaster` in `companion.py:79-106`.
5. **BE-08**: Persist officer clearance verdicts to SQLite database rather than ephemeral memory in `companion.py:762-827`.
6. **BE-09**: Support USB reverse-tethered Android clients (`127.0.0.1` via `adb reverse`) in `main.py:160-184` device tracking.
7. **BE-10**: Fix hardware engine mode reporting in `main.py:249` so CPU-only deployments report `cpu_accelerated` rather than false `cuda_tensorrt`.
8. **ML-04**: Guard `face_detector.py:31-73, 513` against zero-byte empty image payloads to stop hallucinated face detections.
9. **ML-05**: Convert PIL Image inputs to OpenCV NumPy BGR arrays in `face_detector.py:381-410` before YuNet C++ execution.
10. **ML-06**: Add `weights_only=True` to `torch.load` in `tamper_detector.py:101`.
11. **ML-07**: Fix text tampering probability clamping deadband in `tamper_detector.py:397-440` to enable text fraud detection.
12. **ML-08**: Fix centenary year pivot in `cross_validator.py:101-114` using dynamic `reference_year % 100`.
13. **ML-09**: Replace faulty arbitrary embedding dimension averaging in `face_matcher.py:350-371`.
14. **ML-10**: Implement spatial contour/clustering for stamp ink pixels in `stamp_verifier.py:410-440`.
15. **ML-11**: Fix `is_model_loaded` property in `liveness_detector.py:85-87` to reflect actual ONNX session state.
16. **FE-05**: Wire `postScreeningVerdict` in `App.tsx` on officer decision actions ("Admit", "Flag for Secondary", "Reject").
17. **AND-03**: Make `expectedValue` and `actualValue` nullable in `CriticalViolation` in `InspectionModels.kt:214-215`.
18. **AND-05**: Dispatch CameraX frame rotation, downsampling, and JPEG encoding to background `cameraExecutor` in `DualCameraCaptureView.kt:319, 337`.
19. **AND-06**: Call `cameraProvider.unbindAll()` prior to `cameraExecutor.shutdown()` in `QrScannerView.kt:125-129`.
20. **AND-07**: Pass valid application context to `WifiUtils.discoverGatewayOnSubnet()` in `SsbRepository.kt:358`.

### R3. Phase 3 — Medium, Low & Info Architectural Polish & Test Stabilization
Remediate all 30 remaining Medium, Low, and Info defects:
1. **BE-11 to BE-19**: Clarify unmounted schemas (`screening.py`), monotonic sequence persistence (`companion.py`), mDNS `.local.` suffix deduplication (`main.py:108`), network interface parsing regex (`network.py:135-180`), empty directory removal (`companion.py`), upload HTTP 201 status code, and replace bare excepts with structured logging.
2. **ML-12 to ML-20**: Remove `or True` masks in `models.py:171-176`, replace deprecated `getdata()` in `ela_engine.py`, align ELA visual scaling with metrics, handle photo border proximity in `photo_splicing_detector.py`, fix big-int payload slicing in `qr_decoder.py:258-285`, fix BGR-to-RGB channel order for SCRFD, lazily cache EasyOCR reader in `pp_ocr_engine.py`, add AdaFace calibration curve in `face_matcher.py`, and use dynamic dates in `scan.py`.
3. **FE-01, FE-04, FE-06, FE-07**: Add `calibrated_confidence` to `BiometricsDetails` in `types/api.ts`, propagate errors in `clearCompanionCapture`, clean up blob object URLs in `Dropzone.tsx`, and add unmount cancellation in `ModelDiagnosticsModal.tsx`.
4. **AND-08 to AND-12**: Acquire `MulticastLock` in `WifiUtils.kt`, implement R7 exponential backoff retry in `SsbRepository.kt`, route companion photos to `/companion/upload` rather than `/scan/inspect` in outbox sync, restrict cleartext network security config, and maintain stable capture UUID across retries.
5. **TEST-01 & TEST-02**: Add SQLite table truncate fixture in `conftest.py` / `test_challenger_m5_e2e_4tier.py` so the backend pytest suite passes 100% in full run, and mock loopback probe in `RepositoryNetworkRobustnessTest.kt`.

## Acceptance Criteria

### Automated Verification
- [ ] Backend compile check passes without errors: `.venv311/bin/python -m compileall app/`
- [ ] Backend full pytest suite passes with 0 failures: `.venv311/bin/pytest tests/ -v` (all 336 tests passing)
- [ ] Frontend typecheck passes with 0 errors: `npx tsc --noEmit`
- [ ] Frontend unit tests pass with 0 failures: `npm test`
- [ ] Frontend production build succeeds: `npm run build`
- [ ] Android unit tests pass with 0 failures: `./gradlew testDebugUnitTest`
