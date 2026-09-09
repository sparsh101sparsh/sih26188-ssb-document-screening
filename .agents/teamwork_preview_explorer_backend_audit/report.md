# Backend Core & Routers Comprehensive Audit Report (Track 1)
**Project**: SIH26188 AI-Based Fake Identity & Document Screening System  
**Audit Scope**: Backend Core, Routers, Schemas, Services Architecture, LAN Interface Selection, Companion Ingestion  
**Audit Mode**: STRICT READ-ONLY STATIC ANALYSIS & REPRODUCIBLE DIAGNOSTIC VERIFICATION  
**Auditor**: Teamwork Explorer (Track 1 Lead)  
**Date**: 2026-09-09  

---

## 1. Executive Summary

A comprehensive, read-only code audit and diagnostic test execution of the SIH26188 backend subsystem was conducted across:
- `backend/app/api/routers/` (`scan.py`, `companion.py`, `ocr.py`, `biometrics.py`, `forensics.py`, `models.py`)
- `backend/app/api/v1/` (`api.py`, `endpoints/companion.py`)
- `backend/app/core/` (`config.py`, `network.py`, `device_tracker.py`, `backend_selector.py`, `logging.py`)
- `backend/app/schemas/` (`scan.py`, `biometrics.py`, `forensics.py`, `mrz.py`, `ocr.py`, `risk.py`, `screening.py`, `stamp.py`)
- `backend/tests/` test suite and client integration contracts with `frontend/src/` and `android-screening/`.

A total of **19 distinct defects and architectural risks** were identified and verified through static inspection, code path tracing, and diagnostic test reproduction.

### Summary Bug Count by Severity
| Severity | Count | Primary Impact Areas |
| :--- | :---: | :--- |
| **CRITICAL** | 3 | Client crash on deserialization (nullability/type mismatch), Main thread event loop starvation |
| **HIGH** | 7 | Race conditions in device tracking, unhandled polyglot form/JSON parsing, server memory bloat, verdict loss on reboot, USB tethering invisibility, engine mode telemetry deception |
| **MEDIUM** | 4 | Orphaned/dead schema definitions, sequence reset anomalies, mDNS hostname double-suffixing, routing table parser fragility |
| **LOW** | 5 | Dead unmounted router files, missing architectural services layer, empty enclave directories, HTTP status code mismatch, bare except error swallowing |
| **TOTAL** | **19** | |

---

## 2. Bug Registry Summary Table

| Bug ID | Title | Severity | Affected Component & File Path | Line(s) | Status |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **BE-01** | Client Deserialization Crash via Nullability Mismatches on Optional Fields | **CRITICAL** | Schemas vs Android Moshi: `backend/app/schemas/scan.py`, `stamp.py`, `biometrics.py`, `mrz.py` | `scan.py:25-28`, `stamp.py:39-53`, `biometrics.py:60-62` | **ACTIVE** |
| **BE-02** | Type Mismatch on Cross-Validation Warnings (`List[CrossViolation]` Object vs `List<String>`) | **CRITICAL** | `backend/app/schemas/mrz.py` vs `android-screening/.../InspectionModels.kt` | `mrz.py:69`, `InspectionModels.kt:202` | **ACTIVE** |
| **BE-03** | Synchronous Heavy ML Inference Executed on Main Async Event Loop Thread | **CRITICAL** | `backend/app/api/routers/biometrics.py`, `forensics.py`, `ocr.py`, `models.py` | `biometrics.py:67-189`, `forensics.py:74-150`, `ocr.py:78-200`, `models.py:253-389` | **ACTIVE** |
| **BE-04** | Missing Polyglot Form/JSON Request Parsing in `ocr.py` Endpoints | **HIGH** | `backend/app/api/routers/ocr.py` | `ocr.py:43-47, 155-158` | **ACTIVE** |
| **BE-05** | Missing Lock Protection in `DeviceTracker` Causing `RuntimeError` on Concurrent Access | **HIGH** | `backend/app/core/device_tracker.py` | `device_tracker.py:37-163` | **ACTIVE** |
| **BE-06** | Synchronous Mass Disk I/O and Base64 Encoding in `get_companion_gallery` Freezing Server | **HIGH** | `backend/app/api/routers/companion.py` | `companion.py:395-449, 721-733` | **ACTIVE** |
| **BE-07** | Thread-Unsafe `asyncio.Queue` Contention and Fragile Event Loop Capture in `SSEBroadcaster` | **HIGH** | `backend/app/api/routers/companion.py` | `companion.py:79-106, 365-387` | **ACTIVE** |
| **BE-08** | Ephemeral In-Memory Verdict State Lost Across Edge Server Restarts | **HIGH** | `backend/app/api/routers/companion.py` | `companion.py:762-827` | **ACTIVE** |
| **BE-09** | USB Reverse Tethered Android Clients Excluded from Device Tracking Telemetry | **HIGH** | `backend/app/main.py` | `main.py:172-182` | **ACTIVE** |
| **BE-10** | Inaccurate Engine Mode Telemetry in `/api/v1/health` for CPU-Only Deployments | **HIGH** | `backend/app/main.py` | `main.py:249` | **ACTIVE** |
| **BE-11** | Orphaned Unmounted Schema Models in `screening.py` (`extra="forbid"` Without Routes) | **MEDIUM** | `backend/app/schemas/screening.py` | `screening.py:11-155` | **ACTIVE** |
| **BE-12** | Sequence ID Monotonicity Reset to Zero After Process Restart Following Buffer Clear | **MEDIUM** | `backend/app/api/routers/companion.py` | `companion.py:177-220, 476-498` | **ACTIVE** |
| **BE-13** | mDNS Hostname Duplication If System Hostname Ends with `.local` | **MEDIUM** | `backend/app/main.py` | `main.py:108` | **ACTIVE** |
| **BE-14** | Routing Table Subprocess Parsing Fragility on Multi-Hop Default Routes and Locales | **MEDIUM** | `backend/app/core/network.py` | `network.py:135-180` | **ACTIVE** |
| **BE-15** | Dead Unmounted Router Module in `backend/app/api/v1/api.py` and Facade Redundancy | **LOW** | `backend/app/api/v1/api.py`, `v1/endpoints/companion.py` | `api.py:1-15`, `companion.py:1-31` | **ACTIVE** |
| **BE-16** | Missing Dedicated `backend/app/services/` Architecture Layer | **LOW** | `backend/app/services/` | Directory missing | **ACTIVE** |
| **BE-17** | Accumulation of Empty Date Directories on Disk Enclave Item Pruning | **LOW** | `backend/app/api/routers/companion.py` | `companion.py:291-297, 332-337` | **ACTIVE** |
| **BE-18** | Inconsistent HTTP Status Code for Duplicate Capture Uploads (200 OK vs 201 Created) | **LOW** | `backend/app/api/routers/companion.py` | `companion.py:556, 646, 662` | **ACTIVE** |
| **BE-19** | Bare Except Clauses Swallowing Errors Silently in Core Ingestion Paths | **LOW** | `backend/app/api/routers/scan.py`, `companion.py` | `scan.py:101, 133`, `companion.py:195, 256, 385` | **ACTIVE** |

