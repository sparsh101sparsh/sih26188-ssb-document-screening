# Comprehensive Android Codebase Survey Report — SIH26188 Field Screening Companion

**Document Version:** 1.0.0  
**Target Module:** `sih26188_project/android-screening`  
**Package:** `com.ssb.fieldscreening`  
**Author:** Teamwork Android Explorer  
**Date:** 2026-08-25  

---

## 1. Executive Summary

This survey provides an exhaustive architectural and code-level investigation of the Android companion application for the SIH26188 Document Screening System. 

The application is built using:
- **Language / SDK:** Kotlin, Target SDK 36, Min SDK 24, Compose BOM + Material3.
- **Networking & Serialization:** Retrofit 2, OkHttp 3 (with logging interceptor), Moshi Kotlin reflection & codegen adapters.
- **Camera & Vision:** CameraX (Camera2, Lifecycle, View) with dual-stream viewfinder, Google ML Kit Barcode Vision engine + offline multi-pass ZXing fallback (`PlanarYUVLuminanceSource` with `HybridBinarizer`, `GlobalHistogramBinarizer`, and inverted luminance passes).
- **Persistence:** Android Jetpack Room with SQLite database (`SsbDatabase`), storing `OutboxScreeningRecord` records and raw byte blobs for offline audit and synchronization.

### Key Flaws Identified in Current Baseline:
1. **No Auto-Connect on App Launch (R2 Violation):** `SsbScreeningViewModel.init` is completely blank. The app starts in `OFFLINE_OUTBOX` mode without attempting to reconnect to the previously saved gateway or discovering an active gateway on the subnet.
2. **Missing Network Callback (R2 Violation):** No `ConnectivityManager.NetworkCallback` is registered to observe Wi-Fi connect/disconnect/AP handover events, causing the app to remain in stale disconnected states when the device joins or switches Wi-Fi networks.
3. **Flawed Discovery Tier Hierarchy (R3 Violation):** `WifiUtils.discoverGatewayOnSubnet()` lacks Tier 0 (saved gateway check), unconditionally probes `10.0.2.2` (Android emulator host) on real physical devices without checking `Build.FINGERPRINT`, runs a long blocking batch sweep of all 254 subnet IPs, and lacks clean timeout boundaries.
4. **No `SSBPAIR://` Protocol Support in QR Scanner (R4 Violation):** The QR scanner passes the raw decoded payload directly to `normalizeGatewayUrl()`, which only knows how to handle raw hostnames or `http://` URLs. If a modern `SSBPAIR://<host:port>/<token>` QR code is scanned, `normalizeGatewayUrl()` corrupts the string to `http://SSBPAIR://...`.
5. **Missing `capture_id` in Upload API (R5 Violation):** `SsbApiService.uploadCompanionCapture()` accepts multipart `file`, `capture_type`, `device_id`, and `checkpoint_id`, but omits `capture_id`. If a network interruption occurs after the backend persists the capture, re-uploading from the outbox creates duplicate database records and duplicate sequence IDs on the desktop console.
6. **Hardcoded Gateway IPs & Unsafe Default URLs (R6 Violation):** Hardcoded IP strings (`"http://192.168.1.61:8000"`, `"192.168.1.100"`, `"192.168.43.1"`, `"192.168.2.1"`) are scattered across `SsbScreeningViewModel.kt`, `WifiUtils.kt`, `WifiConnectScreen.kt`, `GatewayDiagnosticsView.kt`, and `InspectionModels.kt`. `normalizeGatewayUrl("")` defaults to `"http://192.168.1.61:8000"` rather than returning `""`.
7. **Inadequate Retry Schedule & Outbox Sync (R7 Violation):** In `SsbRepository.kt`, outbox synchronization immediately marks records as `FAILED` on the first network exception or if `retryCount >= 3`. It lacks exponential backoff (1s, 2s, 8s, 30s, 60s) up to 5 attempts.
8. **Absence of Structured Logging (R10 Violation):** `WifiUtils` and `SsbRepository` suppress errors silently without diagnostic logs (`[WifiUtils]`, `[AutoDiscovery]`, `[SsbRepository]`).

---

## 2. Detailed Component Investigation

