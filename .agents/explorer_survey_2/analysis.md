# Comprehensive Frontend Architecture Survey & Integration Blueprint
**Smart India Hackathon 2026 (SIH26188) — SSB AI Document & Identity Screening System**
**Date**: 2026-08-23 | **Surveyor**: Explorer 2 (Frontend Architecture & Layout Analyzer)

---

## Executive Summary

This investigation conducted a full-stack inspection of the frontend architecture at `sih26188_project/frontend/` and reference primitives at `sih26188_project/beautiful-ui-reference/`. 

The frontend is implemented with **React 19.0.0**, **Vite 6.1.0**, **TypeScript 5.7.3**, and **TailwindCSS 3.4.17**, bundled with **Tauri 2.0** for macOS desktop distribution. The backend verification suite currently passes **121/121 pytest tests** across OCR, MRZ, biometrics, forensics, stamps, and risk scoring.

The survey identified:
1. **Layout & Negative Space Bottlenecks**: The root cause of empty negative space in `IngestionPanel.tsx`, `Dropzone.tsx`, and `WebCamCapture.tsx` stems from fixed micro-height constraints (`min-h-[160px]`, `h-[150px]`) within wide 2-column flex/grid containers spanning up to 1700px, combined with unrendered viewport real estate prior to document scanning.
2. **Design Token Gaps**: Discrepancies between `src/index.css` and `beautiful-ui-reference/app/globals.css` in animation class names (kebab-case vs camelCase), missing elevation shadow rings, and missing atomic status pills/tags.
3. **Primitive Adaptation Opportunities**: Mapping the 5 required Beautiful-UI primitives (`DiffTable`, `FilterTable`, `ApprovalCard`, `ToolChips`/`TaskRows`, `SegmentedControl`/`StatusPill`) to replace static tables and ad-hoc controls with polished micro-interactions and state transitions.
4. **Reactive State Data Flow**: A well-structured Pydantic-mirrored TypeScript contract (`DocumentInspectResponse`, `ScanResponse`, `RiskAssessment`) ready for seamless telemetry binding.

---

## 1. Complete Frontend Architecture & Structure Map

### 1.1 Directory & File Layout
```
sih26188_project/
├── frontend/
│   ├── package.json              # React 19, Vite 6, TailwindCSS 3.4, Lucide-react
│   ├── vite.config.ts            # Proxy /api -> http://localhost:8000, port 3000
│   ├── tailwind.config.js        # Defense color palettes, fonts, custom keyframes
│   ├── postcss.config.js         # TailwindCSS + Autoprefixer
│   ├── index.html                # Entry point with SSB branding and fonts
│   ├── public/
│   │   ├── ssb_logo.png          # Official Sashastra Seema Bal emblem
│   │   ├── ssb_logo.svg          # Vector asset
│   │   └── ssb.png               # High-res crest
│   └── src/
│       ├── main.tsx              # React 19 Root Render
│       ├── index.css             # CSS variables, dark theme tokens, keyframes
│       ├── App.tsx               # Orchestrator & reactive state management
│       ├── components/
│       │   ├── Header.tsx                 # Top navigation, checkpoint selector, health ping
│       │   ├── OfflineWarningBanner.tsx   # Offline notification banner
│       │   ├── PresetsBar.tsx             # Quick-test preset scenarios (Clean, Forged, Stamp, Spoof)
│       │   ├── IngestionPanel.tsx         # Document dropzone + Webcam capture + Action bar
│       │   ├── Dropzone.tsx               # Primary document upload & drag-drop
│       │   ├── WebCamCapture.tsx          # Real-time webcam / snapshot / photo upload
│       │   ├── ResultsPanel.tsx           # Multi-pillar inspection results container
│       │   ├── RiskStatusBanner.tsx       # Large GREEN/AMBER/RED status banner
│       │   ├── RiskScoreCard.tsx          # 240° Bayesian gauge & log-odds decomposition
│       │   ├── ReasonBulletList.tsx       # Human-readable discrepancy & telemetry log
│       │   ├── ForensicsViewer.tsx        # Dual-canvas slider / side-by-side heatmap viewer
│       │   ├── PillarsTable.tsx           # 5-Pillar tabbed detail tables
│       │   ├── PillarOCR.tsx              # OCR field table & Aadhaar QR PKI demographics
│       │   ├── PillarMRZ.tsx              # ICAO Doc 9303 checksum analysis table
│       │   ├── PillarBiometrics.tsx       # AdaFace cosine score & MiniFASNet liveness
│       │   ├── PillarForensics.tsx        # DocTamper, TruFor, and ELA intensity metrics
│       │   ├── PillarStamp.tsx            # 4-stage border stamp SSIM & ORB matcher
│       │   ├── AuditCertificateModal.tsx  # Formal legal audit certificate generator
│       │   └── RawJsonViewerModal.tsx     # Full telemetry JSON inspector
│       ├── components/ui/
│       │   ├── Button.tsx                 # Base button primitive (accent, danger, outline)
│       │   ├── StatusPill.tsx             # Tone-based pill indicator (green/amber/red)
│       │   ├── ProgressRing.tsx           # SVG circular progress ring
│       │   ├── ApprovalCard.tsx           # Officer decision authorization primitive
│       │   ├── DiffTable.tsx              # Cross-stream visual vs MRZ mismatch matrix
│       │   ├── FilterTable.tsx            # Cross-validation rules table with filter pills
│       │   └── InspectionPipelineTrace.tsx# Expandable 5-pillar execution trace
│       ├── hooks/
│       │   └── useBackendHealth.ts        # Polling hook for FastAPI /api/v1/health
│       ├── services/
│       │   ├── api.ts                     # inspectDocument() & checkBackendHealth() fetch client
│       │   ├── presets.ts                 # Synthetic canvas document & face image generator
│       │   └── mockData.ts                # Realistic full-telemetry mock inspection payloads
│       ├── types/
│       │   └── api.ts                     # Pydantic v2 mirrored TypeScript interfaces
│       └── utils/
│           ├── formatting.ts              # Millisecond, risk color, and score formatters
│           └── heatmap.ts                 # Synthetic Turbo/Jet colormap generator
```