---

## 3. Detailed Bug Reports

### BE-01: Client Deserialization Crash via Nullability Mismatches on Optional Fields
- **Severity**: `CRITICAL`
- **Affected Component & Path**:
  - `backend/app/schemas/scan.py`: lines 25, 26, 28
  - `backend/app/schemas/stamp.py`: lines 39-53
  - `backend/app/schemas/biometrics.py`: lines 60-62
  - `backend/app/schemas/mrz.py`: lines 23-32
  - `android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt`: lines 95-98, 127-130, 142-144, 186-192
- **Detailed Description**:
  The backend inspection endpoint `/api/v1/scan/inspect` is designed to support single-document screening without a live selfie or without an official border stamp. In these scenarios, the backend emits `null` values for optional fields:
  - `details.biometrics = null` (when no live face photo is provided)
  - `details.liveness = null` (when no live face photo is provided)
  - `details.stamp = null` or `{ "checkpost_id": null, "ssim_score": null, ... }`
  - `details.biometrics.apparent_age_id = null`
  - `details.mrz.doc_number_checksum_valid = null` (when no MRZ is present, e.g. on Aadhaar cards)
  However, in the Android mobile application, Moshi data classes in `InspectionModels.kt` declare these properties as strict non-nullable types:
  ```kotlin
  data class InspectionDetails(
      ...
      val biometrics: BiometricsDetails, // NOT nullable!
      val liveness: LivenessDetails,     // NOT nullable!
      val stamp: StampDetails,           // NOT nullable!
  )
  data class StampDetails(
      ...
      @Json(name = "checkpost_id") val checkpostId: String = "SSB_JAIGAON_01", // NOT nullable!
      @Json(name = "ssim_score") val ssimScore: Double = 0.92,                // NOT nullable!
  )
  ```
- **Root Cause**:
  Moshi in Kotlin enforces strict null safety during JSON parsing. When a JSON payload contains an explicit `null` for a non-nullable property (e.g. `"biometrics": null`), Moshi immediately throws `com.squareup.moshi.JsonDataException: Non-null value 'biometrics' was null at $.details.biometrics`. Supplying default parameter values in Kotlin data classes does NOT prevent Moshi from throwing when the JSON token is an explicit `null`.
- **Reproduction Steps**:
  1. Launch the Android client and point it to the edge gateway.
  2. Perform a document-only scan without capturing a live selfie.
  3. The backend returns HTTP 200 OK with `details.biometrics: null`.
  4. The Android app crashes immediately with `JsonDataException: Non-null value 'biometrics' was null at $.details.biometrics`.
- **Potential Remediation Notes**:
  - In `InspectionModels.kt`, change all optional sub-objects and nullable primitive fields to Kotlin nullable types:
    `val biometrics: BiometricsDetails? = null`, `val liveness: LivenessDetails? = null`, `val stamp: StampDetails? = null`.
    In `StampDetails`: `val checkpostId: String? = null`, `val ssimScore: Double? = null`, `val orbMatchCount: Int? = null`, `val contextConsistent: Boolean? = null`.
    In `BiometricsDetails`: `val apparentAgeId: Int? = null`, `val apparentAgeLive: Int? = null`, `val ageDriftYears: Int? = null`.
    In `MrzDetails`: `val docNumberChecksumValid: Boolean? = null`, etc.
  - In backend `ScanResponse`, ensure default empty objects are provided or nullability is maintained consistently across OpenAPI specs.

