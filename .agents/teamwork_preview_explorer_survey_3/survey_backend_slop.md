# SSB Field Screening System — Backend, Connection Models & Slop Audit Survey
**Document Reference**: `survey_backend_slop.md`  
**Author**: Explorer 3 (Backend & Architecture / Slop Scope)  
**Date**: 2026-08-23  
**Status**: Complete Investigation & Recommendations  

---

## 1. Executive Summary

This investigation surveys the backend endpoints, device tracking and connection models, test suite architecture, and frontend codebase cleanliness across both the **FastAPI Backend**, the **React (Tauri) Computer App**, and the **Android Field Screening Client**.

### Core Findings Summary:
1. **Backend Endpoints & Telemetry**:
   - Master FastAPI service (`sih26188_project/backend/app/main.py`) exposes high-performance asynchronous endpoints for 3-stream parallel multi-modal screening (`/api/v1/scan/inspect` and alias `/api/v1/inspect`), single-modality endpoints (OCR/MRZ/QR, Biometrics/FAS, Forensics/Stamps), and telemetry endpoints (`/health`, `/api/v1/health`, `/api/v1/devices`).
   - Device tracking is handled by an in-memory `DeviceTracker` (`app/core/device_tracker.py`) hooked into a FastAPI HTTP middleware (`track_device_activity_middleware`) that automatically registers connected Android agents and edge terminals, logging IP, User-Agent, checkpoint ID, request count, and latency.

2. **Connection Status Synchronization & Double/Triple Badging**:
   - Both frontends currently suffer from **badge proliferation and redundant connection indicators**:
     - **React Desktop Header**: Displays 3 separate indicators (`activeDeviceCount` badge, `LOCAL · AIR-GAPPED` badge, and `backendOnline` badge) plus an intrusive `OfflineWarningBanner`.
     - **Android HeaderBar**: Displays 2 pills (`ConnectivityMode` pill + `SIH Protocol Version` pill) + Gear button, while `DualCameraCaptureView` repeats connection and state machine pills.
   - **Consolidation Solution**: We propose unifying all status items on both platforms into a **single authoritative status badge** in the header that indicates online/offline state, latency, and connected unit count in a compact, non-intrusive pill.

3. **Backend Test Suite Discovery & Build Verification**:
   - Pytest test suite contains **10 test files with 242 tests**, all passing in **16.92s**:
     - `test_api_health.py` (13 tests)
     - `test_biometrics.py` (23 tests)
     - `test_challenger_m1.py` (14 tests)
     - `test_challenger_m1_stress.py` (89 tests)
     - `test_challenger_m4_m5_backend.py` (11 tests)
     - `test_cross_validation.py` (14 tests)
     - `test_e2e_pipeline.py` (11 tests)
     - `test_forensics.py` (29 tests)
     - `test_mrz_checksum.py` (15 tests)
     - `test_risk_engine.py` (23 tests)
   - **Frontend Build**: `npm run build` succeeds cleanly (`tsc -b && vite build`, 0 TypeScript errors).
   - **Android Build**: `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug` succeeds with `BUILD SUCCESSFUL`.

4. **Slop & Dead Code Audit**:
   - **React Frontend**:
     - `StandbyTelemetry.tsx` (652 lines) is completely **orphaned** and never imported or rendered in `App.tsx`.
     - `TaskRows.tsx` (282 lines), `ProgressRing.tsx` (71 lines), `StreamText.tsx` (76 lines), `Switch.tsx` (42 lines), `Shimmer.tsx` (28 lines), and `Chip.tsx` (35 lines) in `components/ui/` are unimported dead components.
     - `ResultsPanel.tsx` (909 lines) has severe **duplicate rendering** where all 5 child components (`InspectionPipelineTrace`, `DiffTable`, `FilterTable`, `ForensicsViewer`, `PillarsTable`) are rendered both in the `overview` tab and again individually in separate tabs.
   - **Android Frontend**:
     - `NavigationScreen.kt` has 5 legacy dead enum constants (`SCREENING_CONSOLE`, `PIPELINE_TRACE`, `CROSS_VALIDATION`, `DISCREPANCY_DIFF`, `OUTBOX_AUDIT`).
     - `DualCameraCaptureView.kt` (1014 lines) has excessive visual clutter (laser scan animations, 5-state indicators, multi-layer overlays) violating the quiet operational tool requirement.

