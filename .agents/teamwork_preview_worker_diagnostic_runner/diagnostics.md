# SIH26188 Diagnostic Test Execution & Traceback Report (Track 4)

**Execution Timestamp**: 2026-09-09T04:59:00Z  
**Host Environment**: macOS (Darwin 26.6.2 arm64)  
**Agent**: `teamwork_preview_worker_diagnostic_runner` (Track 4)  
**Integrity Mode**: Strict Read-Only (Zero production code or test files modified)

---

## 1. Executive Summary

| Subsystem | Diagnostic Suite / Command | Total Executed | Passed | Failed | Warnings / Errors | Exit Code | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend Core** | `pytest tests/ -v --tb=short` (Python 3.11 venv) | 336 | 334 | 2 | 48 warnings | 1 | ⚠️ 2 Failures (Cross-Test State Pollution) |
| **Backend Isolation** | `pytest tests/test_challenger_m5_e2e_4tier.py` | 11 | 11 | 0 | 1 warning | 0 | ✅ Clean Pass in Isolation |
| **Backend Imports** | `python -m compileall app/` & `python -c "import app.main"` | 100% files | All | 0 | 3 model pending notices | 0 | ✅ Syntax & Imports Valid |
| **Frontend Types** | `npx tsc --noEmit` | N/A | N/A | 0 | 0 | 0 | ✅ Zero Type Errors |
| **Frontend Tests** | `npm test` (`node tests/run_tests.mjs`) | 13 test suites (38+ tests) | 38+ | 0 | 2 esbuild cjs import.meta warnings | 0 | ✅ All Suites Passed |
| **Frontend Build** | `npm run build` (`tsc -b && vite build`) | 1687 modules | 1687 | 0 | 1 chunk size warning (>500 kB) | 0 | ✅ Production Bundle Generated |
| **Android Dry-Run** | `./gradlew testDebugUnitTest --dry-run` | Task Graph | All | 0 | 1 SDK XML schema warning | 0 | ✅ Task Graph Valid (with env fixes) |
| **Android Tests** | `./gradlew testDebugUnitTest` | 54 | 53 | 1 | 1 Robolectric JDK warning | 1 | ⚠️ 1 Failure (Unmocked Host Port 8000 Leak) |

---

## 2. Backend Diagnostics (FastAPI / Pytest)

### 2.1 Execution Command & Parameters
- **Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend`
- **Interpreter**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/.venv311/bin/python` (Python 3.11.16)
- **Pytest Version**: pytest 9.1.1, pluggy 1.6.0
- **Execution Command**:
  ```bash
  /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/.venv311/bin/pytest tests/ -v --tb=short
  ```
- **Execution Duration**: 1115.09s (18 minutes 35 seconds)
- **Exit Code**: 1

### 2.2 Summary of Pytest Results
- **Collected**: 336 items
- **Passed**: 334
- **Failed**: 2
- **Warnings**: 48

### 2.3 Verbatim Tracebacks & Failures

