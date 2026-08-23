# SSB Field Screening System — Frontend Architecture & Deep Oceanic Redesign Survey

**Author**: Explorer 2 (Frontend React / Tauri Scope)  
**Date**: 2026-08-23  
**Target Path**: `sih26188_project/frontend/` & `sih26188_project/src-tauri/`  
**Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_2/`

---

## 1. Executive Summary

The **Sashastra Seema Bal (SSB) Field Screening Computer Application** is a high-security, air-gapped command-center desktop interface built with **React 19**, **Tailwind CSS 3.4**, **Lucide React**, and **Tauri 2.0**. It serves border patrol officers and duty inspectors at critical immigration checkposts along the Indo-Nepal and Indo-Bhutan frontiers (Jaigaon, Sonauli, Raxaul, Panitanki, Jogbani).

This investigation provides an exhaustive technical survey and actionable redesign blueprint to transition the computer application from a visually noisy, multi-stop neon aesthetic to the **Deep Oceanic Universal Product Design Language System (DLS)**. The redesign eliminates decorative bloat, removes arbitrary glow animations, declutters redundant KPI cards, and organizes dense forensic telemetry into clean, expandable accordions while highlighting the high-contrast operational triage status and connected Android field devices.

---

## 2. Codebase Inventory & Architecture Map

### 2.1 File Map & Purpose

```
sih26188_project/
├── frontend/
│   ├── package.json                   # Dependencies: React 19, Lucide React, Tailwind CSS, Vite 6
│   ├── vite.config.ts                 # Vite bundler configuration (Port 3000, React plugin)
│   ├── tsconfig.json                  # TypeScript compiler options (ES2022, React-JSX, Bundler resolution)
│   ├── tailwind.config.js             # Tailwind CSS theme extension (Tokens, animations, keyframes)
│   ├── postcss.config.js              # PostCSS plugin loader (Tailwind + Autoprefixer)
│   ├── index.html                     # HTML entry point with viewport & title
│   ├── public/
│   │   ├── ssb_logo.png               # Official SSB Crest (Bitmap)
│   │   ├── ssb_logo.svg               # Official SSB Crest (Vector with SVG gradients)
│   │   └── favicon.svg                # Application Favicon
│   ├── src/
│   │   ├── main.tsx                   # React 19 root bootstrap (`ReactDOM.createRoot`)
│   │   ├── App.tsx                    # Main workstation shell & state orchestrator
│   │   ├── index.css                  # Global CSS variables, OKLCH root tokens, keyframes
│   │   ├── components/
│   │   │   ├── Header.tsx             # Command-bar header with station selector & health ping
│   │   │   ├── IngestionPanel.tsx     # Dual document + biometric capture workstation
│   │   │   ├── ResultsPanel.tsx       # Multi-tab forensic results inspection viewport
│   │   │   ├── StandbyTelemetry.tsx   # 650-line telemetry component (currently unrendered)
│   │   │   ├── Dropzone.tsx           # Document image drag-and-drop ingestion card
│   │   │   ├── WebCamCapture.tsx      # Live webcam stream + selfie portrait capture
│   │   │   ├── PresetsBar.tsx         # 4 synthetic test preset buttons
│   │   │   ├── RiskScoreCard.tsx      # SVG arc gauge + Bayesian log-odds breakdown
│   │   │   ├── RiskStatusBanner.tsx   # Triage severity banner (AUTO-CLEAR / SECONDARY / DETAIN)
│   │   │   ├── ForensicsViewer.tsx    # Dual-canvas opacity slider & side-by-side viewer
│   │   │   ├── ReasonBulletList.tsx   # Discrepancy telemetry log + 8-rule cross-val table
│   │   │   ├── PillarsTable.tsx       # 5-Pillar multi-tab breakdown wrapper
│   │   │   ├── PillarOCR.tsx          # Pillar 1: PP-OCRv4 & UIDAI QR PKI card
│   │   │   ├── PillarMRZ.tsx          # Pillar 2: ICAO Doc 9303 Modulo-10 card
│   │   │   ├── PillarBiometrics.tsx   # Pillar 3: AdaFace Cosine & MiniFASNet FAS card
│   │   │   ├── PillarForensics.tsx    # Pillar 4: DocTamper DTD, TruFor & ELA card
│   │   │   ├── PillarStamp.tsx        # Pillar 5: 4-Stage SSB border stamp card
│   │   │   ├── AuditCertificateModal.tsx # Printable formal MHA screening audit certificate
│   │   │   ├── RawJsonViewerModal.tsx # OpenAPI JSON payload viewer modal
│   │   │   ├── OfflineWarningBanner.tsx # Edge server disconnection alert banner
│   │   │   └── ui/                    # Reusable Design Primitives:
│   │   │       ├── index.ts           # Barrel export for atoms and primitives
│   │   │       ├── ApprovalCard.tsx   # Officer decision selector & authorization trigger
│   │   │       ├── Button.tsx         # Tactile button primitive with multiple variants
│   │   │       ├── Chip.tsx           # Compact chip badge
│   │   │       ├── DiffTable.tsx      # OCR vs MRZ/PKI comparison table with diff filtering
│   │   │       ├── FilterTable.tsx    # 8-rule cross-validation status table
│   │   │       ├── InspectionPipelineTrace.tsx # Collapsible pipeline latency & status trace
│   │   │       ├── ProgressRing.tsx   # Tactile SVG circular indicator
│   │   │       ├── SegmentedControl.tsx # Tablist with sliding thumb indicator
│   │   │       ├── Shimmer.tsx        # Skeleton shimmer effect
│   │   │       ├── StatusPill.tsx     # Semantic tone pill badge with status dot
│   │   │       ├── StreamText.tsx     # Streaming text primitive
│   │   │       ├── Switch.tsx         # Toggle switch primitive
│   │   │       ├── TaskRows.tsx       # Hierarchical task list primitive
│   │   │       ├── TextRow.tsx        # Label-value pair row primitive
│   │   │       └── ToolChips.tsx      # Neural model telemetry chips & tensor diffs
│   │   ├── hooks/
│   │   │   └── useBackendHealth.ts    # Polling hook for FastAPI `/api/v1/health`
│   │   ├── services/
│   │   │   ├── api.ts                 # API client for `/api/v1/health` & `/api/v1/scan/inspect`
│   │   │   ├── mockData.ts            # Synthetic fallback responses for offline mode
│   │   │   └── presets.ts             # 4 synthetic test presets with generated SVG data
│   │   ├── types/
│   │   │   └── api.ts                 # Pydantic v2 data contracts & schemas
│   │   └── utils/
│   │       ├── formatting.ts          # Percent, latency, Aadhaar masking, color helpers
│   │       └── heatmap.ts             # Heatmap rendering and colormap utilities
│   └── tests/
│       ├── run_tests.mjs              # Custom esbuild node test runner
│       ├── primitives_adversarial.test.tsx
│       └── primitives_interactive_adversarial.test.tsx
└── src-tauri/
    ├── Cargo.toml                     # Tauri 2.0 Rust dependencies
    ├── tauri.conf.json                # Desktop window config (1400×900) & build hooks
    └── src/
        ├── main.rs                    # Tauri desktop entry point
        └── lib.rs                     # `get_api_url` command handler