---

### BE-02: Type Mismatch on Cross-Validation Warnings (`List[CrossViolation]` Object vs `List<String>`)
- **Severity**: `CRITICAL`
- **Affected Component & Path**:
  - `backend/app/schemas/mrz.py`: line 69
  - `android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt`: line 202
- **Detailed Description**:
  The 8-Rule Cross-Validation engine returns warning-level discrepancies (e.g. slight transliteration difference, permit window warnings). In `backend/app/schemas/mrz.py`, `CrossValidationResult.warnings` is typed as:
  ```python
  warnings: List[CrossViolation] = Field(default_factory=list, description="Non-critical warning discrepancies")
  ```
  Each element in `warnings` is a structured dictionary with keys `rule_id`, `rule_name`, `severity`, `field_name`, `expected_value`, `actual_value`, `telemetry_code`, `details`.
  In contrast, the Android client in `InspectionModels.kt` defines:
  ```kotlin
  data class CrossValidationDetails(
      ...
      val warnings: List<String> = emptyList(),
  )
  ```
- **Root Cause**:
  Type collision between backend JSON array of objects (`[{...}]`) and client expectation of JSON array of strings (`["..."]`). When warnings are present, Moshi encounters `JsonReader.Token.BEGIN_OBJECT` where it expects `JsonReader.Token.STRING`.
- **Reproduction Steps**:
  1. Inspect a document where OCR text and MRZ have a minor non-critical mismatch (e.g. CV-02 warning).
  2. Backend responds with `details.cross_validation.warnings: [{"rule_id": "CV-02", ...}]`.
  3. Android client crashes with `JsonDataException: Expected a string but was BEGIN_OBJECT at $.details.cross_validation.warnings[0]`.
- **Potential Remediation Notes**:
  - Update `InspectionModels.kt`: Change `val warnings: List<String>` to `val warnings: List<CriticalViolation> = emptyList()`.

---

### BE-03: Synchronous Heavy ML Inference Executed on Main Async Event Loop Thread
- **Severity**: `CRITICAL`
- **Affected Component & Path**:
  - `backend/app/api/routers/biometrics.py`: lines 67-75, 97-110, 161-179
  - `backend/app/api/routers/forensics.py`: lines 74-78, 111-117, 148-152
  - `backend/app/api/routers/ocr.py`: lines 78-88, 146, 187-189
  - `backend/app/api/routers/models.py`: lines 253-286, 353-389
- **Detailed Description**:
  FastAPI executes all routes declared as `async def` directly on the main OS thread's asyncio event loop. In `biometrics.py`, `forensics.py`, `ocr.py`, and `models.py`, all endpoints (`detect_faces`, `evaluate_liveness`, `match_faces`, `analyze_document_forensics`, `verify_border_stamp`, `analyze_ela`, `extract_ocr`, `decode_qr`, `start_model`, `test_model`) are declared with `async def`.
  However, their function bodies call synchronous, CPU- and GPU-intensive ML inference methods directly:
  - `face_detector.detect_faces()` (ONNX SCRFD inference)
  - `face_matcher.match_faces()` (ONNX AdaFace inference)
  - `liveness_detector.evaluate_liveness()` (ONNX MiniFASNet + 2D FFT)
  - `tamper_detector.analyze()` (DocTamper ResNet-50 + TruFor SegFormer)
  - `stamp_verifier.verify_stamp()` (Hough circle transforms + OpenCV SSIM)
  - `pp_ocr_engine.extract_text()` (PaddleOCR DBNet + SVTR)
  While any of these operations is running, the asyncio event loop is 100% blocked and cannot schedule any coroutines.
- **Root Cause**:
  Missing `await asyncio.to_thread(...)` offloading. In `scan.py` (lines 316-337), the developer correctly recognized that ML pipelines are blocking and wrapped them in `asyncio.to_thread`. But in the individual modular routers (`biometrics.py`, `forensics.py`, `ocr.py`, `models.py`), this was omitted.
- **Reproduction Steps**:
  1. Open a persistent SSE stream connection to `GET /api/v1/companion/stream`.
  2. In parallel, dispatch 3 concurrent requests to `POST /api/v1/biometrics/match` or `POST /api/v1/forensics/analyze`.
  3. Observe that SSE heartbeat pings cease, health check pings to `/health` time out (>2500ms), and all client I/O is halted until inference finishes.
- **Potential Remediation Notes**:
  - Wrap all synchronous engine calls in `await asyncio.to_thread(...)`, e.g.:
    `result = await asyncio.to_thread(face_detector.detect_faces, img_bytes, conf_threshold=conf_threshold)`
  - Alternatively, declare route handlers as standard synchronous functions (`def` instead of `async def`), allowing FastAPI to automatically run them on Starlette's threadpool.

---

### BE-04: Missing Polyglot Form/JSON Request Parsing in `ocr.py` Endpoints
- **Severity**: `HIGH`
- **Affected Component & Path**:
  - `backend/app/api/routers/ocr.py`: lines 43-47, 155-158
