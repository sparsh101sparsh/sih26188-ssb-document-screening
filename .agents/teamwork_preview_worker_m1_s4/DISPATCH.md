## 2026-09-09T14:41:35Z
You are teamwork_preview_worker_m1_s4, an implementation worker.
Your working directory is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_m1_s4
Project root: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUTS (read these before starting work):
1. /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
2. Master bug specification: /Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md
3. Survey reports from explorers:
   - /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_backend/survey_report.md
   - /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_ml/survey_report.md
   - /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_clients/survey_report.md

YOUR MISSION:
Implement Phase 1 — Critical Operational Blocker Remediation (11 defects):
1. BE-01 & AND-01:
   - Ensure backend schemas in `backend/app/schemas/scan.py`, `stamp.py`, `biometrics.py`, and `mrz.py` have `Optional[...] = Field(default=None)` on optional scan sub-objects (`biometrics`, `liveness`, `stamp`).
   - In `android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt`:
     Ensure `InspectionResponse` and sub-models handle nullable optional fields (`val biometrics: BiometricResult? = null`, `val liveness: LivenessResult? = null`, `val stamp: StampVerificationResult? = null`, and `val details: InspectionDetails? = null` if applicable).
2. BE-02 & AND-02:
   - In `backend/app/schemas/mrz.py`: ensure `warnings: List[CrossViolation] = Field(default_factory=list)`.
   - In `android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt`:
     Align `CrossValidationResult`: `val warnings: List<CriticalViolation> = emptyList()`. Also ensure `CriticalViolation` has `val expectedValue: String? = null` and `val actualValue: String? = null` (resolving AND-03 as well).
3. BE-03:
   - In `backend/app/api/routers/ocr.py`, `biometrics.py`, and `forensics.py`:
     Wrap all heavy synchronous ML inference calls (`face_detector.detect_faces`, `face_matcher.compute_similarity`, `liveness_detector.check_liveness`, `tamper_detector.detect_tampering`, `stamp_verifier.verify_stamp`, `pp_ocr_engine.extract_text` / OCR calls) in `await asyncio.to_thread(...)`. Ensure `import asyncio` is present.
4. ML-01:
   - In `backend/app/modules/mrz/mrz_engine.py:439-445`:
     Verify that CD4 checksum verification allows `<` or empty string as valid filler per ICAO Doc 9303 TD3:
     `if cd4 in ('<', ''): cd4_valid = True else: cd4_valid = verify_check_digit(personal_number, cd4)`.
5. ML-02:
   - In `backend/app/modules/mrz/cross_validator.py:80-99`:
     Ensure `parse_date_to_yymmdd` handles format-aware parsing using `strptime` formats before digit stripping so birthdays on the 19th/20th of any month are not parsed as 19xx/20xx.
6. ML-03:
   - In `backend/app/modules/forensics/fraud_edge_cases.py:95-113`:
     Ensure year extraction handles hyphenated `DD-MM-YYYY` dates properly using `_extract_year` format parsing so days are not treated as years.
7. FE-02:
   - In `frontend/src/App.tsx` and `frontend/src/components/Header.tsx`:
     Prepend `API_BASE_URL` to companion gallery (`/api/v1/companion/gallery`), SSE stream (`/api/v1/companion/stream`), and devices endpoint (`/api/v1/devices`).
8. FE-03:
   - In `frontend/src/App.tsx:289-291`:
     Fix inverted sequence comparison by calculating the maximum sequence ID across all items in `data.items`:
     `const maxSeq = data.items.reduce((max, it) => Math.max(max, it.sequence_id ?? 0), lastSequenceIdRef.current);`
     `lastSequenceIdRef.current = Math.max(lastSequenceIdRef.current, maxSeq);`
9. AND-04:
   - In `android-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt:253-266`:
     In offline mode or when gatewayHealth is null, do NOT return immediately! Call `repository.inspectDocument(...)` so the offline scan is enqueued into Room `outboxDao`.

FILES YOU EXCLUSIVELY OWN:
- backend/app/schemas/scan.py
- backend/app/schemas/stamp.py
- backend/app/schemas/biometrics.py
- backend/app/schemas/mrz.py
- backend/app/api/routers/ocr.py
- backend/app/api/routers/biometrics.py
- backend/app/api/routers/forensics.py
- backend/app/modules/mrz/mrz_engine.py
- backend/app/modules/mrz/cross_validator.py
- backend/app/modules/forensics/fraud_edge_cases.py
- frontend/src/App.tsx
- frontend/src/components/Header.tsx
- android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt
- android-screening/app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt

VERIFICATION COMMANDS TO RUN:
1. Backend compile check: `cd sih26188_project/backend && .venv311/bin/python -m compileall app/`
2. Backend targeted tests:
   - `.venv311/bin/pytest tests/test_cross_validation.py -v`
   - `.venv311/bin/pytest tests/test_mrz_checksum.py -v`
   - `.venv311/bin/pytest tests/test_forensics.py -v`
   - `.venv311/bin/pytest tests/test_risk_engine.py -v`
3. Frontend validation:
   - `cd sih26188_project/frontend && npx tsc --noEmit`
   - `npm test`
   - `npm run build`

When completed, record all changes in `changes.md`, write your `handoff.md`, and send a completion message with the paths.