```

---

## 3. Visual Noise, Gradient & Neon Element Audit

The current application contains numerous decorative elements, non-standard gradients, glowing box-shadows, and a fragmented color system combining OKLCH CSS variables with hardcoded `slate-900`/`slate-950` Tailwind classes.

### 3.1 Line-by-Line Visual Noise Inventory

| Component / File | Line(s) | Visual Noise Element | Deep Oceanic Replacement |
|---|---|---|---|
| `frontend/src/index.css` | 93–104 | `@keyframes pulseGlowRed` with intense `box-shadow: 0 0 28px ...` | Replace with solid high-contrast border `#EF4444` and clean badge `#450A0A`/`#EF4444` without radial glow |
| `frontend/tailwind.config.js` | 82–86 | `radar-sweep`, `glow-red`, `glow-green`, `alert-pulse-red` keyframe animations | Remove gaming/neon keyframes entirely |
| `frontend/src/App.tsx` | 291 | `bg-grid-pattern` background texture | Replace with flat, solid Deep Oceanic Base Canvas `#030B14` |
| `frontend/src/components/Header.tsx` | 69–71 | `animate-ping` on SSB crest green dot badge | Replace with steady `#10B981` status dot |
| `frontend/src/components/RiskStatusBanner.tsx` | 38, 84–86 | `pulsing-alert-red` class and `animate-bounce` on Stage 1 tripwire badge | Replace with high-contrast `#EF4444` solid pill badge with crisp `#F8FAFC` text |
| `frontend/src/components/RiskScoreCard.tsx` | 50–78 | 180×180 SVG circular gauge with multi-stop linear gradient (`#10b981` → `#f59e0b` → `#ef4444` → `#991b1b`) | Replace with a compact, crisp score pill/metric badge with semantic border and single solid tone |
| `frontend/src/components/ForensicsViewer.tsx` | 268–275 | Multi-stop rainbow colormap gradient bar (`#30123b` ... `#7a0403`) | Use simplified standard Viridis/Turbo colormap legend with clean `#1E3A5F` border |
| `frontend/src/utils/formatting.ts` | 52, 60, 68 | `glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]'` | Remove glow properties; rely on `#1E3A5F` / `#2C5282` structural borders |
| `frontend/src/components/Pillar*.tsx` | Multiple | 50+ instances of hardcoded `bg-slate-950`, `bg-slate-900`, `border-slate-800` | Standardize to semantic tokens: `bg-inset` (`#081525`), `bg-surface` (`#0B1A2E`), `border-line` (`#1E3A5F`) |
| `frontend/src/components/Header.tsx` | 114–126 | Double/triple badge clutter: Active Field Units + Air-Gapped + CPU Online + UTC Clock | Consolidate into a single authoritative header status cluster |