### 1.2 Package & Build Tooling Specifications
- **Build tool**: Vite 6.1.0 configured with `@vitejs/plugin-react` 4.3.4.
- **Port**: 3000 (with proxy forwarding `/api` to `http://localhost:8000`).
- **Dependencies**: React 19.0.0, ReactDOM 19.0.0, Lucide-react 0.475.0, clsx 2.1.1, tailwind-merge 3.0.1.
- **Zero Incompatible Dependencies**: Clean React 19 execution without Next.js server components, PostHog, or external cloud analytics.

---

## 2. CSS Design Tokens & Layout Diagnosis

### 2.1 Tokenization Comparison (`index.css` vs `beautiful-ui-reference`)

| Category | `beautiful-ui-reference` Tokens | Current `src/index.css` Tokens | Status & Required Fixes |
|---|---|---|---|
| **Surfaces** | `--page`, `--canvas`, `--surface`, `--inset`, `--hover`, `--hover-2`, `--field` | `--surface: #1e293b`, `--hover: #334155`, `--field: #0f172a` | Add `--canvas`, `--page`, `--inset` tokens; ensure smooth dark-mode saturation |
| **Ink Ramp** | `--ink`, `--ink-2`, `--ink-3` | `--ink: #f8fafc`, `--ink-2: #94a3b8`, `--ink-3: #64748b` | Matches dark ink ramp. Map to Tailwind utility classes |
| **Semantic Tints** | `--green-tint`, `--red-tint`, `--orange-tint`, `--accent-tint` | `--green-tint: rgba(16,185,129,0.15)`, `--red-tint: rgba(239,68,68,0.15)` | Ensure `--accent-tint` and `--orange-tint` are fully tokenized for pill backgrounds |
| **Borders** | `--line`, `--line-strong` | `--line: #334155`, `--line-strong: #475569` | Matches; ensure border utilities apply crisp non-alpha rules |
| **Radii** | `--radius-chip: 6px`, `--radius-control: 8px`, `--radius-card: 10px`, `--radius-window: 14px` | `--radius-chip: 6px`, `--radius-control: 8px`, `--radius-card: 12px` | Standardize card radius to 10-12px |
| **Keyframes** | `pop-in`, `pop-out`, `fade-up`, `shimmer-text`, `caret-blink`, `spin`, `pixel-on` | `popIn`, `fadeUp`, `pulseGlowRed`, `radarSweep` | **Critical Fix**: Standardize animation names to kebab-case (`pop-in`, `fade-up`) so `beautiful-ui` components mount animations properly |
| **Micro-Spacing** | `.primitive-card-pad` (12px), `.primitive-card-bar` (10px 12px), `.primitive-card-footer` (10px 12px), `.primitive-table-cell` (10px 12px) | Inline Tailwind padding (`p-3.5`, `p-4`) | Standardize via utility classes to achieve optical harmony |

