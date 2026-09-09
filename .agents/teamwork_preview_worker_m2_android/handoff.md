# Handoff Report — Milestone 2: Android Auto-Connect, Discovery Tiers, QR Handling, Upload Retry & Idempotency

**Agent:** `teamwork_preview_worker`  
**Milestone:** 2 (Android Auto-Connect, Discovery Tiers, QR Handling, Upload Retry & Idempotency)  
**Date:** 2026-08-25  

---

## 1. Observation

### Codebase Baseline State:
1. `SsbScreeningViewModel.kt`:
   - `init` block was empty; no background verification or auto-discovery on launch occurred.
   - `ScreeningUiState.customGatewayUrl` defaulted to `"http://192.168.1.61:8000"`.
   - No `ConnectivityManager.NetworkCallback` was registered to react to Wi-Fi state transitions.
2. `WifiUtils.kt`:
   - `normalizeGatewayUrl("")` defaulted to `"http://192.168.1.61:8000"` rather than `""`.
   - `discoverGatewayOnSubnet()` unconditionally probed emulator IP `10.0.2.2` without checking hardware fingerprint, lacked Tier 0 saved gateway check, and performed an exhaustive 254-host subnet sweep.
   - No handler existed for `SSBPAIR://<host>:<port>/<token>` QR payloads.
3. `QrCodeAnalyzer.kt` / `WifiConnectScreen.kt`:
   - Raw scanned string was not parsed for `SSBPAIR://` format.
   - `WifiConnectScreen.kt` defaulted `currentGatewayUrl` to `"http://192.168.1.61:8000"` and had hardcoded subnet checks.
4. `SsbApiService.kt`:
   - `uploadCompanionCapture` lacked `@Part("capture_id") captureId: RequestBody? = null`.
5. `SsbRepository.kt`:
   - Did not pass client-generated `capture_id` during companion uploads.
   - `syncPendingRecord()` marked records `FAILED` prematurely with a 3-attempt ceiling and lacked exponential backoff.
   - `autoDetectGateway()` contained hardcoded IP candidate list (`"http://192.168.43.1:8000"`, etc.).
6. `InspectionModels.kt` & `GatewayDiagnosticsView.kt`:
   - `AIR_GAPPED_WIFI` endpoint defaulted to `"http://192.168.2.1:8000"`.
   - `GatewayDiagnosticsView.kt` used a hardcoded IP list in its AUTO-DETECT action.

---

## 2. Logic Chain

### Key Architectural & Code Modifications:
1. **Tiered Discovery in `WifiUtils.kt`**:
   - Implemented `isEmulator(): Boolean` by evaluating `Build.FINGERPRINT`, `Build.MODEL`, `Build.HARDWARE`, `Build.BRAND`, `Build.DEVICE`, `Build.PRODUCT`.
   - Enforced 4-tier discovery order in `discoverGatewayOnSubnet(context, port)`:
     - **Tier 0:** Saved gateway from `SharedPreferences` (`getLastConnectedGateway`, 1000ms timeout).
     - **Tier 1:** Emulator `http://10.0.2.2:8000` (only when `isEmulator() == true`, 400ms timeout).
     - **Tier 2:** mDNS/NSD service discovery for `_ssb-gateway._tcp` (3000ms timeout).
     - **Tier 3:** Parallel async probe across 13 priority subnet IPs (`.1, .2, .3, .100, .101, .102, .103, .104, .105, .110, .120, .150, .200`, 350ms timeout).
     - Removed full 254-host subnet sweep.
2. **SSBPAIR Scheme & URL Normalization in `WifiUtils.kt`**:
   - `normalizeGatewayUrl(raw: String)`: returns `""` for blank input. Normalizes missing protocol (`http://`) and missing port (`:8000`).
   - `parseQrPayload(raw: String)`: extracts `http://<host>:<port>` from `SSBPAIR://<host>:<port>/<token>`, `SSBPAIR://<host>/<token>`, or legacy formats (`http://...` / `host:port`).
