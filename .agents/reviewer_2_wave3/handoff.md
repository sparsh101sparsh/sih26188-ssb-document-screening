# Handoff Report: Technical Rigor & Code Contract Review (SIH26188 Wave 3)

**Reviewer**: Reviewer 2 (Technical Rigor & Code Contract Reviewer / Adversarial Critic)  
**Date**: 2026-08-23T02:05:00+05:30  
**Target Project**: `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/`  
**Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

Direct observations from examining all 6 deliverables in `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/`:

1. **Missing ONNX Export Script & Dynamic Axes Specification**:
   - In `UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md` (lines 541–582), the section is titled:
     `### 3.5 Exact ONNX Export & Dynamic Execution Provider Scripts [NEW]`
   - The body contains ONLY `backend/app/core/backend_selector.py` with `get_optimal_execution_providers()` and `get_torch_device()`.
   - No `torch.onnx.export` call, no `opset_version=18`, and no `dynamic_axes` definitions (e.g. for variable batch/height/width in PP-OCRv4, AdaFace, or DocTamper) are provided anywhere in the deliverable.

2. **Dummy Implementation & Unused Parameters in Stamp Verifier**:
   - In `docs/04_STAMP_AUTHENTICATION_MODULE.md` (lines 115–150):
     ```python
     def verify_stamp(
         self,
         image: np.ndarray,
         checkpost_id: str,
         tamper_map: np.ndarray,
         ocr_date: str,
         permit_window: tuple[str, str],
     ) -> dict:
         ...
         # Context validation
         context_mismatch = 0.0  # Assumes matched date within permit window
     ```
   - Parameters `ocr_date` and `permit_window` are formally declared in the signature but ignored, with `context_mismatch` hardcoded to `0.0`.
   - In `extract_stamp_regions` (lines 77–79), only purple ink is masked (`lower_purple = np.array([115, 40, 40])`, `upper_purple = np.array([155, 255, 255])`). Red ink (`H: 0-10, 170-180`) and black ink specified in the registry for `SONAULI_SSB_TRANSIT_V1` are unhandled, causing contour extraction to fail for non-purple stamps.
   - In `match_template` (lines 106–113), the crop is resized to the template size via `cv2.resize` without keypoint feature matching or homography alignment, causing SSIM to collapse on unaligned or rotated impressions.

3. **Tauri 2.0 Lifecycle, IPC, and Facade Claims**:
   - In `docs/03_DESKTOP_APP_ARCHITECTURE.md`:
     - Line 25 claims: `Automatic Port Scanning & Dynamic Port Allocation` and `Clean Process Teardown (SIGTERM -> Wait 1.5s -> SIGKILL)`.
     - Lines 78–82 hardcode `.env("PORT", "8000")` and polling at `http://127.0.0.1:8000/api/v1/health` with zero dynamic port scanning.
     - Lines 78–83 spawn `(mut rx, mut child)`, but `child` is not stored in Tauri state (`app.manage(...)`) and is dropped at the end of setup.
     - Lines 141–146 (`RunEvent::ExitRequested`) perform only `log::info!` with no signal dispatch (`SIGTERM`/`SIGKILL`) or `child.kill()`, leaving the backend as an orphaned zombie process locking port 8000.
     - Line 61 omits `use tauri::Emitter;` while line 126 calls `app_handle.emit(...)`, which causes a compile error in Tauri 2.0.
     - No PyInstaller `--onedir` build command, `.spec` file, or `tauri.conf.json` sidecar permission definition (`tauri-plugin-shell:allow-sidecar`) is provided.

4. **Missing Endpoint `/api/v1/audit/logs` & Pydantic v2 Classes**:
   - Across `android-agent/MASTER_PROMPT.md`, `docs/03_DESKTOP_APP_ARCHITECTURE.md`, and master report, `/api/v1/audit/logs` is completely absent.
   - Schemas are provided only as JSON examples, omitting concrete Python Pydantic v2 model classes (`BaseModel`, `ConfigDict`, `field_validator`).
   - In `android-agent/MASTER_PROMPT.md` line 167, `"audit_record_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"` is the literal SHA-256 hash of an empty byte string `b""`.

5. **Execution Provider Discrepancy & Missing RTX 4060 VRAM Budget**:
   - In `docs/02_DEPLOYMENT_ENVIRONMENTS.md` lines 63–73, `get_optimal_execution_providers()` checks only `CoreMLExecutionProvider` and `CPUExecutionProvider`, omitting `TensorrtExecutionProvider` and `CUDAExecutionProvider` entirely. In contrast, `UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md` lines 550–571 includes TensorRT and CUDA.
   - While the M4 Mac 16GB RAM breakdown is detailed in Section 3.4 (6.02 GB sync baseline, 10.02 GB peak), the RTX 4060 8GB GDDR6 VRAM allocation breakdown is missing an itemized table.
   - In `docs/01_CHANGE_LOG_AND_ANALYSIS.md` line 28, it states: `consumes only 6.02 GB baseline RAM (37.6%), leaving 5.98 GB headroom` — conflating baseline usage (which leaves 9.98 GB headroom) with peak headroom (16 - 10.02 = 5.98 GB).

