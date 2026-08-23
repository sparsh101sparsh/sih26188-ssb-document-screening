# Original User Request

## 2026-08-23T17:21:46Z

Verify and fix the live Wi-Fi/Hotspot connectivity state tracking between the Android APK and the computer Edge backend, ensuring both the web frontend and Android app dynamically display live "Connected" indicators based on active polling and health status check endpoints.

Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford
Integrity mode: development

---

## Requirements

### R1. Android Live Health Polling Loop (2-second interval)
Add a background polling loop in the Android application's `SsbScreeningViewModel.kt` to call the edge gateway health check endpoint periodically.
- Trigger `checkGatewayHealth()` every 2 seconds within a coroutine loop.
- This ensures the Android app's own connectivity status pill is updated live, and that it periodically pings the backend so the server can track it as active.

### R2. Backend Device Tracker Timeout
Update `DeviceTracker` in `sih26188_project/backend/app/core/device_tracker.py` to support dynamic status transitions:
- Mark client devices that have not made any request or health ping within the last 8 seconds as `OFFLINE` (to match the fast 2-second polling).
- Exclude `OFFLINE` devices from the active device count returned by the `GET /api/v1/devices` endpoint.

### R3. Web/Computer UI Live Device Count
Refactor the desktop Header component (`frontend/src/components/Header.tsx`) to show real connected device metrics:
- Poll the `/api/v1/devices` endpoint every 3 seconds.
- Remove the hardcoded `Math.max(1, ...)` fallback so that when there are 0 connected active units, the status capsule reads `0 FIELD UNITS (OFFLINE)` or transitions to an offline warning state.
- Ensure that once the Android app connects to the edge hotspot and starts polling, the count immediately and dynamically updates to `1 FIELD UNIT` showing live ping latency.

---

## Acceptance Criteria

### Live Status Verification
- [ ] If no Android client is active, the desktop dashboard displays `0 FIELD UNITS` (or `OFFLINE SIM` status).
- [ ] When the Android app starts and pings the gateway, the desktop header dynamically increments the count and shows live latency.
- [ ] If the Android app goes offline or is closed, the desktop header reverts to `0 FIELD UNITS` within 8-10 seconds.

### Build Verification
- [ ] Android: `./gradlew assembleDebug` succeeds.
- [ ] Backend: `pytest tests/` passes.
- [ ] Frontend: `npm run build` succeeds.
