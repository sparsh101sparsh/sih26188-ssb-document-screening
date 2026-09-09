## 2026-08-25T05:18:58Z
You are teamwork_preview_worker for Milestone 2: Android Auto-Connect, Discovery Tiers, QR Handling, Upload Retry & Idempotency.
Your working directory is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_m2_android
Project root: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project
User original request: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
Survey android report: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_android/survey_android.md
Scope document: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_orchestrator_2/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task in `sih26188_project/android-screening`:
1. `SsbScreeningViewModel.kt`:
   - On `init`, if saved gateway URL exists in SharedPreferences, immediately launch background coroutine to verify connection (1.5s timeout).
   - If success -> `connectToGateway(savedUrl)`.
   - If failure -> silently kick off mDNS discovery via `discoverGatewayOnSubnet()` and connect to discovered gateway.
   - Register `ConnectivityManager.NetworkCallback` on Wi-Fi changes to automatically trigger re-discovery when active network changes. Unregister cleanly in `onCleared()`.
   - Default `customGatewayUrl` to `""` in `ScreeningUiState`. UI shows "No gateway configured" when empty.
2. `WifiUtils.kt`:
   - In `discoverGatewayOnSubnet()`, enforce 4-tier discovery:
     - Tier 0: Saved gateway URL from SharedPreferences (1s timeout)
     - Tier 1: Emulator 10.0.2.2 (only if `Build.FINGERPRINT.contains("generic") || Build.MODEL.contains("google_sdk") || Build.HARDWARE.contains("goldfish") || Build.HARDWARE.contains("ranchu")`)
     - Tier 2: mDNS/NSD discovery (3s timeout)
     - Tier 3: Priority subnet probe (only if Tiers 0-2 fail, limited to 13 priority IPs, NO full 254-host subnet sweep on auto-start).
   - `normalizeGatewayUrl(input)`: Blank or empty input returns `""`.
   - Implement `parseQrPayload(raw: String): String` to parse `SSBPAIR://<host>:<port>/<token>` (and `SSBPAIR://<host>/<token>`), extract `http://<host>:<port>`, while retaining full backward compatibility for `http://` and raw host:port strings.
3. `QrCodeAnalyzer.kt` / `WifiConnectScreen.kt`:
   - Support `SSBPAIR://` protocol parsing via `WifiUtils.parseQrPayload()`.
   - Save endpoint to SharedPreferences on successful health check.
   - Remove hardcoded IP references (such as `192.168.1.61`).
4. `SsbApiService.kt`:
   - In `uploadCompanionCapture()`, add `@Part("capture_id") captureId: RequestBody? = null`.
5. `SsbRepository.kt`:
   - In `syncPendingRecord()` / `uploadCompanionCapture()`, pass `record.sessionId` as `capture_id`.
   - Implement 5-step exponential backoff retry: Attempt 1 immediate (0s), Attempt 2 after 2s, Attempt 3 after 8s, Attempt 4 after 30s, Attempt 5 after 60s.
   - Mark `sync_status = "FAILED"` after 5 failures and keep image. Never delete local image before 200 OK.
   - Remove hardcoded IPs in `autoDetectGateway()` / fallback lists.
6. Clean hardcoded IPs across other Android files:
   - `GatewayDiagnosticsView.kt`, `InspectionModels.kt`, etc.
7. Structured Logging (R10):
   - Add structured logging with tags `[WifiUtils]`, `[AutoDiscovery]`, `[SsbViewModel]`, `[SsbRepository]`, `[QrAnalyzer]`.
8. Tests & Build:
   - Update tests (e.g. `RepositoryNetworkRobustnessTest.kt` for retry count 5).
   - Run `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew testDebugUnitTest --no-daemon`.
   - Run `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew assembleDebug --no-daemon`.
   - Document commands and results in `handoff.md`.
9. Send completion message back to parent when done.