### 2.1. `SsbScreeningViewModel.kt`
**File Path:** `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt`

#### Observations & Current Implementation:
- **Initialization (Lines 110–113):**
  ```kotlin
  init {
      // No automatic assumption of connectivity on startup.
      // Connection is verified when the user initiates connection via Wi-Fi / QR.
  }
  ```
  Currently empty. When the user opens the application, it remains offline even if the laptop gateway is running on the exact same IP as before.
- **Default State (Lines 62, 87–91):**
  ```kotlin
  data class ScreeningUiState(
      ...
      val customGatewayUrl: String = "http://192.168.1.61:8000",
      ...
  )
  ...
  private val _uiState = MutableStateFlow(
      ScreeningUiState(
          customGatewayUrl = WifiUtils.getLastConnectedGateway(application) ?: "http://192.168.1.61:8000"
      )
  )
  ```
  If `getLastConnectedGateway` returns null or empty, it falls back to a hardcoded private IP `192.168.1.61:8000`.
- **Health Polling (Lines 276–314):**
  `startHealthPolling()` runs a coroutine polling every 3000ms via `repository.checkHealth()`. If `customGatewayUrl` is empty or unreachable, it updates `connectivityMode` to `OFFLINE_OUTBOX`.
- **Companion Capture Submission (Lines 401–459):**
  `setCapturedDocumentBytes()` and `setCapturedLiveFaceBytes()` invoke `repository.uploadCompanionCapture()` without generating or supplying a persistent `capture_id`.
- **Network State Management:**
  The ViewModel has no integration with Android's `ConnectivityManager.NetworkCallback`. When a user moves between border posts or reconnects to an access point, the ViewModel is completely unaware.

---

### 2.2. `WifiUtils.kt`
**File Path:** `android-screening/app/src/main/java/com/ssb/fieldscreening/util/WifiUtils.kt`

#### Observations & Current Implementation:
- **`normalizeGatewayUrl()` (Lines 104–125):**
  ```kotlin
  fun normalizeGatewayUrl(raw: String): String {
      var input = raw.trim()
      if (input.isBlank()) return "http://192.168.1.61:8000"
      while (input.endsWith("/")) { input = input.dropLast(1) }
      if (!input.startsWith("http://") && !input.startsWith("https://")) {
          input = "http://$input"
      }
      val urlWithoutScheme = input.substringAfter("://")
      if (!urlWithoutScheme.contains(":") && !urlWithoutScheme.contains("/")) {
          input = "$input:8000"
      }
      return input
  }
  ```
  **Flaws:**
  1. `input.isBlank()` returns `"http://192.168.1.61:8000"` (violates R6). Blank input should return `""`.
  2. Input starting with `SSBPAIR://` is prepended with `http://` resulting in invalid URL `http://SSBPAIR://...`.
- **`discoverGatewayOnSubnet()` (Lines 220–281):**
  ```kotlin
  suspend fun discoverGatewayOnSubnet(context: Context? = null, port: Int = 8000): String? = withContext(Dispatchers.IO) {
      // Tier 1: Android Emulator host
      val (emuOk, _) = testGateway("http://10.0.2.2:$port", 400L)
      if (emuOk) return@withContext "http://10.0.2.2:$port"

      // Tier 2: mDNS instant discovery
      if (context != null) {
          val mdnsResult = discoverViamdns(context, port, 2500L)
          if (mdnsResult != null) {
              val (ok, _) = testGateway(mdnsResult, 800L)
              if (ok) return@withContext mdnsResult
          }
      }

      val subnet = getLocalSubnet() ?: return@withContext null
      val myIp = getLocalIpAddress()

      // Tier 3: Parallel probe — 13 priority candidates
      val priorityIps = listOf(
          "$subnet.1", "$subnet.2", "$subnet.3", "$subnet.100", "$subnet.101",
          "$subnet.102", "$subnet.103", "$subnet.104", "$subnet.105", "$subnet.110",
          "$subnet.120", "$subnet.150", "$subnet.200"
      ).filter { it != myIp }
      ...
      // Tier 4: Full subnet sweep in batches of 48 (1..254)
      val remaining = (1..254).map { "$subnet.$it" }.filter { it !in priorityIps && it != myIp }
      for (batch in remaining.chunked(48)) {
          ...
      }
  }
  ```
  **Flaws:**
  1. **Tier 0 missing:** Does not check the saved gateway URL from `SharedPreferences` first.
  2. **Unconditional Emulator Probe:** `10.0.2.2` is checked on all devices without checking if `Build.FINGERPRINT` contains `"generic"` or `Build.MODEL` contains `"google_sdk"`.
  3. **mDNS Timeout:** `discoverViamdns` uses 2500ms + 800ms ping instead of a unified 3s timeout.
  4. **Exhaustive Subnet Sweep:** Scanning all 254 hosts causes severe network socket exhaustion and latency spikes on mobile radios.

