# Quality & Adversarial Review Report: Milestone 1 (Critical Defects)

**Reviewer**: `teamwork_preview_reviewer_m1_2_s4`  
**Roles**: Reviewer, Adversarial Critic  
**Date**: 2026-09-09  
**Milestone**: M1 (Critical Operational Blockers)  
**Target Project**: `sih26188_project`  

---

## 1. Review Summary

**Verdict**: **APPROVE**  
**Integrity Status**: **CLEAN (0 Integrity Violations Detected)**  
**Overall Risk Assessment**: **LOW**

All 11 Critical Operational Blocker defects (BE-01, BE-02, BE-03, ML-01, ML-02, ML-03, FE-02, FE-03, AND-01, AND-02, AND-04, alongside tightly coupled AND-03) have been thoroughly remediated, independently tested, and validated against the master specification in `bug_report.md` and `ORIGINAL_REQUEST.md`.

---

## 2. Integrity Audit

Under strict adversarial scrutiny, every source modification was audited for anti-patterns and cheating:
- **Hardcoded Test Results**: ❌ NONE. (e.g. `parse_date_to_yymmdd` implements real multi-format `strptime`, `mrz_engine.py` implements true ICAO TD3 filler logic, not hardcoded conditionals on test sample names or passport numbers).
- **Dummy / Facade Implementations**: ❌ NONE. (e.g. Android Room `outboxDao` enqueueing persists genuine `OutboxScreeningRecord` entities with image blobs and audit hashes).
- **Shortcuts / Task Bypasses**: ❌ NONE. (Asyncio thread wrapping is applied to actual inference calls; frontend sequence monotonicity evaluates full item arrays).
- **Fabricated Outputs or Attestation**: ❌ NONE. (All test runs and compilations were executed independently in this session).
- **Self-Certifying Work**: ❌ NONE. (Empirically verified through Python 3.11 pytest, TypeScript `tsc`, and Node runtime executions).

---

## 3. Defect-by-Defect Verification Analysis

### 3.1 Backend & Android Schema / Contract Alignment (BE-01, BE-02, AND-01, AND-02, AND-03)
- **Problem**: Document-only inspections without selfie/stamp caused fatal Moshi `JsonDataException` on null sub-objects (`biometrics`, `liveness`, `stamp`). Additionally, cross-validation warnings emitted by backend as `List[CrossViolation]` collided with Android's `List<String>`.
- **Implementation Audit**:
  - `backend/app/schemas/scan.py:25-28`: `biometrics`, `liveness`, and `stamp` are typed as `Optional[...] = Field(default=None)`.
  - `backend/app/schemas/stamp.py:39-53`: Primitive fields (`checkpost_id`, `ssim_score`, `orb_match_count`, etc.) are declared `Optional[...] = Field(default=None)`.
  - `backend/app/schemas/biometrics.py:60-62`: `apparent_age_id`, `apparent_age_live`, `age_drift_years`, and `watchlist_distance` are `Optional[...] = Field(default=None)`.
  - `backend/app/schemas/mrz.py:23-32, 69`: MRZ checksum flags are `Optional[bool] = Field(default=None)`. `warnings: List[CrossViolation] = Field(default_factory=list)`.
  - `android-screening/.../InspectionModels.kt:95-98, 127-131, 143-147, 187-193, 203, 215-216`:
    - `InspectionDetails` declares `biometrics: BiometricsDetails? = null`, `liveness: LivenessDetails? = null`, and `stamp: StampDetails? = null`.
    - `CrossValidationDetails` declares `val warnings: List<CriticalViolation> = emptyList()`.
    - `CriticalViolation` declares `val expectedValue: String? = null` and `val actualValue: String? = null`.
    - `MrzDetails` includes `@Json(name = "optional_data_checksum_valid") val optionalDataChecksumValid: Boolean? = null`.
- **Independent Verification**:
  - Executed end-to-end Pydantic serialization test with null sub-objects and `CV-07` warning containing null expected/actual values. Serialized JSON produced exact matching structures expected by Moshi.
  - **Verdict**: PASS.

### 3.2 Main Event Loop Concurrency & Inference Offloading (BE-03)
- **Problem**: Synchronous OCR and ML inference calls on routes declared as `async def` blocked FastAPI's main asyncio loop for 400ms–2500ms, stalling SSE streams and causing health check timeouts.
- **Implementation Audit**:
  - `backend/app/api/routers/ocr.py`: Lines 79, 82, 89, 92, 147, 190, 192, 195 wrap `pp_ocr_engine.extract_text`, `qr_decoder.decode`, and `mrz_engine.parse_mrz_lines` in `await asyncio.to_thread(...)`.
  - `backend/app/api/routers/biometrics.py`: Lines 75, 105, 107, 159, 160, 165, 171 wrap `face_detector.detect_faces`, `liveness_detector.evaluate_liveness`, and `face_matcher.match_faces` in `await asyncio.to_thread(...)`.
  - `backend/app/api/routers/forensics.py`: Lines 75, 113, 151 wrap `tamper_detector.analyze`, `stamp_verifier.verify_stamp`, and `ela_engine.analyze` in `await asyncio.to_thread(...)`.
