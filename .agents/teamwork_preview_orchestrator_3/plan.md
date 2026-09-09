# Orchestration Plan — Comprehensive Read-Only Bug Detection

## Project Scope
- Project Root: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project`
- Destination: `/Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md`
- Policy: STRICT READ-ONLY ENFORCEMENT. No production code or test files may be modified.

## Decomposition Strategy
We decompose the audit into 4 concurrent specialized tracks:
1. **Track 1: Backend Core & Routers Audit** (Subagent: Explorer)
   - Scope: `backend/app/api/routers/`, `backend/app/core/`, `backend/app/services/`
   - Focus: API schema validation, Pydantic vs client naming discrepancies, error handling, session lifecycle, concurrency, DB locking, async integrity.
2. **Track 2: ML & Algorithmic Modules Audit** (Subagent: Explorer)
   - Scope: `backend/app/modules/`
   - Focus: Fallback chain robustness when weights are missing, OCR/MRZ parsing check digit edge cases, facial matching baseline drift, ELA/Tamper scoring calibrations, stamp verification bounding logic.
3. **Track 3: Frontend & Mobile Clients Audit** (Subagent: Explorer)
   - Scope: `frontend/src/`, `android-screening/`
   - Focus: Request payload consistency with backend models, WebSocket event subscription/teardown/reconnect, client state handling, Android camera/network/permission configurations, coroutines, thread safety.
4. **Track 4: Diagnostic Test Execution & Traceback Capture** (Subagent: Worker / QA Diagnostics)
   - Execution of `pytest` in `backend/` using Python 3.11 venv (`backend/.venv311/bin/pytest`).
   - Execution of `npm test` and `npx tsc --noEmit` in `frontend/`.
   - Android gradle checks if available (`./gradlew testDebugUnitTest` / lint / compilation check).
   - Capture all failing tests, tracebacks, and warnings verbatim without modifying any files.

## Review & Consolidation Phase
5. **Synthesis & Report Drafting**:
   - Aggregate all findings from Tracks 1-4.
   - Cross-reference past bug fixes (from prior milestones in `.agents/`) vs active/latent bugs.
   - Construct executive summary table, categorized by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO) and component area.
   - Format each bug with Unique ID, Title, Severity, Affected Component & Path, Line numbers, Description, Root Cause, Reproduction Steps / Traceback, and Potential Remediation Notes.
6. **Integrity & Review Verification**:
   - Dispatch Challenger/Reviewer to audit the consolidated bug report against the actual code paths and confirm 100% read-only integrity (verify git status shows zero modified production files).
7. **Final Publication & Handoff**:
   - Write `/Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md`.
   - Update `progress.md`, write `handoff.md`, and report completion to parent.