---

## 4. Deep Oceanic Design Language System (DLS) Specification

### 4.1 Canonical Design Tokens

All colors across `index.css` and `tailwind.config.js` will map to these exact hex values:

```css
:root {
  /* Canvas & Surfaces */
  --page: #030B14;          /* Base Canvas (App background) */
  --canvas: #030B14;        /* Underlying viewport background */
  --surface: #0B1A2E;       /* Supporting Surface (Cards, panels, modules) */
  --inset: #081525;         /* Inset Surface (Sub-panels, table headers, inputs) */
  --field: #081525;         /* Form input fields */
  --hover: #112745;         /* Interactive Surface / Hover state */
  --hover-2: #183359;       /* Active / Selected hover state */

  /* Typography Colors */
  --ink: #F8FAFC;           /* Primary Text (High contrast, headers, values) */
  --ink-2: #94A3B8;         /* Secondary Text (Body, labels, descriptions) */
  --ink-3: #64748B;         /* Muted Text (Hints, timestamps, inactive) */

  /* Borders & Dividers */
  --line: #1E3A5F;          /* Structural Border (Subtle card & panel boundaries) */
  --line-strong: #2C5282;   /* Active / Hover Border (Focus rings, selected tabs) */

  /* Brand & Accents */
  --accent: #2563EB;        /* Interaction Blue / Primary CTA */
  --accent-hover: #3B82F6;  /* Interaction Blue Hover */
  --accent-ink: #93C5FD;    /* Blue Text Accent */
  --accent-tint: rgba(37, 99, 235, 0.12); /* Subtle blue tint */

  --brand-purple: #5B21B6;  /* SSB Security Purple */
  --brand-purple-dark: #4C1D95;

  /* Semantic Status: Success (Emerald) */
  --green: #10B981;
  --green-bg: #022C22;
  --green-tint: rgba(16, 185, 129, 0.12);
  --green-border: #065F46;

  /* Semantic Status: Warning (Amber) */
  --orange: #F59E0B;
  --orange-bg: #451A03;
  --orange-tint: rgba(245, 158, 11, 0.12);
  --orange-border: #92400E;

  /* Semantic Status: Danger / Critical (Crimson) */
  --red: #EF4444;
  --red-bg: #450A0A;
  --red-tint: rgba(239, 68, 68, 0.14);
  --red-border: #991B1B;

  /* Proportional Corner Radii (22% squircle rule) */
  --radius-chip: 6px;       /* Tags & small pills */
  --radius-control: 8px;    /* Buttons & input fields */
  --radius-card: 10px;      /* Cards & modular containers */
  --radius-window: 14px;    /* Modals & main window panels */

  /* Subtle Crisp Box Shadows (No neon glows) */
  --shadow-hairline: 0 0 0 1px var(--line);
  --shadow-btn: 0 1px 2px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--line);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--line);
  --shadow-raised: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--line-strong);
  --shadow-overlay: 0 12px 32px rgba(0, 0, 0, 0.75), 0 0 0 1px var(--line-strong);
  --shadow-inset-field: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}
```

