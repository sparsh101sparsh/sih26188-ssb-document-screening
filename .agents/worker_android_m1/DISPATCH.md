# Dispatch: Milestone 1 - Android Live Health Polling Loop

## Objective
Implement Requirement R1: Background 2-second polling loop in `SsbScreeningViewModel.kt` for the Android application located at `/Users/iamsparsh00321/Downloads/ssb-field-screening`.

## Reference Documents
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md`
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/PROJECT.md`
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_android_survey/survey_report.md`

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Task Details & Requirements
1. In `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt`:
   - Add a private coroutine job `healthPollingJob: kotlinx.coroutines.Job? = null`.
   - Implement `private fun startHealthPolling()` that cancels any existing job and launches a loop on `viewModelScope` with `while (isActive) { ... delay(2000L) }`.
   - In the polling loop, if `connectivityMode != ConnectivityMode.OFFLINE_OUTBOX`, call `repository.checkHealth(currentState.connectivityMode, currentState.customGatewayUrl)` and update `_uiState` with `gatewayHealth` and `gatewayLatencyMs`.
   - If `connectivityMode == ConnectivityMode.OFFLINE_OUTBOX`, update `_uiState` with `gatewayHealth = null` and `gatewayLatencyMs = 0L`.
   - Start the polling loop in `init`.
   - When `setConnectivityMode()` or `updateCustomGatewayUrl()` is called, ensure polling reflects the new configuration immediately.
   - Do NOT set `isGatewayChecking = true` inside the automatic background loop (avoid UI jitter), but preserve `isGatewayChecking = true` for manual `checkGatewayHealth()`.
2. Build and verify using:
   `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug`
   `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew testDebugUnitTest`

## 2026-08-23T17:26:00Z
You are Worker Android M1.
Your working directory is `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_android_m1`.
Task:
Implement the 2-second live health polling loop in `SsbScreeningViewModel.kt` at `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt`.
Ensure:
1. `healthPollingJob` launches a coroutine on `viewModelScope` with `while (isActive) { ... delay(2000L) }`.
2. Telemetry (`gatewayHealth` and `gatewayLatencyMs`) updates continuously.
3. In `OFFLINE_OUTBOX` mode, health is cleared without network calls.
4. Mode/URL changes trigger polling immediately.
5. Manual pinging via `checkGatewayHealth()` still works with spinner indication.
6. Verify your work by running:
   `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug`
   `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew testDebugUnitTest`
   in `/Users/iamsparsh00321/Downloads/ssb-field-screening`.
7. Write your full report and test verification evidence to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_android_m1/handoff.md`.
8. Send a message to parent when done.
