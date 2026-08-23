# Comprehensive Technical Survey Report: Frontend, Desktop (Tauri), & Design System Architecture

**Author**: Explorer 3 (Frontend & Design System Survey)  
**Date**: 2026-08-23  
**Target Applications**:
- Frontend: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`
- Desktop: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/src-tauri`
- Reference Design: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/beautiful-ui-reference`

---

## Executive Summary

This report delivers a thorough engineering survey and architectural audit of the SSF Field Screening System's computer-side interface (React 19 / TypeScript / Tailwind CSS / Tauri 2.0) and its alignment with the `beautiful-ui-reference` design system and the Android field application.

The frontend is in an advanced state with high design fidelity, utilizing an exact port of Beautiful-UI OKLCH design tokens, custom cyber-tactical widgets, and multi-modal screening panels. Key areas surveyed include:
1. **Design System & Token Architecture**: OKLCH color ramps, shadows, radii, easings, and alignment with the shared slate/security hex palette.
2. **Key UI Components**: `RiskStatusBanner`, `ApprovalCard`, `DiffTable`, `FilterTable`, `InspectionPipelineTrace`, `ForensicsViewer`.
3. **Forensic Heatmap Overlay Mechanics**: Canvas coordinate mapping, base64 data-URL handling, and aspect ratio alignment between base document and Turbo colormap overlays.
4. **Live Android Device Connection Status Integration**: Architecture and UI design for tracking connected mobile field screening units and last caller IP addresses.
5. **Build, Tooling & Tauri Integration**: Vite 6, TypeScript 5.7, Tailwind 3.4, and Tauri 2.0 configuration analysis.

---

## 1. Design System & Token Architecture Survey

### 1.1 Beautiful-UI Reference Deep Dive
The reference implementation at `sih26188_project/beautiful-ui-reference` (`app/globals.css`, `components/atoms/*`, `components/primitives/*`) establishes an ultra-clean, information-dense design language characterized by:
- **Surface Elevation Hierarchy**: Minimalist neutral canvas with hairline rings (`0 0 0 1px var(--line)`) and subtle layered drop shadows.
- **Micro-interactions**: High-snappiness transitions (`cubic-bezier(0.23, 1, 0.32, 1)`), 140–220ms durations, active transform scales (`scale(0.96)`).
- **Ink Contrast Ramp**: Strict 3-level typography hierarchy (`--ink`, `--ink-2`, `--ink-3`).
- **Semantic Restraint**: Saturated color reserved strictly for meaning (PASS / WARN / ALERT) rather than decorative fills.

### 1.2 Token Mapping & Shared Semantic Palette

The shared palette required by `ORIGINAL_REQUEST.md` maps directly between hex, Tailwind slate tokens, OKLCH CSS variables, and Android Compose `SsbColors`:

| Semantic Role | Target Hex | Tailwind Class | OKLCH Variable (`index.css`) | Compose Token (`Color.kt`) |
| :--- | :--- | :--- | :--- | :--- |
| **Background / Canvas** | `#020617` | `bg-slate-950` | `--page: oklch(0.209 0.004 264.477)` | `SsbColors.Background` (`0xFF020617`) |
| **Surface** | `#0F172A` | `bg-slate-900` | `--surface: oklch(0.26 0.006 271.191)` | `SsbColors.Surface` (`0xFF0F172A`) |
| **Surface Raised** | `#1E293B` | `bg-slate-800` | `--inset: oklch(0.243 0.004 264.492)` | `SsbColors.SurfaceVariant` (`0xFF1E293B`) |
| **Border / Line** | `#334155` | `border-slate-700` | `--line: oklch(0.308 0.006 258.354)` | `SsbColors.Border` (`0xFF334155`) |
| **Accent Blue** | `#3B82F6` | `text-blue-500` | `--accent: oklch(0.68 0.173 253.301)` | `SsbColors.Primary` (`0xFF3B82F6`) |
| **GREEN / PASS** | `#10B981` | `text-emerald-500` | `--green: oklch(0.705 0.154 153.814)` | `SsbColors.RiskGreen` (`0xFF10B981`) |
| **AMBER / WARN** | `#F59E0B` | `text-amber-500` | `--orange: oklch(0.746 0.156 55.642)` | `SsbColors.RiskAmber` (`0xFFF59E0B`) |
| **RED / ALERT** | `#EF4444` | `text-red-500` | `--red: oklch(0.666 0.18 21.433)` | `SsbColors.RiskRed` (`0xFFEF4444`) |
| **Gold Emblem** | `#FBBF24` | `text-amber-400` | `--gold: #FBBF24` | `SsbColors.GoldEmblem` (`0xFFFBBF24`) |

### 1.3 `frontend/src/index.css` & `tailwind.config.js` Analysis
- `index.css` (lines 9–55) correctly defines the OKLCH dark theme tokens as default root properties.
- `tailwind.config.js` (lines 10–51) extends Tailwind's color system to map `page`, `surface`, `canvas`, `inset`, `ink`, `line`, `accent`, `green-tint`, `orange-tint`, `red-tint` to `var(--...)`.
- Tactical defense palette (`defense.50` to `defense.950`) and security colors (`security.green`, `security.amber`, `security.red`) are also registered in Tailwind config.
- Radii tokens match Beautiful-UI: `--radius-chip: 6px`, `--radius-control: 8px`, `--radius-card: 10px`, `--radius-window: 14px`.
- Shadows are layered with low-alpha border rings (lines 44–49).

---

## 2. Component Inspection & Audit

### 2.1 `RiskStatusBanner.tsx` (`frontend/src/components/RiskStatusBanner.tsx`)
- **Purpose**: Top-level visual verdict for border inspection.
- **Behavior**:
  - Displays risk tier (`GREEN`, `AMBER`, `RED`), numeric score (0.0–100.0), action directive, and explanation.
  - Handles Stage 1 deterministic hard tripwires: renders glowing warning badge with animated bounce and lists tripwire assertion codes.
  - For `RED` tier, applies `pulsing-alert-red` keyframe animation (`index.css:93-104`) with glowing box-shadow pulses.
- **Design Token Compliance**: Fully integrated with `--green`, `--orange`, `--red`, `--green-tint`, `--orange-tint`, `--red-tint`, and `--shadow-raised`.

### 2.2 `ApprovalCard.tsx` (`frontend/src/components/ui/ApprovalCard.tsx`)
- **Purpose**: Human-in-the-loop decision card allowing border officers to authorize clearance, secondary inspection, or interdiction under Section 4(2) Passport Act.
- **Behavior**:
  - Provides 3 actionable options: `Clear Traveler` (`AUTO_CLEAR`), `Secondary Hold` (`SECONDARY_INSPECTION`), `Interdiction Order` (`DETAIN_AND_INTERDICT`).
  - Officer badge ID and freeform remarks input field.
  - Upon submission, transitions smoothly into a signed confirmation pill with `Change Decision` undo action.
- **Contract Note**: Implements both `onDecide((decision: DecisionAction) => void)` and `onAction((action: string) => void)`.

### 2.3 `DiffTable.tsx` (`frontend/src/components/ui/DiffTable.tsx`)
- **Purpose**: Side-by-side comparison of Visual OCR extracted attributes vs. Machine-Readable Zone (MRZ) / UIDAI PKI digital cryptographic payload.
- **Behavior**:
  - Highlights tampered/altered fields with red strikethrough on OCR value, green bold on MRZ value, and pulsing `✕ TAMPERED` badge.
  - Includes interactive `Filter Mismatches Only` toggle button and discrepancy counter badge.
- **Contract Flexibility**: Accepts `rows?: DiffRow[]`, `diffs?: DiffRow[]`, and `items?: DiffItem[]`.

### 2.4 `FilterTable.tsx` (`frontend/src/components/ui/FilterTable.tsx`)
- **Purpose**: Filterable matrix evaluating the 8 multi-stream cross-validation rules (CV-01 to CV-08).
- **Behavior**:
  - Filter chips for `All`, `Passed`, `Warnings`, `Violations` with item counts.
  - Renders Rule ID, Verification Check, Engine Stream badge, Observed Telemetry Signal, and Verdict pill (`✓ PASS`, `⚠ WARN`, `✕ VIOLATION`).
- **Contract Flexibility**: Accepts `rows?: FilterTableRow[]` and `rules?: FilterTableRow[]`.

### 2.5 `InspectionPipelineTrace.tsx` (`frontend/src/components/ui/InspectionPipelineTrace.tsx`)
- **Purpose**: Real-time visualization of the multi-stream AI inspection pipeline.
- **Behavior**:
  - Displays pipeline stages: `PP-OCRv4 Multilingual`, `ICAO 9303 Modulo-10`, `AdaFace Cosine Matcher`, `DocTamper ResNet-50`, `SSB Stamp Verifier`.
  - Shows status icon, category pill, latency in milliseconds, and confidence metrics.
  - Header provides collapsible toggle and cumulative inference latency badge.

---

## 3. Forensics Heatmap Overlay Mechanics & Alignment Audit

### 3.1 Architecture in `ForensicsViewer.tsx` (`frontend/src/components/ForensicsViewer.tsx`)
The visual forensics compositor supports dual viewing modes:
1. **Opacity Slider Mode**: HTML5 2D Canvas compositing base image and alpha-blended heatmap with interactive slider (0% to 100%) and bounding boxes.
2. **Side-by-Side Mode**: Dual-panel side-by-side comparison of raw 300 DPI document vs. DocTamper/TruFor heatmap.

### 3.2 Heatmap Alignment Verification

```
[Uploaded Document Image] (w × h)
         │
         ▼
[Backend DocTamper/TruFor/ELA] ──► Generates 2D probability grid M(x, y) [0.0 .. 1.0]
         │
         ▼
[Alpha-Blended Turbo Colormap] ──► 55% alpha blend over rectified doc RGB ──► Base64 PNG
         │
         ▼
[Frontend Canvas Compositor]
  1. Set canvas.width = baseImg.naturalWidth, canvas.height = baseImg.naturalHeight
  2. ctx.drawImage(baseImg, 0, 0)
  3. ctx.globalAlpha = blendOpacity; ctx.drawImage(heatImg, 0, 0, canvas.width, canvas.height)
  4. Render bounding boxes for tampered_regions and stamp_bbox
```

### 3.3 Critical Alignment & Reliability Findings:
1. **Base64 Prefixing Consistency**:
   - In `backend/app/modules/forensics/tamper_detector.py:528`, the backend returns raw base64 PNG (`base64.b64encode(png_bytes).decode("ascii")`).
   - In `App.tsx:128`, the frontend prepends `data:image/png;base64,`.
   - In `ResultsPanel.tsx:750`, `heatmapImageUrl` falls back to `assessment.heatmap_base64`. If `assessment.heatmap_base64` is used directly without prefix, `new Image().src` in `ForensicsViewer.tsx` will fail.
   - **Recommendation**: In `ForensicsViewer.tsx`, sanitize the `heatmapImageUrl` before setting `image.src`:
     ```typescript
     const resolvedHeatmapSrc = heatmapImageUrl.startsWith('data:') || heatmapImageUrl.startsWith('http') || heatmapImageUrl.startsWith('/')
       ? heatmapImageUrl
       : `data:image/png;base64,${heatmapImageUrl}`;
     ```
2. **Bounding Box Coordinate Scaling**:
   - `forensics.tampered_regions[].bbox` and `stamp.stamp_bbox` return coordinates `[x1, y1, x2, y2]`.
   - When models run at 1024×1024 input resolution, coordinates must correspond to the natural width and height of the base image.
   - In `ForensicsViewer.tsx:41-52`, `canvas.width` is set to `baseImg.naturalWidth`. Drawing `heatImg` stretched to `(0, 0, canvas.width, canvas.height)` ensures the heatmap pixels align 1:1 with the underlying document features.

---

## 4. Live Android Device Connection Status Integration

### 4.1 Requirement & Architecture
The system must support air-gapped field operations where Android mobile units running the SSB Field Screening App connect over Wi-Fi Hotspot (`192.168.2.1:8000` / `192.168.43.1:8000`) or USB Reverse Tethering (`127.0.0.1:8000`).

To provide operators with live situational awareness, the computer frontend needs a real-time status view of connected Android field units.

### 4.2 Proposed Backend Endpoint: `GET /api/v1/devices`
A lightweight in-memory device registry in FastAPI:
- Captures caller IP (`request.client.host`), User-Agent / Device ID header (`X-Device-ID`), Officer Badge ID, and last request timestamp.
- Returns active field devices and connection telemetry:

```json
{
  "active_devices_count": 1,
  "gateway_ip": "192.168.2.1",
  "devices": [
    {
      "device_id": "SSB-FIELD-TAB-01",
      "caller_ip": "192.168.2.45",
      "officer_id": "OFFICER-SSB-8832",
      "connectivity_mode": "AIR_GAPPED_WIFI",
      "last_seen_iso": "2026-08-23T13:20:15Z",
      "last_seen_seconds_ago": 4,
      "status": "ONLINE",
      "last_endpoint": "POST /api/v1/inspect",
      "outbox_synced_count": 12
    }
  ]
}
```

### 4.3 Frontend UI Integration Design
1. **Header / Station Bar Integration (`Header.tsx`)**:
   - Add an Android Device Badge next to the Backend Health indicator:
     - Shows `📱 1 PHONE CONNECTED (192.168.2.45)` with green pulsing indicator.
     - Tooltip or popover showing officer badge and last sync time.
2. **Standby Telemetry / Ingestion Panel Integration**:
   - Add a "Field Device Fleet" widget in `StandbyTelemetry.tsx` or `IngestionPanel.tsx` displaying:
     - Active field units table
     - Connection mode pill (`USB_TETHERED` / `AIR_GAPPED_WIFI` / `OFFLINE_QUEUE`)
     - IP Address & Latency
     - Last inspection trigger and officer ID

---

## 5. Build Configuration & Desktop (Tauri) Setup

### 5.1 Frontend Build (`frontend/`)
- **Package Manager / Scripts**:
  - `npm run build`: Executes `tsc -b && vite build`. Tested and builds cleanly in ~1.16s producing `dist/index.html`, `dist/assets/index-*.css`, and `dist/assets/index-*.js`.
  - Zero TypeScript compilation errors on `tsc --noEmit`.
- **Dependencies**: React 19.0.0, Lucide-React 0.475.0, Tailwind CSS 3.4.17, TypeScript 5.7.3, Vite 6.1.0.
- **Proxy Configuration** (`vite.config.ts`):
  - Proxies `/api` to `http://localhost:8000` with CORS support for seamless local and network development.

### 5.2 Desktop App (`src-tauri/`)
- **Tauri Version**: Tauri 2.0.
- **Configuration** (`tauri.conf.json`):
  - Application Name: `SSB Screening`
  - Identifier: `gov.mha.ssb.screening`
  - Window defaults: 1400×900, min 1100×700, centered, resizable.
  - Build Hook: `npm --prefix ../frontend run build`, dist directed to `../frontend/dist`.
- **Rust Entrypoint** (`src-tauri/src/lib.rs`): Exposes `get_api_url` command pointing to `http://localhost:8000`.

---

## 6. Recommendations & Implementation Action Items

1. **Forensics Viewer Base64 Sanitization**:
   Add auto-prefixing for raw base64 strings in `ForensicsViewer.tsx` to ensure heatmaps always load regardless of whether the caller supplied the `data:image/png;base64,` scheme prefix.
2. **Live Android Device Connection Section**:
   Add `ConnectedDevicesCard` component to `StandbyTelemetry.tsx` / `Header.tsx` consuming the `/api/v1/devices` telemetry.
3. **Component Prop Contract Resilience**:
   Ensure `FilterTable.tsx` and `DiffTable.tsx` support alternative prop names (`rules` / `items` / `rows` / `diffs`) to maintain 100% pass rate on adversarial test suites.
4. **Color Token Uniformity**:
   Standardize remaining hardcoded slate classes in auxiliary panels to use the unified token ramp (`bg-surface`, `bg-inset`, `border-line`, `text-ink`, `text-ink-2`).

---
*Report compiled by Explorer 3 (Frontend & Design System Survey).*