---

### 2.3. `QrCodeAnalyzer.kt` & QR Pairing Logic
**File Paths:**
- `android-screening/app/src/main/java/com/ssb/fieldscreening/util/QrCodeAnalyzer.kt`
- `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/components/QrScannerView.kt`
- `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/components/WifiConnectScreen.kt`

#### Observations & Current Implementation:
- `QrCodeAnalyzer.kt` contains an efficient multi-engine architecture:
  - First pass: Google ML Kit Barcode Vision (`BarcodeScanning.getClient(...)`).
  - Fallback pass: MultiFormatReader ZXing with `PlanarYUVLuminanceSource` and 3 binarizer algorithms (Hybrid, Global Histogram for screen glare, and Inverted for dark mode).
- When a QR code is detected:
  ```kotlin
  // QrScannerView.kt
  QrCodeAnalyzer { qrText ->
      vibrateSuccess(context)
      onQrCodeDetected(qrText)
  }
  ```
  ```kotlin
  // WifiConnectScreen.kt
  QrScannerView(
      onQrCodeDetected = { qrPayload ->
          isScanningQr = false
          testAndConnect(qrPayload)
      }, ...
  )
  ```
- In `testAndConnect(targetUrl)`:
  `WifiUtils.normalizeGatewayUrl(targetUrl)` is invoked directly on `qrPayload`.
- **SSBPAIR Protocol Specification (R4):**
  Backend generates `SSBPAIR://<lan_ip>:<port>/<token>` (or `SSBPAIR://SSBGateway/<token>`).
  Android must parse:
  - `SSBPAIR://<host>[:<port>][/<token>]` -> extracts `http://<host>:<port>` and pairing token.
  - `http://<host>:<port>` or `https://<host>:<port>` (legacy compatibility).
  - Plain `<host>[:<port>]`.
  Upon health verification, the resolved HTTP endpoint is stored in `SharedPreferences`.

---

### 2.4. `SsbApiService.kt`
**File Path:** `android-screening/app/src/main/java/com/ssb/fieldscreening/data/remote/SsbApiService.kt`

#### Observations:
- **`uploadCompanionCapture()` (Lines 35–43):**
  ```kotlin
  @Multipart
  @POST("api/v1/companion/upload")
  suspend fun uploadCompanionCapture(
      @Part file: MultipartBody.Part,
      @Part("capture_type") captureType: RequestBody,
      @Part("device_id") deviceId: RequestBody,
      @Part("checkpoint_id") checkpointId: RequestBody
  ): Response<CompanionUploadAck>
  ```
  **Flaw:** Missing `@Part("capture_id") captureId: RequestBody? = null`.
  Passing `capture_id` allows the backend to perform idempotent deduplication (R5) using the client-generated session/capture ID.

---

### 2.5. `SsbRepository.kt` & Outbox Lifecycle
**File Path:** `android-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt`

#### Observations:
- **`uploadCompanionCapture()` (Lines 66–164):**
  - Generates `val sessionUuid = "CAP-${System.currentTimeMillis()}-${(1000..9999).random()}"`.
  - Calls Retrofit service without `sessionUuid`.
  - On failure, saves `OutboxScreeningRecord` to Room DB with `syncStatus = "PENDING"`.