#### Failure 1: `test_f4_realtime_ingestion_and_verdict_synchronization`
- **File**: `tests/test_challenger_m5_e2e_4tier.py`
- **Line**: 122
- **Class**: `TestTier1FeatureCoverage`
- **Verbatim Traceback**:
```text
_________________ TestTier1FeatureCoverage.test_f4_realtime_ingestion_and_verdict_synchronization _________________
tests/test_challenger_m5_e2e_4tier.py:122: in test_f4_realtime_ingestion_and_verdict_synchronization
    assert up_res.json()["sequence_id"] == 1
E   assert 3 == 1
------------------------------ Captured log setup ------------------------------
INFO     sih26188.main:main.py:54 Initializing SIH26188 Edge Screening Appliance...
INFO     sih26188.main:main.py:55 Active Environment: development
INFO     sih26188.main:main.py:56 Target Models Directory: /Volumes/issparsh/sih26188_models
INFO     sih26188.main:main.py:60 Configured ONNX Execution Providers: ['CoreMLExecutionProvider', 'CPUExecutionProvider']
WARNING  sih26188.main:main.py:79 [MODEL PENDING] pp_ocrv4_det (ch_PP-OCRv4_det_infer.onnx) not found at /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/models/ch_PP-OCRv4_det_infer.onnx. Ensure weights are downloaded via backend/scripts/download_weights.sh.
WARNING  sih26188.main:main.py:79 [MODEL PENDING] pp_ocrv4_rec (devanagari_PP-OCRv4_rec.onnx) not found at /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/models/devanagari_PP-OCRv4_rec.onnx. Ensure weights are downloaded via backend/scripts/download_weights.sh.
WARNING  sih26188.main:main.py:79 [MODEL PENDING] omnimrz (omnimrz_ppocr_v4.onnx) not found at /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/models/omnimrz_ppocr_v4.onnx. Ensure weights are downloaded via backend/scripts/download_weights.sh.
WARNING  sih26188.main:main.py:79 [MODEL PENDING] scrfd_10gf (scrfd_10g_bnkps.onnx) not found at /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/models/scrfd_10g_bnkps.onnx. Ensure weights are downloaded via backend/scripts/download_weights.sh.
WARNING  sih26188.main:main.py:79 [MODEL PENDING] adaface_r100 (adaface_ir100_ms1mv2.onnx) not found at /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/models/adaface_ir100_ms1mv2.onnx. Ensure weights are downloaded via backend/scripts/download_weights.sh.
WARNING  sih26188.main:main.py:79 [MODEL PENDING] minifasnet_v2 (2.7_80x80_MiniFASNetV2.onnx) not found at /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/models/2.7_80x80_MiniFASNetV2.onnx. Ensure weights are downloaded via backend/scripts/download_weights.sh.
WARNING  sih26188.main:main.py:79 [MODEL PENDING] doctamper_dtd (doctamper_fcn_r50.onnx) not found at /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/models/doctamper_fcn_r50.onnx. Ensure weights are downloaded via backend/scripts/download_weights.sh.
WARNING  sih26188.main:main.py:79 [MODEL PENDING] trufor (trufor_general.pth.tar) not found at /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/models/trufor_general.pth.tar. Ensure weights are downloaded via backend/scripts/download_weights.sh.
INFO     sih26188.main:main.py:87 [DATA READY] Stamp Registry loaded from /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/app/data/stamp_registry.json
INFO     sih26188.main:main.py:89 [DATA READY] UIDAI Offline Root Certificate loaded from /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/app/data/uidai_root_cert.pem
INFO     sih26188.network:network.py:388 [Network] Evaluated interface 'lo0' (127.0.0.1): physical=False, default_route=False, rfc1918=False, vpn=False, virtual=False, loopback=True -> Score: -500
INFO     sih26188.network:network.py:388 [Network] Evaluated interface 'en0' (172.16.4.83): physical=True, default_route=True, rfc1918=True, vpn=False, virtual=False, loopback=False -> Score: 170
INFO     sih26188.network:network.py:412 [Network] Selected LAN IP: 172.16.4.83 (Interface: en0, Score: 170)
WARNING  sih26188.main:main.py:115 [Zeroconf] Could not register Zeroconf service:
------------------------------ Captured log call -------------------------------
INFO     sih26188.companion:companion.py:388 [Companion] Persisted capture #3 (uuid: d537a5ac-e2f3-4906-a675-35b63f4d44d8, type: document)
INFO     httpx:_client.py:1025 HTTP Request: POST http://testserver/api/v1/companion/upload "HTTP/1.1 200 OK"
```
- **Root Cause**: State pollution across tests. The test immediately preceding `test_f4` is `test_f3_pairing_center_companion_info_and_simulate`, which uploads 2 simulated captures (sequences 1 and 2) to the companion SQLite database. When `test_f4` runs, its upload receives sequence ID 3. Because `test_f4` strictly asserts `assert up_res.json()["sequence_id"] == 1` without clearing the database or resetting state in a fixture, the assertion fails.
- **Independent Verification**: When run in isolation (`pytest tests/test_challenger_m5_e2e_4tier.py -k test_f4_realtime_ingestion_and_verdict_synchronization`), this test **PASSED** cleanly.

---

