import sys, os, re, json
from datetime import datetime

dest_dir = '/Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7'
dest_path = os.path.join(dest_dir, 'bug_report.md')
dest_meta = os.path.join(dest_dir, 'bug_report.md.metadata.json')

draft_path = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_orchestrator_3/bug_report_draft.md'
be_path = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_backend_audit/report.md'
ml_path = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_ml_audit/report.md'
client_path = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_client_audit/report.md'
diag_path = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_diagnostic_runner/diagnostics.md'

with open(draft_path) as f:
    draft_text = f.read()

with open(be_path) as f:
    be_text = f.read()

with open(ml_path) as f:
    ml_text = f.read()

with open(client_path) as f:
    client_text = f.read()

with open(diag_path) as f:
    diag_text = f.read()

def parse_bugs(text, prefix_regex):
    pattern = re.compile(r'(###\s+(' + prefix_regex + r'-\d+):?.*?\n)(?=(?:###\s+[A-Z]+-\d+:?)|(?:\n---)|(?:\n## )|\Z)', re.DOTALL)
    bugs = {}
    for block, bid in pattern.findall(text):
        bugs[bid] = block.strip()
    return bugs

be_bugs = parse_bugs(be_text, 'BE')
ml_bugs = parse_bugs(ml_text, 'ML')
fe_bugs = parse_bugs(client_text, 'FE')
and_bugs = parse_bugs(client_text, 'AND')

test_01 = """### TEST-01: Backend Pytest Cross-Test SQLite State Pollution in Test Harness
- **Severity**: `MEDIUM`
- **Affected Component & Exact File Path**: `backend/tests/test_challenger_m5_e2e_4tier.py`
- **Line Numbers**: Lines 122, 195
- **Detailed Description**:
  When the backend pytest test suite is executed in full (`backend/.venv311/bin/pytest tests/ -v`), two assertion failures occur in `test_challenger_m5_e2e_4tier.py`:
  1. `test_f4_realtime_ingestion_and_verdict_synchronization` fails at line 122: `assert up_res.json()["sequence_id"] == 1` fails with `assert 3 == 1`.
  2. `test_concurrent_uploads_monotonic_sequence_integrity` fails at line 195: `assert set(results) == set(range(1, thread_count + 1))` fails with `assert {61, 62, ...} == {1, 2, ...}`.
  However, when `test_challenger_m5_e2e_4tier.py` is executed in total isolation (`pytest tests/test_challenger_m5_e2e_4tier.py`), all 11/11 tests pass with exit code 0.
- **Root Cause**:
  Earlier tests in the pytest test discovery sequence (`test_companion_sync.py`, `test_companion_endpoints.py`) insert test rows into the shared SQLite database file `test_companion.db` without cleaning up. Because SQLite `AUTOINCREMENT` sequences persist across connections, the sequence ID begins at 3 (or 61) rather than 1, violating the strict sequence assertions of `test_challenger_m5_e2e_4tier.py`.
- **Reproduction Steps**:
  1. Run the entire backend test suite:
     `cd backend && .venv311/bin/pytest tests/ -v --tb=short`
  2. Observe failure in `test_challenger_m5_e2e_4tier.py:122` (`assert 3 == 1`) and `195`.
  3. Run the test file in isolation:
     `cd backend && .venv311/bin/pytest tests/test_challenger_m5_e2e_4tier.py`
  4. Observe all 11 tests pass cleanly with exit code 0.
- **Potential Remediation Notes**:
  - Add an autouse pytest fixture in `conftest.py` or `test_challenger_m5_e2e_4tier.py` that truncates the `companion_captures` and `sqlite_sequence` tables before and after test execution:
    ```python
    @pytest.fixture(autouse=True)
    def clean_companion_db():
        with get_db() as conn:
            conn.execute("DELETE FROM companion_captures")
            conn.execute("DELETE FROM sqlite_sequence WHERE name='companion_captures'")
            conn.commit()
        yield
    ```"""