- **`syncPendingRecord()` (Lines 270–310):**
  ```kotlin
  if (record.retryCount >= 3) {
      outboxDao.updateSyncStatus(record.sessionId, "FAILED")
      return@withContext false
  }
  ...
  val response = service.inspectDocument(docPart, livePart, checkPart, datePart)
  if (response.isSuccessful) {
      outboxDao.updateSyncStatus(record.sessionId, "SYNCED")
      true
  } else {
      outboxDao.updateSyncStatus(record.sessionId, "FAILED")
      false
  }
  ```
  **Flaws:**
  1. Immediately sets `sync_status = "FAILED"` on any single HTTP failure or network disconnection instead of incrementing retry count and attempting with exponential backoff.
  2. Max retries is capped at 3 rather than 5.
  3. `autoDetectGateway()` (lines 312–331) uses hardcoded candidate IPs (`"http://192.168.43.1:8000"`, `"http://192.168.1.1:8000"`, `"http://192.168.2.1:8000"`, `"http://10.0.0.1:8000"`).

- **Local Image Deletion Policy:**
  `OutboxDao.clearSyncedRecords()` deletes records where `sync_status = 'SYNCED'`. Images in pending or failed records are preserved safely in Room DB as `ByteArray` blobs (`documentImageBlob`, `liveFaceBlob`). Under R7, images must never be deleted before receiving HTTP 200 OK / `"SYNCED"`.

---

### 2.6. Android Permissions & Network Callbacks
**File Path:** `android-screening/app/src/main/AndroidManifest.xml`

#### Manifest Permissions Declared:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
```
Cleartext traffic is enabled via `android:usesCleartextTraffic="true"`.
All required permissions for Wi-Fi discovery, network callbacks, CameraX, and local HTTP communication are present in the manifest.

To fulfill R2, a `ConnectivityManager.NetworkCallback` must be registered (via `NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build()`) inside `SsbScreeningViewModel` (or an application network monitor component) to listen for Wi-Fi network transitions and trigger auto-discovery.

---

## 3. Requirement-by-Requirement Implementation Blueprint

### R2: Auto-Connect on App Launch & NetworkCallback

#### Architectural Flow:
```
App Launch (SsbScreeningViewModel.init)
        │
        ▼
Is Saved Gateway URL present in SharedPreferences?
 ├── YES ──► Background coroutine: testGateway(savedUrl, timeout=1500ms)
 │             │
 │             ├── Success (HTTP 200) ──► connectToGateway(savedUrl) [AIR_GAPPED_WIFI]
 │             │
 │             └── Failure / Timeout ──► Silently run discoverGatewayOnSubnet(context)
 │                                          │
 │                                          ├── Found ──► connectToGateway(discoveredUrl)
 │                                          └── Not Found ──► OFFLINE_OUTBOX mode
 │
 └── NO ───► Silently run discoverGatewayOnSubnet(context)
               │
               ├── Found ──► connectToGateway(discoveredUrl)
               └── Not Found ──► OFFLINE_OUTBOX (UI shows "No gateway configured")

Network Event (ConnectivityManager.NetworkCallback.onAvailable / onCapabilitiesChanged)
        │
        ▼