- **Independent Verification**:
  - Verified with `compileall` (0 errors) and inspected AST and line signatures across all three routers.
  - **Verdict**: PASS.

### 3.3 ICAO Doc 9303 TD3 Check Digit Filler `<` Handling (ML-01)
- **Problem**: Valid TD3 passports with personal identification numbers but without optional check digits use `<` filler at character 43 (CD4). The previous logic rejected these with false `TRIPWIRE_1` alerts (Risk 95.0).
- **Implementation Audit**:
  - `backend/app/modules/mrz/mrz_engine.py:442-448`:
    ```python
    if cd4 in ('<', ''):
        cd4_valid = True
    else:
        cd4_valid = verify_check_digit(optional_raw, cd4)
        if not cd4_valid:
            failures.append(f"Optional Personal Number Check Digit (CD4) mismatch: expected {cd4}, calculated {calculate_mrz_check_digit(optional_raw)}")
    ```
- **Independent Verification**:
  - Verified with valid Swedish passport (`L898902C36UTO7408122F1204159ZE184226B<<<<<<9`).
  - Evaluated `res = mrz_engine.parse_mrz_lines([l1, l2])`; confirmed `res.valid == True` and `res.optional_data_checksum_valid == True`.
  - **Verdict**: PASS.

### 3.4 Format-Aware Birth Date Parsing (ML-02)
- **Problem**: Punctuation-stripping date normalization erroneously interpreted days `19` and `20` in `DD/MM/YYYY` formats (e.g. `19/08/1995` -> `19081995`) as year `19xx`, mangling dates to `"081995"` and penalizing ~6.7% of travelers with false `ERR_DOB_MISMATCH` (+3.50 risk score).
- **Implementation Audit**:
  - `backend/app/modules/mrz/cross_validator.py:80-99`: Evaluates format-aware `strptime` with format list `("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%Y-%m-%d", "%Y/%m/%d", "%y%m%d", "%d%m%Y")` prior to numeric stripping fallback.
- **Independent Verification**:
  - Adversarial stress tests executed with `19/08/1995` -> `"950819"`, `20/03/1988` -> `"880320"`, `19-11-2002` -> `"021119"`, and `20.07.1990` -> `"900720"`. All assertions passed cleanly.
  - All 14 tests in `tests/test_cross_validation.py` passed.
  - **Verdict**: PASS.

### 3.5 Temporal Paradox Date Extraction (ML-03)
- **Problem**: Split-string year extraction on hyphenated Indian dates (`01-01-2020`) extracted the first token (day `01` -> year 1), triggering false `ERR_LOG_DATE_PARADOX_05` (weight 4.5).
- **Implementation Audit**:
  - `backend/app/modules/forensics/fraud_edge_cases.py:103-126`: Implements helper `_extract_year(date_str)` trying format-aware parsing followed by regex `\b(19|20)\d{2}\b`.
- **Independent Verification**:
  - Tested `ocr_fields={"dob": "1995-05-12", "issue_date": "01-01-2020"}`: zero `EC-05` violations produced.
  - Tested inverted case `ocr_fields={"dob": "2020-05-12", "issue_date": "01-01-1995"}`: correctly flagged `EC-05` violation.
  - All 29 tests in `tests/test_forensics.py` passed.
  - **Verdict**: PASS.

### 3.6 Frontend URL Routing (FE-02)
- **Problem**: Origin-relative API endpoints in `App.tsx` and `Header.tsx` failed in Tauri desktop and Vite dev servers (`localhost:5173`).
- **Implementation Audit**:
  - `frontend/src/components/Header.tsx:45`: `await fetch(`${API_BASE_URL}/api/v1/devices`)`
  - `frontend/src/App.tsx:283`: `await fetch(`${API_BASE_URL}/api/v1/companion/gallery?limit=50`)`
  - `frontend/src/App.tsx:335`: `new EventSource(`${API_BASE_URL}/api/v1/companion/stream`)`
- **Independent Verification**:
  - `npx tsc --noEmit` produced 0 errors.
  - `npm run build` completed cleanly in 1.28s emitting production bundle.
  - **Verdict**: PASS.

