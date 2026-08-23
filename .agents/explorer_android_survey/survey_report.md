# Android Survey & Architectural Investigation Report

**Subagent**: Android Survey Explorer  
**Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_android_survey`  
**Target Repository**: `/Users/iamsparsh00321/Downloads/ssb-field-screening`  
**Timestamp**: 2026-08-23T17:25:00Z  

---

## Executive Summary

This report delivers a comprehensive structural and behavioral analysis of the Android Field Screening application for **Requirement R1 (Android Live Health Polling Loop)**.

The Android codebase is situated at `/Users/iamsparsh00321/Downloads/ssb-field-screening`. It is a modern Jetpack Compose + Kotlin Coroutines + Retrofit + Moshi + Room application targeting Android 14+ (SDK 36, minSdk 24).

The investigation verified that:
1. `SsbScreeningViewModel.kt` currently performs only a single, one-time call to `checkGatewayHealth()` in its `init` block (line 99) and upon manual user interactions (changing connectivity mode, editing custom gateway URL, or clicking manual PING).
2. No recurring background polling loop exists in the Android client. Consequently, live connectivity status in the app and on the edge gateway backend (`/api/v1/devices` tracked by `DeviceTracker`) is static unless an inspection transaction is executed.
3. The project builds cleanly with `./gradlew assembleDebug` and passes all unit tests using the Android Studio bundled JDK (`/Applications/Android Studio.app/Contents/jbr/Contents/Home`).

---

## 1. Exact File Paths and Line Numbers

### 1.1 Android Project Directory Structure
```
/Users/iamsparsh00321/Downloads/ssb-field-screening/
├── app/
│   ├── build.gradle.kts
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   └── java/com/ssb/fieldscreening/
│       │       ├── MainActivity.kt
│       │       ├── data/
│       │       │   ├── local/ (OutboxDao.kt, OutboxEntity.kt, SsbDatabase.kt)
│       │       │   ├── model/ (InspectionModels.kt, PresetScenarios.kt)
│       │       │   ├── remote/ (SsbApiService.kt)
│       │       │   └── repository/ (SsbRepository.kt)
│       │       ├── ui/
│       │       │   ├── MainScreen.kt
│       │       │   ├── components/ (HeaderBar.kt, GatewayDiagnosticsView.kt, ...)
│       │       │   ├── theme/ (Color.kt, Theme.kt, Type.kt)
│       │       │   └── viewmodel/ (SsbScreeningViewModel.kt)
│       │       └── util/ (ImageUtils.kt)
│       └── test/java/com/ssb/fieldscreening/
│           ├── RepositoryNetworkRobustnessTest.kt
│           ├── CameraPipelineTest.kt
│           ├── ImageUtilsTest.kt
│           └── M4M5EmpiricalChallengeTest.kt
├── build.gradle.kts
├── settings.gradle.kts
├── local.properties
└── gradlew
```

### 1.2 Key File Locations & Line References

| File | Absolute Path | Critical Lines | Purpose |
|------|---------------|----------------|---------|
| **`SsbScreeningViewModel.kt`** | `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt` | `45-73`<br>`97-100`<br>`188-191`<br>`241-272`<br>`274-277` | UI State (`ScreeningUiState`), `init` block (one-time check), `checkGatewayHealth()`, `setConnectivityMode()`, `updateCustomGatewayUrl()` |
| **`SsbRepository.kt`** | `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt` | `42-62`<br>`64-131`<br>`210-229` | `checkHealth(mode, customBaseUrl)` returning `Pair<HealthResponse?, Long>`, `inspectDocument()`, `autoDetectGateway()` |
| **`SsbApiService.kt`** | `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/data/remote/SsbApiService.kt` | `20-33`<br>`35-58` | `@GET("api/v1/health") suspend fun getHealth(): Response<HealthResponse>`, `ApiClientFactory` with OkHttpClient (5s connect timeout) & Retrofit Moshi converter |
| **`InspectionModels.kt`** | `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt` | `12-16`<br>`33-39`<br>`41-49` | `ConnectivityMode` enum (`USB_TETHERED`, `AIR_GAPPED_WIFI`, `OFFLINE_OUTBOX`), `HealthResponse`, `ModelsLoadedMap` |
| **`HeaderBar.kt`** | `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/ui/components/HeaderBar.kt` | `170-220` | `connectivity_status_pill` composable rendering mode label, pulsing dot (`pulseAlpha`), and `gatewayLatencyMs` (e.g., `2MS LATENCY`) or `LOCAL QUEUE` |
| **`GatewayDiagnosticsView.kt`** | `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/ui/components/GatewayDiagnosticsView.kt` | `88-216` | Live hardware link status card, latency meter, accelerator engine badge, manual "PING" button (`ping_gateway_btn`) |
| **`MainScreen.kt`** | `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/ui/MainScreen.kt` | `83-99` | Top-level Compose host binding `uiState.gatewayHealth` and `uiState.gatewayLatencyMs` into `HeaderBar` |
| **`MainActivity.kt`** | `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/MainActivity.kt` | `12-24` | Android ComponentActivity hosting `MainScreen(viewModel = viewModel)` |

---

## 2. Current Implementation of Health Check & Gateway Connectivity

### 2.1 ViewModel Initialization & Health Trigger
In `SsbScreeningViewModel.kt` (lines 97-100):
```kotlin
init {
    // Initial health check
    checkGatewayHealth()
}
```
Currently, `checkGatewayHealth()` is executed **only once** upon ViewModel instantiation.

### 2.2 Health Check Execution (`checkGatewayHealth`)
In `SsbScreeningViewModel.kt` (lines 241-272):
```kotlin
fun checkGatewayHealth() {
    val currentState = _uiState.value
    if (currentState.connectivityMode == ConnectivityMode.OFFLINE_OUTBOX) {
        _uiState.update {
            it.copy(
                gatewayHealth = null,
                gatewayLatencyMs = 0L,
                isGatewayChecking = false
            )
        }
        return
    }

    viewModelScope.launch {
        _uiState.update { it.copy(isGatewayChecking = true) }
        val (health, latency) = repository.checkHealth(
            currentState.connectivityMode,
            currentState.customGatewayUrl
        )
        _uiState.update {
            it.copy(
                gatewayHealth = health ?: HealthResponse(
                    status = "simulated_edge_standby",
                    engineMode = "Local Rugged NPU / MPS",
                    modelsLoaded = com.ssb.fieldscreening.data.model.ModelsLoadedMap()
                ),
                gatewayLatencyMs = if (latency > 0) latency else 2L,
                isGatewayChecking = false
            )
        }
    }
}
```

### 2.3 Network Communication Layer (`SsbRepository.kt` & `SsbApiService.kt`)
In `SsbRepository.kt` (lines 42-62):
```kotlin
suspend fun checkHealth(mode: ConnectivityMode, customBaseUrl: String? = null): Pair<HealthResponse?, Long> =
    withContext(Dispatchers.IO) {
        val startTime = System.currentTimeMillis()
        val url = customBaseUrl?.takeIf { it.isNotBlank() } ?: mode.endpoint
        if (url.isBlank() || mode == ConnectivityMode.OFFLINE_OUTBOX) {
            return@withContext Pair(null, 0L)
        }
        try {
            val service = ApiClientFactory.createService(url)
            val response = service.getHealth()
            val latency = System.currentTimeMillis() - startTime
            if (response.isSuccessful && response.body() != null) {
                Pair(response.body(), latency)
            } else {
                Pair(null, latency)
            }
        } catch (e: Exception) {
            val latency = System.currentTimeMillis() - startTime
            Pair(null, latency)
        }
    }
