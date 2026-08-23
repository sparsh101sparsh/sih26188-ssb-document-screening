# Technical Survey Report: Android Field Screening Application

**Target Directory**: `/Users/iamsparsh00321/Downloads/ssb-field-screening`  
**Author**: Explorer 1 (Android Codebase Survey)  
**Date**: 2026-08-23  
**Status**: Comprehensive Technical Audit Complete  

---

## Executive Summary

The SSF / SSB Field Screening Android application is an offline-capable, field-oriented document and biometric verification application built with Kotlin, Jetpack Compose, Room (SQLite), Retrofit2, Moshi, and OkHttp. It is intended to interface with the Python FastAPI edge AI backend over local USB reverse tethering, isolated air-gapped Wi-Fi hotspots, or operate in fully local encrypted outbox mode on Indo-Nepal and Indo-Bhutan frontiers.

While the Compose UI and local Room architecture are well-structured, several critical architectural gaps, integration breaks, branding deficiencies, and dead-code bugs were identified:
1. **Critical CameraX Gap**: CameraX dependencies are completely commented out in `app/build.gradle.kts`; `DualCameraCaptureView.kt` contains only simulated canvas drawing with zero real camera lifecycle binding or image capture.
2. **Critical Integration Path Break**: The Android client requests `POST /api/v1/inspect`, but the backend mounts its master inspection router at `POST /api/v1/scan/inspect`, leading to a `404 Not Found` in real network requests.
3. **Generic Branding & Identity**: The application retains the placeholder package name `com.example`, applicationId `com.aistudio.ssbscreening.fzkvlp`, default Android launcher icons, and hardcoded officer credentials (`"OFFICER-SSB-8832"`).
4. **Google Services / Firebase Residuals**: The Google Services plugin and Firebase AI/AppCheck dependencies are declared without any `google-services.json` present in the repository.
5. **Dead Code & Logic Bugs**: A dead branch bug in `SsbRepository.kt` (`if (mode == OFFLINE_OUTBOX) "PENDING" else "PENDING"`), lack of retry count capping on outbox sync, and lack of exponential backoff network fallback.
6. **Navigation Redundancy**: 6 separate bottom tabs currently fragment the user workflow instead of a streamlined 3-tab layout (`CAPTURE`, `RESULTS`, `OUTBOX`) with expandable diagnostic accordions.

---

## 1. Gradle Configuration & Dependency Audit

### 1.1 Root Configuration
- **File**: `build.gradle.kts`
- **Declared Plugins**:
  - `libs.plugins.android.application` (AGP 9.1.1)
  - `libs.plugins.kotlin.compose` (Kotlin 2.2.10)
  - `libs.plugins.google.devtools.ksp` (KSP 2.3.5)
  - `libs.plugins.roborazzi` (1.59.0)
  - `libs.plugins.secrets` (2.0.1)
  - `libs.plugins.google.services` (4.5.0, applied `false` at root)

### 1.2 Module Configuration (`app/build.gradle.kts`)
- **Namespace**: `com.example` (Needs rename to `com.ssb.fieldscreening`)
- **Application ID**: `com.aistudio.ssbscreening.fzkvlp` (Needs rename to `com.ssb.fieldscreening`)
- **Compile SDK**: `release(36) { minorApiLevel = 1 }`
- **Min SDK**: `24` (Android 7.0 Nougat)
- **Target SDK**: `36` (Android 15+)
- **Java Compatibility**: `JavaVersion.VERSION_11` (Source & Target)
- **Build Features**: `compose = true`, `buildConfig = true`

### 1.3 Dependencies Status Analysis

