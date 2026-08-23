# Project: SSF Field Screening System Engineering Overhaul

## Architecture
The SSF / SSB Field Screening System is a multi-modal identity document screening, biometric verification, and tampering forensics platform designed for air-gapped border checkposts (Indo-Nepal and Indo-Bhutan frontiers).

### Subsystems:
1. **Android Field Application** (`/Users/iamsparsh00321/Downloads/ssb-field-screening`):
   - Kotlin, Jetpack Compose, Room (SQLite), Retrofit2, OkHttp, Moshi, CameraX.
   - Dual-camera document & live selfie capture, offline outbox queuing, 3-tab tactical field UI.
2. **Edge AI FastAPI Backend** (`sih26188_project/backend`):
   - Python 3.11, FastAPI, ONNX Runtime, Pydantic v2.
   - 3-Stream multi-modal analysis (OCR/MRZ/QR, Biometrics, Forensics/Stamps), 8-rule cross-validation matrix, 2-stage hybrid risk engine.
3. **Computer Desktop & Frontend** (`sih26188_project/frontend`, `sih26188_project/src-tauri`):
   - React 19, TypeScript, Tailwind CSS, Tauri 2.0.
   - Beautiful-UI OKLCH tactical dark design system, live device fleet telemetry, interactive forensics heatmap viewer.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Backend Route Alias | Add `POST /api/v1/inspect` alias in FastAPI delegating to `inspect_document`, supporting `live_photo` and `document_image` parts | M1 (DONE) | R1 |
| 2 | Health Telemetry Alignment | Align `GET /api/v1/health` response to include simplified model keys (`pp_ocrv4`, `adaface`, `minifasnet`, `trufor`, `doctamper`, `stamp_verifier`) matching Kotlin Moshi model | M1 (DONE) | R1 |
| 3 | Package Renaming | Rename package from `com.example` to `com.ssb.fieldscreening` across all Android source files, tests, and manifests | M2 (DONE) | R3 |
| 4 | Application ID Update | Update `applicationId` to `com.ssb.fieldscreening` in `app/build.gradle.kts` | M2 (DONE) | R3 |
| 5 | App Name & Label | Update app label in `strings.xml` to "SSB Field Screening" | M2 (DONE) | R3 |
| 6 | Brand Launcher Icons | Convert `/frontend/public/ssb_logo.png` to standard and round mipmap icons across mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi | M2 (DONE) | R3 |
| 7 | Disable Unused Google Services | Disable Google Services plugin and comment out Firebase AI/AppCheck dependencies in Gradle | M2 (DONE) | R3 |
| 8 | Clear Default Officer ID | Set default `officerId` to `""` in `SsbScreeningViewModel` to enforce login | M2 (DONE) | R3 |
| 9 | CameraX Dependencies | Uncomment and activate CameraX dependencies (`camera2`, `core`, `lifecycle`, `view`) in `app/build.gradle.kts` | M3 | R2 |
| 10 | Live Camera Preview & Capture | Implement real `PreviewView` and `ImageCapture` in `DualCameraCaptureView.kt` with rear (document) and front (selfie) support | M3 | R2 |
| 11 | Image Compression Pipeline | Compress captured frames to JPEG <= 80% quality, max 1280px on long edge | M3 | R2 |
| 12 | Camera Permissions Handling | Implement Accompanist camera permissions rationale dialog for graceful denial | M3 | R2 |
| 13 | Real Upload Handshake | Wire real captured `ByteArray` into `SsbScreeningViewModel` and `SsbRepository` | M3 | R2 |
| 14 | Android 3-Tab Field UI | Streamline 6 screens into 3 bottom tabs: `CAPTURE`, `RESULTS`, `OUTBOX` with min 56dp touch targets | M4 | R4 |
| 15 | Expandable Results Accordion | Embed Pipeline Trace, Cross-Validation Matrix, and Discrepancy Diff into expandable cards in RESULTS tab | M4 | R4 |
| 16 | Dominant Verdict & Glow | Visual risk badge prominence, full-width colored surface, pulsating glow on RED verdict | M4 | R4 |
| 17 | Header & Shimmer Telemetry | Always-visible gateway latency & connection status in header, shimmer loading state during AI inference | M4 | R4 |
| 18 | Frontend Color Token Uniformity | Verify `RiskStatusBanner`, `ApprovalCard`, `DiffTable`, `FilterTable` against shared palette | M4 | R4 |
| 19 | Live Device Fleet Telemetry | Add `GET /api/v1/devices` endpoint in backend and live device status card in frontend | M4 | R4 |
| 20 | Forensics Heatmap Overlay | Sanitize base64 prefix and ensure canvas aspect ratio overlay alignment in `ForensicsViewer.tsx` | M4 | R4 |
| 21 | Backend Host Binding | Set default `HOST = "0.0.0.0"` in `app/core/config.py` | M5 | R5 |
| 22 | Network Exponential Backoff | Implement 3 retries with 1s, 2s, 4s backoff in `SsbRepository` before OFFLINE_OUTBOX fallback | M5 | R5 |
| 23 | Hotspot Gateway Auto-Detect | Add "Auto-Detect" ping button in Gateway Diagnostics probing common hotspot gateway IPs | M5 | R5 |
| 24 | Dead Code Removal | Fix `val syncStatus = if (mode == OFFLINE_OUTBOX) "PENDING" else "PENDING"` dead branch in `SsbRepository` | M5 | R6 |
| 25 | Outbox Retry Capping | Add `retryCount: Int = 0` to `OutboxEntity` and cap sync retries at 3 | M5 | R6 |
| 26 | Preset Scenarios Cleanup | Replace realistic citizen names in `PresetScenarios.kt` with fictional test identifiers | M5 | R6 |
| 27 | Backend TODOs Audit & Stubs | Audit `app/modules/` and add clean `NotImplementedError` stubs for Tier-2 VLM and OmniMRZ | M5 | R6 |
| 28 | Comprehensive Verification | Verify `./gradlew assembleDebug` (0), `pytest tests/ -v` (0), and `npm run build` (0) | M6 | R7 |
| 29 | Engineering Summary Report | Generate comprehensive `ENGINEERING_SUMMARY.md` covering Sections A through H | M6 | R7 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Integration Alignment | R1: Backend `POST /api/v1/inspect` alias, multipart form parts, `GET /api/v1/health` schema | None | DONE |
| M2 | Android App Identity & Branding | R3: Package rename to `com.ssb.fieldscreening`, `applicationId`, `strings.xml`, mipmap icons, remove Google Services, empty officer ID | None | DONE |
| M3 | CameraX Implementation & Compression | R2: Uncomment dependencies, `DualCameraCaptureView.kt` real preview/capture, JPEG <=80% 1280px, Accompanist permissions, real ByteArray upload | M2 | IN_PROGRESS |
| M4 | Unified Design System & UX | R4: Android 3-tab navigation, expandable diagnostics, RED verdict pulsating glow, 56dp targets; Desktop device tracking card, ForensicsViewer overlay | M1, M3 | PLANNED |
| M5 | Network Robustness & Code Quality | R5 & R6: Backend `HOST="0.0.0.0"`, Android 1s/2s/4s exponential backoff, Gateway auto-detect, dead code fix, `retryCount` in Outbox, preset cleanup, module stubs | M1, M3 | PLANNED |
| M6 | Build Verification & Summary Documentation | R7 & Final Doc: `./gradlew assembleDebug`, `pytest tests/ -v`, `npm run build`, and `ENGINEERING_SUMMARY.md` | M1, M2, M3, M4, M5 | PLANNED |
