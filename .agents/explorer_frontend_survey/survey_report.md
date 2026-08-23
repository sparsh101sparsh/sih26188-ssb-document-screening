# Frontend Codebase Survey Report: Live Device Tracking & Observability (R3)

**Author:** Frontend Survey Explorer  
**Date:** 2026-08-23T17:25:00Z  
**Target Root:** `sih26188_project/frontend`  
**Reference Requirements:** `ORIGINAL_REQUEST.md` (R3, Acceptance Criteria)

---

## 1. Executive Summary

The frontend application is a React 19 + TypeScript + Vite 6 + Tailwind CSS single-page application located at `sih26188_project/frontend/`.
The Header component (`src/components/Header.tsx`) currently implements an in-component device polling loop against `/api/v1/devices`. However, it has three critical deficiencies violating Requirement R3:
1. It clamps device count to at least 1 using `Math.max(1, data.total_devices)` (line 44), masking zero-device scenarios.
2. It polls at a 5-second interval (`setInterval(checkDevices, 5000)`) instead of the required 3-second interval.
3. The UI capsule renders a static `bg-green` dot and `${activeDeviceCount} FIELD UNITS (...)` whenever `backendOnline` is true, rather than distinguishing 0 connected units (`0 FIELD UNITS (OFFLINE)`) from active units with live ping latency.

Both `npm run build` (`tsc -b && vite build`) and `npm test` (`node tests/run_tests.mjs`) are operational and currently pass cleanly.

---

## 2. Key File Inventory & Line Locations

| File Path | Description | Key Lines |
|---|---|---|
| `sih26188_project/frontend/src/components/Header.tsx` | Main navigation & status bar component displaying checkpoint selector, authoritative connectivity capsule, audit actions, and UTC clock. | Lines 1–167 (State: 28–30, Polling effect: 36–57, Status capsule JSX: 110–131) |
| `sih26188_project/frontend/src/services/api.ts` | Backend API client connecting to FastAPI service (`http://localhost:8000`). Exports `checkBackendHealth` and `inspectDocument`. | Lines 1–100 (Health check: 20–67, Inspect: 72–99) |
| `sih26188_project/frontend/src/types/api.ts` | TypeScript schemas and interfaces matching FastAPI Pydantic v2 models. Contains `ConnectedClient`, `DevicesResponse`, and `CheckpointInfo`. | Lines 222–264 (`ConnectedClient`: 247–256, `DevicesResponse`: 258–263, `CHECKPOINTS`: 230–236) |
| `sih26188_project/frontend/src/hooks/useBackendHealth.ts` | Custom hook polling `/api/v1/health` every 10s for general backend uptime and round-trip HTTP latency. | Lines 1–31 |
| `sih26188_project/frontend/src/components/OfflineWarningBanner.tsx` | Warning banner displayed when edge backend (localhost:8000) is unreachable. | Lines 1–63 |
| `sih26188_project/frontend/src/App.tsx` | Root application orchestrating health state, document inspection flow, and modals. | Lines 1–427 (Header mounting: 292–302) |
| `sih26188_project/frontend/vite.config.ts` | Vite dev server configuration with proxy for `/api` -> `http://localhost:8000`. | Lines 1–19 |
| `sih26188_project/frontend/package.json` | Package manifest defining scripts (`build`, `test`, `typecheck`) and dependencies. | Lines 1–35 |
| `sih26188_project/frontend/tests/adversarial_challenger_m2.test.tsx` | Comprehensive test suite checking UI primitives, device polling fallback, memory leak cleanup, and CSS tokens. | Lines 353–426, 545–553 |

---

## 3. Deep Analysis of Current Implementation in `Header.tsx`