| Dependency Group | Catalog Key | Version | Current State in `app/build.gradle.kts` | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **CameraX Camera2** | `androidx-camera-camera2` | `1.5.0` | **Commented Out** (Line 83) | **Uncomment & Activate** |
| **CameraX Core** | `androidx-camera-core` | `1.5.0` | **Commented Out** (Line 84) | **Uncomment & Activate** |
| **CameraX Lifecycle** | `androidx-camera-lifecycle` | `1.5.0` | **Commented Out** (Line 85) | **Uncomment & Activate** |
| **CameraX View** | `androidx-camera-view` | `1.5.0` | **Commented Out** (Line 86) | **Uncomment & Activate** |
| **Accompanist Permissions** | `accompanist-permissions` | `0.37.3` | **Active** (Line 81) | Keep & Wire into Camera UI |
| **Google Services Plugin** | `libs.plugins.google.services` | `4.5.0` | **Active** (Line 9, 74) | **Disable / Comment out** |
| **Firebase BOM** | `firebase-bom` | `34.17.0` | **Active** (Line 80) | **Disable / Comment out** |
| **Firebase AI** | `firebase-ai` | `34.17.0` | **Active** (Line 103) | **Disable / Comment out** |
| **Firebase AppCheck** | `firebase-appcheck-recaptcha` | `34.17.0` | **Active** (Line 113) | **Disable / Comment out** |
| **Room Runtime / KTX** | `androidx-room-runtime`, `ktx` | `2.7.0` | **Active** (Lines 99, 100) | Keep (Outbox DB) |
| **Room Compiler (KSP)** | `androidx-room-compiler` | `2.7.0` | **Active** (Line 137) | Keep |
| **Retrofit / Moshi** | `retrofit`, `converter-moshi` | `2.12.0` | **Active** (Lines 102, 120) | Keep |
| **OkHttp / Logging** | `okhttp`, `logging-interceptor` | `4.10.0` | **Active** (Lines 116, 118) | Keep |
| **Coil Compose** | `coil-compose` | `2.7.0` | **Active** (Line 101) | Keep |
| **Compose BOM** | `androidx-compose-bom` | `2024.09.00` | **Active** (Line 79) | Keep |

---

## 2. Package Hierarchy & Package Name Audit

### 2.1 File & Directory Tree
All 23 production Kotlin files currently live under `app/src/main/java/com/example/`:
```
app/src/main/java/
└── com/
    └── example/
        ├── MainActivity.kt
        ├── data/
        │   ├── local/
        │   │   ├── OutboxDao.kt
        │   │   ├── OutboxEntity.kt
        │   │   └── SsbDatabase.kt
        │   ├── model/
        │   │   ├── InspectionModels.kt
        │   │   └── PresetScenarios.kt
        │   ├── remote/
        │   │   └── SsbApiService.kt
        │   └── repository/
        │       └── SsbRepository.kt
        └── ui/
            ├── MainScreen.kt
            ├── components/
            │   ├── AssessmentSummaryCard.kt
            │   ├── CrossValidationMatrix.kt
            │   ├── DiscrepancyDiffTable.kt
            │   ├── DualCameraCaptureView.kt
            │   ├── GatewayDiagnosticsView.kt
            │   ├── HeaderBar.kt
            │   ├── InspectionPipelineTrace.kt
            │   ├── OfficerDecisionCard.kt
            │   ├── OutboxScreen.kt
            │   └── PresetBar.kt
            ├── theme/
            │   ├── Color.kt
            │   ├── Theme.kt
            │   └── Type.kt
            └── viewmodel/
                └── SsbScreeningViewModel.kt
```

### 2.2 Test Directories
```
app/src/test/java/com/example/
├── ExampleRobolectricTest.kt
├── ExampleUnitTest.kt
└── GreetingScreenshotTest.kt

app/src/androidTest/java/com/example/
└── ExampleInstrumentedTest.kt
```

### 2.3 `com.example` Reference Inventory
A total of **85 occurrences** of `com.example` exist across the codebase:
- `app/build.gradle.kts`: Line 13 (`namespace = "com.example"`)
- `app/src/main/AndroidManifest.xml`: Lines 18, 20, 23 (Theme reference and `.MainActivity`)
- `app/src/main/java/com/example/ui/viewmodel/SsbScreeningViewModel.kt`: Lines 1, 7-18, 224 (Hardcoded package qualifier `com.example.data.model.ModelsLoadedMap()`)
- `app/src/main/java/com/example/ui/MainScreen.kt`: Lines 1, 53-65, 179 (`com.example.ui.viewmodel.ScreeningUiState`)
- All 23 production source files (package headers & cross-package imports)
- All 4 test files (`ExampleRobolectricTest.kt`, `ExampleUnitTest.kt`, `GreetingScreenshotTest.kt`, `ExampleInstrumentedTest.kt`)