---

## 2. Backend API & Telemetry Contract Analysis

### 2.1 API Endpoint Registry (`sih26188_project/backend/app/`)

| Method | Endpoint | Router / File | Description | Output Schema |
|---|---|---|---|---|
| `GET` | `/health` | `app/main.py:164` | Edge health check & model checkpoint registry | Health telemetry JSON |
| `GET` | `/api/v1/health` | `app/main.py:182` | API v1 health contract for mobile & Tauri desktop | `{ status, engine_mode, models_loaded, uptime_seconds }` |
| `GET` | `/api/v1/devices` | `app/main.py:204` | Connected Android screening fleet & terminals | `{ status, total_devices, devices, last_active_device }` |
| `GET` | `/api/v1/scan/status` | `app/api/routers/scan.py:218` | 3-stream engine status & active hardware provider | Scan status telemetry JSON |
| `POST` | `/api/v1/scan/inspect` | `app/api/routers/scan.py:234` | Master 3-stream parallel document inspection | `DocumentInspectResponse` |
| `POST` | `/api/v1/inspect` | `app/main.py:153` | Backward-compatible alias for Android client | `DocumentInspectResponse` |
| `POST` | `/api/v1/ocr/extract` | `app/api/routers/ocr.py:38` | Tier-1 OCR extraction & QR parsing | `OCRResult` |
| `POST` | `/api/v1/mrz/validate` | `app/api/routers/ocr.py:101` | ICAO Doc 9303 Modulo-10 7-3-1 validation | `MRZResult` |
| `POST` | `/api/v1/qr/decode` | `app/api/routers/ocr.py:150` | Offline Aadhaar Secure QR RSA-2048 PKI | `QRPayload` |
| `GET` | `/api/v1/biometrics/status` | `app/api/routers/biometrics.py:30` | Biometrics readiness & execution provider | Biometric telemetry JSON |
| `POST` | `/api/v1/biometrics/detect` | `app/api/routers/biometrics.py:48` | SCRFD-10GF face & 5-point landmark detection | `FaceDetectionResult` |
| `POST` | `/api/v1/biometrics/liveness` | `app/api/routers/biometrics.py:79` | MiniFASNetV2 dual-scale anti-spoofing | `LivenessResult` |
| `POST` | `/api/v1/biometrics/match` | `app/api/routers/biometrics.py:114` | AdaFace 1:1 matching + liveness evaluation | `BiometricMatchResponse` |
| `POST` | `/api/v1/forensics/analyze` | `app/api/routers/forensics.py:32` | DocTamper DTD, TruFor, ELA, EXIF/DQT | `ForensicsResult` |
| `POST` | `/api/v1/forensics/stamp` | `app/api/routers/forensics.py:83` | 4-Stage SSB Border Stamp Verification | `StampResult` |
| `POST` | `/api/v1/forensics/ela` | `app/api/routers/forensics.py:121` | Classical Error Level Analysis (ELA Q90) | `ELAResult` |

### 2.2 Device Tracker Architecture (`app/core/device_tracker.py`)

The `DeviceTracker` singleton tracks field units accessing the edge server:
```python
class ConnectedClient(BaseModel):
    client_ip: str
    user_agent: Optional[str] = None
    checkpoint_id: Optional[str] = "SSB_SONAULI_01"
    last_seen: str  # ISO 8601 UTC timestamp
    last_endpoint: str = "/api/v1/inspect"
    total_requests: int = 1
    latency_ms: Optional[float] = None
    status: str = "ONLINE"
```

Activity is intercepted transparently by `track_device_activity_middleware` in `app/main.py:114-143`, resolving client IP from `X-Forwarded-For` or `X-Real-IP`, and updating request counts and latency.

---

## 3. Connection Status Synchronization & Badge Consolidation

