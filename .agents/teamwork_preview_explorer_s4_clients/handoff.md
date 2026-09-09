# Handoff Report: Frontend & Android Defect Survey

**Agent**: `teamwork_preview_explorer_s4_clients`  
**Handoff Type**: Hard (Task Complete)  
**Artifact Reference**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_clients/survey_report.md`  

---

## 1. Observation

### Diagnostic Baseline Execution
- **Frontend Typecheck (`npx tsc --noEmit`)**:
  - Command: `npx tsc --noEmit` in `frontend/`
  - Output: Exited with code `0`, zero errors.
- **Frontend Unit Tests (`npm test`)**:
  - Command: `npm test` in `frontend/`
  - Output: Exited with code `0`. 13 test suites passed, 38+ tests passed cleanly (including `adversarial_challenger_m4_deep_e2e.test.tsx`, `qr_generation.test.tsx`, `connect_modal_pairing.test.tsx`).
- **Android Unit Tests (`./gradlew testDebugUnitTest`)**:
  - Command: `./gradlew testDebugUnitTest` in `android-screening/`
  - Output: Failed due to missing local Java runtime initially; when pointed to Android Studio JBR (`/Applications/Android Studio.app/Contents/jbr/Contents/Home`), Gradle failed with:
    ```text
    java.lang.RuntimeException: Could not create parent directory for lock file /Users/iamsparsh00321/.gradle/wrapper/dists/gradle-9.3.1-bin/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1-bin.zip.lck
    ```
  - Inspection of symlinks:
    - `/Users/iamsparsh00321/.gradle -> /Volumes/issparsh/Android_Dev/.gradle`
    - `/Users/iamsparsh00321/.android -> /Volumes/issparsh/Android_Dev/.android`
    - Volume `/Volumes/issparsh` is unmounted (`ls: /Volumes/issparsh: No such file or directory`).

### Defect Observations
1. **FE-01**: `frontend/src/types/api.ts:144-157` has `calibrated_confidence?: number | null` on `FaceMatchResult`, but lacks type alias `BiometricsDetails`. In `frontend/src/components/ResultsPanel.tsx:944`, `(details.biometrics as any).calibrated_confidence` relies on an unsafe type escape hatch.
2. **FE-02**: `frontend/src/components/Header.tsx:44` performs `fetch('/api/v1/devices')` using a hardcoded relative path without `API_BASE_URL`. In desktop runtime (Tauri at `tauri://localhost`), relative fetches fail with 404 or connection failure.
3. **FE-03**: `frontend/src/App.tsx:288-297` parses `data.items` from `/api/v1/companion/gallery`. In `backend/app/api/routers/companion.py:84`, items are stored in chronological ascending order (`items[0]` is oldest). If `items[0]` is tested, `latest.sequence_id > lastSequenceIdRef.current` fails to advance after sequence 1, freezing gallery auto-ingestion.
4. **FE-04**: `frontend/src/services/api.ts:136-144` suppresses errors in `clearCompanionCapture()` with `try { ... } catch (err) { console.warn(...) }`. `ConnectModal.tsx:220` awaits it in a `try/catch` and unconditionally renders `"Gateway inbox purged."` even when the gateway request fails.
5. **FE-05**: `frontend/src/App.tsx:19` imports `postScreeningVerdict`, but `App.tsx:493, 533, 549` binds `onOfficerDecision={setOfficerDecision}` directly, storing verdicts in local React state without pushing them to `/api/v1/companion/verdict`.
6. **FE-06**: `frontend/src/components/Dropzone.tsx:49` invokes `URL.createObjectURL(file)` on every file drop without calling `URL.revokeObjectURL(prevUrl)`, creating memory leaks across long screening shifts.
7. **FE-07**: `frontend/src/components/ModelDiagnosticsModal.tsx:29-46` executes asynchronous state setters (`setDiagnostics`, `setLoading`) inside `loadStatus()` and action handlers without checking whether the component has unmounted.
8. **AND-01**: `android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt:89-102` declares optional scan sub-objects. `InspectionResponse:71` has non-nullable `val details: InspectionDetails`, which crashes Moshi if the backend returns null details on error.
9. **AND-02**: `InspectionModels.kt:202` originally declared `val warnings: List<String>`, whereas backend `mrz.py:70` returns `list[CrossViolation]`, causing `JsonDataException: Expected a string but was BEGIN_OBJECT`.
10. **AND-03**: `InspectionModels.kt:214-215` declares `expectedValue` and `actualValue` in `CriticalViolation`. Rules such as CV-07 emit `null`, which requires nullable `String? = null`.
11. **AND-04**: `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt:253-266` checks `if (currentState.connectivityMode == ConnectivityMode.OFFLINE_OUTBOX || currentState.gatewayHealth == null)` and returns immediately without inserting captured frames into Room `outboxDao`. Offline captures are permanently dropped.
12. **AND-05**: In `DualCameraCaptureView.kt:329-335`, camera frame compression is already dispatched to background `cameraExecutor` with callbacks posted to `mainExecutor`.
13. **AND-06**: In `QrScannerView.kt:127-146`, `cameraProvider?.unbindAll()` is executed before `cameraExecutor.shutdown()`, guarded with exception handling.
14. **AND-07**: In `SsbRepository.kt:358`, `WifiUtils.discoverGatewayOnSubnet()` is called without arguments, passing `context = null`. In `WifiUtils.kt:297, 336`, both Tier 0 (Saved gateway URL) and Tier 2 (mDNS discovery) are skipped when `context == null`.
15. **AND-08**: In `WifiUtils.kt:222-282`, `discoverViamdns` invokes Android `NsdManager` without acquiring `WifiManager.MulticastLock`, causing physical Wi-Fi hardware to drop multicast packets (224.0.0.251).
16. **AND-09**: In `SsbRepository.kt:73-175`, `uploadCompanionCapture()` executes a single POST without retrying across `RETRY_DELAYS_MS` (0s, 2s, 8s, 30s, 60s).
17. **AND-10**: In `SsbRepository.kt:320-336`, `syncPendingRecord()` routes companion captures to `service.inspectDocument()` (`/api/v1/scan/inspect`) instead of `service.uploadCompanionCapture()` (`/api/v1/companion/upload`).
18. **AND-11**: In `AndroidManifest.xml:23`, `android:usesCleartextTraffic="true"` is enabled globally without domain restrictions.
19. **AND-12**: In `SsbRepository.kt:83`, a new random UUID is generated on each attempt (`sessionUuid = "CAP-..."`), breaking backend deduplication across upload retries.
20. **TEST-02**: In `RepositoryNetworkRobustnessTest.kt:178-182`, `autoDetectGateway()` probes `http://127.0.0.1:8000/api/v1/health`. When the backend server is running on host port 8000, `testGateway` connects and returns `http://127.0.0.1:8000`, causing `assertNull(...)` to fail.
21. **TEST-03**: Host paths `~/.gradle` and `~/.android` point to unmounted volume `/Volumes/issparsh/`.

