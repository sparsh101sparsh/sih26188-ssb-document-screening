# Handoff Report: Android Codebase Survey & Requirement Mapping

**Agent:** `teamwork_preview_explorer` (Survey Android)  
**Recipient:** `teamwork_preview_orchestrator_2` (ID: `beb15e66-6467-4738-85f3-26af35b2238d`)  
**Scope:** Android Companion App (`sih26188_project/android-screening`)  
**Report Artifact:** `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_android/survey_android.md`  

---

## 1. Observation

### Exact Code References & Existing Implementation Flaws:

1. **`SsbScreeningViewModel.kt` (`app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt`):**
   - **Line 62 & 89:** `customGatewayUrl` defaults to `"http://192.168.1.61:8000"`.
   - **Lines 110–113:**
     ```kotlin
     init {
         // No automatic assumption of connectivity on startup.
         // Connection is verified when the user initiates connection via Wi-Fi / QR.
     }
     ```
     `init` is empty — no auto-reconnect or silent mDNS discovery is triggered on app startup.
   - **Lines 401–459:** `setCapturedDocumentBytes()` and `setCapturedLiveFaceBytes()` invoke `repository.uploadCompanionCapture()` without generating or forwarding a `capture_id`.
   - **Missing Network Listener:** No `ConnectivityManager.NetworkCallback` is registered.

2. **`WifiUtils.kt` (`app/src/main/java/com/ssb/fieldscreening/util/WifiUtils.kt`):**
   - **Line 106:** `if (input.isBlank()) return "http://192.168.1.61:8000"` in `normalizeGatewayUrl()`.
   - **Lines 220–281:** `discoverGatewayOnSubnet()` lacks Tier 0 (saved URL check), unconditionally probes `10.0.2.2` without checking `Build.FINGERPRINT` or emulator hardware markers, has non-unified mDNS timeouts (2500ms + 800ms ping), and runs an exhaustive 240-host batch sweep (Tier 4).
   - **No `SSBPAIR://` Parser:** `normalizeGatewayUrl("SSBPAIR://192.168.1.50:8000/token")` prepends `http://` resulting in `http://SSBPAIR://...`.

3. **`SsbApiService.kt` (`app/src/main/java/com/ssb/fieldscreening/data/remote/SsbApiService.kt`):**
   - **Lines 35–43:** `uploadCompanionCapture()` missing `@Part("capture_id") captureId: RequestBody? = null`.

4. **`SsbRepository.kt` (`app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt`):**
   - **Lines 270–310:** `syncPendingRecord()` checks `if (record.retryCount >= 3)` and immediately marks records `FAILED` on any single network error without exponential backoff.
   - **Lines 312–331:** `autoDetectGateway()` has hardcoded IP strings (`"http://192.168.43.1:8000"`, `"http://192.168.1.1:8000"`, `"http://192.168.2.1:8000"`, `"http://10.0.0.1:8000"`).

5. **`InspectionModels.kt` (`app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt`):**
   - **Line 14:** `AIR_GAPPED_WIFI` hardcodes `"http://192.168.2.1:8000"`.

6. **Build & Test Infrastructure Tool Execution:**
   - Command: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew testDebugUnitTest --no-daemon`
   - Result: `BUILD SUCCESSFUL in 1m 9s`, all 32 tasks executed / up-to-date.

---

## 2. Logic Chain

1. **Auto-Connect (R2):** Observation (1) shows `init` is empty and no network callback is registered. Therefore, adding an asynchronous background coroutine in `init` that tests the saved URL with 1.5s timeout, falls back to silent mDNS discovery via `discoverGatewayOnSubnet()`, and registers a `ConnectivityManager.NetworkCallback` on Wi-Fi state changes will ensure zero-tap automatic reconnection on every app launch and network handover.
2. **Discovery Tiers (R3):** Observation (2) shows that currently, discovery lacks Tier 0 (saved URL), performs an unconditional emulator check on physical devices, and runs a slow 254-host subnet sweep. Implementing Tier 0 (saved URL 1s timeout) -> Tier 1 (emulator check guarded by `isEmulator()`) -> Tier 2 (mDNS 3s timeout) -> Tier 3 (13 priority IPs) and eliminating the full sweep ensures sub-second to <3s discovery without socket starvation.
3. **QR Pairing (`SSBPAIR://`, R4):** Observation (2) shows `normalizeGatewayUrl` corrupts `SSBPAIR://` URIs. Introducing `parseQrPayload()` that extracts the host and port while preserving backward compatibility with `http://` and raw IPs solves pairing idempotency.
4. **Upload Idempotency (R5):** Observation (3) and (4) show `uploadCompanionCapture()` lacks `capture_id`. Adding `@Part("capture_id")` and passing `sessionId` ("CAP-...") prevents duplicate records in the backend SQLite store upon retry.
5. **Blank Default URL & Hardcoded IP Elimination (R6):** Observation (1), (2), (4), and (5) show hardcoded IPs (`192.168.1.61`, `192.168.1.100`, `192.168.43.1`, `192.168.2.1`). Defaulting `customGatewayUrl` to `""`, returning `""` on blank in `normalizeGatewayUrl`, and eliminating hardcoded fallback arrays resolves R6.
6. **Retry Schedule & Image Retention (R7):** Observation (4) shows immediate failure on retry count 3. Implementing the exponential backoff schedule (0s, 2s, 8s, 30s, 60s) up to 5 attempts while retaining `documentImageBlob` in Room DB until HTTP 200 ensures zero silent data loss.
7. **Structured Logging (R10):** Observation (2) and (4) show suppressed exceptions. Adding tags `[WifiUtils]`, `[AutoDiscovery]`, `[SsbViewModel]`, `[SsbRepository]`, `[QrAnalyzer]` satisfies R10.

---

## 3. Caveats

- Android tests require `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"` and the `--no-daemon` flag when running via CLI sandboxes.
- Robolectric tests in `RepositoryNetworkRobustnessTest.kt` contain an assertion for retry count 3 (`retryCount >= 3`), which will need updating to 5 once R7 is implemented.
- No caveats on production source code access or architecture clarity.

---

## 4. Conclusion

The Android codebase is well-structured, modular, and ready for the implementation of R2, R3, R4, R5, R6, R7, and R10. All 8 affected files and exact line locations have been mapped, detailed architectural blueprints and Kotlin code proposals have been authored in `survey_android.md`, and the Gradle build/test infrastructure has been verified.

---

## 5. Verification Method

### How to independently verify the survey and codebase:

1. **Inspect Report:**
   Read `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_android/survey_android.md`.
2. **Verify Target Source Files:**
   - `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt`
   - `android-screening/app/src/main/java/com/ssb/fieldscreening/util/WifiUtils.kt`
   - `android-screening/app/src/main/java/com/ssb/fieldscreening/util/QrCodeAnalyzer.kt`
   - `android-screening/app/src/main/java/com/ssb/fieldscreening/data/remote/SsbApiService.kt`
   - `android-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt`
   - `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/components/WifiConnectScreen.kt`
3. **Execute Android Build & Tests:**
   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/android-screening
   ./gradlew testDebugUnitTest --no-daemon
   ./gradlew assembleDebug --no-daemon
   ```
