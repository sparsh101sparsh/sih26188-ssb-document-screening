# Frontend & Web UI Architecture & Survey Analysis

**Agent:** Explorer 1 (Frontend & Web UI Specialist)  
**Date:** 2026-08-23  
**Target Application:** React 19 / TypeScript / Vite / TailwindCSS Web Application (`sih26188_project/frontend`)

---

## 1. Executive Summary & Codebase Locations

The SSB AI Document Screening Web Application is located in:
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`

### Core Tooling & Build Configuration
- **Package Manager / Runtime:** Node.js / npm
- **Framework:** React 19 (`react: ^19.0.0`, `react-dom: ^19.0.0`)
- **Build Tool:** Vite 6 (`vite: ^6.1.0`), `@vitejs/plugin-react: ^4.3.4`
- **Language & Type Checking:** TypeScript 5.7 (`typescript: ^5.7.3`)
- **Styling:** Tailwind CSS 3.4 (`tailwindcss: ^3.4.17`, `postcss: ^8.5.2`, `autoprefixer: ^10.4.20`, `tailwind-merge: ^3.0.1`, `clsx: ^2.1.1`)
- **Icons:** Lucide React (`lucide-react: ^0.475.0`)
- **Build Command:** `npm run build` (executes `tsc -b && vite build`) — verified building cleanly in 1.96s.
- **Test Command:** `npm test` (executes `node tests/run_tests.mjs` running 3 adversarial test suites: 55/55 passed).

### File & Directory Map
```
sih26188_project/frontend/
├── package.json                   # Scripts, dependencies (React 19, Vite 6, Tailwind)
├── tsconfig.json                  # TypeScript compiler options
├── vite.config.ts                 # Vite bundle config (port 3000, proxy /api to backend)
├── tailwind.config.js             # Oceanic defense design system color tokens
├── index.html                     # HTML entry point
├── src/
│   ├── main.tsx                   # React root entry point
│   ├── App.tsx                    # Top-level shell, scanner orchestration, header/footer, modal hosts
│   ├── index.css                  # Canonical CSS custom properties & theme tokens
│   ├── components/
│   │   ├── Header.tsx             # Post selector, field unit status capsule, time, air-gapped status
│   │   ├── IngestionPanel.tsx     # Dual-dropzone container & scanning action button
│   │   ├── Dropzone.tsx           # Document upload / drag-and-drop
│   │   ├── WebCamCapture.tsx      # Live webcam portrait selfie capture & preview
│   │   ├── PresetsBar.tsx         # 4 quick-select simulation scenarios (Clean, Forged, Tampered, Spoof)
│   │   ├── ResultsPanel.tsx       # Primary screening viewport, master tabs, score banner, accordions
│   │   ├── RiskStatusBanner.tsx   # Top banner: Threat Risk Level, clearance verdict, action directive
│   │   ├── RiskScoreCard.tsx      # Gauge card: Bayesian calibration, log-odds breakdown, audit hash
│   │   ├── ReasonBulletList.tsx   # Plain-language operational reasons & cross-validation check list
│   │   ├── ForensicsViewer.tsx    # Dual-canvas document & heatmap compositor with opacity slider
│   │   ├── PillarsTable.tsx       # 5-Pillar / 5-Check tabular inspection suite
│   │   ├── PillarOCR.tsx          # Check 1: OCR extracted demographic fields & Aadhaar QR PKI
│   │   ├── PillarMRZ.tsx          # Check 2: ICAO Doc 9303 MRZ check digits & parsed lines
│   │   ├── PillarBiometrics.tsx   # Check 3: Face match similarity & selfie liveness verification
│   │   ├── PillarForensics.tsx    # Check 4: Pixel forgery, text alteration, noise anomaly inspection
│   │   ├── PillarStamp.tsx        # Check 5: 4-Stage hybrid border permit stamp validation
│   │   ├── AuditCertificateModal.tsx # Printable official border screening audit certificate
│   │   ├── RawJsonViewerModal.tsx    # Raw JSON Pydantic OpenAPI payload inspector
│   │   ├── OfflineWarningBanner.tsx  # Network/edge status warning banner
│   │   └── ui/
│   │       ├── ApprovalCard.tsx          # Officer human-in-the-loop decision card (Approve/Hold/Detain)
│   │       ├── DiffTable.tsx             # Cross-stream discrepancy matrix (OCR vs MRZ / QR)
│   │       ├── FilterTable.tsx           # 8-rule cross-validation guard table with status filter
│   │       ├── InspectionPipelineTrace.tsx # Pipeline execution step trace
│   │       ├── ToolChips.tsx             # Telemetry chips & tensor diff tooltips
│   │       ├── StatusPill.tsx            # Status tone pill primitive
│   │       └── SegmentedControl.tsx      # Segmented control tab bar primitive
│   ├── hooks/
│   │   └── useBackendHealth.ts    # Polling hook for backend health check & latency
│   ├── services/
│   │   ├── api.ts                 # Multipart FormData inspection API client
│   │   ├── mockData.ts            # High-fidelity mock responses for 4 core scenarios
│   │   └── presets.ts             # Procedural canvas document & face image generator
│   ├── types/
│   │   └── api.ts                 # Full TypeScript interfaces matching FastAPI Pydantic v2 schemas
│   └── utils/
│       ├── formatting.ts          # Aadhaar masking, percentage formatting, latency format
│       └── heatmap.ts             # Synthetic heatmap generator
└── tests/
    ├── run_tests.mjs              # Test runner
    ├── primitives_adversarial.test.tsx
    ├── primitives_interactive_adversarial.test.tsx
    └── adversarial_challenger_m2.test.tsx