#### Failure 2: `test_concurrent_uploads_monotonic_sequence_integrity`
- **File**: `tests/test_challenger_m5_e2e_4tier.py`
- **Line**: 195
- **Class**: `TestTier2BoundaryAndCornerCases`
- **Verbatim Traceback**:
```text
_ TestTier2BoundaryAndCornerCases.test_concurrent_uploads_monotonic_sequence_integrity _
tests/test_challenger_m5_e2e_4tier.py:195: in test_concurrent_uploads_monotonic_sequence_integrity
    assert set(results) == set(range(1, thread_count + 1))
E   AssertionError: assert {61, 62, 63, 64, 65, 66, ...} == {1, 2, 3, 4, 5, 6, ...}
E     
E     Extra items in the left set:
E     61
E     62
E     63
E     64
E     65...
E     
E     ...Full output truncated (141 lines hidden), use '-vv' to show
------------------------------ Captured log setup ------------------------------
INFO     sih26188.main:main.py:54 Initializing SIH26188 Edge Screening Appliance...
INFO     sih26188.main:main.py:55 Active Environment: development
INFO     sih26188.main:main.py:56 Target Models Directory: /Volumes/issparsh/sih26188_models
INFO     sih26188.main:main.py:60 Configured ONNX Execution Providers: ['CoreMLExecutionProvider', 'CPUExecutionProvider']
...
------------------------------ Captured log call -------------------------------
INFO     sih26188.companion:companion.py:388 [Companion] Persisted capture #61 (uuid: b881f9e1-a090-4a73-bcdf-2dd7e76ff4ee, type: selfie)
INFO     sih26188.companion:companion.py:388 [Companion] Persisted capture #62 (uuid: d7918709-2e9b-4927-a884-8104fba780f4, type: selfie)
...
INFO     sih26188.companion:companion.py:388 [Companion] Persisted capture #85 (uuid: 15ce6616-09df-44ba-a425-09680a3864ae, type: selfie)
```
- **Root Cause**: Monotonic sequence test assumes sequence IDs always start at 1 (`set(range(1, thread_count + 1))`). Preceding tests in `test_companion_sync.py`, `test_challenger_m4_m5_backend.py`, and `test_f3`/`test_f4` had already written 60 records into the SQLite database. Therefore, the 25 concurrent threads were assigned sequences 61 through 85.
- **Independent Verification**: When run in isolation (`pytest tests/test_challenger_m5_e2e_4tier.py -k test_concurrent_uploads_monotonic_sequence_integrity`), this test **PASSED** cleanly.

---

### 2.4 Observed Backend Warnings & Deprecations
1. **Starlette Deprecation Warnings**:
   - `Using 'httpx' with 'starlette.testclient' is deprecated; install 'httpx2' instead.` (at `fastapi/testclient.py:1`).
   - `'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead.` (4 occurrences: `test_api_health.py`, `test_challenger_m1.py`, `test_challenger_m1_stress.py`, `test_e2e_pipeline.py`).
2. **Pillow 14 Removal Warnings (37 occurrences)**:
   - `Image.Image.getdata is deprecated and will be removed in Pillow 14 (2027-10-15). Use get_flattened_data instead.` in `app/modules/forensics/ela_engine.py` (lines 207, 220, 238).
3. **mDNS Zeroconf Socket Permission Teardown Warning**:
   - `zeroconf:_logger.py:110 Error with socket 57 (('127.0.0.1', 5353))): [Errno 1] Operation not permitted` during test teardown.

---

## 3. Frontend Diagnostics (TypeScript / React / Vite)