### 4.2 Tailwind Theme Extension Update Plan

In `frontend/tailwind.config.js`:
- Replace OKLCH variables with the Deep Oceanic tokens.
- Add `oceanic` color palette (`base: '#030B14'`, `surface: '#0B1A2E'`, `inset: '#081525'`, `interactive: '#112745'`, `border: '#1E3A5F'`, `borderActive: '#2C5282'`).
- Strip out unused keyframes (`radarSweep`, `pulseGlowRed`, `glowRed`, `glowGreen`).

---

## 5. Dashboard Structure Analysis & Decluttering Blueprint

### 5.1 Redundant Elements & Clutter to Remove

1. **Orphaned 650-Line Telemetry File (`StandbyTelemetry.tsx`)**:
   - Contains 5 separate tabs with static checkpost coordinates, full hardware memory specifications, and legal essays.
   - **Action**: Do not dump on the main screening viewport. Extract its active device fleet tracking logic (`/api/v1/devices`) into a compact header/sidebar widget.
2. **Duplicate Header Badges**:
   - Currently, `Header.tsx` displays:
     - MapPin Post selector
     - `activeDeviceCount` Field Units badge
     - `LOCAL · AIR-GAPPED` badge
     - `CPU ONLINE` backend latency badge
     - UTC Clock
     - Audit Certificate button
     - JSON button
   - **Action**: Streamline into a unified status bar:
     - Left: SSB Logo + Title
     - Center: Station Post Dropdown + Transit Date
     - Right: Consolidated Fleet Status (`🟢 2 Units · Online 38ms`) + Modals / Settings trigger.
3. **Overwhelming Overview Tab in `ResultsPanel.tsx`**:
   - When active, the Overview tab currently renders:
     - Pipeline trace
     - SVG arc risk gauge
     - Reason bullet list
     - 8-rule cross validation table
     - Field discrepancy diff table
     - Visual forensics canvas
     - 5-pillar table
   - **Action**: Restructure the results into a hierarchical layout dominated by the **Triage Verdict Banner** + **Officer Action Card**, with deep diagnostics organized into clean accordions.

### 5.2 Planned Decluttered Dashboard Layout

