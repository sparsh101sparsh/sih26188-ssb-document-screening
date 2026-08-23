# Handoff Report: Frontend Survey Explorer

## 1. Observation
- **Frontend Codebase Location**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`
- **Header Component**: `sih26188_project/frontend/src/components/Header.tsx` (167 lines)
  - Line 29: `const [activeDeviceCount, setActiveDeviceCount] = useState<number>(1);` initializes device count to `1`.
  - Line 44: `setActiveDeviceCount(Math.max(1, data.total_devices));` uses hardcoded `Math.max(1, ...)` preventing `0` from ever being set.
  - Line 52: `const interval = setInterval(checkDevices, 5000);` polls every `5000ms` (5s) instead of `3000ms` (3s).
  - Lines 113–117:
    ```tsx
    <span className={`w-2 h-2 rounded-full shrink-0 ${backendOnline ? 'bg-green' : 'bg-red'}`} />
    <span className={backendOnline ? 'text-green font-semibold' : 'text-red font-semibold'}>
      {backendOnline
        ? `${activeDeviceCount} ${activeDeviceCount === 1 ? 'FIELD UNIT' : 'FIELD UNITS'} (${backendLatencyMs ?? 0}ms)`
        : 'OFFLINE SIM'}
    </span>
    ```
    Renders `bg-green` and green text unconditionally when `backendOnline` is true, even if `activeDeviceCount` is 0.
- **Backend Endpoint**: `GET /api/v1/devices` in `sih26188_project/backend/app/main.py:203-217` returns `{ status: "ok", total_devices: int, devices: [...], last_active_device: {...} | null }`.
- **API Contracts & Types**: `sih26188_project/frontend/src/types/api.ts:247-264` defines `ConnectedClient` and `DevicesResponse`.
- **Build & Test Verification**:
  - `npm run build` (`tsc -b && vite build`) executed in `sih26188_project/frontend` succeeds with exit code 0.
  - `npm test` (`node tests/run_tests.mjs`) executed in `sih26188_project/frontend` runs 55 tests across 3 suites and all pass with 0 errors.

## 2. Logic Chain
1. Requirement R3 specifies:
   - Poll `/api/v1/devices` every 3 seconds.
   - Remove hardcoded `Math.max(1, ...)`.
   - When 0 connected units, status capsule reads `0 FIELD UNITS (OFFLINE)`.
   - When Android app connects and pings, count dynamically updates to `1 FIELD UNIT` (or active count) with live latency.
2. In `Header.tsx`, changing `useState(1)` to `useState(0)` ensures the initial state does not display an active device before data is fetched.
3. Replacing `Math.max(1, data.total_devices)` with `data.total_devices` enables accurate reflection of 0 active units.
4. Changing `setInterval(checkDevices, 5000)` to `setInterval(checkDevices, 3000)` satisfies the 3-second polling interval requirement.
5. In the status capsule:
   - If `!backendOnline` -> dot: `bg-red`, text: `text-red font-semibold`, label: `OFFLINE SIM`.
   - If `backendOnline && activeDeviceCount === 0` -> dot: `bg-orange`, text: `text-orange font-semibold`, label: `0 FIELD UNITS (OFFLINE)`.
   - If `backendOnline && activeDeviceCount > 0` -> dot: `bg-green`, text: `text-green font-semibold`, label: `${activeDeviceCount} ${activeDeviceCount === 1 ? 'FIELD UNIT' : 'FIELD UNITS'} (${deviceLatencyMs ?? backendLatencyMs ?? 0}ms)`.
6. Maintaining `isMounted`, `clearInterval(timer)`, `clearInterval(interval)` satisfies static memory leak tests in `tests/adversarial_challenger_m2.test.tsx:545-553`.

## 3. Caveats
- The frontend dev server relies on `vite.config.ts` proxying `/api` to `http://localhost:8000`. In production / static preview builds, `fetch('/api/v1/devices')` expects reverse proxy or same-origin host unless configured with `VITE_API_BASE_URL`.
- The latency calculation can use `last_active_device.latency_ms` when available from `/api/v1/devices`, falling back to `backendLatencyMs` from `useBackendHealth`.

## 4. Conclusion
The frontend investigation is complete. The exact file (`sih26188_project/frontend/src/components/Header.tsx`), line numbers (29, 44, 52, 113–117), current limitations, required diff, and verification commands have been mapped and documented in `survey_report.md`.

## 5. Verification Method
1. Inspect `Header.tsx` at lines 28–57 and 110–131.
2. Build frontend:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend
   npm run build
   ```
3. Run test suites:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend
   npm test
   ```
4. Verify all 55 test assertions pass without regression.
