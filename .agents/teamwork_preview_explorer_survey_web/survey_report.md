# Web UI Frontend Comprehensive Survey Report

**Explorer**: Explorer 2 (Web UI Survey)  
**Date**: 2026-08-24  
**Target Repository**: `sih26188_project/frontend` (and `sih26188_project/src-tauri`)  
**Mission**: Full diagnostic survey of existing web frontend styling, AI jargon/math acronyms, ingestion/capture components, Android companion camera live sync, and build tooling.

---

## Executive Summary

The desktop web application for the SSB Document Screening Station is built with **React 19**, **Vite 6**, and **Tailwind CSS 3.4**. It is packaged for both browser deployment and native desktop via **Tauri v2**. 

The frontend has already transitioned its core CSS variables (`src/index.css`) towards a clean whitish palette (`--page: #F8FAFC`, `--surface: #FFFFFF`, `--inset: #F1F5F9`, `--ink: #0F172A`). However, several residual dark-mode color classes, technical AI jargon (e.g. `AdaFace-ResNet100`, `DocTamper-ResNet50`, `MiniFASNet`, `300 DPI`, `Prior Log-Odds`, `tau_adapt`), and missing companion live sync indicators remain across components.

---

## 1. Existing Styling System Analysis

### 1.1 CSS Design Tokens (`src/index.css`)
The CSS design token foundation in `src/index.css` is configured as follows:

| Token | Current Value | Role & Visual Tier |
|---|---|---|
| `--page` | `#F8FAFC` | L0 Canvas Ground (Slate-50) |
| `--canvas` | `#F8FAFC` | Viewport ground |
| `--surface` | `#FFFFFF` | L2 Card / Container surface (Pure White) |
| `--inset` | `#F1F5F9` | L-1 Inset Well / Header bars / Controls (Slate-100) |
| `--field` | `#FFFFFF` | Input form fields |
| `--hover` | `#F1F5F9` | Hover state background |
| `--hover-2` | `#E2E8F0` | Selected / Active state background |
| `--ink` | `#0F172A` | Primary text (High contrast Slate-900) |
| `--ink-2` | `#475569` | Secondary text (Slate-600) |
| `--ink-3` | `#94A3B8` | Subtle hints / Muted text (Slate-400) |
| `--line` | `#E2E8F0` | Slate-200 Hairline border |
| `--line-strong`| `#CBD5E1` | Slate-300 Active border |
| `--accent` | `#2563EB` | Royal Blue Primary Accent |
| `--green` | `#059669` | Semantic Success (Emerald-600) |
| `--green-bg`| `#ECFDF5` | Semantic Success Background (Emerald-50) |
| `--orange` | `#D97706` | Semantic Warning (Amber-600) |
| `--orange-bg`| `#FFFBEB` | Semantic Warning Background (Amber-50) |
| `--red` | `#DC2626` | Semantic Danger (Red-600) |
| `--red-bg` | `#FEF2F2` | Semantic Danger Background (Red-50) |

### 1.2 Tailwind Configuration (`tailwind.config.js`)
- `tailwind.config.js` maps theme colors directly to CSS variables (`page: 'var(--page)'`, `surface: 'var(--surface)'`, etc.).
- **Residual Obsidians**: Lines 44–51 retain an obsolete `obsidian: { canvas: '#090A0F', panel: '#0E121A', card: '#141A24', ... }` object that should be cleaned up.
- **Shadow definitions**: Uses soft ambient shadows (`--shadow-card: 0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02), 0 0 0 1px var(--line)`).

### 1.3 Dark-Mode / Legacy Color Residues
Specific locations where legacy dark color codes remain:
1. `src/components/IngestionPanel.tsx` (Line 110): `bg-white text-[#090A0F]` for the primary scan button (needs clean high-contrast styling e.g. `bg-accent text-white` or `bg-ink text-white`).
2. `src/components/ForensicsViewer.tsx` (Line 112): `fillStyle = '#030B14'` in canvas bounding box rendering.
3. `src/components/ui/Button.tsx` (Line 19): `dark:bg-ink dark:text-canvas` legacy utility classes.
4. `src/components/AuditCertificateModal.tsx` & `RawJsonViewerModal.tsx`: `bg-black/80` backdrop (can use clean `bg-slate-900/40 backdrop-blur-sm`).

