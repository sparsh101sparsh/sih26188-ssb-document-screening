# Project: SSB Field Screening System — Deep Oceanic Redesign & Decluttering

## Architecture & Design Language System (Deep Oceanic)
Universal Product Design Language System (DLS) token specifications applied across both Android and Computer (React/Tauri) apps:
- **Base Canvas**: `#030B14` (Deep ocean darkness / page background)
- **Supporting Surface**: `#0B1A2E` (Cards, panels, primary surfaces)
- **Inset / Header Surface**: `#081525` (Headers, toolbars, recessed regions)
- **Interactive Surface**: `#112745` (Hover states, active chips, secondary action cards)
- **Structural Border**: `#1E3A5F` (Subtle boundary lines, card borders, dividers)
- **Hover / Active Border**: `#2C5282` (Active focus rings, selected tabs)
- **Primary Text**: `#F8FAFC` (High legibility primary headings and text)
- **Secondary Text**: `#94A3B8` (Labels, metadata, captions)
- **Muted Text**: `#64748B` (Inactive states, placeholders)
- **Brand Purple**: `#5B21B6` / `#4C1D95` (Audit seals, authority badges)
- **Interaction Blue**: `#2563EB` / `#3B82F6` (Primary action buttons, links)
- **Amber Warning**: `#F59E0B` (Warning badges, secondary inspection state)
- **Success / Emerald**: `#10B981` (foreground), `#ECFDF5` (background), `#A7F3D0` (border)
- **Danger / Crimson**: `#EF4444` (Detain alert, mismatch flags)

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Android Deep Oceanic Color Injection | Update `Color.kt` and `Theme.kt` with Deep Oceanic tokens | M1 | ORIGINAL_REQUEST §1, R1.1 | DONE |
| 2 | Android 22% Squircle Corner Radii | Proportional corner radii (11-12dp for 48-56dp elements, 8dp for chips, 14-16dp for cards) | M1 | ORIGINAL_REQUEST §R1.1 | DONE |
| 3 | Android 3-Tab Navigation & Cogs Diagnostics | Exactly 3 tabs (`CAPTURE`, `RESULTS`, `OUTBOX`); Gateway Diagnostics via header cogs icon | M1 | ORIGINAL_REQUEST §R1.2 | DONE |
| 4 | Android Quiet Capture View | Declutter `DualCameraCaptureView.kt`: maximize camera viewports, retain only top connection & bottom capture | M1 | ORIGINAL_REQUEST §R1.3 | DONE |
| 5 | Android Accordion Diagnostics | Collapsible accordions for `InspectionPipelineTrace`, `CrossValidationMatrix`, `DiscrepancyDiffTable` | M1 | ORIGINAL_REQUEST §R1.4 | DONE |
| 6 | Android Header Connection Consolidation | Consolidate double pills into single authoritative connection badge | M1 | ORIGINAL_REQUEST §R3 | DONE |
| 7 | Computer App Deep Oceanic Tokens | Standardize colors in `index.css` & Tailwind with Deep Oceanic variables | M2 | ORIGINAL_REQUEST §1, R2.1 | DONE |
| 8 | Remove Visual Noise & Neon Blobs | Eliminate `pulseGlowRed`, `radar-sweep`, `glow-red/green`, arbitrary gradients, and `bg-grid-pattern` | M2 | ORIGINAL_REQUEST §R2.1 | DONE |
| 9 | Decluttered Desktop Dashboard | Active screening queue, latest results, and connected devices tracker; remove redundant KPI cards | M2 | ORIGINAL_REQUEST §R2.2 | DONE |
| 10 | Desktop Accordion Information Architecture | Expandable accordions for technical diagnostics (Pipeline trace, Diff matrix, 8-rule matrix, Forensics, JSON) | M2 | ORIGINAL_REQUEST §R2.2 | DONE |
| 11 | Compact Connected Devices Header Panel | Single authoritative connection capsule reading from `/api/v1/devices` | M2 | ORIGINAL_REQUEST §R2.3, R3 | DONE |
| 12 | Frontend Slop Elimination | Remove orphaned components (`StandbyTelemetry.tsx`, `TaskRows.tsx`, unused UI atoms) and duplicate renders | M2 | ORIGINAL_REQUEST §R3 | DONE |
| 13 | Android Slop & Dead Code Elimination | Remove dead `NavigationScreen` enums and unreachable switch branches | M1 | ORIGINAL_REQUEST §R3 | DONE |
| 14 | Cross-Platform Build & Test Verification | `./gradlew assembleDebug`, `pytest tests/` (242 tests), `npm run build` | M3 | ORIGINAL_REQUEST §Acceptance | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Android App Declutter & Deep Oceanic DLS | Theme, 3-tab nav + cogs, quiet capture, accordions, slop removal | none | DONE |
| M2 | Computer App Declutter & Deep Oceanic DLS | Tokens in CSS/Tailwind, decluttered dashboard, device capsule, accordions, slop removal | none | DONE |
| M3 | End-to-End System Verification & Forensic Audit | Verification of all builds, adversarial tests, and forensic integrity audit | M1, M2 | DONE |

## Code Layout
- **Android App**: `/Users/iamsparsh00321/Downloads/ssb-field-screening/app/src/main/java/com/ssb/fieldscreening/`
  - Theme: `ui/theme/Color.kt`, `Theme.kt`, `Type.kt`
  - Screens: `ui/MainScreen.kt`, `ui/components/HeaderBar.kt`, `ui/components/DualCameraCaptureView.kt`, `ui/components/AssessmentSummaryCard.kt`, `ui/components/InspectionPipelineTrace.kt`, `ui/components/CrossValidationMatrix.kt`, `ui/components/DiscrepancyDiffTable.kt`, `ui/components/OutboxScreen.kt`, `ui/components/GatewayDiagnosticsView.kt`
  - ViewModels: `ui/viewmodel/SsbScreeningViewModel.kt`
- **Computer App (Frontend)**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend/src/`
  - Styles: `index.css`, `../tailwind.config.js`
  - Root: `App.tsx`, `main.tsx`
  - Components: `components/Header.tsx`, `components/RiskStatusBanner.tsx`, `components/RiskScoreCard.tsx`, `components/ApprovalCard.tsx`, `components/ResultsPanel.tsx`, `components/InspectionPipelineTrace.tsx`, `components/DiscrepancyDiffTable.tsx`, `components/CrossValidationMatrix.tsx`, `components/ForensicsViewer.tsx`, `components/AuditCertificateModal.tsx`
- **Backend**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/`
  - App: `app/main.py`, `app/core/device_tracker.py`, `app/api/`
  - Tests: `tests/`
