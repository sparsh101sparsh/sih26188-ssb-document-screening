# Android Codebase Survey & UI Refinement Analysis

**Author:** Explorer 2 (Android App Specialist)  
**Date:** 2026-08-23  
**Project Location:** `/Users/iamsparsh00321/Downloads/ssb-field-screening`  
**Namespace / Package:** `com.ssb.fieldscreening`

---

## 1. Android Project Files & Build Infrastructure

### 1.1 Project Structure & File Locations
The Android application resides at `/Users/iamsparsh00321/Downloads/ssb-field-screening`.

```
/Users/iamsparsh00321/Downloads/ssb-field-screening/
├── build.gradle.kts                      # Root Gradle build script
├── settings.gradle.kts                   # Project settings & dependency resolution
├── gradle.properties                     # JVM heap & AndroidX configuration
├── local.properties                      # Android SDK location
├── gradlew / gradlew.bat                 # Gradle wrapper (Gradle 9.3.1)
├── app/
│   ├── build.gradle.kts                  # Application module build configuration
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml       # App manifest, permissions, package declaration
│   │   │   ├── java/com/ssb/fieldscreening/
│   │   │   │   ├── MainActivity.kt       # Activity entry point
│   │   │   │   ├── data/
│   │   │   │   │   ├── local/            # Room DB (SsbDatabase, OutboxDao, OutboxEntity)
│   │   │   │   │   ├── model/            # Data models (InspectionModels, PresetScenarios)
│   │   │   │   │   ├── remote/           # Retrofit & OkHttp client (SsbApiService)
│   │   │   │   │   └── repository/       # SsbRepository (offline outbox & network retry)
│   │   │   │   ├── ui/
│   │   │   │   │   ├── MainScreen.kt     # Root scaffold, tab navigation, screen transitions
│   │   │   │   │   ├── components/       # 10 modular Jetpack Compose components
│   │   │   │   │   ├── theme/            # Theme, SsbColors, Typography
│   │   │   │   │   └── viewmodel/        # SsbScreeningViewModel, ScreeningUiState
│   │   │   │   └── util/
│   │   │   │       └── ImageUtils.kt     # CameraX JPEG compression & resizing
│   │   │   └── res/                      # Drawables, mipmaps, strings.xml, colors.xml
│   │   ├── test/                         # 7 Unit & Robolectric test suites + screenshot tests
│   │   └── androidTest/                  # Instrumentation test suite
```

### 1.2 Build Verification & Prerequisites
- **JDK Requirement**: Requires JDK 21+ or Android Studio JBR.
  - Available JDK: `/Applications/Android Studio.app/Contents/jbr/Contents/Home` (Java 25) or `/opt/homebrew/opt/openjdk@21`.
- **Sandbox Requirement**: Gradle client-daemon TCP socket communication on macOS sandbox requires executing commands outside restricted loopback containment (`BypassSandbox: true`).
- **Build Invocation Command**:
  ```bash
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew assembleDebug
  ```
- **Build Status**: **SUCCESSFUL** (0 errors, 38 actionable tasks, ~11s execution time).
- **Test Invocation Command**:
  ```bash
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew testDebugUnitTest
  ```
- **Test Status**: **SUCCESSFUL** (0 errors, 32 actionable tasks, ~1s execution time).

---

## 2. Jetpack Compose UI Hierarchy, Navigation, & Views

### 2.1 Navigation Architecture
The app follows a 3-tab tactical field navigation model defined by `NavigationScreen`:
1. `NavigationScreen.CAPTURE`: Primary optical intake and dual camera sensor capture.
2. `NavigationScreen.RESULTS`: Primary risk assessment, officer sign-off, and progressive disclosure accordions.
3. `NavigationScreen.OUTBOX`: DPDP Act 2023 compliant offline SQLite/Room transactional outbox.
4. `NavigationScreen.GATEWAY_DIAGNOSTICS`: Full overlay screen accessible from HeaderBar gear icon.

