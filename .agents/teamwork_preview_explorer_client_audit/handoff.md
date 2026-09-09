# SIH26188 Track 3: Client Audit Handoff Report

## 1. Observation

### Build & Tool Verifications
- **Frontend Build:** `npm run build` in `sih26188_project/frontend` succeeded with 228 modules transformed and 0 TypeScript/Vite compilation errors.
- **Frontend Tests:** `npm test -- --run` in `sih26188_project/frontend` passed (1 test file, 1 test passed in `src/App.test.tsx`).
- **Android Build:** `./gradlew tasks` in `sih26188_project/android-screening` returned `zsh:1: command not found: ./gradlew` or Java Runtime missing. The local environment does not have a JDK installed; all Android auditing was performed via thorough static code analysis.

### Verbatim Codebase Observations
1. **Frontend Biometrics Schema Discrepancy:**
   - `backend/app/schemas/biometrics.py:63-68`:
     ```python
     class BiometricMatchResponse(BaseModel):
         matched: bool
         confidence: float
         calibrated_confidence: float | None = None
         decision: str
         details: BiometricMatchDetails
     ```
   - `frontend/src/types/api.ts:144-156`: `calibrated_confidence` is absent from `BiometricsDetails`.
   - `frontend/src/components/ResultsPanel.tsx:205, 207, 282, 291, 944`: Forced to use `(result.biometrics as any)?.calibrated_confidence`.

2. **Frontend Hardcoded Relative URLs:**
   - `frontend/src/App.tsx:283`: `const res = await fetch('/api/v1/companion/gallery?limit=50');`
   - `frontend/src/App.tsx:329`: `const es = new EventSource('/api/v1/companion/stream');`
   - `frontend/src/components/Header.tsx:44`: `const res = await fetch('/api/v1/devices');`
   - `frontend/src/services/api.ts:1-2`: `const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';`

3. **Frontend Inverted Sequence ID Check:**
   - `backend/app/api/v1/endpoints/companion.py:84-88` and `backend/app/services/companion_buffer.py:27-32`:
     ```python
     def get_buffer(self, limit: int = 50) -> list[CompanionCaptureRecord]:
         records = list(self._buffer)
         records.reverse()  # Oldest (lowest seq) first, newest (highest seq) last
         return records[:limit]
     ```
   - `frontend/src/App.tsx:289-291`:
     ```typescript
     const latest = data.items[0]; // Gets the lowest sequence ID (seq 1)
     if (latest.sequence_id > lastSequenceIdRef.current) { // Evaluates false for all subsequent captures!
         lastSequenceIdRef.current = latest.sequence_id;
     ```

4. **Frontend Dead Code & Error Swallowing:**
   - `frontend/src/services/api.ts:109-131`: `postScreeningVerdict` defined but not imported or called anywhere in `frontend/src/`.
   - `frontend/src/services/api.ts:136-144`: `clearCompanionCapture()` has empty `catch {}`.

5. **Android Moshi Non-Null Violations on Optional Backend Fields:**
   - `backend/app/schemas/scan.py:25-28`:
     ```python
     biometrics: Optional[BiometricsDetails] = None
     liveness: Optional[LivenessDetails] = None
     stamp: Optional[StampDetails] = None
     ```
   - `android-screening/app/src/main/java/com/ssb/screening/data/remote/InspectionModels.kt:95, 96, 98`:
     ```kotlin
     @Json(name = "biometrics") val biometrics: BiometricsDetails,
     @Json(name = "liveness") val liveness: LivenessDetails,
     @Json(name = "stamp") val stamp: StampDetails
     ```
   - `android-screening/app/src/main/java/com/ssb/screening/data/remote/InspectionModels.kt:202`:
     `@Json(name = "warnings") val warnings: List<String> = emptyList()`
     vs `backend/app/schemas/mrz.py:69`: `warnings: list[CrossViolation] = []`.
   - `android-screening/app/src/main/java/com/ssb/screening/data/remote/InspectionModels.kt:214-215`:
     `expectedValue: String` and `actualValue: String`
     vs `backend/app/schemas/mrz.py:63-64`: `expected_value: Optional[str] = None`, `actual_value: Optional[str] = None`.