**Rename Target**: `com.ssb.fieldscreening`
Refactor directory path: `app/src/main/java/com/ssb/fieldscreening/...`

---

## 3. Detailed Component & Source Inspection

### 3.1 `DualCameraCaptureView.kt`
- **Current Mechanism**:
  - Implements a pure Compose Canvas mockup with animated laser scan line (`infiniteRepeatable` with `tween(2200)`).
  - Displays static reticles: corner alignment brackets for document view and an oval reticle with `Icons.Default.Face` for live face view.
  - Draws simulated red bounding boxes when `showHeatmapOverlay` is toggled on `forged_aadhaar`.
- **Gaps**:
  - Zero CameraX imports or API usages.
  - No `AndroidView` holding `androidx.camera.view.PreviewView`.
  - No `ProcessCameraProvider` initialization or lifecycle binding (`ProcessCameraProvider.getInstance(context)`).
  - No `ImageCapture` use cases for document (rear camera) or selfie (front camera).
  - No photo capture triggers; the buttons ("EVALUATE & SCREEN TRAVELER", "Rescan") simply invoke `onRunInspection()` which passes synthetic byte arrays.

### 3.2 `SsbScreeningViewModel.kt`
- **State Structure** (`ScreeningUiState`):
  - `selectedPreset`: Defaults to `PRESET_SCENARIOS[1]` (Forged Aadhaar).
  - `currentInspection`: Defaults to scenario 1 response.
  - `connectivityMode`: Defaults to `ConnectivityMode.USB_TETHERED`.
  - `selectedCheckpoint`: Defaults to Sonauli (`DEFAULT_CHECKPOINTS[0]`).
  - `officerId`: Hardcoded `"OFFICER-SSB-8832"` (Violation of R3 & R6: must be `""` to enforce login/identification).
  - `officerName`: Hardcoded `"Insp. R. Verma"`.
  - `customGatewayUrl`: Defaults to `"http://127.0.0.1:8000"`.
  - `activeScreen`: Defaults to `NavigationScreen.SCREENING_CONSOLE`.
- **Inspection Flow**:
  - `runInspection()` simulates a 4-stage progression with artificial `delay()` calls (120ms, 140ms, 130ms, 90ms).
  - Hardcodes mock bytes: `val docBytes = ByteArray(1024) { 0x42 }`, `val faceBytes = ByteArray(512) { 0x33 }`.
  - Passes these bytes to `repository.inspectDocument(...)`.
- **Gateway Health Check**:
  - When in `OFFLINE_OUTBOX`, sets health to null.
  - Fallback health response uses hardcoded `com.example.data.model.ModelsLoadedMap()`.

### 3.3 `SsbRepository.kt`
- **Health Check** (`checkHealth`):
  - Accurately measures HTTP round-trip latency (`System.currentTimeMillis() - startTime`).
- **Inspection Method** (`inspectDocument`):
  - Builds multipart parts for `document_image`, `live_photo`, `checkpoint_id`, `transit_date`.
  - Fallback logic creates a synthetic response or clones the active preset scenario with a fresh session ID and SHA-256 audit hash.
- **Dead Code Bug (Line 120)**:
  ```kotlin
  val syncStatus = if (mode == ConnectivityMode.OFFLINE_OUTBOX) "PENDING" else "PENDING"
  ```
  Both branches evaluate to `"PENDING"`.
- **Missing Network Resilience**:
  - No retry loop with exponential backoff before falling back to local/preset inspection.
- **Outbox Sync** (`syncPendingRecord`):
  - Uploads pending record to gateway. Does not verify or respect `retryCount` threshold before marking failed.

### 3.4 `SsbApiService.kt`
- **Path Definition**:
  ```kotlin
  @Multipart
  @POST("api/v1/inspect")
  suspend fun inspectDocument(...)
  ```