### 2.2 Component Breakdown
| Composable | File Path | Role & Content |
|---|---|---|
| `MainScreen` | `ui/MainScreen.kt:83` | Top-level Scaffold with `HeaderBar`, bottom `NavigationBarRow`, and `AnimatedContent` view switcher. |
| `HeaderBar` | `ui/components/HeaderBar.kt:69` | SSB checkpoint selector, authoritative single connection pill, live latency indicator, and diagnostics gear trigger. |
| `NavigationBarRow` | `ui/MainScreen.kt:571` | 3 primary tabs (`CAPTURE`, `RESULTS`, `OUTBOX`) with min 56dp touch targets and pending outbox badge count. |
| `CaptureScreenView` | `ui/MainScreen.kt:162` | Contains `PresetBar`, `DualCameraCaptureView`, and quick jump verdict banner. |
| `DualCameraCaptureView` | `ui/components/DualCameraCaptureView.kt:99` | Real-time dual camera preview (rear optical document + front biometric selfie), oval reticle, flash toggle, snap/evaluate buttons. |
| `PresetBar` | `ui/components/PresetBar.kt:46` | Horizontal carousel of 4 synthetic test scenarios (`clean_passport`, `forged_aadhaar`, `tampered_stamp`, `presentation_spoof`). |
| `ResultsScreenView` | `ui/MainScreen.kt:307` | Level 1 `AssessmentSummaryCard`, `OfficerDecisionCard`, and Level 3 expandable accordions. |
| `AssessmentSummaryCard` | `ui/components/AssessmentSummaryCard.kt:59` | High-contrast semantic verdict banner (GREEN/AMBER/RED pulsating glow), threat level score, latency, and reasons. |
| `OfficerDecisionCard` | `ui/components/OfficerDecisionCard.kt:52` | Officer ID display, field remarks input, 3 min 56dp decision buttons (`CLEAR`, `HOLD`, `DETAIN`), digital signature seal. |
| `InspectionPipelineTrace` | `ui/components/InspectionPipelineTrace.kt:55` | 4 pipeline streams (OCR/MRZ, Biometrics, Tamper Forensics, Stamp Correlation) with sub-model scores and check digits. |
| `CrossValidationMatrix` | `ui/components/CrossValidationMatrix.kt:42` | Filterable 8-rule cross-validation matrix (`CV-01` to `CV-08`), failure indicators, critical violation breakdowns. |
| `DiscrepancyDiffTable` | `ui/components/DiscrepancyDiffTable.kt:45` | Side-by-side visual zone (OCR) vs encoded zone (MRZ) character diff table. |
| `OutboxScreen` | `ui/components/OutboxScreen.kt:55` | DPDP 2023 zero-raw-biometric compliance banner, queue sync triggers, SQLCipher local audit transactions. |
| `GatewayDiagnosticsView` | `ui/components/GatewayDiagnosticsView.kt:65` | Edge hardware link status, latency probe, USB/Wi-Fi/Offline profile selector, auto-detect gateway IP scanner. |

---

## 3. Technical Jargon & Metrics Audit

### 3.1 Occurrences of Forbidden Technical Jargon
The following files display raw model names (`PP-OCRv4`, `AdaFace-ResNet100`, `MiniFASNetV2`, `DocTamper DTD`, `TruFor`, `ELA`) and technical jargon that must be refactored:

1. **`MainScreen.kt`**:
   - Line 345: `subtitle = "PP-OCRv4 + AdaFace Bio-Match + TruFor Forensic Splicing"` on the Multi-Stream Pipeline Trace accordion header.
   - Line 259: Raw millisecond processing time (`${inspection.assessment.processingTimeMs}ms`).
2. **`SsbScreeningViewModel.kt`**:
   - Lines 139-147: Dynamic progress text during inspection:
     - Line 139: `"PP-OCRv4 & ICAO Modulo-10 Checksum..."`
     - Line 143: `"AdaFace & MiniFASNet Bio-Match..."`
     - Line 145: `"DocTamper & TruFor Forensic Splicing..."`
     - Line 147: `"4-Stage SSB Stamp Verifier..."`
3. **`InspectionPipelineTrace.kt`**:
   - Line 95: `title = "PP-OCRv4 Multilingual & ICAO 9303 Engine"`
   - Line 196: `title = "AdaFace 512D Cosine & MiniFASNet Fourier Liveness"`
   - Line 220: `text = "ADAFACE COSINE SIMILARITY"`
   - Line 251: `text = "MINIFASNET LIVENESS"`
   - Line 303: `title = "DocTamper ResNet-50 & TruFor Forensic Splicing"`
   - Line 304: `subtitle = "Pixel splicing localization, high-frequency ELA & DQT quantization checks"`
   - Line 326: `text = "DOCTAMPER SCORE"`
   - Line 350: `text = "TRUFOR SPLICING SCORE"`
   - Lines 100, 201, 308, 438: Individual sub-second model stream latencies (`${latencyMs.toInt()}ms`).
4. **`DiscrepancyDiffTable.kt`**:
   - Line 89: `encodedValue = if (details.forensics.isTampered) "DocTamper: 0.94 / TruFor: 0.88" else "DocTamper: 0.02"`
   - Line 92: `details = if (details.forensics.isTampered) "High frequency ELA discrepancy in portrait" else "Uniform printing raster"`
5. **`AssessmentSummaryCard.kt`**:
   - Line 205: `text = "RISK SCORE: "` (must become `Threat Risk Level: X/100` / `Threat Level: X / 100`).
   - Line 228: `${assessment.processingTimeMs}ms latency` (must become `Screening Duration: X.X seconds`).
   - Line 260: `TRIPWIRE TRIGGERS (HARD DISQUALIFICATION)` (must become `Critical Verification Trigger`).
   - Line 291: `DECISION TELEMETRY LOGS` (raw technical logs rendered uncollapsed).
6. **`PresetScenarios.kt`**:
   - Lines 41-43, 214-215, 298-299, 405, 576-577: Synthetic test scenarios mention AdaFace, MiniFASNet, DocTamper, TruFor, and ELA in reason strings.

---

## 4. UI Refinement & Progressive Disclosure Plan