### 3.1 Type Checking (`npx tsc --noEmit`)
- **Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`
- **Command**: `npx tsc --noEmit`
- **Output**: Empty (0 type errors)
- **Exit Code**: 0

### 3.2 Test Runner Execution (`npm test`)
- **Command**: `npm test` -> `node tests/run_tests.mjs`
- **Test Suites Executed**: 13
  1. `adversarial_challenger_m1_theme.test.tsx` — PASSED
  2. `adversarial_challenger_m2.test.tsx` — PASSED
  3. `adversarial_challenger_m2_empirical.test.tsx` — PASSED
  4. `adversarial_challenger_m3_empirical.test.tsx` — PASSED
  5. `adversarial_challenger_m3_empirical_deep.test.tsx` — PASSED
  6. `adversarial_challenger_m4_deep_e2e.test.tsx` — PASSED (8/8 checks passed)
  7. `adversarial_challenger_m4_ingestion.test.tsx` — PASSED
  8. `adversarial_challenger_m5_e2e_4tier.test.tsx` — PASSED
  9. `adversarial_challenger_m5_empirical_deep.test.tsx` — PASSED
  10. `challenger_m2_deep_stress.test.tsx` — PASSED
  11. `challenger_m3_frontend.test.tsx` — PASSED
  12. `connect_modal_pairing.test.tsx` — PASSED (13/13 tests passed)
  13. `qr_generation.test.tsx` — PASSED (17/17 tests passed)
- **Results**: All 13 suites passed cleanly. Total tests: 38+ unit & empirical tests.
- **Exit Code**: 0
- **Warning Observed**:
  ```text
  ▲ [WARNING] "import.meta" is not available with the "cjs" output format and will be empty [empty-import-meta]
      src/services/api.ts:9:10:
        9 │   (typeof import.meta !== 'undefined' && (import.meta as any).env?....
  ```
  Occurs during esbuild bundling of `src/services/api.ts` into CommonJS for the node-based test runner. The code safely falls back to undefined checking at runtime.

### 3.3 Production Build (`npm run build`)
- **Command**: `npm run build` (`tsc -b && vite build`)
- **Output Summary**:
  ```text
  vite v6.4.3 building for production...
  transforming...
  ✓ 1687 modules transformed.
  rendering chunks...
  computing gzip size...
  dist/index.html                   1.23 kB │ gzip:   0.65 kB
  dist/assets/index-t1BAtl0j.css   64.19 kB │ gzip:  11.19 kB
  dist/assets/core-DhEqZVGG.js      2.44 kB │ gzip:   0.98 kB
  dist/assets/index-D2mRAkVb.js   931.49 kB │ gzip: 302.04 kB
  (!) Some chunks are larger than 500 kB after minification.
  ✓ built in 2.40s
  ```
- **Exit Code**: 0

---

## 4. Android Diagnostics (Kotlin / Gradle / Robolectric)

### 4.1 Environmental & Configuration Issues Uncovered
Before tests could execute, three environment defects were identified and diagnosed:
1. **System Java Missing**:
   - Command: `/usr/libexec/java_home` returned:
     `The operation couldn’t be completed. Unable to locate a Java Runtime.`
   - Remediation for test execution: Set `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`.
2. **Broken Symlinks to Unmounted External Drive**:
   - `~/.gradle` -> `/Volumes/issparsh/Android_Dev/.gradle` (Target does not exist).
   - `~/.android` -> `/Volumes/issparsh/Android_Dev/.android` (Target does not exist).
   - Causes `./gradlew` to crash with:
     `RuntimeException: Could not create parent directory for lock file /Users/iamsparsh00321/.gradle/...`
     and AGP plugin initialization crash:
     `An exception occurred applying plugin request [id: 'com.android.application', version: '9.1.1'] > /Users/iamsparsh00321/.android`.
   - Remediation for test execution: Run with `GRADLE_USER_HOME=/tmp/gradle_cache` and `ANDROID_USER_HOME=/tmp/android_home`.
3. **SDK XML Schema Mismatch Warning**:
   - `Warning: SDK processing. This version only understands SDK XML versions up to 3 but an SDK XML file of version 4 was encountered.`

### 4.2 Test Suite Execution (`./gradlew testDebugUnitTest`)
- **Command**:
  ```bash
  ANDROID_USER_HOME=/tmp/android_home GRADLE_USER_HOME=/tmp/gradle_cache JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew testDebugUnitTest
  ```
- **Total Tests Completed**: 54
- **Passed**: 53
- **Failed**: 1
- **Exit Code**: 1

### 4.3 Verbatim Android Test Failure

#### Failure: `test autoDetectGateway safely probes candidate IPs and returns null if unreachable`
- **Class**: `com.ssb.fieldscreening.RepositoryNetworkRobustnessTest`
- **Method**: `test autoDetectGateway safely probes candidate IPs and returns null if unreachable`
- **File**: `android-screening/app/src/test/java/com/ssb/fieldscreening/RepositoryNetworkRobustnessTest.kt`
- **Lines**: 178–182
- **Verbatim Error & Stack Trace**:
```text
RepositoryNetworkRobustnessTest > test autoDetectGateway safely probes candidate IPs and returns null if unreachable FAILED
    java.lang.AssertionError: autoDetectGateway must return null when no hotspot gateways respond expected null, but was:<http://127.0.0.1:8000>
        at org.junit.Assert.fail(Assert.java:89)
        at org.junit.Assert.failNotNull(Assert.java:756)
        at org.junit.Assert.assertNull(Assert.java:738)
        at com.ssb.fieldscreening.RepositoryNetworkRobustnessTest$test autoDetectGateway safely probes candidate IPs and returns null if unreachable$1.invokeSuspend(RepositoryNetworkRobustnessTest.kt:181)
        at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
        at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:100)
        at kotlinx.coroutines.EventLoopImplBase.processNextEvent(EventLoop.common.kt:263)
        at kotlinx.coroutines.BlockingCoroutine.joinBlocking(Builders.kt:94)
        at kotlinx.coroutines.BuildersKt__BuildersKt.runBlocking(Builders.kt:70)
        at kotlinx.coroutines.BuildersKt.runBlocking(Unknown Source)
        at kotlinx.coroutines.BuildersKt__BuildersKt.runBlocking$default(Builders.kt:48)
        at kotlinx.coroutines.BuildersKt.runBlocking$default(Unknown Source)
        at com.ssb.fieldscreening.RepositoryNetworkRobustnessTest.test autoDetectGateway safely probes candidate IPs and returns null if unreachable(RepositoryNetworkRobustnessTest.kt:179)