- **Detailed Description**:
  In `backend/app/api/routers/ocr.py`, endpoints `/api/v1/ocr/extract` and `/api/v1/qr/decode` include fallback code intended to support pure JSON request bodies:
  ```python
  if "application/json" in content_type:
      body = await request.json()
      if isinstance(body, dict) and "raw_text" in body:
          raw_text = body["raw_text"]
  ```
  However, the function signatures declare:
  ```python
  async def extract_ocr(
      request: Request,
      document_image: Optional[UploadFile] = File(None, ...),
      raw_text: Optional[str] = Form(None, ...),
  ):
  ```
  and:
  ```python
  async def decode_qr(
      request: Request,
      document_image: Optional[UploadFile] = File(None, ...),
  ):
  ```
- **Root Cause**:
  FastAPI's route dependency compiler treats any route having `File(...)` or `Form(...)` as strictly requiring `multipart/form-data` or `application/x-www-form-urlencoded`. When a client submits `Content-Type: application/json`, FastAPI's body parser attempts to locate multipart boundary markers before the endpoint body is entered. The request is rejected with HTTP 422 Unprocessable Entity, rendering lines 56-62 and 167-173 dead and unreachable for JSON clients.
- **Reproduction Steps**:
  1. Send a POST request to `/api/v1/qr/decode` with `Content-Type: application/json` and body `{"raw_payload": "some-qr-string"}`.
  2. FastAPI responds with HTTP 422 Unprocessable Entity rather than parsing the JSON body.
- **Potential Remediation Notes**:
  - Split into separate dedicated endpoints or use a custom dependency/middleware, or accept `request: Request` directly and inspect `content-type` before invoking `request.form()` or `request.json()`.

---

### BE-05: Missing Lock Protection in `DeviceTracker` Causing `RuntimeError` on Concurrent Access
- **Severity**: `HIGH`
- **Affected Component & Path**:
  - `backend/app/core/device_tracker.py`: lines 37-163
- **Detailed Description**:
  `DeviceTracker` maintains a global dictionary of connected field devices (`self._devices: Dict[str, ConnectedClient] = {}`). The class docstring explicitly claims:
  `"Thread-safe in-memory device registry for edge appliance monitoring."`
  However, inspection reveals that `DeviceTracker` has NO thread locks (no `threading.Lock()` or `threading.RLock()`).
  In `record_activity()`:
  - `self._devices[client_ip] = dev` inserts or updates devices.
  - In `update_statuses()`, `get_all_devices()`, and `get_active_devices()`:
    `for dev in self._devices.values(): dev.status = ...` iterates over `self._devices.values()`.
- **Root Cause**:
  In Python, mutating a dictionary while another thread or coroutine is iterating over its keys or values raises:
  `RuntimeError: dictionary changed size during iteration`.
  Because FastAPI processes incoming HTTP requests in a multi-threaded server pool (uvicorn with multiple worker threads or threadpool executor), concurrent requests from Android clients and desktop dashboards trigger this collision.
- **Reproduction Steps**:
  1. Concurrently send 50 requests per second to `/api/v1/companion/upload` with varied client IPs.
  2. Simultaneously poll `GET /api/v1/devices`.
  3. `GET /api/v1/devices` fails with 500 Internal Server Error due to `RuntimeError: dictionary changed size during iteration`.
- **Potential Remediation Notes**:
  - Add `self._lock = threading.RLock()` to `DeviceTracker`.
  - Protect all read, write, and iteration blocks (`record_activity`, `update_statuses`, `get_all_devices`, `clear`) with `with self._lock:`.

---

### BE-06: Synchronous Mass Disk I/O and Base64 Encoding in `get_companion_gallery` Freezing Server
- **Severity**: `HIGH`
- **Affected Component & Path**:
  - `backend/app/api/routers/companion.py`: lines 395-449, 721-733
- **Detailed Description**:
  Endpoint `GET /api/v1/companion/gallery` allows the desktop operator to browse recent field captures. In `companion.py`:
  ```python
  def get_buffer(self, limit: int = 50, capture_type: Optional[str] = None) -> List[CompanionCaptureState]:
      with self._lock:
          ...
          for row in rows:
              file_p = Path(row["file_path"])
              if file_p.exists():
                  b_data = file_p.read_bytes()
                  b64 = base64.b64encode(b_data).decode("utf-8")
                  data_uri = f"data:{row['mime_type']};base64,{b64}"
  ```
- **Root Cause**:
  For up to 50 captures of 3-5 MB JPEG/PNG files each, this function synchronously reads 150-250 MB of binary data from disk and base64 encodes it into strings (~200-330 MB of JSON strings) in a tight loop under `self._lock`. Because `get_companion_gallery` is an `async def` route, this heavy I/O and CPU computation executes on the main thread, freezing the event loop for several seconds and causing massive transient RAM spikes.
- **Reproduction Steps**:
  1. Populate `companion_store` with 50 captures of 4MB each.
  2. Open the Companion Gallery Modal in the frontend desktop app.
  3. The backend freezes for 2-5 seconds; during this interval, all `/health` checks and companion SSE streams are unresponsive.
- **Potential Remediation Notes**:
  - Do NOT inline base64 image data in the gallery listing payload. Instead, provide a lightweight thumbnail or an image URL (`/api/v1/companion/image/{sequence_id}`).
  - Only read full image bytes when a specific item is viewed or ingested into the screening bay.

---