```

---

## 2. Detailed Investigation of `PillarsTable.tsx` & Tab Renaming

### Current Tab Header Definitions
In `sih26188_project/frontend/src/components/PillarsTable.tsx` (lines 21–61):
```typescript
const tabs = [
  { id: 'all', label: 'All 5 Pillars', icon: Grid },
  { id: 'ocr', label: '1. OCR & QR PKI', icon: FileText, ... },
  { id: 'mrz', label: '2. ICAO MRZ', icon: CreditCard, ... },
  { id: 'biometrics', label: '3. Biometrics & FAS', icon: UserCheck, ... },
  { id: 'forensics', label: '4. Forensics & ELA', icon: Microscope, ... },
  { id: 'stamp', label: '5. Border Stamp', icon: Stamp, ... },
];
```

### Exact Renaming Plan
| Tab ID | Current Label | Proposed Plain-Text Operational Label | Rationale |
|---|---|---|---|
| `all` | `All 5 Pillars` | `All Verification Checks` | Replaces abstract "Pillars" terminology |
| `ocr` | `1. OCR & QR PKI` | `1. Text & QR Check` | Plain language, immediately understandable |
| `mrz` | `2. ICAO MRZ` | `2. Document Format` | Plain language, highlights document layout/structure |
| `biometrics` | `3. Biometrics & FAS` | `3. Face Match & Liveness` | Removes "FAS" acronym, clear operational function |
| `forensics` | `4. Forensics & ELA` | `4. Ink & Substrate Integrity` | Plain language, removes "ELA" jargon |
| `stamp` | `5. Border Stamp` | `5. Border Permit Stamp` | Unambiguous border permit domain terminology |

### Section Header Renaming in `PillarsTable.tsx` (Lines 103–134)
- Line 103: `Pillar 1: Multilingual OCR & Aadhaar QR Cryptography`  
  ➡️ **`Check 1: Text Extraction & QR Verification`**
- Line 110: `Pillar 2: ICAO Doc 9303 MRZ Checksum Validator`  
  ➡️ **`Check 2: Document Format & Security Checksums`**
- Line 117: `Pillar 3: AdaFace Biometric Matching & MiniFASNet FAS`  
  ➡️ **`Check 3: Face Match & Selfie Liveness Check`** (Removes `AdaFace`, `MiniFASNet`, `FAS`)
- Line 124: `Pillar 4: DocTamper DTD, TruFor Splicing & Classical ELA`  
  ➡️ **`Check 4: Ink, Tamper & Substrate Integrity`** (Removes `DocTamper DTD`, `TruFor`, `ELA`)
- Line 131: `Pillar 5: 4-Stage SSB Border Stamp Authentication`  
  ➡️ **`Check 5: Border Permit Stamp Verification`**

### Audit of Duplicate Connection Indicators & Redundant Labels
1. **`Header.tsx`**:
   - Currently has: (a) pulsing green/red status indicator on the SSB logo (lines 66–68), (b) an authoritative status capsule displaying active field units, latency, and air-gapped status (lines 111–130).
   - *Recommendation:* Keep the consolidated status capsule authoritative; ensure no redundant second status capsule or confusing extra cogs exist.
2. **`ResultsPanel.tsx`**:
   - Lines 756–775 contain status pills (`SCORE X.X · AUTO-CLEAR`, `STAGE 1 TRIPWIRE ACTIVE`, `SIGNED: ...`) placed directly above `RiskStatusBanner`, duplicating the information in the banner below it.
   - *Recommendation:* Streamline this area to avoid duplicated badges that distract border officers from the primary actionable directive.

---

## 3. Inventory of User-Facing Technical Jargon & Replacement Plan

### A. Machine Learning & Model Acronyms in UI Views

| Jargon String | Found in Files | Line Numbers | Replacement Operational Text |
|---|---|---|---|
| `PP-OCRv4` / `PP-OCR` | `App.tsx`<br>`PillarOCR.tsx`<br>`ResultsPanel.tsx`<br>`ToolChips.tsx`<br>`mockData.ts` | `PillarOCR.tsx:44`<br>`ResultsPanel.tsx:171, 233, 234`<br>`ToolChips.tsx:33, 34` | **`Multilingual Text Reader`** / **`Text & QR Engine`** |
| `AdaFace-ResNet100` / `AdaFace` | `PillarBiometrics.tsx`<br>`PillarsTable.tsx`<br>`ResultsPanel.tsx`<br>`WebCamCapture.tsx`<br>`ToolChips.tsx`<br>`mockData.ts` | `PillarBiometrics.tsx:18, 32`<br>`PillarsTable.tsx:117`<br>`ResultsPanel.tsx:195, 272, 273`<br>`WebCamCapture.tsx:96`<br>`ToolChips.tsx:61, 62` | **`Facial Biometric Matcher`** / **`Face Match Engine`** |
| `MiniFASNetV2` / `MiniFASNet` / `FAS` | `PillarBiometrics.tsx`<br>`PillarsTable.tsx`<br>`ResultsPanel.tsx`<br>`WebCamCapture.tsx`<br>`ToolChips.tsx`<br>`mockData.ts`<br>`presets.ts` | `PillarBiometrics.tsx:18, 96`<br>`PillarsTable.tsx:117`<br>`ResultsPanel.tsx:291, 292`<br>`WebCamCapture.tsx:96`<br>`ToolChips.tsx:75, 76`<br>`presets.ts:390` | **`Live Selfie Anti-Spoofing Check`** / **`Live Presentation Check`** |
| `DocTamper DTD` / `DocTamper` | `App.tsx`<br>`ForensicsViewer.tsx`<br>`PillarForensics.tsx`<br>`PillarStamp.tsx`<br>`PillarsTable.tsx`<br>`ResultsPanel.tsx`<br>`ToolChips.tsx`<br>`mockData.ts`<br>`presets.ts` | `ForensicsViewer.tsx:251`<br>`PillarForensics.tsx:58`<br>`PillarStamp.tsx:98`<br>`PillarsTable.tsx:124`<br>`ResultsPanel.tsx:208, 309, 310, 926`<br>`ToolChips.tsx:47, 48`<br>`presets.ts:356` | **`Digital Text Tamper Detector`** / **`Text Alteration Inspection`** |
| `TruFor` / `SegFormer` | `ForensicsViewer.tsx`<br>`PillarForensics.tsx`<br>`PillarsTable.tsx`<br>`ResultsPanel.tsx`<br>`mockData.ts` | `ForensicsViewer.tsx:251`<br>`PillarForensics.tsx:70`<br>`PillarsTable.tsx:124`<br>`ResultsPanel.tsx:208, 934`<br>`mockData.ts:20, 42` | **`Photo Splicing & Forgery Localization`** / **`Substrate Splicing Detector`** |
| `ELA` / `Classical ELA` / `Q90` | `App.tsx`<br>`Dropzone.tsx`<br>`PillarForensics.tsx`<br>`PillarsTable.tsx`<br>`ResultsPanel.tsx` | `Dropzone.tsx:92`<br>`PillarForensics.tsx:98`<br>`PillarsTable.tsx:46, 124`<br>`ResultsPanel.tsx:214, 325, 852, 942` | **`Substrate Compression & Error Analysis`** / **`Compression Integrity`** |

### B. Metric & Label Renaming Matrix

| Old Metric / Label | New Metric / Label | Target Files & Locations | Operational Display Example |
|---|---|---|---|
| `Risk Score` (0–100) | `Threat Risk Level` | `RiskStatusBanner.tsx:100`<br>`RiskScoreCard.tsx:45`<br>`AuditCertificateModal.tsx:142`<br>`ResultsPanel.tsx:758-761` | **`Threat Level: 2.5 / 100`** (GREEN: Low / Auto-Clear, AMBER: Moderate / Hold, RED: Critical / Detain) |
| `Stage 1 Tripwire` / `Tripwire` | `Critical Verification Trigger` | `RiskStatusBanner.tsx:52, 85, 120`<br>`ResultsPanel.tsx:766`<br>`presets.ts:388`<br>`mockData.ts:681, 849` | **`Critical Verification Trigger Active`** (instant RED override) |
| `Cosine Similarity` | `Face Match Confidence` | `PillarBiometrics.tsx:48`<br>`ResultsPanel.tsx:201, 285`<br>`ToolChips.tsx:71`<br>`mockData.ts:18` | **`Face Match Confidence: 84%`** |
| `Liveness Confidence` / `Liveness Score` | `Selfie Liveness Check` | `PillarBiometrics.tsx:112`<br>`ToolChips.tsx:85`<br>`mockData.ts:19` | **`Selfie Liveness Check: Verified Live Human (98%)`** |
| `apparent_age` / `age_drift` / `age_drift_years` | `Age Validation` | `PillarBiometrics.tsx:68`<br>`ResultsPanel.tsx:526`<br>`FilterTable.tsx:29` | **`Age Validation: Consistent (0 yrs drift)`** |

---

## 4. Progressive Disclosure & View Tiering Architecture

### Tier 1: Primary Officer Dashboard (Default High-Visibility View)
The primary screen presented to the border guard officer must be uncluttered, instantly decisive, and free of technical model jargon.

**Components in Tier 1:**
1. **Document Submitted & Demographics Card**:
   - Thumbnail of scanned document credential.
   - Identified document type (Indian Passport / Aadhaar / Bhutan Entry Permit).
   - Traveler Full Legal Name, Document Number (masked Aadhaar where applicable), Date of Birth, Issuing Country.
2. **Face Match & Live Selfie Status**:
   - Side-by-side portrait verification (Document Photo vs Live Webcam Selfie).
   - Status badge: `MATCH CONFIRMED (98%)` or `FACE MISMATCH / SPOOF DETECTED`.
3. **Threat Risk Level Banner (`RiskStatusBanner.tsx`)**:
   - `Threat Level: X / 100` with high-contrast semantic tier styling:
     - **GREEN (0–30):** `AUTO-CLEAR PASS` — "APPROVED — Safe for fast-path border transit clearance."
     - **AMBER (31–70):** `SECONDARY INSPECTION REQUIRED` — "MANUAL HOLD — Officer must conduct physical document inspection."
     - **RED (71–100):** `CRITICAL SECURITY ALERT · DETAIN` — "INTERDICTION MANDATE — Detain subject under Section 14 Foreigners Act."
4. **Operational Reason Bullet Points (`ReasonBulletList.tsx`)**:
   - Actionable explanations in plain English, for example:
     - *"Passport photo shows signs of digital replacement or tampering in the bottom right corner."*
     - *"Date of birth visual text (1994) conflicts with decoded cryptographic payload (1984)."*
     - *"Physical border permit stamp template fails official SSB checkpost registry correlation."*
5. **Clear Actionable Directive & Sign-off Console (`ApprovalCard.tsx`)**:
   - Big decision buttons: `Clear Traveler (Approve)` | `Secondary Hold` | `Interdiction Order (Detain)`.
   - Officer remarks & Duty Officer badge stamp.
6. **Simplified Screening Timing**:
   - On the top summary, replace all sub-second individual model latencies with a single consolidated metric:  
     **`Screening Duration: 0.4 seconds`** (`(processing_time_ms / 1000).toFixed(1) + ' seconds'`).

### Tier 3: Collapsed Technical Accordions ("Advanced Verification Logs & Technical Audits")
All dense diagnostic data and deep inspection tables are grouped into collapsed accordions (default closed) so they do not clutter the primary screening workflow.

**Contents of Collapsed Section (`openAccordions: false` by default):**
- **Inference Pipeline Step Trace (`InspectionPipelineTrace.tsx`)**: Multi-step execution stages.
- **Model Tensors & Intermediate Diagnostics (`ToolChips.tsx`)**: Model versions, tensor diff chips, threshold constants (e.g. $\tau = 0.180$, $7\text{-}3\text{-}1$ weighting, Fourier FFT metrics).
- **Cross-Validation Rule Codes (`FilterTable.tsx`)**: Technical rule codes (`CV-01` through `CV-08`).
- **Discrepancy Matrix (`DiffTable.tsx`)**: Field-by-field raw comparison table.
- **Visual Forensics & Heatmap Compositor (`ForensicsViewer.tsx`)**: Deep pixel anomaly overlays and colormap gradient.
- **Pillars Breakdown (`PillarsTable.tsx`)**: Granular check tabs with detailed telemetry.
- **Export & Audit Actions**: "View Audit Certificate" (opens `AuditCertificateModal.tsx`) and "View JSON Payload" (opens `RawJsonViewerModal.tsx`).

---

## 5. Verification & Test Suite Compatibility

### Build Verification
- Command: `npm run build` in `sih26188_project/frontend`
- Status: Exits 0, compiles 1625 modules with Vite 6.4 in ~1.96 seconds.

### Test Suite Verification & Refactoring Caveat
- Command: `npm test` in `sih26188_project/frontend`
- Test files located in `src/tests/`:
  1. `tests/primitives_adversarial.test.tsx`
  2. `tests/primitives_interactive_adversarial.test.tsx`
  3. `tests/adversarial_challenger_m2.test.tsx`
- **Critical Notice for Implementation Workers:**
  `adversarial_challenger_m2.test.tsx` currently asserts on specific strings:
  - Line 310: `assert.ok(htmlTable.includes('Pillar 3: AdaFace Biometric'))`
  - Line 326: `assert.ok(bioHtml.includes('AdaFace-ResNet100'))`
  - `primitives_adversarial.test.tsx` line 442: `assert.ok(html.includes('AdaFace-R100'))`
  When renaming UI labels to plain language, these unit test assertions must be updated synchronously so `npm test` continues to pass with 0 failures.