test_02 = """### TEST-02: Android Robolectric Network Socket Leak in Repository Unit Test
- **Severity**: `MEDIUM`
- **Affected Component & Exact File Path**: `android-screening/app/src/test/java/com/ssb/fieldscreening/RepositoryNetworkRobustnessTest.kt`
- **Line Numbers**: Lines 179-181
- **Detailed Description**:
  When executing the Android Robolectric unit test suite (`./gradlew testDebugUnitTest`), 53 out of 54 tests pass. However, `test autoDetectGateway safely probes candidate IPs and returns null if unreachable` fails with:
  ```text
  java.lang.AssertionError: autoDetectGateway must return null when no hotspot gateways respond expected null, but was:<http://127.0.0.1:8000>
  ```
- **Root Cause**:
  The unit test creates an instance of `SsbRepository` and invokes `autoDetectGateway(null)`. The method performs an unmocked HTTP probe against loopback candidate IPs, including `http://127.0.0.1:8000/api/v1/health`. In an active developer environment where the backend FastAPI server is running on host port 8000, the test connects to the real local server, receives HTTP 200 OK, and returns `http://127.0.0.1:8000` instead of `null`.
- **Reproduction Steps**:
  1. Start the backend server on host port 8000 (`uvicorn app.main:app --port 8000`).
  2. Run the Android unit tests:
     `cd android-screening && ./gradlew testDebugUnitTest --tests com.ssb.fieldscreening.RepositoryNetworkRobustnessTest`
  3. Observe assertion failure at line 181 (`expected null, but was:<http://127.0.0.1:8000>`).
- **Potential Remediation Notes**:
  - In `RepositoryNetworkRobustnessTest.kt`, mock the underlying `OkHttpClient` or candidate IP list so that unit test probes never leak into the host loopback network:
    ```kotlin
    // Configure mock probe list or ensure MockWebServer interceptor intercepts 127.0.0.1
    ```"""

test_03 = """### TEST-03: Broken User Home Symlinks to Disconnected External Drive
- **Severity**: `LOW`
- **Affected Component & Exact File Path**: Host developer filesystem (`~/.gradle`, `~/.android`)
- **Line Numbers**: N/A (Host environment configuration)
- **Detailed Description**:
  On developer workstations where `~/.gradle` or `~/.android` are symlinked to an external storage drive (`/Volumes/issparsh/`), running `./gradlew` commands fails when the external drive is not mounted or disconnected. Gradle aborts with file access errors attempting to locate lock files or daemon caches.
- **Root Cause**:
  Dangling symlinks from the user home directory pointing to unmounted `/Volumes/issparsh/`.
- **Reproduction Steps**:
  1. Unmount external volume `/Volumes/issparsh/`.
  2. Run `./gradlew tasks` in `android-screening/`.
  3. Gradle fails with `IOException: Broken symbolic link: ~/.gradle`.
- **Potential Remediation Notes**:
  - Specify `-g <local_dir>` explicitly in build scripts or invoke Gradle with `--project-cache-dir /tmp/.gradle` when running diagnostics in offline environments."""

# Build the complete document
report_lines = []

# Header & Frontmatter
report_lines.append("# SIH26188 SSB Edge Screening Gateway — Consolidated Master Bug Report & Defect Dossier\n")
report_lines.append("**System**: SIH26188 AI-Based Fake Identity & Document Screening System  ")
report_lines.append("**Audit Scope**: Entire Gateway Codebase (Backend Core & Routers, ML & Algorithmic Modules, Frontend Web/Desktop, Android Companion Client, Diagnostic Test Suites)  ")
report_lines.append("**Audit Mode**: STRICT READ-ONLY STATIC ANALYSIS & REPRODUCIBLE DIAGNOSTIC VERIFICATION  ")
report_lines.append("**Author**: Project Orchestrator, Forensic Auditors & Multi-Disciplinary Quality Engineering Team  ")
report_lines.append("**Date**: 2026-09-09  ")
report_lines.append("**Destination**: `/Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md`  \n")
report_lines.append("---\n")

# Extract Sections 1, 2, 3, 4 from draft_text
# In draft_text, Section 1 starts at "## 1. Executive Summary"
# Section 5 starts at "## 5. Detailed Bug Reports with Root Cause & Remediation"
sec1_4_match = re.search(r'(## 1\. Executive Summary.*?)(\n## 5\. Detailed Bug Reports)', draft_text, re.DOTALL)
if not sec1_4_match:
    raise ValueError("Could not find Sections 1-4 in draft_text")

report_lines.append(sec1_4_match.group(1).strip())
report_lines.append("\n\n---\n")

# Section 5: Detailed Bug Reports
report_lines.append("## 5. Detailed Bug Reports with Root Cause & Remediation\n")
report_lines.append("This section contains complete, individual, rigorous technical dossiers for all **61 verified defects** across the five architectural categories. Each entry documents the unique Bug ID, Severity, Affected Component, Exact File Path, Line Numbers, Detailed Description, Root Cause Analysis, Reproduction Steps / Verbatim Tracebacks, and Concrete Potential Remediation Code.\n")

# 5.1 Backend
report_lines.append("### 5.1 Backend Core & Routers (19 Defects)\n")
for i in range(1, 20):
    bid = f"BE-{i:02d}"
    if bid in be_bugs:
        report_lines.append(be_bugs[bid] + "\n\n---\n")
    else:
        print(f"WARNING: {bid} missing from be_bugs")