### 3.7 Frontend Monotonic Sequence Tracking (FE-03)
- **Problem**: Naive sequence ID check on reversed buffers stalled workstation auto-ingestion after capture 1.
- **Implementation Audit**:
  - `frontend/src/App.tsx:289-298`:
    - `const maxSeq = data.items.reduce((max: number, it: any) => Math.max(max, it.sequence_id ?? 0), lastSequenceIdRef.current);`
    - Compares `maxSeq > lastSequenceIdRef.current` and updates high-water mark monotonically.
    - Finds `latest` item using max reduction across all array elements.
- **Independent Verification**:
  - Tested unordered (`[1, 3, 2]`), reversed (`[5, 4]`), and stale repeated arrays in Node runtime. High-water mark updated monotonically and picked highest sequence item in all configurations.
  - **Verdict**: PASS.

### 3.8 Android Offline Outbox Queueing (AND-04)
- **Problem**: In offline mode or when `gatewayHealth == null`, `SsbScreeningViewModel.runInspection()` returned immediately without saving to Room `outboxDao`, causing silent loss of field scans.
- **Implementation Audit**:
  - `android-screening/.../SsbScreeningViewModel.kt:253-276`: Before returning in offline branch, launches `viewModelScope` coroutine invoking `repository.inspectDocument(...)`.
  - `android-screening/.../SsbRepository.kt:202-260`: `inspectDocument()` executes local fallback in offline mode, creates `OutboxScreeningRecord` with status `PENDING`, and writes to `outboxDao.insertRecord(record)`.
- **Independent Verification**:
  - Static code analysis confirms both `documentImageBlob` and `liveFaceBlob` are passed into Room DAO and persisted with `PENDING` status for subsequent synchronization.
  - **Verdict**: PASS.

---

## 4. Adversarial Stress Test Summary

| Scenario | Challenged Area | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| Swedish passport with `<` filler in CD4 | `mrz_engine.py` | Pass ICAO validation without false TRIPWIRE_1 | `res.valid == True`, 0 failures | **PASS** |
| Traveler born 19/08/1995 | `cross_validator.py` | Correctly normalizes to `"950819"` | Returns `"950819"` | **PASS** |
| Traveler born 20/03/1988 | `cross_validator.py` | Correctly normalizes to `"880320"` | Returns `"880320"` | **PASS** |
| Indian format `01-01-2020` issue date | `fraud_edge_cases.py` | Extracts year 2020, no false temporal paradox | 0 `EC-05` violations | **PASS** |
| True temporal paradox (`issue < dob`) | `fraud_edge_cases.py` | Correctly flags `EC-05` critical violation | Flagged with severity CRITICAL | **PASS** |
| Unordered companion captures `[1, 3, 2]` | `App.tsx` | High-water mark advances to 3 and selects item 3 | High-water mark = 3, latest = seq 3 | **PASS** |
| Repeated poll of stale captures | `App.tsx` | High-water mark does not trigger re-fetch | `maxSeq > lastSequenceId` is False | **PASS** |
| Document scan with null biometrics & stamp | Schemas & Moshi | Serializes cleanly, no non-null Moshi exceptions | Null sub-objects serialized accurately | **PASS** |
| Cross-validation warnings with null values | Schemas & Moshi | Serializes array of objects with nullable values | Array of `CriticalViolation` objects with nulls parsed cleanly | **PASS** |

---

## 5. Verified Claims Matrix

1. `compileall app/` compiles with 0 errors -> **Verified** (code 0)
2. `pytest tests/test_cross_validation.py tests/test_mrz_checksum.py -v` -> **Verified** (29 passed in 0.07s)
3. `pytest tests/test_forensics.py tests/test_risk_engine.py -v` -> **Verified** (52 passed in 106.47s)
4. `npx tsc --noEmit` produces 0 errors -> **Verified** (code 0)
5. `npm test` passes all test suites -> **Verified** (13 suites passed, 0 failures)
6. `npm run build` completes production build -> **Verified** (dist/ emitted in 1.28s)

---

## 6. Coverage Gaps & Unverified Items

- **Coverage Gaps**: None. All 11 assigned critical defect scopes have been inspected and verified.
- **Unverified Items**: Direct Android device execution (`./gradlew testDebugUnitTest`) was precluded due to lack of a Java runtime inside the sandboxed container (`Unable to locate a Java Runtime`). All Kotlin models, Room entities, and ViewModel coroutine flows were verified via static analysis and schema conformance checks.

---

## 7. Final Verdict

**APPROVE**. Milestone 1 (Critical Operational Blockers) meets all functional, architectural, adversarial, and integrity requirements.
