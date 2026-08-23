# Handoff Report — Frontend & Web UI Codebase Survey

**Agent:** Explorer 1 (Frontend & Web UI Specialist)  
**Parent Agent:** Orchestrator (`0ae7d8db-cc73-43d2-932f-5ce9ad1da211`)  
**Working Directory:** `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_survey_frontend_1`  
**Date:** 2026-08-23

---

## 1. Observation

Direct code observations, exact paths, line numbers, and tool verification outputs:

### 1.1 Web Application Setup & Build Tooling
- Frontend Root: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`
- Build scripts in `package.json` (lines 6–15):
  ```json
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "node tests/run_tests.mjs",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug"
  }
  ```
- Command Execution Verification:
  - `npm run build` executed via `run_command` in `sih26188_project/frontend`: exited with code `0`, finished in `1.96s`, produced `dist/index.html`, `dist/assets/index-*.css` (29.59 kB), `dist/assets/index-*.js` (396.22 kB).
  - `npm test` executed via `run_command` in `sih26188_project/frontend`: executed `node tests/run_tests.mjs`, ran 3 test suites (`primitives_adversarial.test.tsx`, `primitives_interactive_adversarial.test.tsx`, `adversarial_challenger_m2.test.tsx`), exited code `0` with 55 tests passed.

### 1.2 `PillarsTable.tsx` Tab Headers & Section Headers
In `sih26188_project/frontend/src/components/PillarsTable.tsx`:
- Lines 21–61 define `tabs`:
  - Line 22: `{ id: 'all', label: 'All 5 Pillars', icon: Grid }`
  - Line 25: `{ id: 'ocr', label: '1. OCR & QR PKI', icon: FileText, ... }`
  - Line 32: `{ id: 'mrz', label: '2. ICAO MRZ', icon: CreditCard, ... }`
  - Line 39: `{ id: 'biometrics', label: '3. Biometrics & FAS', icon: UserCheck, ... }`
  - Line 46: `{ id: 'forensics', label: '4. Forensics & ELA', icon: Microscope, ... }`
  - Line 53: `{ id: 'stamp', label: '5. Border Stamp', icon: Stamp, ... }`
- Lines 103–134 define section titles inside the "All" view:
  - Line 103: `<FileText className="w-4 h-4" /> Pillar 1: Multilingual OCR & Aadhaar QR Cryptography`
  - Line 110: `<CreditCard className="w-4 h-4" /> Pillar 2: ICAO Doc 9303 MRZ Checksum Validator`
  - Line 117: `<UserCheck className="w-4 h-4" /> Pillar 3: AdaFace Biometric Matching & MiniFASNet FAS`
  - Line 124: `<Microscope className="w-4 h-4" /> Pillar 4: DocTamper DTD, TruFor Splicing & Classical ELA`
  - Line 131: `<Stamp className="w-4 h-4" /> Pillar 5: 4-Stage SSB Border Stamp Authentication`

### 1.3 Machine Learning Jargon & Technical Strings across Frontend
- `PP-OCRv4` / `PP-OCR`:
  - `PillarOCR.tsx:44`: `requires_tier2_vlm ? 'TRIGGERED (Qwen2.5-VL)' : 'BYPASS (PP-OCR PASS)'`
  - `ResultsPanel.tsx:171`: `name: 'PP-OCRv4 Multilingual OCR & UIDAI QR Engine'`
  - `ResultsPanel.tsx:233-234`: `name: 'PP-OCRv4 Multilingual Engine'`, `label: 'PP-OCRv4'`
  - `ToolChips.tsx:33-34`: `name: 'PP-OCRv4 Multilingual Engine'`, `label: 'PP-OCRv4'`
  - `App.tsx:162, 268`: `pp_ocr: 'PP-OCRv4-Multilingual'`
- `AdaFace-ResNet100` / `AdaFace`:
  - `PillarBiometrics.tsx:18`: `evaluate 1:1 AdaFace similarity and MiniFASNet presentation attack detection.`
  - `PillarBiometrics.tsx:32`: `AdaFace-ResNet100 1:1 Cosine Verification`
  - `PillarsTable.tsx:117`: `Pillar 3: AdaFace Biometric Matching & MiniFASNet FAS`
  - `ResultsPanel.tsx:195`: `name: 'AdaFace Cosine Matcher & Umeyama 5-Pt Align'`
  - `ResultsPanel.tsx:272-273`: `name: 'AdaFace Cosine Biometric Matcher'`, `label: 'AdaFace-R100'`
  - `WebCamCapture.tsx:96`: `AdaFace Cosine · MiniFASNet FAS`
  - `ToolChips.tsx:61-62`: `name: 'AdaFace Cosine Biometric Matcher'`, `label: 'AdaFace-R100'`
- `MiniFASNetV2` / `MiniFASNet`:
  - `PillarBiometrics.tsx:96`: `MiniFASNetV2-SE Dual-Scale Anti-Spoofing`
  - `ResultsPanel.tsx:291-292`: `name: 'MiniFASNetV2 Anti-Spoofing'`, `label: 'MiniFASNetV2-SE'`
  - `presets.ts:390`: `'MiniFASNetV2-SE flagged 2D digital screen replay attack (Fourier Moiré pattern detected, Liveness: 0.04).'`
- `DocTamper DTD` / `DocTamper`:
  - `ForensicsViewer.tsx:251`: `DocTamper & TruFor Heatmap`
  - `PillarForensics.tsx:58`: `DocTamper ResNet-50`
  - `PillarsTable.tsx:124`: `Pillar 4: DocTamper DTD, TruFor Splicing & Classical ELA`
  - `ResultsPanel.tsx:208, 309-310, 926`: `DocTamper DTD Score`
- `TruFor`:
  - `PillarForensics.tsx:70`: `TruFor SegFormer-B0`
  - `ResultsPanel.tsx:934`: `TruFor Splicing Score`
- `ELA`:
  - `Dropzone.tsx:92`: `['ICAO Doc 9303', 'UIDAI QR PKI', 'Devanagari OCR', 'Substrate ELA']`
  - `PillarForensics.tsx:98`: `Classical ELA (Q90 x20 Error)`
  - `ResultsPanel.tsx:852, 942`: `title="Visual Forensics, ELA & Splicing Localization"`, `ELA Q90 Max Intensity`

### 1.4 Metric Names & Labels
- `Risk Score`:
  - `RiskStatusBanner.tsx:100`: `Risk Score`
  - `AuditCertificateModal.tsx:142`: `Risk Score:`
  - `ResultsPanel.tsx:758-761`: `SCORE ${assessment.risk_score.toFixed(1)} ...`
- `Tripwire` / `Stage 1`:
  - `RiskStatusBanner.tsx:52, 85, 120`: `Stage 1 tripwire`, `Stage 1 Hard Tripwire Assertions (instant RED override):`
  - `ResultsPanel.tsx:766`: `STAGE 1 TRIPWIRE ACTIVE`
- `Cosine Similarity` / `Liveness Confidence`:
  - `PillarBiometrics.tsx:48`: `Cosine Similarity`
  - `PillarBiometrics.tsx:112`: `Liveness Score`
  - `ResultsPanel.tsx:201, 285`: `Cosine: ...`, `Cosine similarity: ...`
- `apparent_age` / `age_drift`:
  - `PillarBiometrics.tsx:68`: `Apparent Age Drift`
  - `ResultsPanel.tsx:526`: `Biometric Apparent Age vs Optical DOB Drift`

### 1.5 Unit Test Assertions on Old Labels
- In `tests/adversarial_challenger_m2.test.tsx`:
  - Line 310: `assert.ok(htmlTable.includes('Pillar 3: AdaFace Biometric'), 'Pillar 3 section missing');`
  - Line 326: `assert.ok(bioHtml.includes('AdaFace-ResNet100'), 'PillarBiometrics missing model name');`
- In `tests/primitives_adversarial.test.tsx`:
  - Line 442: `assert.ok(html.includes('AdaFace-R100'));`

---

## 2. Logic Chain

1. **Premise 1 (Codebase Structure):** The web frontend is built using standard React 19 + TypeScript + TailwindCSS + Vite, rooted in `sih26188_project/frontend/`. `npm run build` and `npm test` are the authoritative commands.
2. **Premise 2 (Jargon Infiltration):** Multiple UI components (`PillarsTable.tsx`, `PillarOCR.tsx`, `PillarMRZ.tsx`, `PillarBiometrics.tsx`, `PillarForensics.tsx`, `ResultsPanel.tsx`, `WebCamCapture.tsx`, `Dropzone.tsx`, `ToolChips.tsx`, `RiskStatusBanner.tsx`, `AuditCertificateModal.tsx`, `presets.ts`, `mockData.ts`) directly render machine-learning model names (`PP-OCRv4`, `AdaFace-ResNet100`, `MiniFASNetV2`, `DocTamper DTD`, `TruFor`, `ELA`) and raw mathematical metric names (`Cosine Similarity`, `Stage 1 Hard Tripwire`, `Risk Score`, `Apparent Age Drift`).
3. **Premise 3 (Operational Usability Goal):** Border security officers require plain-language operational summaries ("Threat Level: X / 100", "Face Match Confidence", "Selfie Liveness Check", "Critical Verification Trigger", "Text & QR Check", "Document Format", "Face Match & Liveness", "Ink & Substrate Integrity", "Border Permit Stamp", "Screening Duration: X.X seconds") rather than academic ML acronyms.
4. **Premise 4 (Progressive Disclosure Architecture):** High-level operational directives (APPROVED / MANUAL HOLD / DETAIN), face match status, document details, and plain bullet points belong on Tier 1 (Primary Dashboard). Technical telemetry, model floats, rule codes (`CV-01`..`CV-08`), and latency traces belong in a single collapsed Tier 3 accordion titled "Advanced Verification Logs & Technical Audits" (default closed).
5. **Premise 5 (Test Synchronization):** Existing test suites in `tests/*.test.tsx` assert on exact string occurrences of old model names and tab labels. Modifying the components without updating the tests would cause `npm test` regressions. Therefore, unit test assertions must be updated synchronously with UI refactoring.

---

## 3. Caveats

- **Caveat 1:** `beautiful-ui-reference` in the workspace is a Next.js reference prototype and not the active production application. All operational changes must be made exclusively in `sih26188_project/frontend`.
- **Caveat 2:** Backend Pydantic models return `assessment.model_versions` and `details.biometrics.embedding_model_used` as JSON fields. These underlying backend property names should remain intact in API contracts (`src/types/api.ts`), while user-facing labels in TSX components are transformed to plain language.
- **Caveat 3:** Test suite files (`tests/adversarial_challenger_m2.test.tsx` and `tests/primitives_adversarial.test.tsx`) must be updated in step with component label changes to ensure `npm test` continues passing cleanly.

---

## 4. Conclusion

The frontend codebase is well-structured and ready for refactoring. The refactoring plan covers:
1. **Renaming Tab Headers in `PillarsTable.tsx`**:
   - `1. OCR & QR PKI` ➡️ `1. Text & QR Check`
   - `2. ICAO MRZ` ➡️ `2. Document Format`
   - `3. Biometrics & FAS` ➡️ `3. Face Match & Liveness`
   - `4. Forensics & ELA` ➡️ `4. Ink & Substrate Integrity`
   - `5. Border Stamp` ➡️ `5. Border Permit Stamp`
   - `All 5 Pillars` ➡️ `All Verification Checks`
2. **Eliminating ML Jargon**:
   - Remove `PP-OCRv4`, `AdaFace-ResNet100`, `MiniFASNetV2`, `DocTamper DTD`, `TruFor`, `ELA` from user-facing views across all 15 identified frontend components.
   - Rename metrics: `Risk Score` ➡️ `Threat Risk Level` ("Threat Level: X / 100"), `Stage 1 Tripwire` ➡️ `Critical Verification Trigger`, `Cosine Similarity` ➡️ `Face Match Confidence`, `Liveness Confidence` ➡️ `Selfie Liveness Check`, `apparent_age / age_drift` ➡️ `Age Validation`.
   - Simplify timing on main view: Replace individual sub-second latencies with single `Screening Duration: X.X seconds`.
3. **Implementing Progressive Disclosure**:
   - **Level 1 (Primary Dashboard):** Document preview & extracted demographics, Threat Risk Level badge (GREEN/AMBER/RED), face match status, plain operational reasons bullet points, and actionable decision card (`APPROVED` / `MANUAL HOLD` / `DETAIN`).
   - **Level 3 (Advanced Accordion):** "Advanced Verification Logs & Technical Audits" (default closed) enclosing latency traces, telemetry chips, tensor diffs, `CV-01`..`CV-08` rule codes, and raw JSON / certificate modal triggers.
4. **Updating Test Assertions**:
   - Update string assertions in `tests/adversarial_challenger_m2.test.tsx` and `tests/primitives_adversarial.test.tsx` to match the new plain-language labels, ensuring both `npm run build` and `npm test` pass.

---

## 5. Verification Method

Independent verification steps:

1. **Build Verification**:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend
   npm run build
   ```
   *Expected Result:* Zero TypeScript or Vite compilation errors; build outputs to `dist/`.

2. **Test Suite Verification**:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend
   npm test
   ```
   *Expected Result:* All 3 test suites pass (`primitives_adversarial`, `primitives_interactive_adversarial`, `adversarial_challenger_m2`) with 0 failures.

3. **Jargon Elimination Check**:
   ```bash
   rg -i "AdaFace-ResNet100|MiniFASNetV2|DocTamper-ResNet50|TruFor-SegFormer|PP-OCRv4" sih26188_project/frontend/src/components/
   ```
   *Expected Result:* Zero matches in user-facing JSX render strings.

4. **Tab Label Check in `PillarsTable.tsx`**:
   Inspect `sih26188_project/frontend/src/components/PillarsTable.tsx` lines 21–61 and lines 103–134 to confirm all 5 plain-language tab labels and section headers are rendered.