```
+----------------------------------------------------------------------------------------------------+
| SSB LOGO | Sashastra Seema Bal - Document Screening   [ Post: Jaigaon (JAI) v ]   [ 🟢 2 Units · 38ms ] [ Cert | JSON ] |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ TOP / LEFT: INGESTION WORKSTATION ]                                                             |
|  +---------------------------------------+  +----------------------------------------------------+ |
|  | Document Credential (Drop / Browse)   |  | Live Face Camera (WebCam / Photo)                  | |
|  | [ Dropzone Preview ]                  |  | [ Live Photo Preview ]                             | |
|  +---------------------------------------+  +----------------------------------------------------+ |
|  | Quick Presets: [ Standard Passport ] [ Tampered Passport ] [ Aadhaar QR ] [ Spliced Face ]     | |
|  | [ Transit Date: 2026-08-23 ]                           [ Reset ] [ ⚡ SCAN & MATCH BIOMETRICS ] | |
|                                                                                                    |
|  [ SCREENING RESULTS VIEWPORT (When Scanned) ]                                                     |
|  +-----------------------------------------------------------------------------------------------+ |
|  |  🟢 AUTO-CLEAR PASS (Score: 2.5 / 100) — Approved for Fast-Path Transit                       | |
|  |  All cryptographic signatures, ICAO check digits and facial biometrics authenticated.        | |
|  +-----------------------------------------------------------------------------------------------+ |
|  |  Human-In-The-Loop Officer Authorization:                                                     | |
|  |  [ (•) Clear Traveler ]  [ ( ) Secondary Hold ]  [ ( ) Interdiction Order ] [ Commit Action ] | |
|  +-----------------------------------------------------------------------------------------------+ |
|                                                                                                    |
|  [ EXPANDABLE TECHNICAL ACCORDIONS (Collapsed by Default) ]                                       |
|  v 1. Multi-Model Pipeline Trace (PP-OCRv4, ICAO 9303, AdaFace, DocTamper, Stamp - 420ms)        | |
|  > 2. Forensic Discrepancy Matrix & Cross-Validation (0 diffs, 8/8 rules passed)                  | |
|  > 3. Dual-Canvas Visual Forensics & Heatmap Compositor (Tamper ELA & Bounding Boxes)             | |
|  > 4. Granular 5-Pillar Telemetry (OCR, MRZ, Biometrics, Forensics, Stamp Details)                | |
|  > 5. Connected Devices & Fleet Telemetry (2 Field Units Active on 192.168.43.x)                  | |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
| CONFIDENTIAL • SSB FIELD SCREENING • DPDP ACT 2023 & AADHAAR ACT COMPLIANT • ZERO BIOMETRIC STORAGE|
+----------------------------------------------------------------------------------------------------+
```

---

## 6. Expandable Clean Accordions Architecture

To maintain a clean operator view without losing technical depth, dense data must be encapsulated in clean accordions.

### 6.1 Accordion Component Specification

Each accordion adheres to the Deep Oceanic style:
- **Header**: Background `#081525` (`--inset`), text `#F8FAFC` (`--ink`), subtle arrow chevron, summary badge (`8/8 Rules Passed`, `420ms`).
- **Border**: `#1E3A5F` hairline border, hover highlight `#2C5282`.
- **Content Panel**: Background `#0B1A2E` (`--surface`), padding 12px, zero layout shift during toggle.

### 6.2 Accordion Mapping

1. **Pipeline Execution Trace (`InspectionPipelineTrace.tsx`)**:
   - Summary: Count of completed/failed models (`5/5 Models Warm · 420ms`).
   - Body: Model name, category, execution latency (ms), confidence %, and detail string.
2. **Discrepancy & Cross-Validation Matrix (`DiffTable.tsx` & `FilterTable.tsx`)**:
   - Summary: Mismatch count (`0 Mismatches · 8/8 Guards Valid`).
   - Body: Side-by-side comparison of Visual OCR vs MRZ/PKI fields, plus rule-by-rule evaluation (CV-01 to CV-08).
3. **Dual-Canvas Forensics Viewer (`ForensicsViewer.tsx`)**:
   - Summary: Tamper score (`Tamper Score: 2.5% · Substrate Clean`).
   - Body: Dual-canvas slider with DocTamper/TruFor heatmap overlay, zoom controls, and detected anomaly bounding boxes.
4. **5-Pillar Telemetry Breakdown (`PillarsTable.tsx`)**:
   - Summary: Per-pillar badges (OCR, MRZ, Biometrics, Forensics, Stamp).
   - Body: Detailed demographic fields, OCR-B raw lines, cosine similarity scores, and stamp template matching scores.
5. **Raw JSON & Cryptographic Audit**:
   - Summary: SHA-256 evidence hash.
   - Body: Collapsible syntax-highlighted JSON viewer with single-click clipboard copy.

---

## 7. Connected Devices Indicator & Integration Plan (`/api/v1/devices`)

### 7.1 Backend Endpoint Contract

The edge FastAPI backend exposes `GET /api/v1/devices` which tracks field client units (Android handhelds and USB-tethered stations) sending requests to `/api/v1/scan/inspect` or `/api/v1/health`.

**Data Contract (`DevicesResponse`)**:
```typescript
export interface ConnectedClient {
  client_ip: string;
  user_agent?: string | null;
  checkpoint_id?: string | null;
  last_seen: string;
  last_endpoint: string;
  total_requests: number;
  latency_ms?: number | null;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE' | string;
}

export interface DevicesResponse {
  status: string;
  total_devices: number;
  devices: ConnectedClient[];
  last_active_device?: ConnectedClient | null;
}
```