---

## 2. Inventory of AI Model Jargon & Mathematical Acronyms

To meet Requirement **R1 (Language Simplification)**, all technical model names, neural layer acronyms, and raw Bayesian mathematical formulas must be sanitized and replaced with direct operational terms.

### 2.1 File-by-File Jargon Locations

| File | Line(s) | Current Jargon / Mathematical Term | Recommended Plain Operational Term |
|---|---|---|---|
| `src/App.tsx` | 172 | `pp_ocr: 'PP-OCRv4-Multilingual'` | `text_reader: 'Standard OCR Engine'` |
| `src/App.tsx` | 173 | `mrz_engine: 'ICAO-9303-v2.1'` | `format_validator: 'ICAO Format Engine'` |
| `src/App.tsx` | 174, 227 | `face_embedder: 'AdaFace-ResNet100'` | `face_match_engine: 'Biometric Face Matcher'` |
| `src/App.tsx` | 175, 239 | `tamper_detector: 'DocTamper-ResNet50'`, `doctamper_score` | `tamper_checker: 'Document Integrity Scanner'`, `tamper_score` |
| `src/App.tsx` | 240 | `trufor_score: 0.03` | `splicing_score: 0.03` |
| `src/App.tsx` | 271–272 | `prior_log_odds: -2.94`, `posterior_log_odds: -3.47` | (Internal calculation only; replace display with calibrated probability) |
| `src/components/RiskScoreCard.tsx` | 113 | `Λ_post = Λ₀ + Σ ΔΛᵢ · Score = 100 / (1 + exp(−L_post))` | **Purge formula banner**; display "Risk Factor Breakdown" |
| `src/components/RiskScoreCard.tsx` | 120–124 | `Base Checkpoint Baseline`, `tamper_log_odds_delta`, `face_log_odds_delta`, etc. | `Checkpoint Risk Baseline`, `Document Integrity Impact`, `Face Match Impact`, `Cross-Check Mismatch Impact`, `Permit Seal Impact` |
| `src/components/ForensicsViewer.tsx` | 240 | `Raw 300 DPI Document` | `Original Identity Document` |
| `src/components/ForensicsViewer.tsx` | 287 | `0.18 (Tau Adaptive)` | `0.18 (Standard Threshold)` |
| `src/components/PillarForensics.tsx` | 54 | `tau_adapt = 0.180` | `Nominal threshold: 0.180` |
| `src/components/PillarForensics.tsx` | 58 | `Digital Text Tamper Detector (DocTamper)` | `Text & Content Alteration Check` |
| `src/components/PillarForensics.tsx` | 70 | `Photo Splicing Localization (TruFor)` | `Photo & Substrate Splicing Check` |
| `src/components/PillarForensics.tsx` | 122, 134 | `EXIF & JPEG Quantization (DQT)`, `Non-Standard DQT` | `Image File Metadata & Compression Analysis`, `Compression Irregularity` |
| `src/components/PillarBiometrics.tsx` | 96 | `Selfie Liveness & Anti-Spoofing Check` | `Live Traveler Selfie Presentation Check` |
| `src/components/PillarBiometrics.tsx` | 123, 131 | `Patch Scale 2.7x`, `Patch Scale 4.0x` | `Macro Face Inspection`, `Wide Frame Inspection` |
| `src/components/PillarBiometrics.tsx` | 142 | `2D Fourier FFT Anomaly` | `Screen / Replay Reflection Check` |
| `src/components/PillarStamp.tsx` | 70, 82 | `Template SSIM`, `ORB Inliers` | `Seal Shape Similarity`, `Feature Alignment Match` |
| `src/components/ResultsPanel.tsx` | 810 | `Multi-Model Inference Pipeline Trace` | `Security Inspection Pipeline Steps` |
| `src/components/ResultsPanel.tsx` | 960 | `5-Pillar Neural Model Telemetry & Tensor Output Diffs` | `Security Verification Checks & Technical Telemetry` |
| `src/components/ResultsPanel.tsx` | 981 | `Apple Silicon M4 MPS / CoreML Execution Provider` | `Hardware Acceleration: Active (Edge AI Unit)` |
| `src/services/mockData.ts` | 39–43, etc. | `AdaFace-ResNet100-ONNX`, `MiniFASNetV2-SE-DualScale`, `DocTamper-ResNet50-DTD`, `TruFor-SegFormer-B0` | Standardized model naming |

