# Original User Request

## Initial Request — 2026-08-23T16:17:32Z

You are the Project Orchestrator for the SSB Field Screening System refactoring task.

Your working directory is:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/orchestrator_1

The user request is documented in:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md

Workspace root:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford

Task Summary & Requirements:
1. R1. Remove Technical Jargon & Implement Operational Language
   - Remove occurrences of `PP-OCRv4`, `AdaFace-ResNet100`, `MiniFASNetV2`, `DocTamper DTD`, `TruFor`, `ELA` from user-facing views.
   - Rename metrics: `Risk Score` (0-100) -> `Threat Risk Level` ("Threat Level: X / 100", GREEN/AMBER/RED bands), `Stage 1 Tripwire` -> `Critical Verification Trigger`, `Cosine Similarity` / `Liveness Confidence` -> `Face Match Confidence` / `Selfie Liveness Check`, `apparent_age` / `age_drift` -> `Age Validation`.
   - Simplify timings: Remove individual sub-second model processing times from the main view. On primary dashboard, show only `Screening Duration: X.X seconds`.
2. R2. Progressive Disclosure & Collapsed Technical Accordions
   - Primary Dashboard View (Level 1): Document submitted, genuine/suspicious, operational bullet points of what looks wrong (e.g. "Passport photo shows signs of replacement in the bottom right corner"), face match status, clear actionable directive (APPROVED / MANUAL HOLD / DETAIN).
   - Advanced Audit Accordion (Level 3): Collapsed section titled "Advanced Verification Logs & Technical Audits" (defaults to closed) containing intermediate metric floats, model latencies, rule codes (CV-01), JSON/compliance certificate buttons.
3. R3. App Spacing, Clutter & Tab Refinement
   - Android App: Reorganize bottom tabs and Compose views to prioritize photo comparison, live selfie verification status, and Threat Risk Level badge. Keep diagnostics tables/logs collapsed.
   - Computer App (`PillarsTable.tsx`): Plain-text operational titles:
     - Tab 1: Text & QR Check (was OCR & QR PKI)
     - Tab 2: Document Format (was ICAO MRZ)
     - Tab 3: Face Match & Liveness (was Biometrics & FAS)
     - Tab 4: Ink & Substrate Integrity (was Forensics & ELA)
     - Tab 5: Border Permit Stamp (was Border Stamp)
   - Remove duplicate connection indicators, cogs, or redundant labels.
4. Acceptance Criteria:
   - Android app: Primary results card shows "Threat Risk Level: X/100" and semantic badge; no AdaFace/MiniFASNet/DocTamper on main screening results; check digits, age drifts, logs collapsed.
   - Computer app: Centered dashboard with connected device status, active queue, latest results with operational bullet reasons, action card; timelines/matrices/JSON collapsed in advanced accordion; individual model latencies hidden, displaying only "Screening Duration: X.X seconds".
   - Build Verification:
     - Android: `./gradlew assembleDebug` succeeds
     - Backend: `pytest tests/` passes
     - Frontend: `npm run build` succeeds

Please orchestrate this work with your team, maintain `progress.md` and `plan.md` in your directory, run verification tests, and notify me with your completion report when all requirements and tests pass.
