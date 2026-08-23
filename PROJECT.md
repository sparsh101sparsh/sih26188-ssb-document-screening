# Project: SSB Field Identity & Document Screening System Refactoring

## Architecture
- **Web / Computer Frontend (`sih26188_project/frontend`)**: React 19, TypeScript, Tailwind CSS, Vite. Displays centered dashboard with connected device status, active queue, operational screening result card, plain-language tabs in `PillarsTable.tsx`, and collapsed "Advanced Verification Logs & Technical Audits" accordion.
- **Android Mobile App (`/Users/iamsparsh00321/Downloads/ssb-field-screening`)**: Kotlin, Jetpack Compose, Kotlinx Coroutines, Moshi, Room. Displays streamlined 3-tab layout (`CAPTURE`, `RESULTS`, `OUTBOX`), prominent "Threat Risk Level: X/100" with semantic badge, side-by-side photo comparison, live selfie verification status, and collapsed technical diagnostics logs.
- **Backend API (`sih26188_project/backend`)**: FastAPI, Pydantic v2, Python 3.11. Multi-stream inspection, two-stage Bayesian risk engine, 8-rule cross-validation matrix, providing structured reason explanations and forensic telemetry.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Remove Technical ML Jargon | Remove `PP-OCRv4`, `AdaFace-ResNet100`, `MiniFASNetV2`, `DocTamper DTD`, `TruFor`, `ELA` from all user-facing views | M1, M2 | ORIGINAL_REQUEST §1 |
| 2 | Operational Metric Renaming | Rename `Risk Score` (0-100) -> `Threat Risk Level` ("Threat Level: X / 100", GREEN/AMBER/RED), `Stage 1 Tripwire` -> `Critical Verification Trigger`, `Cosine Similarity` / `Liveness Confidence` -> `Face Match Confidence` / `Selfie Liveness Check`, `apparent_age` / `age_drift` -> `Age Validation` | M1, M2 | ORIGINAL_REQUEST §1 |
| 3 | Timing Simplification | Remove individual sub-second model latencies from main view; display single consolidated `Screening Duration: X.X seconds` | M1, M2 | ORIGINAL_REQUEST §1 |
| 4 | Progressive Disclosure & Accordions | Level 1 Primary Dashboard (document, genuine/suspicious, operational bullet reasons, face match status, directive APPROVED/MANUAL HOLD/DETAIN); Level 3 Collapsed Accordion "Advanced Verification Logs & Technical Audits" (default closed) with intermediate floats, latencies, rule codes, JSON/cert | M1, M2 | ORIGINAL_REQUEST §2 |
| 5 | Web Tabs & UI Clutter Refinement | Plain-text operational titles in `PillarsTable.tsx` (1. Text & QR Check, 2. Document Format, 3. Face Match & Liveness, 4. Ink & Substrate Integrity, 5. Border Permit Stamp); remove duplicate connection indicators, cogs, redundant badges | M1 | ORIGINAL_REQUEST §3 |
| 6 | Android UI & Spacing Refinement | Reorganize bottom tabs and Compose views; prioritize photo comparison and live selfie verification; show Threat Risk Level badge; collapse diagnostics tables and raw logs | M2 | ORIGINAL_REQUEST §3 |
| 7 | Full Build & Test Verification | Verify `./gradlew assembleDebug` (and Android unit tests), `npm run build` (and frontend tests), and `pytest tests/` pass 100% | M3 | ORIGINAL_REQUEST §4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Web Frontend Refactoring | Refactor `PillarsTable.tsx`, `ResultsPanel.tsx`, `RiskStatusBanner.tsx`, `Pillar*.tsx`, and UI components in `sih26188_project/frontend` to implement R1, R2, R3; update test assertions; verify `npm run build` & `npm test` | none | DONE |
| M2 | Android App Refactoring | Refactor `MainScreen.kt`, `AssessmentSummaryCard.kt`, `InspectionPipelineTrace.kt`, `DiscrepancyDiffTable.kt`, `SsbScreeningViewModel.kt`, `PresetScenarios.kt` in `/Users/iamsparsh00321/Downloads/ssb-field-screening` to implement R1, R2, R3; verify `./gradlew assembleDebug` & unit tests | none | DONE |
| M3 | Integration, Full Verification & Audit Gate | Run comprehensive test suites across all 3 platforms (`./gradlew assembleDebug`, `npm run build`, `pytest tests/`), execute Reviewers, Challengers, and Forensic Auditor verification | M1, M2 | DONE |

## Interface Contracts
### Backend ↔ Frontend / Android REST API
- `POST /api/v1/scan/inspect` & `POST /api/v1/inspect` -> `DocumentInspectResponse`
  - JSON keys (`risk_score`, `risk_level`, `tripwire_triggered`, `tripwire_codes`, `similarity`, `is_live`, `processing_time_ms`, etc.) remain stable.
  - UI Presentation layers (React & Compose) map `risk_score` to `"Threat Risk Level: ${score} / 100"`, format `processing_time_ms` into `"Screening Duration: ${(processing_time_ms / 1000).toFixed(2)} seconds"`, and display plain-language titles.

## Code Layout
- Web Frontend: `sih26188_project/frontend/src/`
  - `components/PillarsTable.tsx`
  - `components/ResultsPanel.tsx`
  - `components/RiskStatusBanner.tsx`
  - `components/PillarOCR.tsx`, `PillarMRZ.tsx`, `PillarBiometrics.tsx`, `PillarForensics.tsx`, `PillarStamp.tsx`
  - `components/AuditCertificateModal.tsx`, `WebCamCapture.tsx`, `Dropzone.tsx`, `ToolChips.tsx`
  - `components/presets.ts`, `types/mockData.ts`
  - `tests/*.test.tsx`
- Android App: `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/`
  - `ui/MainScreen.kt`
  - `ui/components/AssessmentSummaryCard.kt`
  - `ui/components/InspectionPipelineTrace.kt`
  - `ui/components/DiscrepancyDiffTable.kt`
  - `ui/components/OfficerDecisionCard.kt`
  - `ui/components/CrossValidationMatrix.kt`
  - `ui/viewmodel/SsbScreeningViewModel.kt`
  - `data/model/PresetScenarios.kt`
  - `app/src/test/java/com/ssb/fieldscreening/`
- Backend: `sih26188_project/backend/`
  - `app/api/routers/`
  - `app/modules/`
  - `tests/`