---

## 3. Ingestion and Capture Components

### 3.1 `Dropzone.tsx` (Document Upload)
- **Current Behavior**:
  - Handles drag-and-drop and standard file selection for document credentials.
  - Previews document scan with thumbnail and file size metadata.
  - Provides "Replace" and "Remove" actions.
- **Enhancement Points for Companion Sync**:
  - Add visual indicator badge when a document is received remotely from the companion phone (`✓ Received from Field Unit Camera`).
  - Add status indicator when waiting for or connected to Field Companion.

### 3.2 `WebCamCapture.tsx` (Traveler Photo Ingestion)
- **Current Behavior**:
  - Prompts user to start local webcam or upload portrait image.
  - Uses `navigator.mediaDevices.getUserMedia` for video stream.
  - Snaps canvas frame to `File` (JPEG 0.95 quality).
- **Enhancement Points for Companion Sync**:
  - Render companion camera sync status indicator: `📱 Field Unit Connected (Live Companion Sync Active)`.
  - Automatically display live companion capture when received from phone with a prominent source badge: `📱 From Android Field Unit`.

### 3.3 `IngestionPanel.tsx` (Ingestion Workstation Shell)
- **Current Layout**:
  - Top: `PresetsBar` for 1-click test scenarios.
  - Middle: 2-column grid (`Dropzone` on left, `WebCamCapture` on right).
  - Bottom: Toolbar with checkpoint selector, transit date input, Reset button, and "Run Document Screening" button.
- **Enhancement Points**:
  - Prominent live sync header badge: `📱 Field Unit Connected (Live Companion Sync Active)`.
  - Auto-run trigger notification when companion photo arrives and document is pre-loaded.

---

## 4. Companion Live Sync Mechanism & Workflow

### 4.1 Backend API Endpoints (`backend/app/api/routers/companion.py`)
The backend companion system exposes 3 endpoints:
1. `POST /api/v1/companion/upload`:
   - Receives multipart `file`, `capture_type` (`"selfie"` or `"document"`), `device_id`, `checkpoint_id`.
   - Stores capture in memory buffer, increments `sequence_id`, encodes Base64 data URI.
2. `GET /api/v1/companion/latest`:
   - Returns JSON: `{ has_capture: boolean, sequence_id: int, capture_type: string, device_id: string, image_data: string (data URI), timestamp: float }`.
3. `POST /api/v1/companion/clear`:
   - Resets `has_capture` to false.

### 4.2 Desktop Web Polling & Ingestion Flow (`src/App.tsx`)
1. `App.tsx` runs an active polling loop (`setInterval(pollCompanion, 1500)`).
2. When `data.has_capture` is true and `data.sequence_id > lastSequenceId`:
   - Converts `data.image_data` data URI to a `File` object using `dataURLtoFile()`.
   - If `capture_type === 'document'`: sets `documentFile` and `documentPreviewUrl`.
   - If `capture_type === 'selfie'`: sets `livePhotoFile` and `livePhotoPreviewUrl`.
   - Displays toast banner: `📱 Traveler Photo received from Field Unit (${data.device_id}) — Auto-running screening…`.
   - **Auto-screening**: If `documentFile` or `documentPreviewUrl` is already loaded on the desktop, it invokes `executeScreening(documentFile, documentPreviewUrl, file)` immediately with zero clicks!

