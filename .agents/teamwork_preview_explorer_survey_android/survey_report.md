# Comprehensive Android Codebase Survey & Companion Camera Redesign Specification

**Project**: Smart India Hackathon 2026 (SIH26188) — AI-Based Fake Identity & Document Screening System  
**Client Application**: SSB Mobile Field Inspection Client / Live Companion Camera  
**Android Target Codebase**: `/Users/iamsparsh00321/Downloads/ssb-field-screening`  
**Backend Reference**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend`  
**Date**: August 2026  
**Status**: COMPLETE SURVEY & ARCHITECTURE REPORT  

---

## 1. Executive Summary

The frontline border checkpoint inspection architecture has evolved from an isolated mobile screening silo into a **Real-Time Live Companion Camera** architecture. In this paradigm:
1. The **Desktop Web Terminal** serves as the central inspection console where the officer pre-loads identity documents, oversees full multi-modal cross-validation, and makes authoritative clearance/detention decisions.
2. The **Android Mobile Client** functions as a high-speed, sunlight-legible **Companion Camera** held by the frontline officer. The officer captures the traveler's live face (or physical document), which immediately streams over USB reverse tether or local Wi-Fi to the edge desktop terminal.
3. The Android UI is transformed into an **ultra-clean whitish theme** (Apple Pro / Enterprise Clean) with high contrast for outdoor mountain checkposts, 56dp ergonomic touch targets, an unambiguous connection status pill, and instant verdict broadcast.

---

## 2. Android Codebase & Jetpack Compose Theme Survey

### 2.1 Project File Layout
```
ssb-field-screening/
├── app/
│   ├── build.gradle.kts                      # Gradle build config (Compose, CameraX, Room, Moshi, Retrofit)
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml           # Camera, Internet, Network state permissions
│       │   └── java/com/ssb/fieldscreening/
│       │       ├── MainActivity.kt           # Edge-to-edge component activity host
│       │       ├── ui/
│       │       │   ├── MainScreen.kt         # Scaffold, navigation host, 3 tabs (CAPTURE, RESULTS, OUTBOX)
│       │       │   ├── theme/
│       │       │   │   ├── Color.kt          # SsbColors token palette (Slate-50 ground, Pure White surfaces)
│       │       │   │   ├── Theme.kt          # SsbInspectionTheme wrapper
│       │       │   │   └── Type.kt           # Material 3 typography
│       │       │   ├── components/
│       │       │   │   ├── HeaderBar.kt      # Top bar with Checkpoint selector & Connection status pill
│       │       │   │   ├── DualCameraCaptureView.kt # CameraX preview & capture interface
│       │       │   │   ├── AssessmentSummaryCard.kt # Dominant verdict banner
│       │       │   │   ├── OfficerDecisionCard.kt   # Clear / Hold / Detain sign-off
│       │       │   │   ├── OutboxScreen.kt          # Offline encrypted audit queue
│       │       │   │   └── GatewayDiagnosticsView.kt# Edge connection diagnostics
│       │       │   └── viewmodel/
│       │       │       └── SsbScreeningViewModel.kt # StateFlows, health polling, companion upload
│       │       ├── data/
│       │       │   ├── local/ (OutboxDao.kt, OutboxEntity.kt, SsbDatabase.kt)
│       │       │   ├── model/ (InspectionModels.kt, PresetScenarios.kt)
│       │       │   ├── remote/ (SsbApiService.kt, ApiClientFactory)
│       │       │   └── repository/ (SsbRepository.kt)
│       │       └── util/ (ImageUtils.kt)
```

### 2.2 Jetpack Compose Theme Setup (`Color.kt`, `Theme.kt`, `Type.kt`)

#### Color Tokens (`Color.kt:5-59`)
The design system adopts a crisp, light, high-contrast surface stack with high outdoor sunlight legibility:
- **Base Ground (L0 Canvas)**: `SsbColors.BaseCanvas = Color(0xFFF8FAFC)` (Slate-50 soft off-white)
- **Container Surfaces (L2 Cards)**: `SsbColors.SupportingSurface = Color(0xFFFFFFFF)` (Pure White)
- **Input / Inset Wells (L-1)**: `SsbColors.SurfaceInset = Color(0xFFF1F5F9)` (Slate-100)
- **Interactive Surfaces (L3 Active)**: `SsbColors.InteractiveSurface = Color(0xFFE2E8F0)` (Slate-200)
- **Structural Borders**: `SsbColors.StructuralBorder = Color(0xFFE2E8F0)` (Hairline Slate-200)
- **Active / Focused Borders**: `SsbColors.ActiveBorder = Color(0xFFCBD5E1)` (Slate-300)
- **Typography**:
  - `TextPrimary = Color(0xFF0F172A)` (Slate-900 high contrast dark)
  - `TextSecondary = Color(0xFF475569)` (Slate-600 readable body text)
  - `TextMuted = Color(0xFF94A3B8)` (Slate-400 hint & telemetry labels)
- **Semantic Status**:
  - `GreenPass = Color(0xFF059669)` / `GreenBg = Color(0xFFECFDF5)` / `GreenBorder = Color(0xFFA7F3D0)`
  - `AmberWarn = Color(0xFFD97706)` / `AmberBg = Color(0xFFFFFBEB)` / `AmberBorder = Color(0xFFFDE68A)`
  - `RedAlert = Color(0xFFDC2626)` / `RedBg = Color(0xFFFEF2F2)` / `RedBorder = Color(0xFFFECACA)`
- **Interaction Accents**:
  - `BlueInteraction = Color(0xFF2563EB)` (Royal Blue), `BlueGlow = Color(0xFF3B82F6)`

#### Theme Container (`Theme.kt:8-44`)
`SsbInspectionTheme` wraps `MaterialTheme` mapping semantic colors to standard Material 3 color roles (`primary`, `surface`, `background`, `outline`, etc.).

---

## 3. Current Camera Implementation & CameraX Lifecycle

### 3.1 `DualCameraCaptureView.kt` Architecture
- **Camera Provider Binding** (`DualCameraCaptureView.kt:260-298`):
  - Uses `ProcessCameraProvider.getInstance(context)`.
  - Configures `Preview.Builder().build()` and attaches `previewView.surfaceProvider`.
  - Configures `ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build()`.
  - Binds to `LocalLifecycleOwner.current` with dynamic `CameraSelector`:
    - `DOCUMENT_REAR`: `CameraSelector.DEFAULT_BACK_CAMERA`
    - `TRAVELER_FRONT`: `CameraSelector.DEFAULT_FRONT_CAMERA`
- **Flashlight / Torch Control** (`DualCameraCaptureView.kt:569-588`):
  - Interacts with `cameraControl?.enableTorch(isTorchOn)` on rear optical sensor.
- **Image Processing Pipeline** (`DualCameraCaptureView.kt:320-336`):
  - Captures `ImageProxy` asynchronously on main executor.
  - Transforms and compresses sensor buffer via `ImageUtils.processImageProxy(imageProxy)` to standard JPEG bytes.
  - Invokes `onDocumentCaptured` / `onLiveFaceCaptured` callbacks with byte array.
- **HUD Reticles** (`DualCameraCaptureView.kt:478-514`):
  - Document Mode: Corner bracket canvas guide.
  - Selfie Mode: Oval facial alignment reticle with stroke width `2.dp`.

### 3.2 State Flow to ViewModel & Repository
In `SsbScreeningViewModel.kt:359-387`:
```kotlin
fun setCapturedLiveFaceBytes(bytes: ByteArray) {
    _uiState.update { it.copy(capturedLiveFaceBytes = bytes) }
    val currentState = _uiState.value
    viewModelScope.launch {
        repository.uploadCompanionCapture(
            captureBytes = bytes,
            captureType = "selfie",
            checkpointId = currentState.selectedCheckpoint.id,
            deviceId = currentState.officerId,
            customBaseUrl = currentState.customGatewayUrl,
            mode = currentState.connectivityMode
        )
    }
}
```

---

## 4. Companion Camera Redesign Specifications

### 4.1 Operational Architecture
```
+-------------------------------------------------------------------------------+
|                      COMPANION LIVE STREAMING PIPELINE                         |
+-------------------------------------------------------------------------------+
| [ Android Field Phone / Tablet ]                                              |
|   1. Officer frames traveler face in clean oval viewfinder                    |
|   2. Taps "📸 SNAP TRAVELER PHOTO" (56dp shutter)                             |
|   3. CameraX acquires frame -> Encodes JPEG                                   |
|   4. HTTP POST /api/v1/companion/upload (Multipart)                           |
|        - file: traveler_selfie.jpg                                            |
|        - capture_type: "selfie"                                               |
|        - device_id: "SSB_FIELD_01"                                            |
|        - checkpoint_id: "WB-JAI-01"                                           |
|   5. Instant UI feedback: "⚡ Sent to Desktop Terminal (Seq #1)"               |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼ [ < 100ms over USB / Wi-Fi ]
+-------------------------------------------------------------------------------+
| [ FastAPI Edge Backend: /api/v1/companion/upload ]                            |
|   - Stores capture in memory CompanionStore with sequence_id & timestamp      |
|   - Returns 200 OK                                                            |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼ [ Real-time poll / SSE ]
+-------------------------------------------------------------------------------+
| [ Desktop Web Terminal (Tauri / Browser) ]                                    |
|   - IngestionPanel displays "📱 Field Unit Connected (Live Sync Active)"       |
|   - Automatically renders incoming photo in traveler well                     |
|   - If document is pre-loaded -> Automatically triggers /api/v1/scan/inspect  |
|   - Computes 1:1 AdaFace biometric similarity + multi-pillar screening        |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼ [ Verdict Sync ]
+-------------------------------------------------------------------------------+
| [ Android Field Client ]                                                      |
|   - Displays instant verdict card: 🟢 AUTO-CLEAR PASS (Risk Score: 12/100)    |
+-------------------------------------------------------------------------------+
```

### 4.2 Key UI Components for Companion Camera

| UI Element | Specification & Visual Details | Compose Code Mapping |
|---|---|---|
| **Top Connection Pill** | Shows `🟢 Connected to Desktop Terminal (2ms)` on green tint `#ECFDF5`, pulsing emerald dot `#059669`. Tapping opens endpoint configuration (`http://127.0.0.1:8000` or `http://192.168.2.1:8000`). | `HeaderBar.kt` & `DualCameraCaptureView.kt:542-566` |
| **Clean Viewfinder** | Height `320dp+` (or full bleed), pure white surface frame `#FFFFFF`, subtle `#E2E8F0` border, minimal face oval guide. No laser scan clutter or academic AI acronyms. | `DualCameraCaptureView.kt:457-530` |
| **56dp Shutter Button** | Minimum height `56dp`, width `fillMaxWidth()`, container `#2563EB` (Royal Blue) or `#0F172A` (Slate Dark), text `📸 SNAP TRAVELER PHOTO`, 12dp squircle radius (`RoundedCornerShape(12.dp)`). | `DualCameraCaptureView.kt:634-674` |
| **Instant Sync Pill** | Upon snap: Displays `⚡ Sent to Desktop Terminal` with sequence number. Disappears smoothly after 2 seconds. | Toast / Overlay in `DualCameraCaptureView.kt` |
| **Instant Screening Verdict** | When desktop completes verification: Renders high-contrast banner with large score badge (e.g. `🟢 14/100 · AUTO-CLEAR PASS` or `🔴 88/100 · DETAIN`). | `MainScreen.kt:208-290` / `AssessmentSummaryCard.kt` |