---

## 2. Logic Chain

1. **Frontend Network Isolation (FE-02, FE-04, FE-05)**:
   - Observation: `Header.tsx:44` uses relative path `/api/v1/devices`. `ConnectModal.tsx` handles errors but `clearCompanionCapture()` suppresses exceptions. `App.tsx` leaves `postScreeningVerdict` uninvoked.
   - Inference: The frontend is architecturally designed to support desktop embedded webviews and remote edge gateways. Relative fetches bypass `API_BASE_URL`, swallowed exceptions mislead the operator, and omitted verdict syncing prevents mobile units from receiving gate clearance decisions.
   - Remediation: Prepend `API_BASE_URL` to all endpoints, re-throw on non-200 responses in `clearCompanionCapture()`, and invoke `postScreeningVerdict()` inside an `onOfficerDecision` callback in `App.tsx`.

2. **Ingestion Monotonicity & Resource Cleanup (FE-03, FE-06, FE-07)**:
   - Observation: Buffer items are chronological. Object URLs are generated without revocation. Diagnostics modal lacks unmount guards.
   - Inference: Testing index 0 stalls polling when captures accumulate. Unrevoked blob URLs leak memory over an 8-hour shift. Async state setters on unmounted modal components trigger React memory leak warnings.
   - Remediation: Reduce `data.items` by maximum sequence ID, revoke blob URLs on change/unmount, and guard async modal callbacks with an `isMountedRef`.