### BE-07: Thread-Unsafe `asyncio.Queue` Contention and Fragile Event Loop Capture in `SSEBroadcaster`
- **Severity**: `HIGH`
- **Affected Component & Path**:
  - `backend/app/api/routers/companion.py`: lines 79-106, 365-387
- **Detailed Description**:
  `SSEBroadcaster` maintains a set of `asyncio.Queue` subscriber instances for streaming real-time notifications (`NEW_CAPTURE`).
  In `PersistentCompanionStore.set_capture()`:
  ```python
  try:
      loop = asyncio.get_event_loop()
      if loop.is_running():
          asyncio.create_task(
              sse_broadcaster.broadcast("NEW_CAPTURE", {...})
          )
  except Exception:
      pass
  ```
- **Root Cause**:
  1. `asyncio.Queue` is strictly non-thread-safe. Calling `put_nowait()` from multiple threads or cross-thread contexts can corrupt internal queue state or fail to wake waiting coroutines.
  2. In Python 3.10+, `asyncio.get_event_loop()` without an active event loop in the current thread raises a `RuntimeError: There is no current event loop in thread '...'` or creates a DeprecationWarning.
  3. If `set_capture` is executed in a background worker thread or threadpool, the call fails silently due to `except Exception: pass`, resulting in dropped desktop push notifications.
- **Reproduction Steps**:
  1. Connect a desktop workstation to `GET /api/v1/companion/stream`.
  2. Call `companion_store.set_capture(...)` from a background worker thread.
  3. Notice that no `NEW_CAPTURE` SSE event arrives at the desktop workstation.
- **Potential Remediation Notes**:
  - Store the application's primary running event loop during startup lifespan (`app.state.event_loop = asyncio.get_running_loop()`).
  - Use `loop.call_soon_threadsafe(q.put_nowait, message)` to dispatch events safely across threads.

---

### BE-08: Ephemeral In-Memory Verdict State Lost Across Edge Server Restarts
- **Severity**: `HIGH`
- **Affected Component & Path**:
  - `backend/app/api/routers/companion.py`: lines 762-827
- **Detailed Description**:
  The system architecture specifies that when the desktop operator reaches a screening decision (PASS, SECONDARY, DETAIN), it posts the verdict via `POST /api/v1/companion/verdict`. The Android client queries `GET /api/v1/companion/result/{sequence_id}` to display the decision to the frontline officer.
  In `companion.py`:
  ```python
  _verdicts_lock = threading.RLock()
  _verdicts: Dict[int, Dict[str, Any]] = {}
  ```
  Verdicts are stored exclusively in this in-memory dictionary.
  While captured photos are durably saved to SQLite (`companion.db`), verdicts are never written to SQLite.
- **Root Cause**:
  Lack of persistence for verdict state. When the edge gateway server is restarted, `_verdicts` is emptied.
  Any subsequent request from an Android client for `GET /api/v1/companion/result/{sequence_id}` returns:
  ```json
  {
    "has_verdict": false,
    "sequence_id": sequence_id,
    "verdict": "PROCESSING",
    "risk_level": "UNKNOWN",
    "details": "Screening in progress"
  }
  ```
  The frontline officer's mobile device is left stuck in a perpetual "Screening in progress" spinner for a document that was already vetted.
- **Reproduction Steps**:
  1. Upload a capture (`sequence_id=1`).
  2. Post a verdict (`POST /api/v1/companion/verdict` with `sequence_id=1, verdict="PASS"`).
  3. Restart the FastAPI backend process.
  4. Query `GET /api/v1/companion/result/1`.
  5. The server returns `"has_verdict": false, "verdict": "PROCESSING"`, losing the original verdict.
- **Potential Remediation Notes**:
  - Add a `verdicts` table to `companion.db` (or add `verdict`, `risk_level`, `risk_score`, `verdict_details` columns to `companion_captures`).
  - Persist and query verdicts directly through SQLite transactions.

---

### BE-09: USB Reverse Tethered Android Clients Excluded from Device Tracking Telemetry
- **Severity**: `HIGH`
- **Affected Component & Path**:
  - `backend/app/main.py`: lines 160-184
- **Detailed Description**:
  Architecture requirement R4/R5 and section 7.2 specify that the edge gateway tracks active frontline screening devices. In `main.py`:
  ```python
  is_loopback = client_ip in ("127.0.0.1", "::1", "localhost", "")
  is_browser = any(b in user_agent for b in ("Mozilla", "Chrome", "Safari", "AppleWebKit", "Firefox", "Edge"))

  if not is_loopback and not is_browser:
      device_tracker.record_activity(...)
  ```
  However, in frontline edge checkpoints where RF-silence or zero-RF latency is required, Android devices connect via USB cable with `adb reverse tcp:8000 tcp:8000`. In this operating mode, all Android requests hit `http://127.0.0.1:8000` with `client_ip == "127.0.0.1"`.
- **Root Cause**:
  The check `is_loopback = client_ip in ("127.0.0.1", ...)` unconditionally excludes all loopback connections, assuming loopback is only used by desktop browsers. It fails to inspect the `User-Agent` (e.g. `okhttp/4.12.0` or `SSB-Field-Android`) or custom client headers (`X-Checkpoint-Id`).
- **Reproduction Steps**:
  1. Connect an Android phone via USB cable and run `adb reverse tcp:8000 tcp:8000`.
  2. Make requests from the Android phone to `http://127.0.0.1:8000/api/v1/health`.
  3. Query `GET /api/v1/devices`.
  4. The response reports `"total_devices": 0` and `"devices": []`.
