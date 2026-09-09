# Handoff Report: Track 1 Backend Core & Routers Audit

**Milestone**: Track 1: Backend Core & Routers Audit  
**Auditor**: Teamwork Explorer Subagent  
**Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_backend_audit`  
**Consolidated Audit Report**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_backend_audit/report.md`  
**Date**: 2026-09-09  

---

## 1. Observation

1. **Schema & Client Nullability / Type Collisions**:
   - In `backend/app/schemas/scan.py` lines 25-28, `biometrics: Optional[FaceMatchResult] = None`, `liveness: Optional[LivenessResult] = None`, and `stamp: Optional[StampResult] = None`.
   - In `backend/app/schemas/stamp.py` lines 39-53, `checkpost_id: Optional[str] = None`, `location_name: Optional[str] = None`, `ssim_score: Optional[float] = None`, etc.
   - In `backend/app/schemas/biometrics.py` lines 60-62, `apparent_age_id: Optional[int] = None`.
   - In `backend/app/schemas/mrz.py` line 69, `warnings: List[CrossViolation] = Field(default_factory=list)`.
   - In `android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt`:
     - Line 95: `val biometrics: BiometricsDetails,` (non-nullable).
     - Line 96: `val liveness: LivenessDetails,` (non-nullable).
     - Line 98: `val stamp: StampDetails,` (non-nullable).
     - Lines 142-144: `@Json(name = "apparent_age_id") val apparentAgeId: Int = 30` (non-nullable primitive Int).
     - Line 186: `@Json(name = "checkpost_id") val checkpostId: String = "SSB_JAIGAON_01"` (non-nullable String).
     - Line 188: `@Json(name = "ssim_score") val ssimScore: Double = 0.92` (non-nullable Double).
     - Line 202: `val warnings: List<String> = emptyList(),` (typed as `List<String>` instead of `List<CriticalViolation>`).

2. **Async Event Loop Starvation by Synchronous ML Inference**:
   - In `backend/app/api/routers/biometrics.py` lines 48-189: `detect_faces`, `evaluate_liveness`, and `match_faces` are declared as `async def` but run synchronous ONNX SCRFD, AdaFace, and MiniFASNet models directly on the event loop thread without `asyncio.to_thread`.
   - In `backend/app/api/routers/forensics.py` lines 38-154: `analyze_document_forensics`, `verify_border_stamp`, and `analyze_ela` are `async def` but invoke DocTamper DTD, TruFor, Hough circle transforms, and Pillow/OpenCV image processing directly on the event loop thread.
   - In `backend/app/api/routers/ocr.py` lines 43-204: `extract_ocr` and `decode_qr` run PaddleOCR and RSA-2048 PKI signature checks directly on the event loop thread.

3. **Concurrency & Thread-Safety in In-Memory Stores**:
   - In `backend/app/core/device_tracker.py` line 38: Docstring claims `"Thread-safe in-memory device registry"`, but lines 42-163 contain NO locks. `self._devices` is mutated in `record_activity` while `update_statuses()`, `get_all_devices()`, and `get_active_devices()` iterate over `self._devices.values()`.
   - In `backend/app/api/routers/companion.py` lines 79-106 and 365-387: `SSEBroadcaster` uses `asyncio.Queue` (which is non-thread-safe), and `set_capture` captures `asyncio.get_event_loop()` which fails with `RuntimeError` if called from a worker thread.

4. **Session Lifecycle & State Persistence Flaws**:
   - In `backend/app/api/routers/companion.py` lines 762-827: `_verdicts: Dict[int, Dict[str, Any]] = {}` stores verdicts exclusively in memory. After an edge server reboot, captures in SQLite persist, but all verdicts are wiped, leaving Android clients polling `/api/v1/companion/result/{sequence_id}` in a perpetual "PROCESSING" state.
   - In `backend/app/api/routers/companion.py` lines 395-449: `get_buffer()` synchronously loads up to 50 raw images from disk and base64-encodes 150-250MB into JSON strings under a lock on the main thread whenever `/gallery` is called.

5. **LAN Interface, USB Reverse Tethering & mDNS Anomalies**:
   - In `backend/app/main.py` lines 172-175: Middleware unconditionally excludes loopback connections (`is_loopback = client_ip in ("127.0.0.1", "::1", "localhost", "")`). Android clients connected via USB reverse tethering (`adb reverse tcp:8000 tcp:8000`) communicate via `127.0.0.1` and are never recorded in `device_tracker`.
   - In `backend/app/main.py` line 249: `"engine_mode": "darwin_arm64_coreml" if "CoreMLExecutionProvider" in get_optimal_execution_providers() else "cuda_tensorrt"`. On CPU-only environments without CoreML or CUDA, it falsely outputs `"cuda_tensorrt"`.
   - In `backend/app/main.py` line 108: `server=f"{socket.gethostname()}.local."` registers duplicate `.local.local.` suffixes when `socket.gethostname()` already includes `.local`.

6. **Diagnostic Test Execution Verifications (Verbatim Outputs)**:
   - `backend/.venv311/bin/pytest tests/test_api_health.py`: 13 passed in 277.06s.
   - `backend/.venv311/bin/pytest tests/test_network_interface.py`: 13 passed in 3.09s.
   - `backend/.venv311/bin/pytest tests/test_risk_engine.py`: 23 passed in 107.00s.
   - All tests executed strictly read-only without modifying production source code.