3. **Android Client Serialization & Offline Data Safety (AND-01, AND-02, AND-03, AND-04)**:
   - Observation: Single-document scans omit biometrics/stamp; cross-validation warnings contain violation objects; stamps omit expected/actual values; offline inspections return immediately.
   - Inference: Moshi requires nullable definitions for optional JSON fields; non-nullable types trigger fatal crashes during document scans. Returning early in `SsbScreeningViewModel.kt` without writing to Room SQLite results in permanent data loss.
   - Remediation: Mark optional scan fields nullable, align `warnings` with `List<CriticalViolation>`, and call `repository.inspectDocument()` to enqueue offline scans in `outboxDao`.

4. **Android Network & Hardware Reliability (AND-07, AND-08, AND-09, AND-10, AND-12)**:
   - Observation: Null context skips Tier 0 and Tier 2 in `WifiUtils`; missing MulticastLock drops mDNS packets; single upload attempts fail on radio noise; outbox sync routes companion photos to `/scan/inspect`; random UUIDs bypass backend deduplication.
   - Inference: Mobile field units cannot discover gateways quickly, drop uploads on transient packet loss, route companion photos incorrectly, and flood the gallery with duplicates.
   - Remediation: Pass application context to `WifiUtils`, acquire `MulticastLock`, loop across `RETRY_DELAYS_MS`, route companion captures to `/api/v1/companion/upload`, and maintain stable capture UUIDs across retries.

5. **Test Determinism & Host Environment (TEST-02, TEST-03)**:
   - Observation: Host port 8000 responds to loopback probes during tests. Unmounted external volume breaks `~/.gradle`.
   - Inference: Unit tests should not bind to ambient host daemon ports, and offline builds must use a local Gradle cache.
   - Remediation: Direct test probe to unallocated port 59999, and configure `GRADLE_USER_HOME=/tmp/.gradle` or local directory.

---

## 3. Caveats

- **No Code Modifications Undertaken**: Consistent with read-only explorer instructions, zero production or test files were modified. All suggested fixes are documented with proposed code snippets in `survey_report.md`.
- **Backend Schema Interoperability**: Some fixes (e.g. AND-01, AND-02) depend on matching backend schemas in `scan.py` and `mrz.py`. Cross-validation models in both frontend and Android are synchronized with backend schemas.

---

## 4. Conclusion

All 21 assigned defects across Frontend Web/Desktop (FE-01 to FE-07), Android Companion Mobile (AND-01 to AND-12), and Client Test Harnesses (TEST-02, TEST-03) have been thoroughly investigated, line-audited, and documented in:
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_clients/survey_report.md`

Every defect includes:
- Exact file path and line numbers
- Current verbatim logic and architectural analysis
- Concrete recommended remediation code
- Test coverage and impact assessment

---

## 5. Verification Method

To independently verify the survey findings:

1. **Frontend Diagnostics**:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend
   npx tsc --noEmit
   npm test
   npm run build
   ```
2. **Android Source & Test Verification**:
   - Inspect files referenced in `survey_report.md`:
     - `android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt`
     - `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt`
     - `android-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt`
     - `android-screening/app/src/main/java/com/ssb/fieldscreening/util/WifiUtils.kt`
     - `android-screening/app/src/main/AndroidManifest.xml`
     - `android-screening/app/src/test/java/com/ssb/fieldscreening/RepositoryNetworkRobustnessTest.kt`
   - To run Android unit tests with local environment override:
     ```bash
     cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/android-screening
     JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" GRADLE_USER_HOME=/tmp/.gradle ./gradlew testDebugUnitTest --dry-run
     ```