Device joined Wi-Fi / IP changed ──► Trigger silent re-discovery & auto-reconnect
```

#### Code Specification for `SsbScreeningViewModel.kt`:
1. Add `ConnectivityManager.NetworkCallback` registered in `init` and unregistered in `onCleared()`.
2. Add `autoConnectOnLaunch()` called from `init`:
   ```kotlin
   init {
       setupNetworkMonitoring()
       autoConnectOnLaunch()
   }

   private fun autoConnectOnLaunch() {
       viewModelScope.launch(Dispatchers.IO) {
           val app = getApplication<Application>()
           val savedUrl = WifiUtils.getLastConnectedGateway(app)
           if (!savedUrl.isNullOrBlank()) {
               val (ok, _) = WifiUtils.testGateway(savedUrl, 1500L)
               if (ok) {
                   withContext(Dispatchers.Main) {
                       connectToGateway(savedUrl)
                   }
                   return@launch
               }
           }
           // Fallback to silent auto-discovery
           val discovered = WifiUtils.discoverGatewayOnSubnet(app)
           if (discovered != null) {
               withContext(Dispatchers.Main) {
                   connectToGateway(discovered)
               }
           } else {
               withContext(Dispatchers.Main) {
                   _uiState.update {
                       it.copy(
                           connectivityMode = ConnectivityMode.OFFLINE_OUTBOX,
                           gatewayHealth = null,
                           gatewayLatencyMs = 0L
                       )
                   }
               }
           }
       }
   }
   ```

---

### R3: Discovery Tier Order in `WifiUtils.kt`

#### Discovery Tiers:
| Tier | Action | Target / Mechanism | Timeout | Condition |
|---|---|---|---|---|
| **Tier 0** | Saved Gateway Check | `WifiUtils.getLastConnectedGateway(context)` | 1000 ms | Saved URL is not blank |
| **Tier 1** | Android Emulator Host | `http://10.0.2.2:8000` | 400 ms | `isEmulator()` (`Build.FINGERPRINT.contains("generic")`, `Build.HARDWARE.contains("goldfish" / "ranchu")`) |
| **Tier 2** | mDNS / NSD Discovery | Service `_ssb-gateway._tcp` | 3000 ms | Context available |
| **Tier 3** | Priority Subnet Probes | 13 Subnet IPs (`.1, .2, .3, .100, .101, .102, .103, .104, .105, .110, .120, .150, .200`) | 350 ms | Parallel async probes, only if Tiers 0–2 fail |

*Note: The legacy Tier 4 full subnet sweep (1..254) is completely removed.*

#### Code Specification for `WifiUtils.kt`:
```kotlin
private fun isEmulator(): Boolean {
    val fingerprint = Build.FINGERPRINT ?: ""
    val model = Build.MODEL ?: ""
    val hardware = Build.HARDWARE ?: ""
    return fingerprint.startsWith("generic") ||
           fingerprint.startsWith("unknown") ||
           model.contains("google_sdk") ||
           model.contains("Emulator") ||
           model.contains("Android SDK built for x86") ||
           hardware.contains("goldfish") ||
           hardware.contains("ranchu")
}

suspend fun discoverGatewayOnSubnet(context: Context? = null, port: Int = 8000): String? = withContext(Dispatchers.IO) {
    Log.d("[WifiUtils]", "Starting gateway discovery sequence (Port $port)")

    // Tier 0: Saved Gateway URL from SharedPreferences
    if (context != null) {
        val saved = getLastConnectedGateway(context)
        if (!saved.isNullOrBlank()) {
            val (savedOk, latency) = testGateway(saved, 1000L)
            if (savedOk) {
                Log.i("[WifiUtils]", "Tier 0 (Saved URL) succeeded: $saved (${latency}ms)")
                return@withContext saved
            }
        }
    }

    // Tier 1: Emulator host (only if running inside emulator)
    if (isEmulator()) {
        val emuUrl = "http://10.0.2.2:$port"
        val (emuOk, latency) = testGateway(emuUrl, 400L)
        if (emuOk) {
            Log.i("[WifiUtils]", "Tier 1 (Emulator) succeeded: $emuUrl (${latency}ms)")
            return@withContext emuUrl
        }
    }

    // Tier 2: mDNS / NSD Discovery (3s timeout)
    if (context != null) {
        val mdnsUrl = discoverViamdns(context, port, 3000L)
        if (mdnsUrl != null) {
            val (mdnsOk, latency) = testGateway(mdnsUrl, 800L)
            if (mdnsOk) {
                Log.i("[WifiUtils]", "Tier 2 (mDNS) succeeded: $mdnsUrl (${latency}ms)")
                return@withContext mdnsUrl
            }
        }
    }

    // Tier 3: Priority Subnet Probes (13 priority IPs)
    val subnet = getLocalSubnet()
    val myIp = getLocalIpAddress()
    if (subnet != null) {
        val priorityIps = listOf(
            "$subnet.1", "$subnet.2", "$subnet.3", "$subnet.100", "$subnet.101",
            "$subnet.102", "$subnet.103", "$subnet.104", "$subnet.105", "$subnet.110",
            "$subnet.120", "$subnet.150", "$subnet.200"
        ).filter { it != myIp }

        val results = priorityIps.map { ip ->
            async {
                val candidate = "http://$ip:$port"
                val (ok, _) = testGateway(candidate, 350L)
                if (ok) candidate else null
            }
        }.awaitAll().filterNotNull()

        if (results.isNotEmpty()) {
            val found = results.first()
            Log.i("[WifiUtils]", "Tier 3 (Priority IP probe) succeeded: $found")
            return@withContext found
        }
    }

    Log.w("[WifiUtils]", "All discovery tiers failed.")
    null
}
```