---

## 2. Logic Chain

1. **Step 1 (Client Crash)**: Observation 1 confirms that backend Pydantic models serialize optional fields as JSON `null`. Kotlin Moshi reflection deserializers in `InspectionModels.kt` enforce non-nullable types. When a document-only scan or a document without a stamp is returned, Moshi encounters `null` where a non-nullable type is expected, raising `JsonDataException` and causing the mobile app to crash. Furthermore, when cross-validation warnings are emitted as objects (`CrossViolation`), Moshi expects a list of strings (`List<String>`), raising `Expected a string but was BEGIN_OBJECT`.
2. **Step 2 (Event Loop Starvation)**: Observation 2 shows that route handlers in `biometrics.py`, `forensics.py`, `ocr.py`, and `models.py` are declared as `async def` and execute synchronous ML inference. In Python's asyncio model, running blocking CPU-bound tasks inside `async def` functions blocks the OS thread executing the event loop. During this time, no other I/O coroutines can execute, directly causing SSE push ping drops, health check timeouts, and unresponsiveness.
3. **Step 3 (Concurrent Server Crashes)**: Observation 3 shows that `DeviceTracker` lacks locking mechanisms. In Python, modifying a dictionary while iterating over its values (`for dev in self._devices.values():`) raises `RuntimeError: dictionary changed size during iteration`. Under multi-device field traffic, concurrent requests hitting the tracking middleware and dashboard simultaneously trigger this crash, resulting in HTTP 500 responses.
4. **Step 4 (Verdict Disappearance on Restart)**: Observation 4 demonstrates that verdicts posted by desktop operators are never saved to SQLite, living only in volatile memory `_verdicts`. When an edge gateway process restarts (e.g. following DHCP network change, crash, or reboot), all past verdict associations are lost, permanently desynchronizing the frontline Android units from the central desktop bay.
5. **Step 5 (USB Tethering Invisibility)**: Observation 5 shows that middleware hardcodes an exclusion for `127.0.0.1`. When frontline field officers operate in RF-silent or zero-latency USB tethered mode (`adb reverse`), requests arrive from `127.0.0.1`. The device tracker discards them, causing the operator dashboard to falsely display 0 connected devices.

---

## 3. Caveats

- The audit strictly adhered to read-only static analysis and test suite execution. No production code files were altered.
- Performance timings for test executions reflect Apple Silicon hardware running on CPU/CoreML execution providers.
- Android UI composables were reviewed strictly in relation to the backend data models and serialization contracts.

---

## 4. Conclusion

The Backend Core and Routers sub-system contains robust algorithmic and risk scoring engines, and its automated test suites (`test_network_interface.py`, `test_risk_engine.py`, `test_api_health.py`) pass 100% in isolation. However, critical runtime integration defects exist:
1. **BE-01 & BE-02 (CRITICAL)**: Android client will crash when screening real-world documents without live selfies or with cross-validation warnings due to Moshi nullability and type mismatches.
2. **BE-03 (CRITICAL)**: Async event loop is starved by synchronous ONNX/OpenCV operations in `biometrics.py`, `forensics.py`, and `ocr.py`.
3. **BE-05 & BE-07 (HIGH)**: Concurrency race conditions in `DeviceTracker` and `SSEBroadcaster`.
4. **BE-08 & BE-09 (HIGH)**: State loss of screening verdicts across server reboots, and invisibility of USB-tethered Android units.

All 19 cataloged bugs are documented with exact file paths, line numbers, root cause analyses, reproduction scenarios, and remediation blueprints in `report.md`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Test Health**:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend
   .venv311/bin/pytest tests/test_network_interface.py
   .venv311/bin/pytest tests/test_risk_engine.py
   .venv311/bin/pytest tests/test_api_health.py
   ```

2. **Inspect Identified Bug Locations**:
   - `backend/app/schemas/scan.py:25-28` vs `android-screening/.../InspectionModels.kt:95-98, 186-192` (BE-01)
   - `backend/app/schemas/mrz.py:69` vs `android-screening/.../InspectionModels.kt:202` (BE-02)
   - `backend/app/api/routers/biometrics.py:67-189`, `forensics.py:74-150` (BE-03)
   - `backend/app/api/routers/ocr.py:43-47, 155-158` (BE-04)
   - `backend/app/core/device_tracker.py:37-163` (BE-05)
   - `backend/app/api/routers/companion.py:395-449` (BE-06)
   - `backend/app/api/routers/companion.py:762-827` (BE-08)
   - `backend/app/main.py:172-182` (BE-09)
   - `backend/app/main.py:249` (BE-10)

3. **Invalidation Conditions**:
   - If `InspectionModels.kt` is updated with nullable fields (`BiometricsDetails?`, `StampDetails?`, `CriticalViolation`) and deserializes null values without `JsonDataException`, BE-01 and BE-02 are invalidated.
   - If blocking ML calls in `biometrics.py` and `forensics.py` are wrapped in `asyncio.to_thread` or converted to synchronous `def`, BE-03 is invalidated.
   - If `threading.RLock()` is added to `DeviceTracker`, BE-05 is invalidated.