### 2.2 Root Cause Analysis of Empty Negative Space

#### Issue 1: Viewport Blank Space Before Document Ingestion
- **Observation**: In `App.tsx` (lines 293–299), `{scanResult && documentPreviewUrl && (<ResultsPanel ... />)}` conditionally unmounts the entire results viewport when idle.
- **Impact**: On a 1080p or 1440p monitor (viewport height > 900px), the `IngestionPanel` occupies only ~320px vertical space, leaving ~600px of completely empty dark background below it.
- **Solution**: 
  - Render an interactive **"Screening Ready & System Standby"** dashboard or **Interactive Telemetry Pipeline** in idle state, displaying active border checkpost guards, checkpoint statistics, and model readiness status.
  - Alternatively, design `IngestionPanel` as an expansive, full-height command console with side-by-side live camera stream, document verification specifications, and supported credential guidance.

#### Issue 2: Horizontal Stretching in `Dropzone.tsx` and `WebCamCapture.tsx`
- **Observation**: `IngestionPanel.tsx` uses `<div className="grid grid-cols-1 md:grid-cols-2 gap-3">`. In a 1700px wide container (`max-w-[1700px]`), each card is ~830px wide, but contains `min-h-[160px]` and content limited to `max-w-xs` (320px).
- **Impact**: More than 60% of each upload/camera card consists of empty dark space flanking small centered icons and text.
- **Solution**:
  - Restructure the dropzone into a 3-part layout: Left = Action dropzone / Live camera viewfinder; Middle = Image specs & accepted security features (ICAO 9303, UIDAI QR PKI, Devanagari OCR, 300 DPI Flatbed); Right = Live credential preview card with metadata badges.
  - When an image is ingested, expand the preview to utilize the container height and width gracefully (`h-[220px] object-contain`).

---

## 3. Reactive State & API Telemetry Flow Analysis

### 3.1 Data Flow Diagram
```
[User Action / Preset Select / WebCam Capture]
                 │
                 ▼
          App.tsx State
 (documentFile, livePhotoFile, selectedCheckpoint, transitDate)
                 │
                 ▼
       services/api.ts -> POST /api/v1/scan/inspect
                 │
                 ▼
      DocumentInspectResponse
   ├── session_id: string
   ├── status: "completed" | "flagged" | "failed"
   ├── assessment: RiskAssessment
   │     ├── risk_score: number (0-100)
   │     ├── risk_level: "GREEN" | "AMBER" | "RED"
   │     ├── auto_clear: boolean
   │     ├── tripwire_triggered: boolean
   │     ├── tripwire_codes: string[]
   │     ├── reasons: string[]
   │     ├── cross_validation_violations: string[]
   │     ├── score_breakdown: RiskScoreBreakdown (Bayesian log-odds)
   │     ├── heatmap_base64: string (Turbo colormap PNG)
   │     └── audit_hash: string (SHA-256)
   └── details: ScanResponse
         ├── ocr: OCRResult (fields, confidences, raw_boxes, qr_payload)
         ├── mrz: MRZResult (valid, raw_lines, parsed_fields, checksum_failures)
         ├── biometrics: FaceMatchResult (similarity, match, threshold, apparent_age)
         ├── liveness: LivenessResult (is_live, confidence, attack_type, scores)
         ├── forensics: ForensicsResult (tamper_score, tampered_regions, doctamper, trufor, ela)
         ├── stamp: StampResult (stamp_found, stamp_score, verdict, ssim, orb)
         └── cross_validation: CrossValidationResult (flags, rules_checked, violations)
```

### 3.2 Component State Wiring Matrix