# 5.2 ML
report_lines.append("### 5.2 Machine Learning & Algorithmic Modules (20 Defects)\n")
for i in range(1, 21):
    bid = f"ML-{i:02d}"
    if bid in ml_bugs:
        report_lines.append(ml_bugs[bid] + "\n\n---\n")
    else:
        print(f"WARNING: {bid} missing from ml_bugs")

# 5.3 Frontend
report_lines.append("### 5.3 Frontend Web & Desktop Gateway Client (7 Defects)\n")
for i in range(1, 8):
    bid = f"FE-{i:02d}"
    if bid in fe_bugs:
        report_lines.append(fe_bugs[bid] + "\n\n---\n")
    else:
        print(f"WARNING: {bid} missing from fe_bugs")

# 5.4 Android
report_lines.append("### 5.4 Android Companion Field Screening Client (12 Defects)\n")
for i in range(1, 13):
    bid = f"AND-{i:02d}"
    if bid in and_bugs:
        report_lines.append(and_bugs[bid] + "\n\n---\n")
    else:
        print(f"WARNING: {bid} missing from and_bugs")

# 5.5 Test Suite
report_lines.append("### 5.5 Test Suite & Diagnostic Harness (3 Defects)\n")
report_lines.append(test_01 + "\n\n---\n")
report_lines.append(test_02 + "\n\n---\n")
report_lines.append(test_03 + "\n\n---\n")

# Section 6: Systemic Architectural Risk Analysis & Priority Remediation Roadmap
sec6 = """## 6. Systemic Architectural Risk Analysis & Priority Remediation Roadmap

Based on the multi-tiered audit findings across all 61 defects, systemic architectural risks have been categorized into a phased remediation roadmap to ensure gateway zero-downtime stability and 100% border inspection reliability:

### Phase 1: Critical Operational Blockers (Target: Immediate 24h Sprint)
1. **Android Moshi Null-Safety Rectification (BE-01, AND-01, AND-02, AND-03)**:
   - Make all optional inspection sub-objects (`biometrics`, `liveness`, `stamp`) and fields nullable in `InspectionModels.kt`.
   - Align `CrossValidationDetails.warnings` with `List<CrossViolation>` data model.
2. **Main Thread Event Loop Starvation Offload (BE-03)**:
   - Wrap heavy OpenCV, ONNX Runtime, and Pillow inference executions in `await asyncio.to_thread()` across `biometrics.py`, `forensics.py`, `ocr.py`.
3. **ICAO TD3 Check Digit Filler Compliance (ML-01)**:
   - Support `<` filler character in passport CD4 optional field check digit computation to eliminate false TRIPWIRE_1 RED alerts on valid international documents.
4. **Date Parsing Birthday Logic Rectification (ML-02, ML-03)**:
   - Enforce ISO format-aware parsing for DD-MM-YYYY dates in `cross_validator.py` and `fraud_edge_cases.py` to prevent false age paradox flags for travelers born on the 19th/20th.
5. **Offline Capture Loss Prevention (AND-04)**:
   - Ensure `SsbScreeningViewModel` enqueues captured documents and selfies into Room `OutboxDao` immediately, regardless of current Wi-Fi connectivity state.
6. **Workstation Companion Ingestion Unfreezing (FE-02, FE-03)**:
   - Prepend `API_BASE_URL` to all companion and device fetch endpoints in `App.tsx` and sort ingestion items monotonically ascending before checking sequence numbers.

### Phase 2: High-Severity Concurrency, Hardware & Security Hardening (Target: Sprint 2)
1. **Thread-Safe Device State & SSE Broadcasting (BE-05, BE-07)**:
   - Protect `DeviceTracker` dictionary iterations with `asyncio.Lock()` and initialize `SSEBroadcaster` queue strictly within the active running event loop.
2. **Asynchronous Companion Gallery Encoding (BE-06)**:
   - Offload disk file reads and Base64 thumbnail encoding in `companion.py` to a dedicated thread pool to eliminate gateway freeze under heavy mobile traffic.
3. **Persistent Verdict Management (BE-08)**:
   - Persist officer screening verdicts to SQLite rather than ephemeral RAM to ensure mobile clients receive definitive clearance status even across gateway restarts.
4. **Biometric Input Defensive Hardening (ML-04, ML-05)**:
   - Reject empty byte payloads `b""` before calling face detection; convert PIL Images to NumPy BGR arrays before YuNet inference.
5. **Forensic Stamp Spatial Clustering (ML-10)**:
   - Apply DBSCAN or connected-component bounding box clustering to stamp ink pixels to prevent merging separate visa stamps into distorted out-of-bounds crops.
6. **Android CameraX Lifecycle & Threading (AND-05, AND-06)**:
   - Move raw frame rotation, downsampling, and JPEG compression to `Dispatchers.Default` background coroutines. Ensure `unbindAll()` is called prior to executor shutdown.

### Phase 3: Medium & Low Architectural Polish (Target: Sprint 3)
1. **Sequence ID Persistent Monotonicity (BE-12)**:
   - Initialize companion sequence IDs from `MAX(sequence_id)` in SQLite database rather than resetting to 0 on server restarts.
2. **mDNS Double-Suffixing Prevention (BE-13)**:
   - Strip trailing `.local.` from hostnames prior to Zeroconf registration.
3. **Android Wi-Fi MulticastLock (AND-08)**:
   - Acquire Android `WifiManager.MulticastLock` during mDNS gateway discovery to prevent packet filtering on aggressive mobile Wi-Fi chipsets.
4. **R7 Exponential Backoff Companion Upload Loop (AND-09, AND-12)**:
   - Implement the 5-stage backoff retry loop (0s, 2s, 8s, 30s, 60s) in `SsbRepository` and preserve static session UUIDs across retries to maintain backend deduplication integrity.
5. **Test Harness State Isolation (TEST-01, TEST-02)**:
   - Introduce autouse database clean fixtures in pytest and mock loopback candidate probes in Robolectric unit tests."""