- **Mismatch**: Backend `scan.py` router has prefix `/api/v1/scan` with `@router.post("/inspect")`, resolving to `/api/v1/scan/inspect`. Calls to `/api/v1/inspect` fail with `404 Not Found` on current backend.

### 3.5 `OutboxEntity.kt` & `OutboxDao.kt`
- **Schema (`outbox_screening_records`)**:
  - Columns: `id` (PK autoincrement), `session_id` (Unique index), `checkpoint_id`, `officer_id`, `transit_date`, `document_image_blob` (BLOB), `live_face_blob` (BLOB), `inspection_response_json`, `risk_score`, `risk_level`, `audit_hash`, `created_at`, `sync_status` (Index), `retry_count` (`Int = 0`), `officer_decision`, `traveler_name`, `document_number`.
  - Database name: `ssb_field_screening.db` (Room Database version 1).
- **Dao Operations**:
  - Supports streaming queries via Kotlin Coroutines `Flow` (`getAllRecords`, `getPendingRecords`, `getPendingCount`).
  - Update query: `UPDATE outbox_screening_records SET sync_status = :status, retry_count = retry_count + 1 WHERE session_id = :sessionId`.

### 3.6 `PresetScenarios.kt`
- Contains 4 rich scenarios:
  1. `clean_passport`: "ARJUN SHARMA", "Z9018241", Green auto-clear.
  2. `forged_aadhaar`: "ARJUN SHARMA", "9018-2410-8812", Red detain mandate.
  3. `tampered_stamp`: "TASHI DORJI", "BTN-TR-49102", Amber secondary hold.
  4. `presentation_spoof`: "VIKRAMADITYA SINGH", "N8829104", Red detain mandate.
- Per R6, names and numbers should be replaced with fictionalized test data (e.g. "OFFICER-TEST-0001", "TEST-DOC-001", "TRAVELER-TEST-01").

### 3.7 `Color.kt` & Design System
- Token mappings:
  - `Background`: `0xFF020617` (slate-950)
  - `Surface`: `0xFF0F172A` (slate-900)
  - `SurfaceRaised`: `0xFF1E293B` (slate-800)
  - `Border`: `0xFF334155` (slate-700)
  - `Accent`: `0xFF3B82F6` (blue-500)
  - `GreenPass`: `0xFF10B981` (emerald-500)
  - `AmberWarn`: `0xFFF59E0B` (amber-500)
  - `RedAlert`: `0xFFEF4444` (red-500)
  - `GoldEmblem`: `0xFFFBBF24` (gold-400)
- Fully aligned with Beautiful-UI / desktop frontend theme tokens.

---

## 4. Camera, Permissions, Compression & Upload Architecture

### 4.1 Required CameraX Architecture
To satisfy Requirement R2:
1. **Camera Provider**: `ProcessCameraProvider` managed via `remember { ... }` and `LocalContext.current`.
2. **Dual Camera Dual Viewport**:
   - Primary Viewport: Document Capture (Rear camera `CameraSelector.LENS_FACING_BACK`).
   - Secondary Viewport: Traveler Selfie (Front camera `CameraSelector.LENS_FACING_FRONT`).
3. **Capture Execution**:
   - Capture `ImageProxy` or file in-memory using `ImageCapture.takePicture(executor, object : OnImageCapturedCallback ...)`.
   - Convert image to `Bitmap`, rotate according to EXIF/orientation metadata.
4. **Image Compression**:
   - Downscale long edge to max `1280px` while maintaining aspect ratio:
     ```kotlin
     val ratio = min(1.0, 1280.0 / max(bitmap.width, bitmap.height))
     val scaledBitmap = Bitmap.createScaledBitmap(bitmap, (bitmap.width * ratio).toInt(), (bitmap.height * ratio).toInt(), true)
     ```
   - Compress to JPEG at `80%` quality into `ByteArrayOutputStream`.
5. **Permissions Handling**:
   - Use Accompanist `rememberPermissionState(Manifest.permission.CAMERA)` or Compose `rememberLauncherForActivityResult`.
   - If not granted, display high-contrast outdoor rationale card with "Grant Camera Permission" action button.
6. **Upload Handshake**:
   - Pass the captured `ByteArray` directly into `SsbScreeningViewModel.runInspection(documentBytes, liveFaceBytes)`.

