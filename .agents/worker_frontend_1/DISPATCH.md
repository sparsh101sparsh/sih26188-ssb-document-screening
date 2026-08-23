## 2026-08-23T16:23:48Z

You are Worker 1 (Web & Frontend Specialist).
Your working directory is:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_frontend_1

MANDATORY: Read the original user request at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
and read the project plan at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/PROJECT.md
and read the survey findings at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_survey_frontend_1/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusive File Ownership:
You exclusively own and modify files in:
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend/`

Tasks to execute:
1. Remove Technical Jargon across all user-facing views:
   - Remove occurrences of `PP-OCRv4`, `AdaFace-ResNet100`, `MiniFASNetV2`, `DocTamper DTD`, `TruFor`, `ELA` from UI components (`PillarsTable.tsx`, `PillarOCR.tsx`, `PillarMRZ.tsx`, `PillarBiometrics.tsx`, `PillarForensics.tsx`, `ResultsPanel.tsx`, `RiskStatusBanner.tsx`, `AuditCertificateModal.tsx`, `WebCamCapture.tsx`, `Dropzone.tsx`, `ToolChips.tsx`, `presets.ts`, `mockData.ts`).
2. Implement Operational Language & Metric Renaming:
   - Rename `Risk Score` (0-100) -> `Threat Risk Level` ("Threat Level: X / 100", GREEN/AMBER/RED bands).
   - Rename `Stage 1 Tripwire` -> `Critical Verification Trigger`.
   - Rename `Cosine Similarity` / `Liveness Confidence` -> `Face Match Confidence` / `Selfie Liveness Check`.
   - Rename `apparent_age` / `age_drift` -> `Age Validation`.
   - Simplify timings: Remove individual sub-second model processing times from the main view. On primary dashboard, show only `Screening Duration: X.X seconds`.
3. Progressive Disclosure & Collapsed Technical Accordion:
   - Primary Dashboard View (Level 1): Document submitted, genuine/suspicious, operational bullet points of what looks wrong, face match status, clear actionable directive (APPROVED / MANUAL HOLD / DETAIN).
   - Advanced Audit Accordion (Level 3): Collapsed section titled "Advanced Verification Logs & Technical Audits" (defaults to closed) containing intermediate metric floats, model latencies, rule codes (CV-01), JSON/compliance certificate buttons.
4. Refine `PillarsTable.tsx` Tab Titles & Clean Clutter:
   - Tab 1: `Text & QR Check` (was OCR & QR PKI)
   - Tab 2: `Document Format` (was ICAO MRZ)
   - Tab 3: `Face Match & Liveness` (was Biometrics & FAS)
   - Tab 4: `Ink & Substrate Integrity` (was Forensics & ELA)
   - Tab 5: `Border Permit Stamp` (was Border Stamp)
   - Remove duplicate connection indicators, cogs, or redundant labels.
5. Update Unit Tests:
   - Update string assertions in `tests/adversarial_challenger_m2.test.tsx` and `tests/primitives_adversarial.test.tsx` to align with the new plain-language labels.
6. Build & Test Verification:
   - Run `npm run build` in `sih26188_project/frontend` (must succeed with 0 errors).
   - Run `npm test` in `sih26188_project/frontend` (must pass 100%).

Write your completion summary and verification outputs to:
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_frontend_1/handoff.md`

Send a message when complete.