| UI Component | Data Source Field | Rendered Information & Interaction |
|---|---|---|
| `RiskStatusBanner` | `assessment.risk_level`, `assessment.risk_score`, `assessment.tripwire_codes` | Tier indicator, auto-clear badge, instant tripwire overrides, action mandate |
| `ApprovalCard` | `assessment.risk_level`, `assessment.risk_score` | Pre-selects recommended action (`AUTO_CLEAR` for Green, `SECONDARY_INSPECTION` for Amber, `DETAIN_AND_INTERDICT` for Red), collects officer badge/remarks, outputs audit decision |
| `InspectionPipelineTrace` / `TaskRows` | `details.ocr`, `details.mrz`, `details.biometrics`, `details.forensics`, `details.stamp` | Real-time multi-model telemetry (PP-OCRv4, ICAO 7-3-1, AdaFace, MiniFASNet, DocTamper, SSB Stamp), latency badges, status indicators |
| `RiskScoreCard` | `assessment.risk_score`, `assessment.score_breakdown`, `assessment.audit_hash` | SVG 240° calibrated gauge, log-odds breakdown matrix ($L_0 + \sum \Delta L_i$), SHA-256 copy button |
| `DiffTable` | `details.ocr.fields` vs `details.mrz.parsed_fields` vs `details.ocr.qr_payload.demographics` | Cross-field visual vs MRZ discrepancies (DOB, Document Number, Name, Issuing Country), strike-through tampered values, match/mismatch filtering |
| `FilterTable` | `details.cross_validation.flags` | 8-rule cross-validation status (CV-01 through CV-08), category chips (OCR/MRZ, Biometrics, Forensics, PKI), interactive filter pills (All, Passed, Warnings, Violations) |
| `ForensicsViewer` | `documentImageUrl`, `heatmapImageUrl`, `details.forensics.tampered_regions`, `details.stamp.stamp_bbox` | Interactive alpha-blending canvas slider, side-by-side 300 DPI view, bounding box overlay, Turbo colormap scale, zoom controls |
| `PillarsTable` | `details.ocr`, `details.mrz`, `details.biometrics`, `details.forensics`, `details.stamp` | Deep pillar telemetry tabs (OCR bounding boxes, QR PKI RSA-2048, Modulo-10 checksum details, AdaFace embeddings, DocTamper DTD / TruFor splicing scores, Stamp SSIM / ORB keypoint counts) |

---

## 4. UI Primitives Integration & Porting Blueprint

### 4.1 `DiffTable` Adaptation (`src/components/ui/DiffTable.tsx`)
- **Origin**: `beautiful-ui-reference/components/primitives/DiffTable.tsx`
- **Adaptation Purpose**: Visual OCR text vs ICAO MRZ / UIDAI PKI demographic discrepancy matrix.
- **Key Features**:
  1. Header with discrepancy counter and "Filter Mismatches Only" toggle.
  2. Smooth stage animation with row-level inclusion toggling.
  3. Red strike-through for conflicting OCR values vs validated MRZ/PKI source of truth.
  4. Status badge (`✓ MATCH` in green tint vs `✕ TAMPERED` in red tint with pulsing highlight).
  5. Footer summary displaying active discrepancy count and "Acknowledge Mismatches" action.

### 4.2 `FilterTable` Adaptation (`src/components/ui/FilterTable.tsx`)
- **Origin**: `beautiful-ui-reference/components/primitives/FilterTable.tsx`
- **Adaptation Purpose**: Dynamic filtering of the 8 Multi-Modal Cross-Validation Rules.
- **Key Features**:
  1. Horizontal pill filter strip: `All (8)`, `Passed (X)`, `Warnings (Y)`, `Violations (Z)`.
  2. Smooth CSS grid height transition (`grid-template-rows 1fr -> 0fr` with cubic bezier easing) for filtered rows.
  3. Status pill indicators (`✓ PASS`, `⚠ WARN`, `✕ VIOLATION`).
  4. Rule category badges (`OCR / MRZ`, `BIOMETRICS`, `FORENSICS`, `CRYPTO PKI`).

### 4.3 `ApprovalCard` Adaptation (`src/components/ui/ApprovalCard.tsx`)
- **Origin**: `beautiful-ui-reference/components/primitives/ApprovalCard.tsx`
- **Adaptation Purpose**: Border control officer human-in-the-loop interdiction and clearance decisions.
- **Key Features**:
  1. 3 action cards: `Clear Traveler (Auto-Clear)`, `Secondary Hold (Physical Inspection)`, `Interdiction Order (Detain & Report)`.
  2. Radio selection indicators with animated scale transitions.
  3. Officer notes and badge ID input with focus-within highlighting.
  4. Decision confirmation badge with pop-in animation upon authorization.

### 4.4 `ToolChips` & `TaskRows` (`src/components/ui/ToolChips.tsx` & `src/components/ui/TaskRows.tsx`)
- **Origin**: `beautiful-ui-reference/components/primitives/ToolChips.tsx` and `TaskRows.tsx`
- **Adaptation Purpose**: Multi-model execution telemetry.
- **Key Features**:
  1. Expandable rows for each neural module:
     - `PP-OCRv4 Multilingual` -> OCR field extraction and Devanagari script recognition.
     - `ICAO Doc 9303 Modulo-10` -> 7-3-1 weight check digits (CD1, CD2, CD3, CD4).
     - `AdaFace ResNet-100` -> Cosine similarity & Umeyama 5-point alignment.
     - `MiniFASNetV2-SE` -> Dual-scale (2.7× and 4.0×) anti-spoofing liveness verification.
     - `DocTamper DTD & TruFor` -> Pixel manipulation localization & ELA quality 90.
     - `SSB Stamp Verifier` -> HSV color filtering, SSIM reference template correlation, ORB keypoints.
  2. Micro-chip badges displaying latency (e.g. `82ms`, `12ms`, `110ms`) and model versions.
  3. Expandable detail drawers revealing raw telemetry outputs.