---

## 5. App Identity, Branding & Asset Audit

### 5.1 App Manifest & Strings
- **`app/src/main/res/values/strings.xml`**:
  - Current: `<string name="app_name">SSB Screening</string>`
  - Target: `<string name="app_name">SSB Field Screening</string>`
- **`app/src/main/AndroidManifest.xml`**:
  - Uses `android:label="@string/app_name"`.
  - `android:usesCleartextTraffic="true"` is enabled (required for local HTTP `http://127.0.0.1:8000` and `http://192.168.2.1:8000`).
  - Permissions declared: `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`.

### 5.2 Launcher Icons & SSB Logo Source
- **Official SSB Logo**: Found at `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend/public/ssb_logo.png` (512x512 PNG, circular emblem with Ashoka lions, wreath, and "Sashastra Seema Bal - Service Security Brotherhood").
- **Current Mipmap Assets**:
  - `res/mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` reference `drawable/ic_launcher_foreground.xml` (a stylized shield vector) and `ic_launcher_background.xml`.
  - Raster mipmap directories (`hdpi`, `mdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) contain standard webp icons.
- **Icon Generation Plan**:
  - Resize `ssb_logo.png` across standard Android mipmap buckets using `sips` / Python PIL:
    - `mipmap-mdpi`: 48x48 px
    - `mipmap-hdpi`: 72x72 px
    - `mipmap-xhdpi`: 96x96 px
    - `mipmap-xxhdpi`: 144x144 px
    - `mipmap-xxxhdpi`: 192x192 px
  - Generate both standard `ic_launcher.png` / `ic_launcher.webp` and round `ic_launcher_round.png` / `ic_launcher_round.webp`.

### 5.3 Google Services & Firebase Cleanup
- `google-services.json` does not exist.
- In `app/build.gradle.kts`, disable plugin `alias(libs.plugins.google.services)` and comment out `firebase.bom`, `firebase.ai`, `firebase.appcheck.recaptcha`.
- This ensures offline air-gapped builds succeed cleanly without warning or external dependencies.

---

## 6. Navigation Architecture Survey

### 6.1 Current Layout (6 Screens)
The current UI in `MainScreen.kt` renders a bottom navigation bar with 6 horizontal tabs:
1. `SCREENING_CONSOLE`: Main viewport, preset bar, summary card, decision card.
2. `PIPELINE_TRACE`: Multi-stream pipeline breakdown (Streams 1-4).
3. `CROSS_VALIDATION`: 8-rule cross-assertion matrix.
4. `DISCREPANCY_DIFF`: Character-by-character forensic diff table.
5. `OUTBOX_AUDIT`: Outbox queue and transaction logs.
6. `GATEWAY_DIAGNOSTICS`: Gateway hardware status and IP configuration.

### 6.2 Target Redesign (3 Primary Tabs with Expandable Sections)
Per Requirement R4:
- **Bottom Navigation Bar**: Exactly 3 large touch-friendly tabs:
  1. `CAPTURE` (Camera preview, capture trigger, preset selector, live header telemetry).
  2. `RESULTS` (Dominant risk verdict badge, full-width colored alert banner, decision sign-off card, with expandable accordions for *Pipeline Trace*, *Cross-Validation Matrix*, and *Discrepancy Inspector*).
  3. `OUTBOX` (Encrypted queue audit, sync controls, transaction status counts).
- **Diagnostics Entry**: Accessible via Gateway / Latency pill in `HeaderBar` or dedicated settings modal.
- **Outdoor Visual Polish**:
  - Minimum touch target size: 56dp.
  - Pulsating glow animation for `RED` detain verdicts (`animateFloat` with `infiniteRepeatable`).
  - Shimmer loading state during AI inference.

---

## 7. Inventory of Dead Code, Bugs & Discrepancies

| Item | Location | Observation | Root Cause & Required Fix |
| :--- | :--- | :--- | :--- |
| **Dead Branch Bug** | `SsbRepository.kt:120` | `val syncStatus = if (mode == ConnectivityMode.OFFLINE_OUTBOX) "PENDING" else "PENDING"` | Both branches identical. Replace with `val syncStatus = "PENDING"`. |
| **Missing Sync Retry Capping** | `SsbRepository.kt:161-196` | `syncPendingRecord` attempts upload and updates status to `FAILED` without checking if `record.retryCount >= 3`. | Add check: if `record.retryCount >= 3`, mark permanently failed or skip. |
| **Hardcoded Officer ID** | `SsbScreeningViewModel.kt:49` | `val officerId: String = "OFFICER-SSB-8832"` | Default should be empty string `""` to require officer identification. |
| **Hardcoded Officer Name** | `SsbScreeningViewModel.kt:50` | `val officerName: String = "Insp. R. Verma"` | Default should be `""`. |
| **API Path Mismatch (404)** | `SsbApiService.kt:26` | `@POST("api/v1/inspect")` | Backend mounts at `/api/v1/scan/inspect`. Add alias route in backend `POST /api/v1/inspect` or update service. |
| **Missing Network Exponential Backoff** | `SsbRepository.kt:76-104` | Single HTTP attempt; falls back immediately upon error. | Add retry loop with delays: 1s, 2s, 4s before fallback to local engine. |
| **Missing Gateway Auto-Detect** | `GatewayDiagnosticsView.kt` | No auto-discovery button or network probing logic. | Implement gateway ping helper scanning `192.168.43.1`, `192.168.1.1`, `192.168.2.1`, `10.0.0.1`. |
| **Realistic Preset Data** | `PresetScenarios.kt` | Uses real citizen names like "Arjun Sharma", "Tashi Dorji". | Replace with fictional test tokens (`"OFFICER-TEST-0001"`, `"TEST-DOC-001"`, etc.). |
| **Hardcoded Package Qualifier** | `SsbScreeningViewModel.kt:224` | `modelsLoaded = com.example.data.model.ModelsLoadedMap()` | Package rename will cause compile error if fully qualified reference is not updated. |

---

## 8. Actionable Implementation Roadmap

1. **Step 1: Build & Package Renaming**
   - Refactor `app/src/main/java/com/example/` → `app/src/main/java/com/ssb/fieldscreening/`.
   - Update `app/build.gradle.kts`: `namespace = "com.ssb.fieldscreening"`, `applicationId = "com.ssb.fieldscreening"`.
   - Update `AndroidManifest.xml` and all imports across main and test sources.
   - Update `strings.xml`: app_name = `"SSB Field Screening"`.

2. **Step 2: Dependencies & Branding Assets**
   - Uncomment CameraX dependencies in `app/build.gradle.kts` (`camera2`, `core`, `lifecycle`, `view`).
   - Disable/comment out Google Services plugin and Firebase dependencies.
   - Convert and generate SSB logo mipmap icons for mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi.

3. **Step 3: Real CameraX Implementation**
   - Implement live `PreviewView` and `ImageCapture` in `DualCameraCaptureView.kt`.
   - Add camera switcher for rear (document) and front (selfie) views.
   - Add Accompanist permission rationale composable.
   - Implement JPEG compression utility (max 1280px on long edge, 80% quality).
   - Wire real capture `ByteArray` into ViewModel and Repository.

4. **Step 4: Network & Repository Hardening**
   - Add 3-attempt exponential backoff retry (1s, 2s, 4s) in `SsbRepository.inspectDocument()`.
   - Fix `"PENDING" else "PENDING"` dead branch.
   - Cap outbox retries at 3 in `syncPendingRecord()`.
   - Add auto-detect gateway IP button in `GatewayDiagnosticsView.kt`.
   - Clear default officer ID to `""`.
   - Sanitize `PresetScenarios.kt` with synthetic test identifiers.

5. **Step 5: UI/UX Streamlining**
   - Implement 3-tab navigation (`CAPTURE`, `RESULTS`, `OUTBOX`).
   - Embed *Pipeline Trace*, *Cross-Validation Matrix*, and *Discrepancy Inspector* as expandable cards inside `RESULTS`.
   - Add pulsating glow animation for RED verdict.
   - Verify build: `./gradlew assembleDebug`.