6. **Package Name Discrepancy**:
   - In `UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md` Section 3.2 (line 450), `onnxruntime-silicon==1.20.1` is listed. Official PyPI wheels for Apple Silicon macOS are distributed under `onnxruntime==1.20.1`.

---

## 2. Logic Chain

1. **Observation 1 + 2 + 3** directly demonstrate gaps where specifications claim specific capabilities (ONNX export opset 18, dynamic port allocation, clean sidecar teardown, context stamp validation) but either omit the code entirely, hardcode dummy bypasses, or leave processes unmanaged.
2. In accordance with reviewer integrity rules, a facade implementation where a claimed core capability is bypassed with hardcoded dummy variables (`context_mismatch = 0.0`, hardcoded `PORT 8000` with no teardown) or where an entire titled section is omitted (ONNX export script) mandates a verdict of **`REQUEST_CHANGES`** with finding tagged as **`INTEGRITY VIOLATION`**.
3. **Observation 3** establishes that the Tauri 2.0 Rust lifecycle manager will fail compilation (missing `Emitter` trait) and leak orphaned child processes across app restarts.
4. **Observation 4** establishes that the API contract is incomplete relative to the required 5 endpoints (`/api/v1/audit/logs` missing) and lacks executable Pydantic v2 class definitions.
5. **Observation 5 + 6** establish inter-document inconsistencies between `02_DEPLOYMENT_ENVIRONMENTS.md` and the master architecture report regarding execution provider detection and package naming.

---

## 3. Findings

### [Critical] Finding 1 — INTEGRITY VIOLATION: Omitted ONNX Export Script & Dynamic Axes
- **What**: Section 3.5 promises "Exact ONNX Export & Dynamic Execution Provider Scripts", but contains zero ONNX export code.
- **Where**: `UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md`, Section 3.5 (lines 541–582).
- **Why**: Student implementers have no reference for opset 18 conversion, input signatures, or dynamic axes configurations for variable input resolutions (OCR recognition, AdaFace face crops, DocTamper images).
- **Suggestion**: Add complete Python export snippets using `torch.onnx.export(..., opset_version=18, dynamic_axes={'input': {0: 'batch', 2: 'height', 3: 'width'}})` for PP-OCRv4 recognition, AdaFace-R100, and DocTamper.

### [Critical] Finding 2 — INTEGRITY VIOLATION: Dummy Context Logic & Broken Stamp Alignment
- **What**: `verify_stamp()` accepts `ocr_date` and `permit_window` but hardcodes `context_mismatch = 0.0`. `match_template` uses naive `cv2.resize` without keypoint homography alignment.
- **Where**: `docs/04_STAMP_AUTHENTICATION_MODULE.md`, lines 77–146.
- **Why**: Dummy stub ignores inputs; non-purple inks fail detection; unaligned stamps yield near-zero SSIM scores.
- **Suggestion**:
  1. Implement actual date range parsing: check if `permit_window[0] <= ocr_date <= permit_window[1]`.
  2. Add multi-ink HSV masks (red: `[0, 50, 50]-[10, 255, 255]` & `[170, 50, 50]-[180, 255, 255]`, blue: `[100, 50, 50]-[130, 255, 255]`).
  3. Add SIFT/ORB feature matching with `cv2.findHomography` and `cv2.warpPerspective` prior to `ssim()`.

### [Critical] Finding 3 — Tauri 2.0 Sidecar Process Leak & Compilation Failure
- **What**: Missing `use tauri::Emitter;` trait. Sidecar `child` process handle is dropped in `.setup()`, leaving orphan processes on exit with no SIGTERM/SIGKILL handler. Port allocation is hardcoded despite claimed dynamic scanning.
- **Where**: `docs/03_DESKTOP_APP_ARCHITECTURE.md`, lines 58–148.
- **Why**: Compilation fails on `app_handle.emit`; backend sidecar survives app closing, permanently blocking port 8000 on subsequent launches.
- **Suggestion**:
  1. Add `use tauri::Emitter;`.
  2. Store `child` in an `Arc<tokio::sync::Mutex<Option<CommandChild>>>` managed via `app.manage()`.
  3. In `RunEvent::ExitRequested`, acquire the child lock and invoke `child.kill().await`.
  4. Provide exact `pyinstaller --onedir` script and `tauri.conf.json` external binary config.