### 4.1 Progressive Disclosure Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: PRIMARY OPERATIONAL DASHBOARD (Always Visible)                │
│ • Threat Risk Level: X/100 with prominent semantic badge (GREEN/AMBER/RED)│
│ • Action Directive (APPROVED / MANUAL HOLD / DETAIN)                    │
│ • Operational Bullet Points (e.g. "Passport photo shows signs of       │
│   replacement in the bottom right corner")                              │
│ • Live Face Match Status (Verified / Mismatch) & Liveness Check        │
│ • Screening Duration: X.X seconds (e.g. "0.4s")                         │
│ • Officer Decision & Sign-Off Action Card (56dp touch targets)          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LEVEL 2: VISUAL VERIFICATION & PHOTO COMPARISON (Interactive Tabs)     │
│ • Dual camera viewport: Captured document image vs Live traveler selfie│
│ • Plain-text discrepancy table (Visual text vs Encoded chip/MRZ)        │
│ • Heatmap overlay toggle for localized tamper highlighting              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LEVEL 3: ADVANCED AUDIT ACCORDION (Collapsed by Default)                │
│ Accordion Header: "Advanced Verification Logs & Technical Audits" [v]   │
│ • ICAO Modulo-10 Check Digits (Doc No, DOB, Expiry, Composite)          │
│ • Apparent Age Validation & Drift years                                 │
│ • Sub-system individual model timings                                   │
│ • Rule IDs & codes (CV-01 through CV-08)                                │
│ • Cryptographic SHA-256 Audit Seal Hash & Copy button                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Concrete Refinement Actions
1. **Operational Language Replacement**:
   - `PP-OCRv4 & ICAO Checksum` ➔ `Text & Document Check`
   - `AdaFace 512D Cosine` ➔ `Face Match Confidence`
   - `MiniFASNet Liveness` ➔ `Selfie Liveness Check`
   - `DocTamper / TruFor / ELA` ➔ `Ink & Substrate Integrity`
   - `4-Stage SSB Stamp Verifier` ➔ `Border Permit Stamp Check`
   - `Risk Score` ➔ `Threat Risk Level`
   - `Tripwire Trigger` ➔ `Critical Verification Trigger`
   - `apparent_age / age_drift` ➔ `Age Validation`
2. **Timing Simplification**:
   - Remove individual model latencies (`38ms`, `110ms`, `140ms`) from primary cards.
   - Format overall latency in seconds: `val seconds = assessment.processingTimeMs / 1000.0; "Screening Duration: ${String.format(\"%.1f\", seconds)}s"`.
3. **Consolidate Level 3 Accordions**:
   - In `ResultsScreenView.kt`: Default all accordions to `isExpanded = false`.
   - Wrap raw logs, Modulo-10 check digit tables, age drift numbers, and cryptographic seals inside the collapsed advanced audit accordion.
4. **Capture Screen Enhancement**:
   - In `DualCameraCaptureView.kt`: Ensure side-by-side document image and traveler selfie are clear, prominent, and uncluttered.
   - Update inspection progress messages in `SsbScreeningViewModel.kt` to operational terms ("Verifying document text...", "Verifying face match & liveness...", "Analyzing substrate & seal authenticity...").

---

## 5. Unit & Instrumentation Test Coverage

### 5.1 Test Suite Inventory
All tests are located in `app/src/test/` (Host/Robolectric) and `app/src/androidTest/` (Device/Instrumentation):

| Test Suite File | Type | Framework | Test Cases / Focus Areas |
|---|---|---|---|
| `CameraPipelineTest.kt` | Unit | Robolectric / ComposeRule | ViewModel image byte capture/clear, Room Outbox persistence of real document & face blobs, camera permission rationale UI. |
| `ImageUtilsTest.kt` | Unit | Robolectric / JUnit | Bitmap resizing (long edge 1280px maintaining aspect ratio), JPEG compression quality capped at 80%, full processing pipeline. |
| `M4M5EmpiricalChallengeTest.kt` | Unit | Robolectric / ComposeRule | 3-tab navigation bar verification, results screen expandable accordions, officer decision workflow & remarks input, gateway diagnostics navigation & auto-detect, Room OutboxDao CRUD & retryCount increment, repository sync capping at 3 retries, offline outbox mode. |
| `RepositoryNetworkRobustnessTest.kt` | Unit | Robolectric / JUnit | Offline outbox fallback, retry capping at 3, offline mode sync abort, auto-detect gateway probing, sanitized synthetic test identifiers. |
| `GreetingScreenshotTest.kt` | Screenshot | Roborazzi / Robolectric | Roborazzi visual regression snapshot testing for `AssessmentSummaryCard`. |
| `ExampleRobolectricTest.kt` | Unit | Robolectric / JUnit | App name resource check, preset scenario counts, checkpoint list, viewModel state navigation. |
| `ExampleUnitTest.kt` | Unit | JUnit | Basic unit test sanity check. |
| `ExampleInstrumentedTest.kt` | Instrumented | AndroidJUnit4 | Verifies application package ID on device runtime. |

### 5.2 Test Execution Results
- Host unit test suite execution:
  ```bash
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew testDebugUnitTest
  ```
  **Result**: `BUILD SUCCESSFUL in 978ms` (100% passing across all 7 test classes).