### 4.5 `SegmentedControl` & `StatusPill` (`src/components/ui/SegmentedControl.tsx` & `src/components/ui/StatusPill.tsx`)
- **Origin**: `beautiful-ui-reference/components/atoms/SegmentedControl.tsx` and `StatusPill.tsx`
- **Adaptation Purpose**:
  - `SegmentedControl`: Sliding thumb tab switchers for View Modes (Opacity Slider vs Side-by-Side), Presets Selection, and 5-Pillars Filtering.
  - `StatusPill`: Atomic indicator with semantic dot (`green`, `orange`, `red`, `accent`, `neutral`) using `--green-tint`, `--red-tint`, and `--orange-tint`.

---

## 5. Layout Refactoring Plan (Eliminating Negative Space)

### Step 1: IngestionPanel Re-architecture
- Convert `IngestionPanel.tsx` from an isolated centered card into a rich border-control command workstation.
- Integrate `PresetsBar` with a `SegmentedControl` or tactile preset chips.
- Expand `Dropzone` and `WebCamCapture` with:
  - Visual aspect-ratio boundary indicators (Document flatbed 3:2 vs Face portrait 1:1).
  - Supported credential matrix chips with quick guidance tooltips.
  - Dual action buttons: Primary action (Browse/Capture) + Secondary action (Sample loader / Camera switch).
  - Expanded preview height (`h-[200px]` - `h-[240px]`) that scales responsively.

### Step 2: System Standby / Live Baseline Dashboard
- When no document is scanned yet (`!scanResult`), replace the empty space below `IngestionPanel` with a **"System Ready & Standby Telemetry Panel"**:
  - Showing active border checkpost status (Jaigaon / Sonauli / Raxaul / Panitanki / Jogbani).
  - Active detection models status (all 6 models verified loaded in CoreML/CUDA memory).
  - Standby checklist highlighting compliance with DPDP Act 2023, Aadhaar Act, and ICAO Doc 9303 standards.

### Step 3: Tactile Action Bar
- Dock the "Scan & Inspect" execution bar with a prominent action button, clear visual feedback (`Loader2` spinner + `Running pipeline…`), and instant keyboard shortcut support (`Enter` / `Space`).

---

## 6. Tauri macOS Desktop Application Verification

### Configuration in `src-tauri/tauri.conf.json`:
- **Window Specs**: Width 1400px, Height 900px, MinWidth 1100px, MinHeight 700px, resizable, centered.
- **Product Name**: `SSB Screening` (Bundle ID: `gov.mha.ssb.screening`).
- **Icons**: Configured with `icons/32x32.png`, `icons/128x128.png`, `icons/128x128@2x.png`, `icons/icon.icns`, and `icons/1024x1024.png`.
- **Build Target**: Verified clean build command `npm --prefix ../frontend run build` producing `frontend/dist`.

---

## 7. Next Steps & Implementation Roadmap

1. **Phase 1: Token & CSS Synchronization**
   - Update `src/index.css` with missing Beautiful-UI variables, kebab-case keyframe animations (`pop-in`, `fade-up`, `radarSweep`), and atomic utility classes.
2. **Phase 2: UI Primitives Porting & Enhancements**
   - Refactor `DiffTable.tsx`, `FilterTable.tsx`, `ApprovalCard.tsx`, and create `ToolChips.tsx` / `SegmentedControl.tsx` in `src/components/ui/`.
3. **Phase 3: Ingestion & Dashboard Layout Refactoring**
   - Refactor `IngestionPanel.tsx`, `Dropzone.tsx`, and `WebCamCapture.tsx` to eliminate empty negative space and add the standby telemetry panel.
4. **Phase 4: State Wiring & ResultsPanel Integration**
   - Wire all new primitives to reactive state in `App.tsx` and `ResultsPanel.tsx`.
5. **Phase 5: Full Build & Desktop Verification**
   - Verify `npm run typecheck`, `npm run build`, `pytest tests/`, and `cargo tauri build`.