3. **Auto-Connect & NetworkCallback in `SsbScreeningViewModel.kt`**:
   - On `init`: registers `ConnectivityManager.NetworkCallback` for `TRANSPORT_WIFI`. When Wi-Fi is connected, automatically triggers `autoConnectOnLaunch()`. When Wi-Fi is lost, cleanly sets state to `OFFLINE_OUTBOX`.
   - Unregisters `NetworkCallback` cleanly in `onCleared()`.
   - In `autoConnectOnLaunch()`: launches background coroutine checking saved gateway with 1500ms timeout; if healthy -> connects; if unreachable -> executes silent discovery via `discoverGatewayOnSubnet()`.
   - Defaulted `customGatewayUrl` in `ScreeningUiState` to `""`.
4. **QR Code Scanning in `WifiConnectScreen.kt` & `QrCodeAnalyzer.kt`**:
   - `WifiConnectScreen.kt` parses scanned QR payloads using `WifiUtils.parseQrPayload(qrPayload)`.
   - Tested and verified endpoints are saved to `SharedPreferences` upon connection.
   - Removed hardcoded default IPs and subnet checks.
5. **Idempotent Uploads in `SsbApiService.kt` & `SsbRepository.kt`**:
   - Added `@Part("capture_id") captureId: RequestBody? = null` in `SsbApiService.uploadCompanionCapture()`.
   - `SsbRepository.uploadCompanionCapture()` sends `record.sessionId` as `capture_id`.
6. **5-Step Exponential Backoff Retry in `SsbRepository.kt`**:
   - Defined `MAX_RETRY_ATTEMPTS = 5` and `RETRY_DELAYS_MS = listOf(0L, 2000L, 8000L, 30000L, 60000L)`.
   - In `syncPendingRecord()`: delays according to attempt number; on failure increments retry count; only marks `sync_status = "FAILED"` after 5 failed attempts.
   - Local image blobs are retained in SQLite/Room DB and never deleted before HTTP 200 OK.
7. **Cleaned Hardcoded IPs & Structured Logging**:
   - Removed hardcoded IPs across `InspectionModels.kt`, `GatewayDiagnosticsView.kt`, `SsbRepository.kt`, `WifiConnectScreen.kt`, and `SsbScreeningViewModel.kt`.
   - Added structured logging with tags `[WifiUtils]`, `[AutoDiscovery]`, `[SsbViewModel]`, `[SsbRepository]`, and `[QrAnalyzer]`.

---

## 3. Caveats

- In test/Robolectric environments where Wi-Fi hardware and mDNS daemon are absent, Tier 0 and Tier 1 / Tier 3 fallback gracefully without throwing unhandled exceptions.
- Cleartext HTTP traffic is required for local network gateway communication and is enabled in `AndroidManifest.xml` via `android:usesCleartextTraffic="true"`.

---

## 4. Conclusion

All requirements for Milestone 2 have been implemented and verified against the unit test suite and full APK compilation. The Android app now features:
- Zero-friction auto-connect on startup and network handover.
- 4-tier rapid discovery hierarchy.
- Seamless `SSBPAIR://` and legacy QR code pairing.
- Idempotent upload deduplication via `capture_id`.
- 5-step exponential backoff retry with offline image retention.
- Complete removal of hardcoded IP addresses.
- Structured diagnostic logging.

---

## 5. Verification Method

To independently verify the implementation:

1. **Run Full Debug Unit Test Suite:**
   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   cd sih26188_project/android-screening
   ./gradlew testDebugUnitTest --no-daemon
   ```
   **Result:** `BUILD SUCCESSFUL` (All tests pass, including `WifiUtilsTest`, `SsbScreeningViewModelPollingTest`, `RepositoryNetworkRobustnessTest`, and `M4M5EmpiricalChallengeTest`).

2. **Assemble Debug APK:**
   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   cd sih26188_project/android-screening
   ./gradlew assembleDebug --no-daemon
   ```
   **Result:** `BUILD SUCCESSFUL` (Outputs `app/build/outputs/apk/debug/app-debug.apk`).

3. **Verify No Hardcoded Fallback IPs in Production Source:**
   ```bash
   grep -rn "192.168.1.61" app/src/main/
   ```
   **Result:** 0 matches.