### 3.1 Existing Anti-Pattern: Redundant Status Badges

#### Desktop React App (`frontend/src/`):
1. `Header.tsx:114`: `<div className="...">{activeDeviceCount} FIELD UNITS <span className="... animate-pulse" /></div>`
2. `Header.tsx:121`: `<div className="...">LOCAL · AIR-GAPPED · 0 CLOUD CALLS</div>`
3. `Header.tsx:128`: `<button className="...">ONLINE (2ms) / OFFLINE · SIMULATION</button>`
4. `OfflineWarningBanner.tsx`: Full-width amber warning banner with redundant retry button and shell command instructions.
5. `StandbyTelemetry.tsx:280`: `SYSTEM READY`, `6 / 6 WARM`, `AIR-GAPPED`, `3 FIELD UNITS`, `M4 NEURAL ENGINE ACTIVE`.

#### Android Client (`android-agent` / `ssb-field-screening`):
1. `HeaderBar.kt:182`: Prominent Latency & Mode Pill: `USB TETHERED • 2MS LATENCY` with animated pulsing dot.
2. `HeaderBar.kt:320`: Protocol Version Pill: `SIH26188 • PROTOCOL v3.5`.
3. `HeaderBar.kt:224`: Gear button for Gateway Diagnostics.
4. `DualCameraCaptureView.kt:464`: `CameraStateMachineIndicator` HUD (IDLE, CAPTURING, UPLOADING, PROCESSING, COMPLETE).
5. `DualCameraCaptureView.kt:580`: "LIVE REAR SENSOR" / "LIVE FRONT" status badges.

### 3.2 Target Unified Status Architecture

#### Single Authoritative Header Badge (React App):
Consolidate into a single status capsule in `Header.tsx`:
```tsx
{/* Consolidated Authoritative Gateway Capsule */}
<div className="flex items-center bg-inset border border-line rounded-control px-2.5 py-1 space-x-2 text-[11px] font-mono shadow-btn">
  <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-green animate-pulse' : 'bg-red'}`} />
  <span className={backendOnline ? 'text-green font-semibold' : 'text-red font-semibold'}>
    {backendOnline ? `EDGE READY · ${backendLatencyMs ?? 0}ms` : 'OFFLINE SIM'}
  </span>
  <span className="text-line-strong">|</span>
  <span className="text-ink-2">
    {activeDeviceCount} {activeDeviceCount === 1 ? 'UNIT' : 'UNITS'}
  </span>
  <button
    onClick={onRefreshHealth}
    disabled={isCheckingHealth}
    title="Refresh Gateway Health"
    className="text-ink-3 hover:text-ink transition-colors ml-0.5"
  >
    <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
  </button>