### 7.2 Header Integration Design

In `Header.tsx`:
1. Polling interval: `5000ms` fetch to `/api/v1/devices`.
2. Compact indicator badge in header:
   ```tsx
   <div className="flex items-center bg-inset border border-line rounded-control px-2.5 py-1 space-x-1.5 font-mono text-[11px]">
     <Smartphone className="w-3.5 h-3.5 text-accent" />
     <span className="font-semibold text-ink">
       {activeDeviceCount} {activeDeviceCount === 1 ? 'FIELD UNIT' : 'FIELD UNITS'}
     </span>
     <span className="w-1.5 h-1.5 rounded-full bg-green" />
   </div>
   ```
3. Hover / Click popover: Displays a compact breakdown table:
   - Client IP (e.g. `192.168.43.102`)
   - Device Model (e.g. `Pixel 8 Pro (Android 14)`)
   - Checkpoint Post (`SSB-WB-JAI-01`)
   - Last Ingestion Time & Total Scans (`14 scans · 38ms`)

---

## 8. Build Configuration & Validation Protocol

### 8.1 Build Scripts & Environments

In `frontend/package.json`:
- `"dev": "vite --port 3000"`: Development server.
- `"build": "tsc -b && vite build"`: Production build producing `frontend/dist/`.
- `"typecheck": "tsc --noEmit"`: TypeScript diagnostic check.
- `"test": "node tests/run_tests.mjs"`: Unit test suite runner.
- `"tauri:build": "tauri build"`: Bundles native desktop application.

### 8.2 Build Verification Status

- **`npm run build`**: Executed and passed cleanly with **0 TypeScript errors** in 2.05s.
  - Output bundle: `dist/assets/index-3S7u2LVE.css` (37.93 kB), `dist/assets/index-CtRwfGc_.js` (393.04 kB).
- **Tauri Integration**: `src-tauri/tauri.conf.json` correctly points `beforeBuildCommand` to `npm --prefix ../frontend run build` and `frontendDist` to `../frontend/dist`.
- **Adversarial Test Suite Note**: `tests/run_tests.mjs` contains legacy unit test assertions expecting old button text (e.g., `'Commit Decision'` instead of `'Authorize Decision'`). During implementation, unit tests will align with the refined primitive APIs.

---

## 9. Actionable Implementation Plan for Implementer Agents

1. **Step 1: CSS & Tokens Alignment (`index.css` & `tailwind.config.js`)**
   - Replace OKLCH values in `index.css` with Deep Oceanic hex tokens (`#030B14`, `#0B1A2E`, `#081525`, `#112745`, `#1E3A5F`, `#2C5282`, `#F8FAFC`, `#94A3B8`, `#64748B`, `#10B981`, `#F59E0B`, `#EF4444`).
   - Remove neon keyframes and radial glow shadows.
2. **Step 2: Component Surface & Border Cleanup**
   - Audit and replace hardcoded `slate-900`/`slate-950` in `Pillar*.tsx`, `AuditCertificateModal.tsx`, `RawJsonViewerModal.tsx`, `ForensicsViewer.tsx`, `RiskScoreCard.tsx` with semantic Tailwind classes (`bg-surface`, `bg-inset`, `border-line`, `text-ink`, `text-ink-2`).
3. **Step 3: Header Consolidation**
   - Streamline `Header.tsx` to display a clean, single-row status bar with the `/api/v1/devices` fleet indicator.
4. **Step 4: Results Viewport Accordion Transformation**
   - In `ResultsPanel.tsx`, elevate the high-contrast Triage Banner and `ApprovalCard` to the top.
   - Wrap `InspectionPipelineTrace`, `DiffTable`, `FilterTable`, `ForensicsViewer`, and `PillarsTable` in thin, neat Deep Oceanic accordions.
5. **Step 5: Verification & Zero TypeScript Errors**
   - Run `npm run build` and verify that bundle size remains optimal with zero build errors.