```

### 2.4 End-to-End Connectivity Trace to Edge Gateway
- Edge FastAPI Backend (`sih26188_project/backend/app/main.py:123-143`) intercepts all incoming requests to `/api/v1/health` or `/api/v1/inspect` in an ASGI middleware.
- In this middleware, `device_tracker.record_activity(...)` is called with `client_ip`, `user_agent`, `endpoint`, `checkpoint_id`, and `latency_ms`.
- Without a periodic polling loop from Android, `DeviceTracker` never records the Android client as active until an actual document scan is sent.

---

## 3. Precise Changes Required for R1

### 3.1 Requirement Objective
Implement a background 2-second polling loop in `SsbScreeningViewModel.kt` to periodically query the Edge Gateway's `/api/v1/health` endpoint. This fulfills:
1. Continuous, live telemetry in the Android UI (`HeaderBar` connectivity pill and `GatewayDiagnosticsView`).
2. Periodic pinging of the backend edge server, enabling `DeviceTracker` to track the Android client as `ONLINE` with active ping timestamps and live latency metrics.

### 3.2 Architectural Plan for ViewModel
1. **Coroutine Polling Job Management**:
   - Declare `private var healthPollingJob: kotlinx.coroutines.Job? = null`.
   - Create `private fun startHealthPolling()` that cancels any existing `healthPollingJob` and launches a new coroutine on `viewModelScope`.
2. **Loop Structure & Lifecycle**:
   ```kotlin
   private fun startHealthPolling() {
       healthPollingJob?.cancel()
       healthPollingJob = viewModelScope.launch {
           while (isActive) {
               val currentState = _uiState.value
               if (currentState.connectivityMode != ConnectivityMode.OFFLINE_OUTBOX) {
                   val (health, latency) = repository.checkHealth(
                       currentState.connectivityMode,
                       currentState.customGatewayUrl
                   )
                   _uiState.update {
                       it.copy(
                           gatewayHealth = health ?: HealthResponse(
                               status = "simulated_edge_standby",
                               engineMode = "Local Rugged NPU / MPS",
                               modelsLoaded = com.ssb.fieldscreening.data.model.ModelsLoadedMap()
                           ),
                           gatewayLatencyMs = if (latency > 0) latency else 2L
                       )
                   }
               } else {
                   _uiState.update {
                       it.copy(
                           gatewayHealth = null,
                           gatewayLatencyMs = 0L
                       )
                   }
               }
               delay(2000L) // 2-second periodic polling interval
           }
       }
   }
   ```
3. **Trigger Points**:
   - Call `startHealthPolling()` in `init { ... }`.
   - When `setConnectivityMode()` or `updateCustomGatewayUrl()` is invoked, restart the polling loop (`startHealthPolling()`) or immediately poll.
   - For `fun checkGatewayHealth()` (manual PING from `GatewayDiagnosticsView`), retain ability to trigger an immediate check with `isGatewayChecking = true` without breaking the loop.

---

## 4. Potential Risks, Edge Cases, and Dependencies

1. **UI Jitter / Flicker with `isGatewayChecking`**:
   - `GatewayDiagnosticsView.kt` shows a spinner in the "PING" button when `isGatewayChecking == true`.
   - *Recommendation*: Do not toggle `isGatewayChecking = true` inside the automatic 2-second background loop. Only set `isGatewayChecking = true` during explicit user-initiated manual pings (`checkGatewayHealth(manual = true)`), so background polling silently refreshes telemetry without causing UI button flicker.
2. **Network Timeout Handling**:
   - `ApiClientFactory` sets `connectTimeout(5, TimeUnit.SECONDS)`.
   - If the gateway is unreachable, OkHttp blocks the coroutine for up to 5s before throwing an exception, making that cycle take 5s + 2s = 7s.
   - Because R2 specifies an 8-second timeout for `DeviceTracker`, 7s is within the 8s window. However, ensuring clean exception handling inside `checkHealth()` (which is already wrapped in `try-catch`) prevents crashes.
3. **Offline Mode Optimization**:
   - In `ConnectivityMode.OFFLINE_OUTBOX`, no HTTP requests are sent. The loop checks mode and simply waits `delay(2000L)` without burning network or battery.
4. **Coroutine Cleanup**:
   - Using `viewModelScope` guarantees all polling coroutines automatically cancel when the ViewModel lifecycle terminates (e.g. app process closed or ViewModel cleared).

---

## 5. Gradle Build & Test Verification

### 5.1 Project & Wrapper Locations
- **Project Directory**: `/Users/iamsparsh00321/Downloads/ssb-field-screening`
- **Gradle Wrapper**: `/Users/iamsparsh00321/Downloads/ssb-field-screening/gradlew`
- **Gradle Version**: `9.3.1` (Kotlin 2.2.21, AGP 8.8.0)

### 5.2 Java / JDK Environment
- The system default `java` is not in global PATH, but Android Studio JBR is available at:
  `/Applications/Android Studio.app/Contents/jbr/Contents/Home`

### 5.3 Verified Commands & Results

1. **Gradle Version Check**:
   ```bash
   JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew --version
   ```
   *Result*: `BUILD SUCCESSFUL` (Gradle 9.3.1, JVM 25.0.2).

2. **Debug APK Build**:
   ```bash
   JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
   ```
   *Result*: `BUILD SUCCESSFUL in 6s` (Generated debug APK and dex packages).

3. **Unit Tests Execution**:
   ```bash
   JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew testDebugUnitTest
   ```
   *Result*: `BUILD SUCCESSFUL in 3s` (32 test tasks up-to-date / passed).

---

## Conclusion & Readiness

The Android codebase is fully mapped, clean, and ready for R1 implementation. The implementer only needs to modify `SsbScreeningViewModel.kt` to introduce `startHealthPolling()` with a 2-second interval, while preserving manual ping semantics and clean coroutine lifecycle management.