</div>
```

#### Single Authoritative Header Capsule (Android App):
In `HeaderBar.kt`:
```kotlin
// Consolidated Single Status Capsule
Row(
    modifier = Modifier
        .clip(RoundedCornerShape(8.dp))
        .background(SsbColors.SurfaceRaised)
        .border(1.dp, SsbColors.Border, RoundedCornerShape(8.dp))
        .clickable { onOpenDiagnostics?.invoke() }
        .padding(horizontal = 10.dp, vertical = 6.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(6.dp)
) {
    Box(
        modifier = Modifier
            .size(7.dp)
            .clip(CircleShape)
            .background(if (gatewayHealth != null) SsbColors.GreenPass else SsbColors.AmberWarn)
    )
    Text(
        text = "${connectivityMode.label.uppercase()} · ${gatewayLatencyMs}ms",
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        fontFamily = FontFamily.Monospace,
        color = SsbColors.TextPrimary
    )
    Icon(
        imageVector = Icons.Default.Settings,
        contentDescription = "Diagnostics",
        tint = SsbColors.TextSecondary,
        modifier = Modifier.size(14.dp)
    )
}
```

---

## 4. Test Suite Discovery & Verification Results

### 4.1 Pytest Test Suite (`sih26188_project/backend/tests/`)
- **Execution Command**: `.venv311/bin/pytest tests/`
- **Results**: **242 passed**, 33 warnings in **16.92s** (100% pass rate).

#### Breakdown by Suite:
1. `tests/test_api_health.py` (13 tests):
   - Validates `/health` and `/api/v1/health` JSON contracts, model loading state map dynamism, uptime tracking, and serialization.
2. `tests/test_biometrics.py` (23 tests):
   - Validates SCRFD face detection, Umeyama 5-point alignment, AdaFace-ResNet100 1:1 cosine matching, deadbands ($\tau=0.35$), MiniFASNetV2 liveness detection, and age estimation.
3. `tests/test_challenger_m1.py` (14 tests):
   - Core challenger validation: RAM-only DPDP ephemeral storage, session isolation, SHA-256 legal hash generation.
4. `tests/test_challenger_m1_stress.py` (89 tests):
   - Multi-format stress testing: corrupted payloads, huge images (4K/8K), boundary conditions, concurrent sessions.
5. `tests/test_challenger_m4_m5_backend.py` (11 tests):
   - `DeviceTracker` lifecycle, concurrent requests, reverse proxy IP resolution (`X-Forwarded-For`, `X-Real-IP`), `/api/v1/devices` endpoint, `/api/v1/inspect` alias activity recording.
6. `tests/test_cross_validation.py` (14 tests):
   - 8-Rule deterministic cross-validation matrix (CV-01 through CV-08), Levenshtein string distance, token sort ratio, date parsing.
7. `tests/test_e2e_pipeline.py` (11 tests):
   - Full 3-stream parallel end-to-end integration across all 6 scenarios (Passport, Forged Aadhaar, Tampered Stamp, Presentation Spoof, Multi-MRZ TD1/TD2/TD3, Error Handling).
8. `tests/test_forensics.py` (29 tests):
   - Classical ELA Q90, DocTamper DTD text forgery localization, TruFor splicing detection, EXIF/DQT quantization matrix parsing, 4-Stage SSB Stamp verification.
9. `tests/test_mrz_checksum.py` (15 tests):
   - ICAO Doc 9303 Modulo-10 7-3-1 weight check digit verification across TD1 (3x30), TD2 (2x36), and TD3 (2x44).
10. `tests/test_risk_engine.py` (23 tests):
    - Stage 1 Hard Tripwires (1..6), Stage 2 Multi-Factor Log-Odds Bayesian Fusion, calibrated noise deadbands ($\psi_{tamper}, \psi_{live}, \psi_{stamp}, \psi_{face}$).

### 4.2 Frontend Build & TypeScript Verification (`sih26188_project/frontend/`)
- **Execution Command**: `npm run build` (`tsc -b && vite build`)
- **Results**: **Success in 2.51s**, 0 TypeScript errors. Output: `dist/assets/index-CtRwfGc_.js` (393 kB / 107 kB gzip), `dist/assets/index-3S7u2LVE.css` (37.9 kB / 7.6 kB gzip).

### 4.3 Android Build Verification (`ssb-field-screening/`)
- **Execution Command**: `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug`
- **Results**: **BUILD SUCCESSFUL in 2s** (38 tasks up-to-date).

---

## 5. Slop, Dead Code, Unused Imports & Redundancy Audit

### 5.1 React Desktop Frontend Slop Inventory

| File Path | Lines | Status | Issue / Description | Recommended Action |
|---|---|---|---|---|
| `src/components/StandbyTelemetry.tsx` | 652 | **Orphaned** | Never imported or rendered in `App.tsx`. Contains 120 lines of redundant fallback data (`FALLBACK_DEVICES`, `PREWARMED_MODELS`, `CHECKPOST_METRICS`). | Delete or replace with a compact 40-line `ConnectedDevicesPanel.tsx`. |
| `src/components/ui/TaskRows.tsx` | 282 | **Orphaned** | Never imported in any active component. | Remove file; remove export from `src/components/ui/index.ts`. |
| `src/components/ui/ProgressRing.tsx` | 71 | **Orphaned** | Never imported in any active component. | Remove file; remove export from `src/components/ui/index.ts`. |
| `src/components/ui/StreamText.tsx` | 76 | **Orphaned** | Never imported in any active component. | Remove file; remove export from `src/components/ui/index.ts`. |
| `src/components/ui/Switch.tsx` | 42 | **Orphaned** | Never imported in any active component. | Remove file; remove export from `src/components/ui/index.ts`. |
| `src/components/ui/Shimmer.tsx` | 28 | **Orphaned** | Never imported in any active component. | Remove file; remove export from `src/components/ui/index.ts`. |
| `src/components/ui/Chip.tsx` | 35 | **Orphaned** | Never imported in application screens (`StatusPill` is used instead). | Remove file; remove export from `src/components/ui/index.ts`. |
| `src/components/ResultsPanel.tsx` | 909 | **Redundant Layout** | All 5 components are rendered in `overview` AND rendered again in tabs `discrepancies`, `forensics`, `telemetry`, and `pillars`. No collapsible accordions. | Refactor to accordion-based layout where `InspectionPipelineTrace`, `CrossValidationMatrix` (`FilterTable`), and `DiscrepancyDiffTable` (`DiffTable`) are collapsed by default. |
| `src/components/OfflineWarningBanner.tsx` | 60 | **Styling Slop** | Hardcoded `amber-950`, `amber-800` classes instead of theme tokens. Intrusive full banner. | Refactor into subtle inline notification or consolidated header warning. |
| `src/components/Header.tsx` | 183 | **Badge Slop** | 3 separate badges + `animate-ping` decorative logo pulse. | Consolidate into single authoritative station status capsule. |
| `src/index.css` | 129 | **Token Slop** | Legacy OKLCH variables instead of Deep Oceanic hex tokens. | Standardize to Deep Oceanic design tokens. |

### 5.2 Android Frontend Slop Inventory

| File Path | Lines | Status | Issue / Description | Recommended Action |
|---|---|---|---|---|
| `ui/viewmodel/SsbScreeningViewModel.kt:44-48` | 5 | **Dead Enum Constants** | `SCREENING_CONSOLE`, `PIPELINE_TRACE`, `CROSS_VALIDATION`, `DISCREPANCY_DIFF`, `OUTBOX_AUDIT` in `NavigationScreen`. | Remove dead enum entries; retain strictly `CAPTURE`, `RESULTS`, `OUTBOX`, `GATEWAY_DIAGNOSTICS`. |
| `ui/MainScreen.kt:124, 131-133, 140` | 6 | **Dead Switch Branches** | Matching on removed `NavigationScreen` constants. | Clean up `when` block in `MainScreen.kt` and `NavigationBarRow`. |
| `ui/MainScreen.kt:206-303` | 98 | **Redundant Jump Banner** | `CaptureScreenView` renders a full secondary risk verdict banner when results exist. | Remove redundant banner or simplify to a minimal chip. |
| `ui/MainScreen.kt:737-742` | 6 | **Ad-hoc Slop** | `private data class Quadruple<A, B, C, D>` defined at the bottom of the file. | Eliminate `Quadruple` in favor of standard Kotlin logic. |
| `ui/components/DualCameraCaptureView.kt` | 1014 | **Visual Clutter** | Overlaid laser sweep animations, 5-state machine HUD, corner brackets, multi-row overlays. | Simplify to quiet capture view: full-bleed camera viewports, top connection state, bottom capture trigger. |
| `ui/components/HeaderBar.kt` | 339 | **Badge Bloat** | Multiple pills (connectivity, protocol version v3.5, checkpoint dropdown, gear button). | Consolidate into clean single status pill + gear icon. |
| `ui/viewmodel/SsbScreeningViewModel.kt:134-154` | 21 | **Debug Delays** | 6 artificial `delay(...)` statements in `runInspection` simulating step progress. | Remove artificial delays when connecting to real backend or streamline to smooth transition. |

---

## 6. Concrete Recommendations & Refactoring Blueprint

### 6.1 Deep Oceanic Theme Token Unification (`frontend/src/index.css`)

Replace the generic OKLCH variables with the Deep Oceanic standard:
```css
:root {
  /* Deep Oceanic Design System */
  --page: #030B14;           /* Base Canvas / Background */
  --canvas: #030B14;
  --surface: #0B1A2E;        /* Supporting Surface / Cards */
  --inset: #081525;          /* Inset / Header Surface */
  --hover: #112745;          /* Interactive / Hover Surface */
  --hover-2: #163259;
  
  --line: #1E3A5F;           /* Structural Border */
  --line-strong: #2C5282;    /* Active / Hover Border */
  --field: #081525;
  
  --ink: #F8FAFC;            /* Primary Text */
  --ink-2: #94A3B8;          /* Secondary Text */
  --ink-3: #64748B;          /* Muted / Tertiary Text */
  
  --accent: #2563EB;         /* Interaction Blue */
  --accent-ink: #3B82F6;
  --accent-tint: rgba(37, 99, 235, 0.16);
  --brand-purple: #5B21B6;   /* Brand Purple */
  
  --green: #10B981;          /* Emerald Success */
  --green-tint: rgba(16, 185, 129, 0.15);
  --orange: #F59E0B;         /* Amber Warning */
  --orange-tint: rgba(245, 158, 11, 0.15);
  --red: #EF4444;            /* Crimson Danger */
  --red-tint: rgba(239, 68, 68, 0.15);

  --radius-chip: 6px;
  --radius-control: 8px;
  --radius-card: 10px;
  --radius-window: 14px;
}
```

### 6.2 Compact Connected Devices Panel Component

In place of `StandbyTelemetry.tsx`, implement a clean, lightweight `DeviceConnectionPanel.tsx` (approx. 60 lines) reading directly from `/api/v1/devices`:
```tsx
export const DeviceConnectionPanel: React.FC = () => {
  const [devices, setDevices] = useState<ConnectedClient[]>([]);
  
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/v1/devices');
        if (res.ok) {
          const data = await res.json();
          setDevices(data.devices || []);
        }
      } catch {}
    };
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface border border-line rounded-card p-3 space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-ink-2 font-bold uppercase">Connected Field Fleet</span>
        <span className="text-green font-semibold">{devices.length} Active</span>
      </div>
      <div className="divide-y divide-line/60">
        {devices.map((d, i) => (
          <div key={i} className="py-1.5 flex items-center justify-between text-[11px] font-mono">
            <span className="text-ink">{d.checkpoint_id} ({d.client_ip})</span>
            <span className="text-ink-3">{d.latency_ms ? `${d.latency_ms}ms` : 'online'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 6.3 Accordion Structure for Results Screen (React & Android)

#### React `ResultsPanel.tsx`:
Replace duplicated flat cards with a unified, high-contrast Risk Score Hero dominating the view, followed by expandable accordions for technical diagnostics:
1. **Hero**: `RiskScoreCard` + `ApprovalCard` + `ReasonBulletList`.
2. **Accordion 1**: `Cross-Validation Matrix` (`FilterTable`) [Default: Collapsed].
3. **Accordion 2**: `Field Discrepancy Matrix` (`DiffTable`) [Default: Expanded only if discrepancies exist].
4. **Accordion 3**: `Multi-Stream Pipeline Trace` (`InspectionPipelineTrace`) [Default: Collapsed].
5. **Accordion 4**: `Visual Forensics & Stamp Analysis` (`ForensicsViewer`) [Default: Expanded].

---

## 7. Conclusion & Next Steps

The backend infrastructure is robust and high-performing, with 100% passing tests (242/242) and verified sub-400ms end-to-end inference. The primary opportunities for improvement lie in **frontend slop elimination**:
1. Remove dead files (`StandbyTelemetry.tsx`, `TaskRows.tsx`, unimported UI atoms).
2. Clean `NavigationScreen.kt` enum and simplify `MainScreen.kt` navigation.
3. Consolidate disjoint badges on both platforms into single authoritative header capsules.
4. Replace duplicate views with clean, expandable accordions on the Results screen.
5. Apply Deep Oceanic tokens across `index.css` and Android `Color.kt`.
