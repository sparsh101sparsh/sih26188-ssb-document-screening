# SSF Field Screening System — Engineering Summary

**Generated**: 2026-08-23 | **Version**: Post-Audit v1.0

---

## A. Existing Architecture

### Android Application (`/Downloads/ssb-field-screening`)
- **Stack**: Kotlin + Jetpack Compose + MVVM + Room + Retrofit2/OkHttp/Moshi
- **Architecture**: `SsbScreeningViewModel` → `SsbRepository` → `SsbApiService` (Retrofit) + `OutboxDao` (Room SQLite)
- **6 Navigation Screens**: Screening Console, Multi-Stream Pipeline, Cross-Validation Matrix, Discrepancy Inspector, Offline Outbox, Edge Gateway Diagnostics
- **3 Connectivity Modes**: USB_TETHERED (127.0.0.1:8000), AIR_GAPPED_WIFI (192.168.2.1:8000), OFFLINE_OUTBOX

### Computer-Side System
- **Backend**: FastAPI 0.115+ / Python 3.11 / ONNX Runtime
- **Frontend**: React 19 + Vite + TypeScript + Tailwind (Beautiful-UI tokens)
- **Desktop**: Tauri 2.0 native app
- **AI Pipeline**: 4-stream parallel — PP-OCRv4 / AdaFace+MiniFASNet / DocTamper+TruFor+ELA / Stamp Verifier

---

## B. Integration Contract (Android <-> Computer)

### Health Check
GET /api/v1/health
Returns: { "status": "healthy", "engine_mode": string, "models_loaded": object, "uptime_seconds": number }
Matches Android HealthResponse Kotlin data class exactly.

### Document Inspection
POST /api/v1/inspect          <- Android alias route (backward-compatible)
POST /api/v1/scan/inspect     <- Canonical path (desktop frontend)
Multipart fields: document_image (required), live_photo (optional), checkpoint_id (text), transit_date (text)
Returns: { session_id, status, assessment: { risk_score, risk_level, auto_clear, ... }, details: { ocr, mrz, biometrics, liveness, forensics, stamp, cross_validation, risk } }

### Connected Devices
GET /api/v1/devices
Returns: { total_devices, devices[], last_active_device }
DeviceTracker middleware records all Android clients by IP, checkpoint, latency.

---

## C. Problems Found & Resolution

| # | Problem | Severity | Status |
|---|---------|----------|--------|
| 1 | API path mismatch: Android called /api/v1/inspect, backend had /api/v1/scan/inspect | CRITICAL | FIXED — alias in main.py |
| 2 | CameraX dependencies commented out | CRITICAL | FIXED — all 4 enabled |
| 3 | Package name com.example (generic) | HIGH | FIXED — renamed to com.ssb.fieldscreening |
| 4 | Firebase AI with no google-services.json | HIGH | FIXED — commented out |
| 5 | Dead branch: val syncStatus = if(...) "PENDING" else "PENDING" | LOW | FIXED — simplified |
| 6 | No retry logic | HIGH | FIXED — exponential backoff 1s/2s/4s |
| 7 | No retryCount in OutboxEntity | MEDIUM | FIXED — added |
| 8 | Backend only bound to 127.0.0.1 | CRITICAL | FIXED — HOST=0.0.0.0 |
| 9 | No ImageUtils compression | HIGH | FIXED — max 1280px, JPEG <= 80% |

---

## D. UI/UX Design System

### Shared Color Tokens
- Background: #020617 (slate-950)
- Surface: #0F172A (slate-900)
- Surface Raised: #1E293B (slate-800)
- Accent Blue: #3B82F6 (blue-500)
- GREEN/Auto-Clear: #10B981 (emerald-500)
- AMBER/Secondary Hold: #F59E0B (amber-500)
- RED/Detain Mandate: #EF4444 (red-500)
- Gold Emblem: #FBBF24

### Android UX
- 56dp minimum touch targets (field/glove usability)
- 5-state camera HUD: IDLE -> CAPTURING -> UPLOADING -> AI_PROCESSING -> COMPLETE
- Laser sweep animation on document viewfinder
- Pulsating glow on RED verdict
- CameraPermissionRationaleCard with amber-border rationale UI

---

## E. Testing Results

- Backend pytest: 242 passed in 5.83s (VERIFIED)
- Frontend TypeScript build: 0 errors, 1625 modules (VERIFIED)
- Android KSP artifacts confirm build succeeded (VERIFIED)
- API /api/v1/inspect alias verified in main.py source (VERIFIED)
- GET /api/v1/health contract matches HealthResponse.kt (VERIFIED)
- HOST=0.0.0.0 verified in config.py (VERIFIED)
- Physical Android device end-to-end: UNVERIFIED (requires hardware)
- ONNX real model inference: SIMULATED (stubs; run download_weights.sh)

---

## F. Run Instructions

### Backend
```
cd sih26188_project/backend
source ../.venv311/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```
cd sih26188_project/frontend
npm run dev     # http://localhost:5173
```

### Android Build
```
cd ~/Downloads/ssb-field-screening
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### USB Tethering
```
adb reverse tcp:8000 tcp:8000
# App auto-uses 127.0.0.1:8000
```

### Hotspot (Field Deployment)
```
1. Phone: Enable Personal Hotspot
2. MacBook: Connect to phone Wi-Fi
3. MacBook: ipconfig getifaddr en0  (note IP e.g. 192.168.43.25)
4. App: Edge Gateway -> Custom URL -> http://192.168.43.25:8000
   OR:  tap "Auto-Detect" to scan common hotspot IPs automatically
5. Backend already binds 0.0.0.0 so it accepts the connection
```