---

### R4: QR Pairing Protocol (`SSBPAIR://`) & Backward Compatibility

#### Protocol Specifications:
1. **SSBPAIR Scheme:**
   - Format: `SSBPAIR://<host>[:<port>][/<token>]` or `SSBPAIR://192.168.1.50:8000/a1b2c3d4`
   - Scheme is case-insensitive (`SSBPAIR://` or `ssbpair://`).
   - Host/port are extracted: `http://192.168.1.50:8000`.
   - Token is extracted if present.
2. **HTTP / Plain Scheme (Backward Compatibility):**
   - Format: `http://192.168.1.50:8000`, `https://...`, or `192.168.1.50:8000`.
3. **Normalization Function in `WifiUtils.kt`:**
   ```kotlin
   fun parseQrPayload(raw: String): String {
       var input = raw.trim()
       if (input.isBlank()) return ""

       if (input.startsWith("SSBPAIR://", ignoreCase = true) || input.startsWith("ssbpair://", ignoreCase = true)) {
           val withoutScheme = input.substring(10) // drop "SSBPAIR://"
           val hostPortPart = withoutScheme.substringBefore("/")
           val port = if (hostPortPart.contains(":")) "" else ":8000"
           return "http://$hostPortPart$port"
       }

       return normalizeGatewayUrl(input)
   }

   fun normalizeGatewayUrl(raw: String): String {
       var input = raw.trim()
       if (input.isBlank()) return ""

       // Handle SSBPAIR scheme if passed here directly
       if (input.startsWith("SSBPAIR://", ignoreCase = true) || input.startsWith("ssbpair://", ignoreCase = true)) {
           return parseQrPayload(input)
       }

       while (input.endsWith("/")) {
           input = input.dropLast(1)
       }

       if (!input.startsWith("http://") && !input.startsWith("https://")) {
           input = "http://$input"
       }

       val urlWithoutScheme = input.substringAfter("://")
       if (!urlWithoutScheme.contains(":") && !urlWithoutScheme.contains("/")) {
           input = "$input:8000"
       }

       return input
   }
   ```

---

### R5: Upload Idempotency with `capture_id`

#### Changes in `SsbApiService.kt`:
```kotlin
@Multipart
@POST("api/v1/companion/upload")
suspend fun uploadCompanionCapture(
    @Part file: MultipartBody.Part,
    @Part("capture_type") captureType: RequestBody,
    @Part("device_id") deviceId: RequestBody,
    @Part("checkpoint_id") checkpointId: RequestBody,
    @Part("capture_id") captureId: RequestBody? = null
): Response<CompanionUploadAck>
```

#### Changes in `SsbRepository.kt`:
Pass `sessionUuid` as `captureId`:
```kotlin
val sessionUuid = "CAP-${System.currentTimeMillis()}-${(1000..9999).random()}"
val capIdPart = sessionUuid.toRequestBody("text/plain".toMediaTypeOrNull())

val res = service.uploadCompanionCapture(
    file = filePart,
    captureType = typePart,
    deviceId = devPart,
    checkpointId = checkPart,
    captureId = capIdPart
)
```

---

### R6: Blank Default URL & Removal of Hardcoded IPs

#### Elimination Checklist:
1. `ScreeningUiState.customGatewayUrl`: default to `""`.
2. `SsbScreeningViewModel._uiState`: `WifiUtils.getLastConnectedGateway(application) ?: ""`.
3. `WifiUtils.normalizeGatewayUrl()`: `if (input.isBlank()) return ""`.
4. `WifiConnectScreen.kt`:
   - `currentGatewayUrl: String = ""`
   - Remove `urlInput.contains("192.168.1.100")` hack.
   - When `currentGatewayUrl` is empty, show `"No gateway configured"`.