report_lines.append(sec6 + "\n\n---\n")

# Section 7: Verification Commands & Invalidation Conditions
sec7 = """## 7. Verification Commands & Audit Invalidation Conditions

### 7.1 Verification Commands
To independently verify any claim, defect, or metric in this report, execute the following commands in their designated directories:

1. **Backend Verification Suite**:
   ```bash
   cd sih26188_project/backend
   # Full suite execution (reproduces 334 passed, 2 cross-test state failures)
   .venv311/bin/pytest tests/ -v --tb=short
   # Isolated feature execution (reproduces 11/11 passed clean)
   .venv311/bin/pytest tests/test_challenger_m5_e2e_4tier.py
   # Syntax & import verification
   .venv311/bin/python -m compileall app/
   ```

2. **Frontend Verification Suite**:
   ```bash
   cd sih26188_project/frontend
   # TypeScript strict static typecheck (reproduces 0 errors)
   npx tsc --noEmit
   # Unit test runner (reproduces 13 suites passed)
   npm test
   # Production bundle compilation (reproduces 1687 modules transformed)
   npm run build
   ```

3. **Android Verification Suite**:
   ```bash
   cd sih26188_project/android-screening
   # Gradle task graph dry-run
   ./gradlew testDebugUnitTest --dry-run
   # Unit tests execution (reproduces 53 passed, 1 failed due to port 8000 socket leak)
   ./gradlew testDebugUnitTest
   ```

### 7.2 Strict Read-Only Audit Invariant Attestation
- `git status --porcelain` in `sih26188_project` confirms **zero production source code or test files were altered** during this audit.
- No dummy files, facade classes, or mock bypasses were introduced into the project repository.
- All 61 defects reflect active, genuine, reproducible code paths in the repository.

### 7.3 Conditions Invalidating This Report
This audit report shall be considered partially or fully invalidated under the following future conditions:
1. **BE-01, AND-01, AND-02, AND-03**: Invalidated when `InspectionModels.kt` is patched with nullable types and Moshi lenient deserializers, and backend models emit non-null fallbacks.
2. **BE-03**: Invalidated when ONNX and OpenCV inference calls in `biometrics.py`, `forensics.py`, and `ocr.py` are wrapped in `asyncio.to_thread`.
3. **ML-01**: Invalidated when `mrz_engine.py` is updated to treat `<` as a valid filler character in passport CD4 optional fields.
4. **ML-02, ML-03**: Invalidated when regex-based ISO date parsing is deployed in `cross_validator.py` and `fraud_edge_cases.py`.
5. **FE-02, FE-03**: Invalidated when `API_BASE_URL` is prepended to companion URLs in `App.tsx` and sequence polling evaluates items in monotonically ascending order.
6. **AND-04**: Invalidated when `SsbScreeningViewModel.kt` enqueues offline scans into Room before evaluating network connectivity."""

report_lines.append(sec7 + "\n")

full_report = "\n".join(report_lines)

os.makedirs(dest_dir, exist_ok=True)
with open(dest_path, 'w') as f:
    f.write(full_report)

meta = {
    "summary": "Master Consolidated Bug Report & Defect Dossier for SIH26188 Edge Screening Gateway covering 61 verified defects across Backend, ML, Frontend, Android, and Diagnostics.",
    "updatedAt": datetime.utcnow().isoformat() + "Z",
    "userFacing": True
}
with open(dest_meta, 'w') as f:
    json.dump(meta, f, indent=2)

print(f"Successfully generated master bug report:")
print(f"Destination: {dest_path}")
print(f"Size: {len(full_report)} characters, {len(full_report.splitlines())} lines")
