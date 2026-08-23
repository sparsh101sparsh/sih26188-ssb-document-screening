## 2026-08-23T04:22:22+05:30

Refactor the full user interface of the SSB AI Document & Identity Screening System (SIH26188) by implementing the design language, primitives, and micro-interactions from the cloned `beautiful-ui` repository (`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/beautiful-ui-reference/`) across all views.

### R1. Design System & CSS Variables Tokenization
- Implement all CSS color tokens, tints (`--red-tint`, `--green-tint`, `--field`, `--hover`), radii (`--radius-chip`, `--radius-control`, `--radius-card`), and keyframe animations (`pop-in`, `fade-up`, `radarSweep`, `pop-out`) in `frontend/src/index.css`.

### R2. Beautiful-UI Primitives Porting & Adaptations
Adapt and implement the following components from `sih26188_project/beautiful-ui-reference` into `sih26188_project/frontend/src/components/ui/`:
- **`DiffTable`**: For forensic cross-field mismatch inspection (e.g., visual text vs MRZ discrepancies).
- **`FilterTable`**: For cross-validation rules and checkpoint history logs with status chips.
- **`ApprovalCard`**: For border officer human-in-the-loop decisions (Hold for Secondary, Clear, Issue Interdiction).
- **`ToolChips` / `TaskRows`**: For granular multi-model execution telemetry.
- **`SegmentedControl` & `StatusPill`**: For presets and risk level indicators.

### R3. Dashboard Layout & Ingestion Refactoring
- Restructure `IngestionPanel.tsx`, `Dropzone.tsx`, and `WebCamCapture.tsx` to eliminate empty negative space and ensure responsive alignment.
- Provide live preview cards for ingested documents and biometrics with tactile upload buttons.

### R4. Complete Integration & Tauri Verification
- Connect all new primitives to the reactive state in `App.tsx` and `ResultsPanel.tsx`.
- Verify clean frontend build (`npm run build`) in `frontend/` with 0 errors.
- Verify backend tests (`pytest tests/` in `backend/`) passes all 121 tests.
- Compile the macOS desktop application (`cargo-tauri build` in `sih26188_project/` or `src-tauri/`) bundled with the official `ssb.webp` icon.

## Acceptance Criteria
- [ ] All 5 adapted primitives (`DiffTable`, `FilterTable`, `ApprovalCard`, `ToolChips`, `SegmentedControl`) render cleanly in TypeScript.
- [ ] No missing dependencies (`posthog`, next.js server components) in the Vite/React app.
- [ ] Ingestion screen layout fills the viewport cleanly without blank space.
- [ ] Cross-validation results render via `FilterTable` with interactive filter pills.
- [ ] Secondary action buttons open `ApprovalCard` for officer interdiction.
- [ ] `npm run build` completes in `frontend/` with 0 errors.
- [ ] `pytest tests/` in `backend/` passes all 121 tests.
- [ ] `cargo-tauri build` produces a working `SSB Screening.app` macOS bundle with the custom icon.