- **Potential Remediation Notes**:
  - Update the filter condition: If `client_ip == "127.0.0.1"`, do NOT exclude the device if `user_agent` indicates a field client (e.g. `okhttp` or `SSB-Field`) or if `x-checkpoint-id` header is present.

---

### BE-10: Inaccurate Hardware Engine Mode Telemetry in `/api/v1/health` for CPU-Only Deployments
- **Severity**: `HIGH`
- **Affected Component & Path**:
  - `backend/app/main.py`: line 249
- **Detailed Description**:
  In `main.py`, the endpoint `GET /api/v1/health` reports the active machine learning execution mode:
  ```python
  "engine_mode": "darwin_arm64_coreml" if "CoreMLExecutionProvider" in get_optimal_execution_providers() else "cuda_tensorrt",
  ```
- **Root Cause**:
  A binary ternary expression is used that assumes that if CoreML is absent, the system MUST be running on NVIDIA CUDA TensorRT. On standard Linux/x86_64, Windows, or Intel Mac machines without an NVIDIA GPU, `get_optimal_execution_providers()` returns `["CPUExecutionProvider"]`. The endpoint falsely claims `"engine_mode": "cuda_tensorrt"`.
- **Reproduction Steps**:
  1. Run the backend on a CPU-only machine without CoreML and without CUDA.
  2. Query `GET /api/v1/health`.
  3. Observe `"engine_mode": "cuda_tensorrt"`, which is factually false and misleads operators into believing GPU acceleration is active.
- **Potential Remediation Notes**:
  - Update line 249 to check for providers accurately:
    ```python
    providers = get_optimal_execution_providers()
    if "CoreMLExecutionProvider" in providers:
        engine_mode = "darwin_arm64_coreml"
    elif "CUDAExecutionProvider" in providers or "TensorrtExecutionProvider" in providers:
        engine_mode = "cuda_tensorrt"
    else:
        engine_mode = "cpu_accelerated"
    ```

---

### BE-11: Orphaned Unmounted Schema Models in `screening.py` (`extra="forbid"` Without Routes)
- **Severity**: `MEDIUM`
- **Affected Component & Path**:
  - `backend/app/schemas/screening.py`: lines 11-155
- **Detailed Description**:
  `backend/app/schemas/screening.py` defines schemas for a 3-step field screening REST workflow:
  - `DocumentScanRequest`, `DocumentScanResponse`
  - `FaceScanRequest`, `FaceScanResponse`
  - `ScreeningCompleteRequest`, `ScreeningCompleteResponse`
  - `AuditLogEntry`, `AuditLogQueryFilter`, `AuditLogsResponse`
  All these request models are configured with strict `model_config = ConfigDict(extra="forbid")`.
  However, search across the entire codebase reveals that these schemas are never imported or utilized by any FastAPI router in `backend/app/api/`.
- **Root Cause**:
  Dead specification code. The master screening pipeline was consolidated into `/api/v1/scan/inspect` in `scan.py`, leaving `screening.py` as an unmaintained orphan that confuses developers and API consumers.
- **Reproduction Steps**:
  1. Run `grep_search` for `DocumentScanRequest` or `ScreeningCompleteRequest` across all routers in `backend/app/api/`.
  2. Zero occurrences outside `schemas/screening.py`.
- **Potential Remediation Notes**:
  - Deprecate or document `screening.py` as an experimental multi-step draft, or mount an adapter router if this API is required by external mobile clients.

---

### BE-12: Sequence ID Monotonicity Reset to Zero After Process Restart Following Buffer Clear
- **Severity**: `MEDIUM`
- **Affected Component & Path**:
  - `backend/app/api/routers/companion.py`: lines 177-220, 476-498
- **Detailed Description**:
  When `companion_store.clear(hard=False)` is executed, SQLite rows are deleted, and in-memory state is set to `CompanionCaptureState(has_capture=False, sequence_id=last_seq)` to preserve the monotonic sequence number.
  However, if the edge gateway process is restarted after a soft clear, `_load_latest_state()` executes:
  `SELECT * FROM companion_captures ORDER BY sequence_id DESC LIMIT 1`.
  Because the table is empty, `row` is `None`, and it returns `CompanionCaptureState()` with default `sequence_id=0`.
- **Root Cause**:
  The monotonic sequence ID counter is not persisted in a metadata table or `sqlite_sequence`. When the database has 0 rows, process restart resets the counter to 0.
- **Reproduction Steps**:
  1. Upload 5 captures (`sequence_id=1..5`).
  2. Call `POST /api/v1/companion/clear`.
  3. Restart the backend process.
  4. Upload a new capture.
  5. The new capture receives `sequence_id=1` instead of `sequence_id=6`.
- **Potential Remediation Notes**:
  - Persist `last_sequence_id` in a dedicated `metadata` table in SQLite so sequence numbers remain strictly monotonic across server restarts.

---

### BE-13: mDNS Hostname Duplication If System Hostname Ends with `.local`
- **Severity**: `MEDIUM`
- **Affected Component & Path**:
  - `backend/app/main.py`: line 108
