# SSF Field Screening System Engineering Plan

## 1. Survey & Architecture Mapping
- Spawn 3 Explorers in parallel:
  - Explorer 1 (Android): inspect `/Users/iamsparsh00321/Downloads/ssb-field-screening`, build.gradle.kts, libs.versions.toml, package structure, DualCameraCaptureView, SsbRepository, SsbApiService, OutboxDao, NavigationScreen, PresetScenarios, Color.kt.
  - Explorer 2 (Backend): inspect `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend`, app/main.py, app/api/v1/, app/core/config.py, app/schemas/health.py, app/modules/ TODOs, tests/.
  - Explorer 3 (Frontend & Design Reference): inspect `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`, `src-tauri`, `beautiful-ui-reference`, verify UI components, design tokens, ForensicsViewer, devices endpoint/status, index.css.

## 2. Global PROJECT.md & Decomposition
- Merge explorer findings into PROJECT.md with architecture, feature inventory, code layout, interface contracts, and milestone breakdown.

## 3. Execution by Milestones
- **Milestone 1 (R1 Integration)**:
  - Add POST /api/v1/inspect alias in FastAPI backend.
  - Verify GET /api/v1/health shape matches Kotlin HealthResponse (`status`, `engine_mode`, `models_loaded`, `uptime_seconds`).
  - Worker -> Reviewer -> Challenger -> Auditor gate.
- **Milestone 2 (R3 Android Branding & Package Rename)**:
  - Rename package from `com.example` to `com.ssb.fieldscreening`.
  - Update `applicationId` to `com.ssb.fieldscreening`.
  - Set app label to "SSB Field Screening" in strings.xml.
  - Convert `ssb_logo.png` to mipmap icons across mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi (standard + round).
  - Remove/comment Google Services & Firebase AI dependencies.
  - Set default officer ID to `""`.
  - Worker -> Reviewer -> Challenger -> Auditor gate.
- **Milestone 3 (R2 Android CameraX Implementation)**:
  - Uncomment CameraX dependencies in `app/build.gradle.kts`.
  - Wire up `DualCameraCaptureView.kt` with live `PreviewView` and `ImageCapture`.
  - Rear (doc) & Front (selfie) support.
  - Compress JPEG <= 80% quality, max 1280px long edge.
  - Accompanist permissions handling with rationale dialog.
  - Update `SsbRepository.inspectDocument()` to use captured `ByteArray`.
  - Worker -> Reviewer -> Challenger -> Auditor gate.
- **Milestone 4 (R4 Unified Design System)**:
  - Android 3-tab navigation (CAPTURE, RESULTS, OUTBOX).
  - Expandable sections inside RESULTS for PIPELINE_TRACE, CROSS_VALIDATION, DISCREPANCY_DIFF.
  - 56dp touch targets, pulsating RED verdict glow, connection status header, shimmer loading, camera state machine indicators.
  - Computer frontend styling alignment with shared color tokens, live Android device status, and ForensicsViewer overlay.
  - Worker -> Reviewer -> Challenger -> Auditor gate.
- **Milestone 5 (R5 & R6 Network Robustness & Code Quality)**:
  - Backend `HOST="0.0.0.0"` in config.py.
  - Android 1s/2s/4s exponential backoff retry in `SsbRepository` before offline fallback.
  - IP auto-detect button in Gateway Diagnostics.
  - Remove dead branch in SsbRepository.
  - Add `retryCount: Int = 0` to `OutboxEntity`.
  - Clean `PresetScenarios.kt` test data.
  - Audit backend `app/modules/` TODOs and add clear stubs.
  - Worker -> Reviewer -> Challenger -> Auditor gate.
- **Milestone 6 (R7 Verification & Final Documentation)**:
  - `./gradlew assembleDebug` verification.
  - `python -m pytest tests/ -v` verification.
  - `npm run build` verification.
  - Generate complete `ENGINEERING_SUMMARY.md` covering Sections A through H.