### [Major] Finding 4 — Missing `/api/v1/audit/logs` Endpoint & Concrete Pydantic v2 Classes
- **What**: `/api/v1/audit/logs` is missing from all deliverables; models are only shown as JSON examples.
- **Where**: `android-agent/MASTER_PROMPT.md`, `docs/03_DESKTOP_APP_ARCHITECTURE.md`, master report.
- **Why**: Violates the 5-endpoint contract and leaves audit log querying unspecified for client developers.
- **Suggestion**: Add Pydantic v2 `BaseModel` classes for all 5 endpoints including `AuditLogResponse` and `GET /api/v1/audit/logs?limit=50&offset=0`.

### [Major] Finding 5 — Inconsistent Execution Provider Fallback & Missing RTX 4060 VRAM Table
- **What**: `docs/02_DEPLOYMENT_ENVIRONMENTS.md` omits TensorRT and CUDA from `get_optimal_execution_providers()`. Master report lacks an itemized RTX 4060 8GB VRAM allocation table.
- **Where**: `docs/02_DEPLOYMENT_ENVIRONMENTS.md` (lines 63–74); `UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md` Section 3.4.
- **Why**: Production edge code will fail to activate TensorRT/CUDA if copied from `02_DEPLOYMENT_ENVIRONMENTS.md`. VRAM headroom on 8GB cards is unverified in documentation.
- **Suggestion**: Synchronize `backend_selector.py` across docs and include an itemized 8 GB GDDR6 VRAM allocation breakdown (TensorRT models ~1.1 GB, Context ~0.8 GB, Qwen INT4 ~2.2 GB, Buffers ~1.2 GB = 5.3 GB / 8.0 GB).

### [Minor] Finding 6 — Package Name & Arithmetic Errata
- **What**: `onnxruntime-silicon` is non-standard PyPI; arithmetic in `01_CHANGE_LOG_AND_ANALYSIS.md` line 28 states 6.02 GB baseline leaves 5.98 GB headroom.
- **Where**: `UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md` line 450; `docs/01_CHANGE_LOG_AND_ANALYSIS.md` line 28.
- **Suggestion**: Change `onnxruntime-silicon` to `onnxruntime==1.20.1` and clarify baseline headroom (9.98 GB) vs peak headroom (5.98 GB).

---

## 4. Verified Claims

- **Bayesian Prior Formulation**: $\Lambda_0 = \ln(0.02 / 0.98) = -3.89182$. Exact and mathematically rigorous.
- **Sigmoid Scaling Function**: $R = 100 / (1 + \exp(-\Lambda_{\text{post}}))$ correctly scales continuous odds to $[0, 100]$.
- **ICAO Doc 9303 Checksum**: Modulo-10 7-3-1 weighting algorithm matches ICAO 9303 Part 3 specifications.
- **M4 Unified RAM Budgeting**: 6.02 GB synchronous baseline (3800 OS + 450 Tauri + 350 FastAPI + 500 Libs + 920 Models) and 10.02 GB peak correctly verified against 16 GB envelope.
- **Two-Stage Risk Logic**: Hard tripwire overrides correctly prevent score dilution on cryptographic/biometric failures.
- **Model Checkpoints**: PP-OCRv4, AdaFace-R100, MiniFASNetV2, DocTamper DTD, and TruFor repository sources and licenses verified.

---

## 5. Coverage Gaps & Unverified Items

- **Dzongkha OCR Feasibility**: Deferral is well justified based on 100% Latin/English identity fields on Bhutanese CIDs, but synthetic Uchen font baseline remains unverified for Phase 2.
- **PyInstaller Sidecar Cold Start**: Standalone PyInstaller `--onedir` bundle startup latency on macOS arm64 without active compilation was not empirically benchmarked.

---

## 6. Conclusion

While the architecture demonstrates outstanding domain depth, sound mathematical formulations, and excellent alignment with SSB operational realities, critical code contracts and lifecycle implementations contain facade shortcuts, missing export scripts, and unhandled sidecar process lifecycles.

**Verdict**: **`REQUEST_CHANGES`**

---

## 7. Verification Method

To independently verify these findings:
1. Inspect `UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md` Section 3.5 (lines 541–582) — confirm absence of `torch.onnx.export` and `opset_version=18`.
2. Inspect `docs/04_STAMP_AUTHENTICATION_MODULE.md` line 144 — confirm `context_mismatch = 0.0` hardcoded stub.
3. Inspect `docs/03_DESKTOP_APP_ARCHITECTURE.md` lines 78–148 — confirm lack of `child.kill()`, missing `use tauri::Emitter;`, and hardcoded port 8000.
4. Grep `/api/v1/audit/logs` across `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/` — confirm zero occurrences.