---

## 5. Backend Companion API Contract Verification

The FastAPI router at `backend/app/api/routers/companion.py` exposes:

1. **`POST /api/v1/companion/upload`**:
   - Accepts multipart form data:
     - `file`: `UploadFile` (JPEG/PNG image)
     - `capture_type`: `str` (`"selfie"` or `"document"`, default `"selfie"`)
     - `device_id`: `str` (`"field-unit-1"`)
     - `checkpoint_id`: `str` (`"WB-JAI-01"`)
   - Returns:
     ```json
     {
       "status": "success",
       "message": "Capture synced to Edge Terminal",
       "sequence_id": 1,
       "capture_type": "selfie",
       "device_id": "field-unit-1",
       "timestamp": 1724451600.12
     }
     ```

2. **`GET /api/v1/companion/latest`**:
   - Returns:
     ```json
     {
       "has_capture": true,
       "sequence_id": 1,
       "capture_type": "selfie",
       "device_id": "field-unit-1",
       "checkpoint_id": "WB-JAI-01",
       "image_data": "data:image/jpeg;base64,...",
       "filename": "capture.jpg",
       "timestamp": 1724451600.12
     }
     ```

3. **`POST /api/v1/companion/clear`**:
   - Resets active companion buffer once consumed.

---

## 6. Android Build & Dependency Audit

