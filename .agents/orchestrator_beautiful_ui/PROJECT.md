# Project: SSB AI Document & Identity Screening System (SIH26188) — Beautiful UI Refactor

## Architecture & System Overview
The SSB AI Screening System provides border officers with real-time multi-modal document forensics, OCR/MRZ verification, biometrics matching/liveness, and Bayesian risk scoring.
This refactor overhauls the frontend interface using the cloned `beautiful-ui` design language, custom CSS token ramps, and 5 adapted UI primitives:
- **Design Tokens**: Surface ramps (`--page`, `--canvas`, `--surface`, `--inset`, `--field`, `--hover`), ink ramps (`--ink`, `--ink-2`, `--ink-3`), border hairlines, semantic tints (`--red-tint`, `--green-tint`, `--orange-tint`, `--accent-tint`), corner radii, and micro-interaction keyframes (`pop-in`, `fade-up`, `radarSweep`, `records-pulse`).
- **Adapted UI Primitives** (`frontend/src/components/ui/`):
  1. `DiffTable`: Discrepancy comparison between Visual OCR and Machine-Readable Zone (MRZ)/PKI data.
  2. `FilterTable`: Cross-validation rule evaluation logs with status filter chips and accordion explanations.
  3. `ApprovalCard`: Border officer interdiction decision workflow (Hold for Secondary, Clear, Issue Interdiction) with reason logging.
  4. `ToolChips` & `TaskRows`: Multi-model telemetry (PP-OCRv4, DocTamper, SCRFD, AdaFace, MiniFASNet) displaying status, latency, and confidence metrics.
  5. `SegmentedControl` & `StatusPill`: Preset selection and risk severity indicators.
- **Ingestion & Dashboard Layout**: Responsive dual-column ingestion interface eliminating negative space with active preview cards, tactical upload controls, and standby readiness telemetry when idle.
- **Air-Gapped Desktop Runtime**: Pure React 19 + Vite 6 + Tailwind CSS bundled via Tauri v2 into a standalone macOS `.app` bundle with custom `ssb.webp` icon.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---|---|---|---|---|
| 1 | CSS Token Ramp & Typography | Complete surface, ink, border, radii, and semantic tint variable tokens in `index.css` | M1 | Survey E1 | DONE |
| 2 | Micro-interaction Keyframes | CSS animations (`pop-in`, `fade-up`, `fade-in`, `radarSweep`, `records-pulse`, `shimmer-text`) | M1 | Survey E1, E2 | DONE |
| 3 | `DiffTable` Component | Visual text vs MRZ cross-field mismatch inspection with strikethroughs & additions | M2 | Survey E1 | DONE |
| 4 | `FilterTable` Component | Cross-validation rules table with status filter chips, counts, and accordion details | M2 | Survey E1 | DONE |
| 5 | `ApprovalCard` Component | 3-way officer authorization workflow (Hold for Secondary, Clear, Issue Interdiction) | M2 | Survey E1 | DONE |
| 6 | `ToolChips` & `TaskRows` Component | 5-pillar neural pipeline telemetry with latency and confidence diagnostics | M2 | Survey E1 | DONE |
| 7 | `SegmentedControl` & `StatusPill` | Sliding thumb preset selector and multi-tone status badges | M2 | Survey E1 | DONE |
| 8 | Ingestion Viewport Refactoring | Expand dropzone & webcam viewports, eliminate empty negative space | M3 | Survey E2 | DONE |
| 9 | Tactile Ingestion Controls & Previews | Live document and face preview cards with drag-and-drop & webcam capture | M3 | Survey E2 | DONE |
| 10 | Standby Telemetry & Readiness Grid | Rich standby dashboard when idle so screen is never blank | M3 | Survey E2 | DONE |
| 11 | API Field Alignment | Ensure `document_image` and `live_face_image` parameter names match FastAPI schema | M4 | Survey E3 | DONE |
| 12 | Reactive ResultsPanel Integration | Wire DiffTable, FilterTable, ToolChips, and StatusPill to scan results | M4 | Survey E2 | DONE |
| 13 | Officer Interdiction Modal Flow | Wire Secondary Action button to open ApprovalCard modal for officer decision | M4 | Survey E2 | DONE |
| 14 | Backend Pytest Verification | Run and pass all 121 tests in `backend/tests/` | M5 | Survey E3 | DONE |
| 15 | Frontend TypeScript & Build Verification | Verify `npm run build` completes with 0 errors | M5 | Survey E2, E3 | DONE |
| 16 | Tauri Desktop Compilation | Compile macOS `SSB Screening.app` via `cargo tauri build` with custom icon | M5 | Survey E3 | DONE |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Design System & CSS Tokens | `frontend/src/index.css`, Tailwind theme tokens, keyframe animations | none | DONE |
| M2 | UI Primitives Porting | `frontend/src/components/ui/` (`DiffTable`, `FilterTable`, `ApprovalCard`, `ToolChips`, `SegmentedControl`, `StatusPill`) | M1 | DONE |
| M3 | Ingestion & Dashboard Layout | `IngestionPanel.tsx`, `Dropzone.tsx`, `WebCamCapture.tsx`, Standby telemetry | M1, M2 | DONE |
| M4 | Full Reactive Integration | `App.tsx`, `ResultsPanel.tsx`, `api.ts`, officer decision modal | M2, M3 | DONE |
| M5 | Comprehensive Verification & Tauri Build | Backend 121 tests, Frontend `npm run build`, `cargo tauri build` macOS bundle | M4 | DONE |

---

## Interface Contracts
### `DiffTable`
- Props: `items: Array<{ field: string; sourceA: string; sourceB: string; status: 'match' | 'mismatch' | 'missing'; labelA?: string; labelB?: string; }>`
### `FilterTable`
- Props: `rules: Array<{ id: string; name: string; status: 'passed' | 'violation' | 'warning' | 'info'; description?: string; details?: string; weight?: number; }>`
### `ApprovalCard`
- Props: `riskScore: number; riskLevel: string; onDecision: (decision: 'clear' | 'secondary' | 'interdict', notes: string) => void; onCancel?: () => void; isOpen?: boolean;`
### `ToolChips` / `TaskRows`
- Props: `telemetry: Array<{ name: string; status: 'pending' | 'running' | 'completed' | 'failed'; durationMs?: number; confidence?: number; modelVersion?: string; details?: string; }>`
### `SegmentedControl`
- Props: `options: Array<{ id: string; label: string; icon?: React.ReactNode }>; value: string; onChange: (id: string) => void;`

---

## Code Layout
- `frontend/src/index.css`: Tokens, animations, global resets.
- `frontend/src/components/ui/`: Pure reusable primitives (`DiffTable.tsx`, `FilterTable.tsx`, `ApprovalCard.tsx`, `ToolChips.tsx`, `SegmentedControl.tsx`, `StatusPill.tsx`, etc.).
- `frontend/src/components/`: View panels (`IngestionPanel.tsx`, `Dropzone.tsx`, `WebCamCapture.tsx`, `ResultsPanel.tsx`, `StandbyTelemetry.tsx`, `AuditCertificateModal.tsx`).
- `frontend/src/services/api.ts`: API service and FormData payload mapping.
- `frontend/src/App.tsx`: Master reactive state orchestrator.
- `backend/`: FastAPI backend with 121 passing tests.
- `src-tauri/`: Tauri v2 configuration and desktop build files (`SSB Screening.app`).