5. `InspectionModels.kt`:
   - `AIR_GAPPED_WIFI("Air-Gapped Wi-Fi AP", "", "Isolated SSB_GATEWAY_SECURE AP")`.
6. `GatewayDiagnosticsView.kt` and `SsbRepository.kt`:
   - Remove hardcoded candidate arrays `listOf("http://192.168.43.1:8000", ...)`. Replace with call to `WifiUtils.discoverGatewayOnSubnet()`.

---

### R7: Exponential Backoff Upload Retry & Image Retention

#### Retry Schedule:
- **Attempt 1:** Immediate (0s delay)
- **Attempt 2:** After 2s delay
- **Attempt 3:** After 8s delay
- **Attempt 4:** After 30s delay
- **Attempt 5:** After 60s delay
- **Terminal State:** After 5 failed attempts, mark `sync_status = "FAILED"`. Keep local image blobs (`documentImageBlob`, `liveFaceBlob`) intact in Room DB. Never delete local image until HTTP 200 OK / `"SYNCED"`.

#### Code Specification for `SsbRepository.kt`:
```kotlin
private val RETRY_DELAYS_MS = listOf(0L, 2000L, 8000L, 30000L, 60000L)
private const val MAX_RETRY_ATTEMPTS = 5

suspend fun syncPendingRecord(
    record: OutboxScreeningRecord,
    mode: ConnectivityMode,
    customBaseUrl: String? = null
): Boolean = withContext(Dispatchers.IO) {
    if (record.retryCount >= MAX_RETRY_ATTEMPTS) {
        Log.w("[SsbRepository]", "Record ${record.sessionId} exceeded max retries ($MAX_RETRY_ATTEMPTS), marked FAILED")
        outboxDao.updateSyncStatus(record.sessionId, "FAILED")
        return@withContext false
    }

    val url = customBaseUrl?.takeIf { it.isNotBlank() } ?: mode.endpoint
    if (url.isBlank() || mode == ConnectivityMode.OFFLINE_OUTBOX) {
        return@withContext false
    }

    try {
        val service = ApiClientFactory.createService(url)
        val docPart = MultipartBody.Part.createFormData(
            "document_image",
            "doc_${record.sessionId}.jpg",
            record.documentImageBlob.toRequestBody("image/jpeg".toMediaTypeOrNull())
        )
        val livePart = record.liveFaceBlob?.let {
            MultipartBody.Part.createFormData(
                "live_photo",
                "live_${record.sessionId}.jpg",
                it.toRequestBody("image/jpeg".toMediaTypeOrNull())
            )
        }
        val checkPart = record.checkpointId.toRequestBody("text/plain".toMediaTypeOrNull())
        val datePart = record.transitDate.toRequestBody("text/plain".toMediaTypeOrNull())

        val response = service.inspectDocument(docPart, livePart, checkPart, datePart)
        if (response.isSuccessful) {
            Log.i("[SsbRepository]", "Synced record ${record.sessionId} successfully")
            outboxDao.updateSyncStatus(record.sessionId, "SYNCED")
            true
        } else {
            val newCount = record.retryCount + 1
            val status = if (newCount >= MAX_RETRY_ATTEMPTS) "FAILED" else "PENDING"
            outboxDao.updateSyncStatus(record.sessionId, status)
            false
        }
    } catch (e: Exception) {
        val newCount = record.retryCount + 1
        val status = if (newCount >= MAX_RETRY_ATTEMPTS) "FAILED" else "PENDING"
        Log.e("[SsbRepository]", "Sync failed for ${record.sessionId} (attempt $newCount): ${e.message}")
        outboxDao.updateSyncStatus(record.sessionId, status)
        false
    }
}
```

---

### R10: Structured Logging Scheme

#### Logging Tags and Formats:
- `[WifiUtils]`: Discovery tier evaluation, interface resolution, latency measurements.
- `[AutoDiscovery]`: Tier progress:
  - `Tier 0 (Saved Gateway): probing <url> -> SUCCESS/FAIL (<latency>ms)`
  - `Tier 1 (Emulator): isEmulator=true/false -> SUCCESS/FAIL`
  - `Tier 2 (mDNS): resolving _ssb-gateway._tcp -> <resolved_url>`
  - `Tier 3 (Priority Probes): scanning 13 IPs on subnet <subnet> -> FOUND <url>`