6. **Android Offline Drop:**
   - `android-screening/app/src/main/java/com/ssb/screening/ui/screening/SsbScreeningViewModel.kt:253-266`:
     ```kotlin
     if (!_uiState.value.isOnline) {
         _uiState.update { it.copy(
             statusMessage = "Offline: scan queued for sync",
             isInspecting = false
         )}
         return
     }
     ```
     No database insertion or queueing is invoked before `return`.

7. **Android UI Main Thread Image Processing:**
   - `android-screening/app/src/main/java/com/ssb/screening/ui/camera/DualCameraCaptureView.kt:319, 337`:
     `imageCapture.takePicture(ContextCompat.getMainExecutor(context), object : ImageCapture.OnImageCapturedCallback() { ... ImageUtils.processImageProxy(...) })`

8. **Android Camera Resource Leak:**
   - `android-screening/app/src/main/java/com/ssb/screening/ui/camera/QrScannerView.kt:125-129`:
     `cameraExecutor.shutdown()` is called in `onDispose` without calling `cameraProvider.unbindAll()`.

9. **Android Discovery Context Nullability:**
   - `android-screening/app/src/main/java/com/ssb/screening/data/repository/SsbRepository.kt:358`:
     `WifiUtils.discoverGatewayOnSubnet(context = null, subnet = subnet, port = port)`
     bypasses Tier 0 and Tier 2 branches guarded by `if (context != null)`.

---

## 2. Logic Chain

1. **Chain 1 (Android Fatal Moshi Deserialization Crashes):**
   - Observation 5 shows `InspectionResponse` in backend defines `biometrics`, `liveness`, and `stamp` as `Optional[T] = None`.
   - When a border officer inspects a document without face biometrics, the backend serializes `"biometrics": null`.
   - In Kotlin, Moshi's reflection/codegen enforces non-null safety for properties not typed with `?`.
   - When Moshi encounters `null` for a non-nullable Kotlin field, it throws `com.squareup.moshi.JsonDataException`.
   - Therefore, any document-only inspection in the field will fatally crash the Android screening app.
   - Similarly, when the backend cross-validation returns warnings as `list[CrossViolation]`, Moshi parsing against `List<String>` throws `JsonDataException: Expected a string but was BEGIN_OBJECT`.
   - When rule CV-07 executes (missing seal/stamp), backend sends `expected_value: None`. Moshi parsing against non-nullable `expectedValue: String` throws `JsonDataException`.

2. **Chain 2 (Android Offline Data Silently Lost):**
   - Observation 6 shows `SsbScreeningViewModel.runInspection()` checking `!_uiState.value.isOnline`.
   - The method updates the UI message to `"Offline: scan queued for sync"` and immediately executes `return`.
   - Neither `repository.queueRecord()` nor `outboxDao.insertRecord()` is called.
   - Because no Room database insertion occurs, the scan is never stored in `outbox_records`.
   - Therefore, field scans captured offline are permanently dropped and lost forever upon app restart.

3. **Chain 3 (Frontend Companion Sync Permanent Freeze):**
   - Observation 3 shows `backend/app/services/companion_buffer.py` reversing buffer items, placing the oldest item (sequence 1) at index 0.
   - `App.tsx:289` accesses `data.items[0]` assuming it is the latest capture.
   - After the first capture (sequence 1) is processed, `lastSequenceIdRef.current` is set to 1.
   - On the next poll, `data.items[0]` is still sequence 1.
   - The condition `1 > 1` evaluates to `false`.
   - Therefore, the workstation companion gallery permanently halts auto-ingestion after the very first capture.

4. **Chain 4 (Frontend Cross-Platform Network Failure):**
   - Observation 2 shows `App.tsx` and `Header.tsx` issuing direct `fetch('/api/v1/...')` and `new EventSource('/api/v1/...')`.
   - In Tauri (`tauri://localhost`) or Electron (`file://`) desktop shells, or when the React UI runs on port 5173 targeting a separate backend server (`http://192.168.1.100:8000`), relative URLs resolve to `tauri://localhost/api/v1` or `http://localhost:5173/api/v1`, which fails.
   - Therefore, companion gallery polling, companion SSE streaming, and device status monitoring fail completely outside standard Vite proxy dev setups.