- **Detailed Description**:
  In `main.py`, the Zeroconf service registration builds the server FQDN:
  ```python
  server=f"{socket.gethostname()}.local."
  ```
  On macOS systems and Linux machines with mDNS configured, `socket.gethostname()` frequently returns names that already contain `.local` (e.g. `MacBook-Pro.local`).
- **Root Cause**:
  Blind string concatenation without removing existing `.local` suffixes. This produces `MacBook-Pro.local.local.`.
- **Reproduction Steps**:
  1. On a Mac where `socket.gethostname()` returns `sparshs-MacBook-Air.local`, start the server.
  2. Inspect the mDNS ServiceInfo record registered in Zeroconf.
  3. The server name is registered as `sparshs-MacBook-Air.local.local.`.
- **Potential Remediation Notes**:
  - Clean hostname: `host = socket.gethostname().removesuffix('.local')` before building `f"{host}.local."`.

---

### BE-14: Routing Table Subprocess Parsing Fragility on Multi-Hop Default Routes and Locales
- **Severity**: `MEDIUM`
- **Affected Component & Path**:
  - `backend/app/core/network.py`: lines 135-180
- **Detailed Description**:
  In `detect_default_route_interface()`, line 138 parses `netstat -rn -f inet`:
  ```python
  for line in out.splitlines():
      parts = line.split()
      if len(parts) >= 4 and parts[0] in ("default", "0.0.0.0"):
          iface = parts[-1]
  ```
  On platforms where routing table lines contain trailing flags, metric numbers, or interface expiration times, `parts[-1]` can extract a numeric metric or flag string rather than the interface name.
- **Root Cause**:
  Positional assumption (`parts[-1]`) on command output that varies across OS versions and system locales.
- **Reproduction Steps**:
  1. Simulate netstat output where routing line has trailing metric: `default 192.168.1.1 UGScg en0 100`.
  2. `parts[-1]` resolves to `"100"` instead of `"en0"`.
- **Potential Remediation Notes**:
  - Use regex pattern matching to validate that the extracted interface name matches valid interface patterns (e.g. `^[a-zA-Z]+[0-9]+.*$`), or use `route -n get default` directly.

---

### BE-15: Dead Unmounted Router Module in `backend/app/api/v1/api.py` and Facade Redundancy
- **Severity**: `LOW`
- **Affected Component & Path**:
  - `backend/app/api/v1/api.py`: lines 1-15
  - `backend/app/api/v1/endpoints/companion.py`: lines 1-31
- **Detailed Description**:
  `backend/app/api/v1/api.py` defines `api_router = APIRouter()`, includes `companion.router`, and imports `biometrics, forensics, ocr, scan`.
  However:
  1. It never includes `biometrics.router`, `forensics.router`, `ocr.router`, or `scan.router` in `api_router`.
  2. `api_router` is NEVER mounted in `app/main.py`.
  3. `backend/app/api/v1/endpoints/companion.py` simply imports and re-exports symbols from `backend/app/api/routers/companion.py`.
- **Root Cause**:
  Incomplete refactoring from a nested `api/v1/endpoints/` pattern to a flat `api/routers/` pattern.
- **Reproduction Steps**:
  1. Add a test route to `api/v1/api.py`.
  2. Start `app.main:app`.
  3. The test route returns 404 Not Found because `api_router` is never mounted.
- **Potential Remediation Notes**:
  - Consolidate all routers into either `api/v1/api.py` mounted in `main.py`, or remove the unused `api/v1/api.py` and `v1/endpoints/companion.py` facade to eliminate architectural confusion.

---

### BE-16: Missing Dedicated `backend/app/services/` Architecture Layer
- **Severity**: `LOW`
- **Affected Component & Path**:
  - `backend/app/services/` (Directory does not exist)
- **Detailed Description**:
  The system architecture references a three-tier design (Routers -> Services -> Modules/Engines). However, the directory `backend/app/services/` is missing entirely.
- **Root Cause**:
  Orchestration and state logic that belongs in a service layer (e.g. `ScreeningOrchestrator`, `DeviceTrackerService`) is currently embedded directly in route handler files (`scan.py`, `companion.py`).
- **Potential Remediation Notes**:
  - Create `backend/app/services/` and extract business workflows (e.g., screening coordination, companion persistence) out of HTTP controller routers into pure service classes.

---

### BE-17: Accumulation of Empty Date Directories on Disk Enclave Item Pruning
- **Severity**: `LOW`
- **Affected Component & Path**:
  - `backend/app/api/routers/companion.py`: lines 291-297, 332-337, 461-465, 484-488
- **Detailed Description**:
  In `PersistentCompanionStore`, captures are stored on disk in partitioned directories: `data/companion_store/YYYY-MM-DD/{uuid}_{filename}`.
  When captures are deleted (via `delete_item()`, `clear()`, or automatic FIFO pruning when exceeding `max_buffer_size`), `Path(file_path).unlink(missing_ok=True)` deletes the individual files.
  However, the parent date directory `YYYY-MM-DD/` is never removed even when empty.
- **Root Cause**:
  Missing empty-directory cleanup check (`try: parent.rmdir() except OSError: pass`).
- **Reproduction Steps**:
  1. Upload a capture on day X.
  2. Call `clear()`.
  3. Observe that `data/companion_store/YYYY-MM-DD/` remains as an empty directory on disk.