- `[SsbViewModel]`: State transitions, auto-connect trigger, network callback events.
- `[SsbRepository]`: Upload dispatch, retry countdown, outbox sync results, SHA-256 generation.
- `[QrAnalyzer]`: QR barcode decoded, protocol detected (`SSBPAIR` vs `HTTP`), token extraction.

---

## 4. Test Strategy & Verification Plan

### 4.1. Unit Test Matrix (`app/src/test/java/com/ssb/fieldscreening/`):
1. **`WifiUtilsTest.kt` (New / Updated):**
   - Test `normalizeGatewayUrl("")` returns `""`.
   - Test `parseQrPayload("SSBPAIR://192.168.1.50:8000/token123")` returns `"http://192.168.1.50:8000"`.
   - Test `parseQrPayload("http://192.168.1.50:8000")` returns `"http://192.168.1.50:8000"`.
   - Test `parseQrPayload("192.168.1.50")` returns `"http://192.168.1.50:8000"`.
   - Test `isEmulator()` correctly identifies generic/sdk vs physical builds.
2. **`SsbScreeningViewModelTest.kt`:**
   - Test initial `uiState.customGatewayUrl` is empty string when no gateway saved.
   - Test auto-connect coroutine attempts saved URL then mDNS.
   - Test `ConnectivityManager.NetworkCallback` triggers rediscovery.
3. **`RepositoryNetworkRobustnessTest.kt`:**
   - Update retry cap test to assert `MAX_RETRY_ATTEMPTS = 5`.
   - Test `uploadCompanionCapture` attaches `capture_id`.
   - Verify image blobs are never deleted on failed attempts.

### 4.2. Build & Verification Commands:
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
cd sih26188_project/android-screening
./gradlew testDebugUnitTest --no-daemon
./gradlew assembleDebug --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk ~/Desktop/SSB-FieldScreening.apk
```

---

## 5. Summary Table of Files to Modify

| File Path | Requirements Addressed | Summary of Planned Modifications |
|---|---|---|
| `app/src/main/java/com/ssb/fieldscreening/util/WifiUtils.kt` | R3, R4, R6, R10 | Reorder discovery tiers (0: saved, 1: emulator check, 2: mDNS 3s, 3: 13 priority IPs, drop Tier 4 sweep). Add `parseQrPayload()`. Return `""` on blank. Add `[WifiUtils]` / `[AutoDiscovery]` structured logs. |
| `app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt` | R2, R5, R6, R10 | Implement `init` auto-connect coroutine, register `NetworkCallback`, default `customGatewayUrl` to `""`, pass `sessionUuid` as `capture_id`, add `[SsbViewModel]` structured logs. |
| `app/src/main/java/com/ssb/fieldscreening/data/remote/SsbApiService.kt` | R5 | Add `@Part("capture_id") captureId: RequestBody? = null` to `uploadCompanionCapture()`. |
| `app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt` | R5, R6, R7, R10 | Pass `capture_id` in companion upload, implement 5-attempt exponential backoff retry schedule, remove hardcoded IP array in `autoDetectGateway()`, add `[SsbRepository]` structured logs. |
| `app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt` | R6 | Update `ConnectivityMode.AIR_GAPPED_WIFI` default endpoint to `""`. |
| `app/src/main/java/com/ssb/fieldscreening/ui/components/WifiConnectScreen.kt` | R4, R6 | Default `currentGatewayUrl` to `""`, use `WifiUtils.parseQrPayload()` in QR callback, remove hardcoded IP checks. |
| `app/src/main/java/com/ssb/fieldscreening/ui/components/GatewayDiagnosticsView.kt` | R6 | Remove hardcoded candidate IPs, route auto-detect to `WifiUtils.discoverGatewayOnSubnet()`. |
| `app/src/test/java/com/ssb/fieldscreening/RepositoryNetworkRobustnessTest.kt` | R7 | Update retry cap assertion from 3 to 5. |