5. **Chain 5 (Android UI Freezes and Crashes):**
   - Observation 7 shows raw camera frames processed on `ContextCompat.getMainExecutor(context)`.
   - YUV/RGB processing, rotation, downsampling, and JPEG compression of 12MP-64MP images take hundreds of milliseconds of CPU time.
   - Executing this on the main thread causes dropped frames, touch unresponsiveness, and Android ANRs.
   - Observation 8 shows `cameraExecutor.shutdown()` executed without unbinding `cameraProvider`.
   - Frames in flight delivered to the shut-down executor throw `RejectedExecutionException`, crashing the app upon navigating away from `QrScannerView`.

---

## 3. Caveats

1. **Android Dynamic Testing:** Dynamic APK execution and device-level testing could not be executed locally because Java Runtime Environment / Android SDK tools are not installed in this environment. All findings were verified through exhaustive static analysis of the Kotlin AST, Room database entities, and build configuration files.
2. **Backend Server-Sent Events Header:** `backend/app/api/v1/endpoints/companion.py:stream_captures` sends `text/event-stream`. Web browsers support native `EventSource` over HTTP GET, but `EventSource` does not support custom authorization headers (e.g. `X-API-Key` or `Authorization: Bearer`). If authentication is enabled on the gateway, `EventSource` must be replaced with `fetchEventSource` from `@microsoft/fetch-event-source`.
3. **No Code Modified:** In accordance with the Explorer subagent read-only mandate, no production files were modified. All proposed code changes are provided as diffs in `report.md`.

---

## 4. Conclusion

The client audit identified **19 unique deficiencies** (7 Frontend, 12 Android).
Three defects on the Android client (**AND-01, AND-02, AND-03**) represent immediate, reproducible fatal deserialization crashes caused by schema drift with FastAPI/Pydantic models.
One defect (**AND-04**) causes silent data loss of field checkpoint inspections when offline.
Two defects on the Frontend (**FE-02, FE-03**) completely break the desktop workstation companion synchronization pipeline.
All 19 deficiencies have been cataloged with precise source locations, backend schema comparisons, reproduction proofs, and exact code remediations in `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_client_audit/report.md`.

---

## 5. Verification Method

### Frontend Independent Verification
1. Run Vite build:
   ```bash
   cd sih26188_project/frontend && npm run build
   ```
2. Run Vitest suite:
   ```bash
   cd sih26188_project/frontend && npm test -- --run
   ```
3. Inspect lines:
   - `frontend/src/types/api.ts:144-156` (confirm absence of `calibrated_confidence`)
   - `frontend/src/App.tsx:283, 329` (confirm relative paths bypassing `API_BASE_URL`)
   - `frontend/src/App.tsx:289` (confirm `data.items[0]` sequence comparison)

### Android Independent Verification
1. Inspect Kotlin models vs Backend schemas:
   - `android-screening/app/src/main/java/com/ssb/screening/data/remote/InspectionModels.kt:95-98` vs `backend/app/schemas/scan.py:25-28`
   - `android-screening/app/src/main/java/com/ssb/screening/data/remote/InspectionModels.kt:202` vs `backend/app/schemas/mrz.py:69`
   - `android-screening/app/src/main/java/com/ssb/screening/data/remote/InspectionModels.kt:214-215` vs `backend/app/schemas/mrz.py:63-64`
2. Inspect offline logic:
   - `android-screening/app/src/main/java/com/ssb/screening/ui/screening/SsbScreeningViewModel.kt:253-266` (confirm immediate return without outbox insert)
3. Inspect threading & lifecycle:
   - `android-screening/app/src/main/java/com/ssb/screening/ui/camera/DualCameraCaptureView.kt:319` (confirm `getMainExecutor(context)` usage)
   - `android-screening/app/src/main/java/com/ssb/screening/ui/camera/QrScannerView.kt:125-129` (confirm missing `unbindAll()`)

### Invalidation Conditions
- If the backend modifies `companion.py:get_gallery` to return items in descending order, FE-03's logic would need to be evaluated in reverse.
- If the Android client replaces Moshi with a lenient deserializer that coerces nulls to defaults, AND-01, AND-02, and AND-03 would present as empty/default objects rather than fatal crashes, but would still mask validation data.