### 3.1 Device Polling Effect (Lines 29–57)
```tsx
29: const [activeDeviceCount, setActiveDeviceCount] = useState<number>(1);
...
36: useEffect(() => {
37:   let isMounted = true;
38:   const checkDevices = async () => {
39:     try {
40:       const res = await fetch('/api/v1/devices');
41:       if (res.ok) {
42:         const data = await res.json();
43:         if (isMounted && typeof data.total_devices === 'number') {
44:           setActiveDeviceCount(Math.max(1, data.total_devices));
45:         }
46:       }
47:     } catch (e) {
48:       // fallback
49:     }
50:   };
51:   checkDevices();
52:   const interval = setInterval(checkDevices, 5000);
53:   return () => {
54:     isMounted = false;
55:     clearInterval(interval);
56:   };
57: }, []);
```

**Issues Identified:**
1. **Initial State Hardcoded to 1**: `useState<number>(1)` assumes 1 active unit before the first poll completes.
2. **Hardcoded Lower Bound**: Line 44 `Math.max(1, data.total_devices)` forces `activeDeviceCount` to always be $\ge 1$, even when the edge gateway returns `total_devices: 0`.
3. **5-Second Polling Interval**: Line 52 `setInterval(checkDevices, 5000)` polls every 5 seconds. Requirement R3 explicitly mandates 3-second polling.
4. **Catch / Error Fallback**: Catch block ignores network errors without resetting `activeDeviceCount` to 0 when disconnected.

### 3.2 Status Capsule Rendering (Lines 110–131)
```tsx
110: {/* Consolidated Authoritative Status Capsule */}
111: <div className="flex items-center bg-inset border border-line rounded-control px-2.5 py-1 space-x-2 text-[11px] font-mono shadow-btn">
112:   <Smartphone className="w-3.5 h-3.5 text-accent shrink-0" />
113:   <span className={`w-2 h-2 rounded-full shrink-0 ${backendOnline ? 'bg-green' : 'bg-red'}`} />
114:   <span className={backendOnline ? 'text-green font-semibold' : 'text-red font-semibold'}>
115:     {backendOnline
116:       ? `${activeDeviceCount} ${activeDeviceCount === 1 ? 'FIELD UNIT' : 'FIELD UNITS'} (${backendLatencyMs ?? 0}ms)`
117:       : 'OFFLINE SIM'}
118:   </span>
119:   <span className="text-line-strong">|</span>
120:   <span className="text-ink-2 font-medium">AIR-GAPPED</span>
121:   <button
122:     type="button"
123:     onClick={onRefreshHealth}
124:     disabled={isCheckingHealth}
125:     title="Refresh Edge Gateway Status"
126:     className="text-ink-3 hover:text-ink transition-colors ml-0.5"
127:   >
128:     <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
129:   </button>
130: </div>
```

**Issues Identified:**
1. When `backendOnline` is `true` but `activeDeviceCount` is `0`, line 113 renders a `bg-green` dot and line 116 renders `0 FIELD UNITS (Xms)` in green, rather than indicating an offline/waiting state `0 FIELD UNITS (OFFLINE)`.
2. The latency shown is only `backendLatencyMs` (from the 10s health check) instead of reflecting the most recent client latency from `last_active_device.latency_ms` when available.

---

## 4. Backend Device Tracker & `/api/v1/devices` Endpoint Specification

Backend router at `sih26188_project/backend/app/main.py:203-217`:
- Returns JSON structure:
  ```json
  {
    "status": "ok",
    "total_devices": 1,
    "devices": [
      {
        "client_ip": "192.168.43.50",
        "user_agent": "SSB-Android-FieldApp/1.0",
        "checkpoint_id": "SSB-WB-JAI-01",
        "last_seen": "2026-08-23T17:21:00Z",
        "last_endpoint": "/api/v1/health",
        "total_requests": 14,
        "latency_ms": 18.5,
        "status": "ONLINE"
      }
    ],
    "last_active_device": {
      "client_ip": "192.168.43.50",
      "latency_ms": 18.5,
      ...
    }
  }
  ```
- When no devices are registered or active within timeout:
  ```json
  {
    "status": "ok",
    "total_devices": 0,
    "devices": [],
    "last_active_device": null
  }
  ```

---

## 5. Precise Required Changes for R3

To satisfy R3 and Acceptance Criteria, `Header.tsx` should be modified as follows:

