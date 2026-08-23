# Dispatch: Milestone 3 - Web/Computer UI Live Device Count

## Objective
Implement Requirement R3: Refactor the desktop Header component (`sih26188_project/frontend/src/components/Header.tsx`) to display real live connected field unit metrics and ping latency.

## Reference Documents
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md`
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/PROJECT.md`
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_frontend_survey/survey_report.md`

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Task Details & Requirements
1. In `sih26188_project/frontend/src/components/Header.tsx`:
   - Initialize `activeDeviceCount` to `0` and manage `deviceLatencyMs` (`number | null`).
   - In the polling `useEffect`:
     - Poll `/api/v1/devices` every 3000ms (`setInterval(checkDevices, 3000)`).
     - Remove `Math.max(1, data.total_devices)`. Use `data.total_devices` directly.
     - Extract `last_active_device.latency_ms` to update `deviceLatencyMs` when units are online; reset when 0 devices or error.
     - Ensure proper cleanup (`isMounted = false`, `clearInterval(interval)`).
   - In the status capsule JSX:
     - When `!backendOnline`: render `'OFFLINE SIM'` with `text-red` / `bg-red`.
     - When `backendOnline` and `activeDeviceCount === 0`: render `'0 FIELD UNITS (OFFLINE)'` with `text-orange` / `bg-orange`.
     - When `backendOnline` and `activeDeviceCount > 0`: render `${activeDeviceCount} ${activeDeviceCount === 1 ? 'FIELD UNIT' : 'FIELD UNITS'} (${deviceLatencyMs ?? backendLatencyMs ?? 0}ms)` with `text-green` / `bg-green`.
2. Build and verify using:
   `npm run build`
   `npm test`
   in `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend`.
3. Write your report to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_frontend_m3/handoff.md`.
4. Send a message to parent when done.
