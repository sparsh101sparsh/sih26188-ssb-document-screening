## 2026-08-23T13:36:40Z

You are Worker M4 (Unified Design System & UI/UX Redesign).
Your working directory is:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_m4

Read the authoritative original request and project plan:
- /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
- /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/PROJECT.md
- Frontend survey report: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_3/report.md
- Android survey report: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_1/report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks:
1. Target codebases:
   - Android: `/Users/iamsparsh00321/Downloads/ssb-field-screening`
   - Frontend: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`

2. Android UI/UX Redesign (Field-First):
   - Simplify bottom navigation in `MainScreen.kt` from 6 tabs to exactly 3 primary tabs: `CAPTURE`, `RESULTS`, `OUTBOX`.
   - In `RESULTS` screen, place `AssessmentSummaryCard` and `OfficerDecisionCard`, and embed `InspectionPipelineTrace`, `CrossValidationMatrix`, and `DiscrepancyDiffTable` as high-contrast expandable accordion sections.
   - Enforce high-contrast touch targets of at least 56dp (`Modifier.sizeIn(minWidth = 56.dp, minHeight = 56.dp)`) across buttons, tab items, and action triggers.
   - Ensure the Risk verdict (GREEN/AMBER/RED) is the most visually dominant element on the results screen (large badge, full-width colored surface).
   - Implement pulsating glow animation on RED verdict using `rememberInfiniteTransition` with `animateFloat` / `InfiniteRepeatableSpec`.
   - Update `HeaderBar.kt` so connection status, gateway latency, and current mode are always prominently visible.
   - Implement shimmer loading animation on alpha using `InfiniteRepeatableSpec` during AI processing state.
   - Add clear camera state machine indicators: `IDLE` -> `CAPTURING` -> `UPLOADING` -> `PROCESSING` -> `COMPLETE`.
   - Ensure Gateway Diagnostics is accessible via a gear/telemetry icon or latency pill in the header.

3. Computer Frontend UI/UX Alignment:
   - Ensure `RiskStatusBanner.tsx`, `ApprovalCard.tsx`, `DiffTable.tsx`, `FilterTable.tsx`, `InspectionPipelineTrace.tsx` use the shared OKLCH/slate color tokens.
   - In `ForensicsViewer.tsx`, sanitize base64 prefix so heatmap image URLs without `data:image/png;base64,` scheme load cleanly, and verify canvas overlay alignment.
   - Add a Live Android Device connection card in `Header.tsx` or `StandbyTelemetry.tsx` / `App.tsx` displaying connected field units from `/api/v1/devices` (with graceful fallback if endpoint returns empty list).

4. Verify builds:
   - Run `npm run build` in `frontend/` (must exit 0).
   - Run `./gradlew assembleDebug` in Android (must exit 0).

5. Write detailed report to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_m4/report.md` and `handoff.md`. Notify parent when complete.