### 5.1 State Initialization
```tsx
const [activeDeviceCount, setActiveDeviceCount] = useState<number>(0);
const [deviceLatencyMs, setDeviceLatencyMs] = useState<number | null>(null);
```

### 5.2 Polling Loop (3-Second Interval & Accurate Parsing)
```tsx
useEffect(() => {
  let isMounted = true;
  const checkDevices = async () => {
    try {
      const res = await fetch('/api/v1/devices');
      if (res.ok) {
        const data = await res.json();
        if (isMounted && typeof data.total_devices === 'number') {
          setActiveDeviceCount(data.total_devices);
          if (data.last_active_device && typeof data.last_active_device.latency_ms === 'number') {
            setDeviceLatencyMs(Math.round(data.last_active_device.latency_ms));
          } else if (data.total_devices === 0) {
            setDeviceLatencyMs(null);
          }
        }
      } else if (isMounted) {
        setActiveDeviceCount(0);
        setDeviceLatencyMs(null);
      }
    } catch {
      if (isMounted) {
        setActiveDeviceCount(0);
        setDeviceLatencyMs(null);
      }
    }
  };

  checkDevices();
  const interval = setInterval(checkDevices, 3000); // Poll every 3 seconds
  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, []);
```

### 5.3 Dynamic UI Rendering in Status Capsule
```tsx
{/* Consolidated Authoritative Status Capsule */}
<div className="flex items-center bg-inset border border-line rounded-control px-2.5 py-1 space-x-2 text-[11px] font-mono shadow-btn">
  <Smartphone className="w-3.5 h-3.5 text-accent shrink-0" />
  
  {/* Status Dot Indicator */}
  <span
    className={`w-2 h-2 rounded-full shrink-0 ${
      !backendOnline
        ? 'bg-red'
        : activeDeviceCount > 0
        ? 'bg-green'
        : 'bg-orange'
    }`}
  />

  {/* Status Text Display */}
  <span
    className={`font-semibold ${
      !backendOnline
        ? 'text-red'
        : activeDeviceCount > 0
        ? 'text-green'
        : 'text-orange'
    }`}
  >
    {!backendOnline
      ? 'OFFLINE SIM'
      : activeDeviceCount === 0
      ? '0 FIELD UNITS (OFFLINE)'
      : `${activeDeviceCount} ${activeDeviceCount === 1 ? 'FIELD UNIT' : 'FIELD UNITS'} (${deviceLatencyMs ?? backendLatencyMs ?? 0}ms)`}
  </span>

  <span className="text-line-strong">|</span>
  <span className="text-ink-2 font-medium">AIR-GAPPED</span>
  <button
    type="button"
    onClick={onRefreshHealth}
    disabled={isCheckingHealth}
    title="Refresh Edge Gateway Status"
    className="text-ink-3 hover:text-ink transition-colors ml-0.5"
  >
    <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
  </button>
</div>
```

---

## 6. Build and Test Verification

### 6.1 Commands
- **Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`
- **Build**: `npm run build`
  - Runs: `tsc -b && vite build`
  - Output: Compiles TypeScript and bundles into `dist/`
- **Unit & Adversarial Tests**: `npm test`
  - Runs: `node tests/run_tests.mjs`
  - Executes 3 test suites: `primitives_adversarial`, `primitives_interactive_adversarial`, `adversarial_challenger_m2`
- **Type Checking**: `npm run typecheck` (`tsc --noEmit`)

### 6.2 Test Suite Static Audit Compliance
In `tests/adversarial_challenger_m2.test.tsx`:
- Suite 3 checks that `html.includes('FIELD UNIT')` passes for rendered Header.
- Suite 5 checks:
  - `clearInterval(timer)`
  - `clearInterval(interval)`
  - `isMounted = false`
All proposed changes preserve these exact cleanup patterns and strings, ensuring tests pass.

---

## 7. Next Steps for Implementation
1. Apply the edits to `sih26188_project/frontend/src/components/Header.tsx`.
2. Run `npm run build` and `npm test` in `sih26188_project/frontend/` to verify zero regressions.
3. Test end-to-end integration with backend and Android health polling loop.