### 4.3 Side-by-Side Comparison UI in Results
In `ResultsPanel.tsx`, the screening output should prominently display a side-by-side biometric comparison:
- **Left**: Document Credential Photo (extracted from ID).
- **Right**: Live Companion Capture (streamed from phone).
- **Center**: Biometric Match Verdict (e.g. `92% Face Match · PASS`) with clear visual linkage.

---

## 5. Web Build Tooling & Dependencies

### 5.1 Build Configuration
- **Package Manager**: npm
- **Build Command**: `npm run build` (`tsc -b && vite build`)
- **TypeScript**: TypeScript 5.7.3 with strict type checking.
- **Vite**: Vite 6.1.0 configured with proxy to `http://127.0.0.1:8000` for `/api`.
- **Tauri Integration**: `src-tauri/tauri.conf.json` configured to build `frontend/dist` with `npm --prefix frontend run build`.

### 5.2 Build Status Verification
- Running `npm run build` completed cleanly in **2.72s** with **zero errors**.
- Output chunks:
  - `dist/index.html` (0.75 kB)
  - `dist/assets/index-Bou-rf9L.css` (29.78 kB)
  - `dist/assets/index-DmGoPuiD.js` (397.22 kB)

### 5.3 Test Suite Status
- `npm test` runs 4 test files via `tests/run_tests.mjs`:
  - `primitives_adversarial.test.tsx` -> **PASSED** (9/9)
  - `primitives_interactive_adversarial.test.tsx` -> **PASSED** (9/9)
  - `adversarial_challenger_m2.test.tsx` -> Fails due to hardcoded assertions for the old dark oceanic `#030B14` theme tokens from Milestone 2.
  - `challenger_m3_frontend.test.tsx` -> Pending suite execution.
- Note: When implementing R1 whitish theme and R3 companion live sync, the test assertions in `adversarial_challenger_m2.test.tsx` and `challenger_m3_frontend.test.tsx` must be updated to validate the whitish `#F8FAFC` / `#FFFFFF` theme and updated companion connection status labels.

---

## 6. Implementation Action Plan for Workers

1. **Styling Polish (R1)**:
   - Clean up `tailwind.config.js` to eliminate legacy `obsidian` dark colors.
   - Refine any remaining dark text/background remnants in `IngestionPanel.tsx`, `ForensicsViewer.tsx`, and `Button.tsx`.
   - Ensure soft hairline borders (`border-line`) and pure white cards (`bg-surface`) throughout.
2. **Jargon Purge (R1)**:
   - Replace all occurrences of `AdaFace`, `MiniFASNet`, `DocTamper`, `TruFor`, `300 DPI`, and `Prior Log-Odds` across `App.tsx`, `RiskScoreCard.tsx`, `ResultsPanel.tsx`, `PillarsTable.tsx`, `PillarBiometrics.tsx`, `PillarForensics.tsx`, `PillarStamp.tsx`, and `mockData.ts`.
   - Replace the mathematical formula banner in `RiskScoreCard.tsx` with a clean, operational factor breakdown.
3. **Companion Sync Enhancements (R3)**:
   - Add the live companion connection pill `📱 Field Unit Connected (Live Companion Sync Active)` to `Header.tsx`, `IngestionPanel.tsx`, and `WebCamCapture.tsx`.
   - Display `✓ Received from Field Unit Camera` tag on incoming companion photos.
   - Ensure the side-by-side biometric comparison is featured prominently in `ResultsPanel.tsx`.
4. **Test Suite Alignment**:
   - Update tests in `frontend/tests/` to assert whitish theme tokens and new plain operational labels.

---
*Report generated by Explorer 2 (Web UI Survey)*