### 6.1 Dependency Matrix (`app/build.gradle.kts`)
- **Android Gradle Plugin**: 8.8.0+
- **Compile / Target SDK**: 36 (Android 15+)
- **Min SDK**: 24 (Android 7.0+)
- **Java Compatibility**: JavaVersion.VERSION_11 (runs on JDK 17 / JDK 25 JBR)
- **Jetpack Compose BOM**: Active Material3, Graphics, Tooling
- **CameraX Stack**:
  - `androidx.camera:camera-camera2`
  - `androidx.camera:camera-core`
  - `androidx.camera:camera-lifecycle`
  - `androidx.camera:camera-view`
- **Network Stack**:
  - `com.squareup.retrofit2:retrofit:2.11.0`
  - `com.squareup.retrofit2:converter-moshi:2.11.0`
  - `com.squareup.okhttp3:okhttp:4.12.0`
  - `com.squareup.okhttp3:logging-interceptor:4.12.0`
  - `com.squareup.moshi:moshi-kotlin:1.15.2` (with KSP code generation)
- **Permissions**: `com.google.accompanist:accompanist-permissions:0.37.2`
- **Local Persistence**: `androidx.room:room-runtime:2.7.0` + KSP compiler

### 6.2 Identified Compilation Bug & Fix

During build verification (`./gradlew assembleDebug`), a Kotlin compilation error was detected:
- **Location**: `app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt:70`
- **Observed Error**: `e: ... SsbRepository.kt:70:51 Unresolved reference 'WIFI_AP'.`
- **Root Cause**: `ConnectivityMode` enum in `InspectionModels.kt:12-16` defines `AIR_GAPPED_WIFI`, `USB_TETHERED`, and `OFFLINE_OUTBOX`. `SsbRepository.kt:70` used legacy default parameter `ConnectivityMode.WIFI_AP`.
- **Exact Fix**: Change default parameter in `SsbRepository.kt:70` from `ConnectivityMode.WIFI_AP` to `ConnectivityMode.AIR_GAPPED_WIFI`.