```

- **Root Cause Analysis**:
  1. **Network Leak in Robolectric Unit Test**: `RepositoryNetworkRobustnessTest` calls `repository.autoDetectGateway()`, which invokes `WifiUtils.discoverGatewayOnSubnet()`.
  2. In `WifiUtils.kt` (lines 311–318), "Tier 0b: USB Cable / ADB Reverse Host" executes an active HTTP ping to `http://127.0.0.1:8000/api/v1/health` using unmocked `OkHttpClient`.
  3. A live uvicorn server (PID 61339) was actively running on the host machine listening on port 8000 (`127.0.0.1:8000`), responding with `200 OK` (`{"status":"healthy", ...}`).
  4. Because the test does not isolate the network or mock `ApiClientFactory`, the live backend on the host intercepted the probe and returned `Pair(true, latency)`.
  5. As a result, `autoDetectGateway()` returned `"http://127.0.0.1:8000"` instead of `null`, failing `assertNull(...)`.

---

## 5. Summary Table of Defect Registry Entries (from Diagnostics)

| Defect ID | Severity | Subsystem & File | Defect Title | Impact | Remediation Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-DIAG-01** | MEDIUM | Backend: `tests/test_challenger_m5_e2e_4tier.py:122` | Companion SQLite Table State Leakage Across Tests | Fails assertion `sequence_id == 1` when run in full test suite. | Provide an autouse pytest fixture that resets the companion table or uses an isolated in-memory DB per test session. |
| **DEF-DIAG-02** | MEDIUM | Backend: `tests/test_challenger_m5_e2e_4tier.py:195` | Non-Zero Base Monotonic Sequence Assumption in Concurrency Test | Fails `assert set(results) == set(range(1, thread_count + 1))` when preceding tests have written records. | Assert monotonic increment and length (`len(set(results)) == thread_count` and contiguous sequence) rather than hardcoded 1..25 range. |
| **DEF-DIAG-03** | HIGH | Android: `RepositoryNetworkRobustnessTest.kt:179` & `WifiUtils.kt:313` | Live Socket Network Leakage in Robolectric Unit Tests | Test fails whenever a local development gateway is running on host port 8000. | Mock `ApiClientFactory` or use `MockWebServer` in `RepositoryNetworkRobustnessTest` to decouple unit tests from host port 8000. |
| **DEF-DIAG-04** | MEDIUM | Android Env: Host `~/.gradle` & `~/.android` symlinks | Broken Symlinks to Unmounted Volume `/Volumes/issparsh` | Gradle and Android Gradle Plugin fail to start unless user home is explicitly redirected. | Repoint symlinks to a valid local path on root disk or document environment variables `GRADLE_USER_HOME` and `ANDROID_USER_HOME`. |
| **DEF-DIAG-05** | LOW | Backend: `app/modules/forensics/ela_engine.py:207,220,238` | Deprecated `Image.Image.getdata()` usage | 37 deprecation warnings during test execution; will break upon upgrade to Pillow 14. | Migrate to `Image.Image.get_flattened_data()` as recommended by Pillow deprecation notice. |

---

## 6. Verification and Integrity Attestation

- **Strict Read-Only Guarantee**: No files inside `sih26188_project/backend`, `sih26188_project/frontend`, or `sih26188_project/android-screening` were altered or modified.
- **Repeatability**:
  - Full backend pytest run reproduced in Task ID `task-30`.
  - Backend isolation verification reproduced in Task ID `task-107` and `task-127`.
  - Android Gradle build and unit tests reproduced in Task ID `task-85` and `task-145`.
  - Frontend typecheck, test suites, and build reproduced directly via shell commands.