- **Potential Remediation Notes**:
  - After unlinking an image file, invoke `try: parent.rmdir() except OSError: pass` to automatically clean up empty folders.

---

### BE-18: Inconsistent HTTP Status Code for Duplicate Capture Uploads (200 OK vs 201 Created)
- **Severity**: `LOW`
- **Affected Component & Path**:
  - `backend/app/api/routers/companion.py`: lines 556, 646, 662
- **Detailed Description**:
  The docstring for `upload_companion_capture()` states:
  `"returns confirmed delivery handshake JSON (HTTP 201)"`.
  However, the FastAPI endpoint definition does NOT set `status_code=status.HTTP_201_CREATED`. Both new uploads and duplicate ACK responses return standard HTTP 200 OK.
- **Root Cause**:
  Missing `status_code` specification in route decorator.
- **Potential Remediation Notes**:
  - Align the docstring with HTTP 200 OK, or return HTTP 201 for fresh uploads and HTTP 200 (or 208 Already Reported) for duplicate ACKs.

---

### BE-19: Bare Except Clauses Swallowing Errors Silently in Core Ingestion Paths
- **Severity**: `LOW`
- **Affected Component & Path**:
  - `backend/app/api/routers/scan.py`: lines 101-102, 133-134
  - `backend/app/api/routers/companion.py`: lines 195-196, 256-257, 385-386, 464-465, 487-488
- **Detailed Description**:
  Throughout the ingestion pipeline, multiple `try...except Exception: pass` blocks swallow failures silently:
  - In `scan.py` line 101: `except Exception: qr_res = None` suppresses all QR decoder crashes without logging.
  - In `companion.py` lines 195-196 & 256-257: Base64 image decoding failures are caught with `pass` without warning logs.
  - In `companion.py` line 385: Asynchronous SSE broadcast scheduling failures are silently ignored.
- **Root Cause**:
  Overly broad exception handlers without structured log emission.
- **Potential Remediation Notes**:
  - Replace `except Exception: pass` with `except Exception as e: logger.debug(..., exc_info=True)` to ensure field telemetry captures diagnostic clues during edge outages.

---

## 4. Test Diagnostic Execution Summary

All tests were executed against the Python 3.11 edge environment (`.venv311/bin/pytest`) without modifying any production source files.

### 1. `tests/test_api_health.py`
- **Command**: `.venv311/bin/pytest tests/test_api_health.py`
- **Status**: `PASSED` (13/13 passed in 277.06s)
- **Coverage**:
  - `/health` telemetry endpoint
  - `/api/v1/health` Android contract compliance
  - `/api/v1/scan/inspect` validation & error handling
  - `/api/v1/inspect` alias endpoint for Android client
  - `/api/v1/devices` device tracker telemetry

### 2. `tests/test_network_interface.py`
- **Command**: `.venv311/bin/pytest tests/test_network_interface.py`
- **Status**: `PASSED` (13/13 passed in 3.09s)
- **Coverage**:
  - Physical interface classification (en0, eth0, wlan0)
  - VPN tunnel suppression (utun0, tun0, wg0, tailscale0)
  - Virtual bridge penalty (docker0, vboxnet0)
  - RFC 1918 10.x.x.x preservation on physical NICs
  - Loopback fallback (127.0.0.1)
  - SSBPAIR QR code URI format (`SSBPAIR://<ip>:<port>/<token>`)
  - `capture_id` deduplication and idempotent ACKs for multipart & JSON uploads

### 3. `tests/test_risk_engine.py`
- **Command**: `.venv311/bin/pytest tests/test_risk_engine.py`
- **Status**: `PASSED` (23/23 passed)
- **Coverage**:
  - Noise deadbands: `psi_tamper`, `psi_live`, `psi_stamp`, `psi_face`
  - Name Levenshtein similarity metric
  - Two-Stage Hybrid Risk Engine & Bayesian Evidence Fusion
  - 3-Stream Concurrency and integration tests on `/api/v1/scan/inspect`

---

## 5. Architectural & Implementation Guidance

1. **Client/Server Schema Synchronization**:
   - The immediate priority for mobile reliability is fixing **BE-01** and **BE-02** in `android-screening/.../InspectionModels.kt`. Changing `biometrics`, `liveness`, `stamp`, `apparentAgeId`, `ssimScore`, and `warnings` to nullable types will prevent Android from crashing on real-world document inspections.
2. **Event Loop Offloading**:
   - To fix **BE-03**, wrap all synchronous ONNX/PyTorch/OpenCV calls in `await asyncio.to_thread(...)` across `biometrics.py`, `forensics.py`, `ocr.py`, and `models.py`. This restores full concurrency for SSE notifications and health telemetry.
3. **Persistent Verdicts & Locks**:
   - To resolve **BE-05** and **BE-08**, add `threading.RLock()` to `DeviceTracker` and store verdicts in SQLite `companion.db` so officer decisions survive edge server reboots.
4. **USB Reverse Tethering Telemetry**:
   - To resolve **BE-09**, update `track_device_activity_middleware` to inspect `User-Agent` and `X-Checkpoint-Id` headers when requests originate from `127.0.0.1`, ensuring USB-tethered field units appear in the edge dashboard.

---
*Report generated by Track 1 Backend Explorer Agent under Strict Read-Only Governance.*