---

## 7. Actionable Implementation Recommendations for Builder Agents

1. **Fix Default Parameter in `SsbRepository.kt:70`**:
   - Replace `ConnectivityMode.WIFI_AP` with `ConnectivityMode.AIR_GAPPED_WIFI` to ensure `./gradlew assembleDebug` builds cleanly.

2. **Streamline `DualCameraCaptureView.kt` into Companion Camera**:
   - Ensure the camera defaults to `TRAVELER_FRONT` or provides a quick 1-touch toggle.
   - Retain the clean 56dp shutter button (`📸 SNAP TRAVELER PHOTO`).
   - Trigger `repository.uploadCompanionCapture` immediately on photo capture.
   - Display a clean feedback badge: `⚡ Sent to Desktop Terminal`.

3. **Enhance `HeaderBar.kt` & Connection Pill**:
   - Ensure the connection status pill prominently reads: `🟢 Connected to Desktop Terminal` with latency counter.
   - Provide direct tap-to-configure for host gateway IP (`http://127.0.0.1:8000` via USB tether or `http://192.168.2.1:8000` via Wi-Fi AP).

4. **Verdict Notification Broadcast**:
   - Enable periodic polling or callback update from desktop screening so that when desktop completes `POST /api/v1/scan/inspect`, the Android screen displays the prominent result badge (`AUTO-CLEAR PASS` / `SECONDARY HOLD` / `DETAIN`).

---
*End of Android Codebase Survey & Companion Camera Redesign Report*
