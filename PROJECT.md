# Project: SSB Document Screening - Live Connectivity & Device Tracking

## Architecture
The system consists of three interconnected components operating across air-gapped field checkpoints:
1. **Android Field Client** (`/Users/iamsparsh00321/Downloads/ssb-field-screening`): Kotlin/Compose application run on ruggedized handhelds. Interacts with Edge Gateway via Wi-Fi/Hotspot or USB Tethering.
2. **Edge Screening Backend** (`sih26188_project/backend`): Python/FastAPI service hosting ML inference pipelines, telemetry, and in-memory `DeviceTracker`.
3. **Web Management Dashboard** (`sih26188_project/frontend`): React 19/TypeScript SPA displaying edge gateway health, checkpoint selector, and active field unit metrics.

```
+--------------------------------+           Wi-Fi / Hotspot HTTP           +---------------------------------+
|      Android Field Client      |  ======================================> |      Edge Screening Backend     |
|   (SsbScreeningViewModel.kt)   |   Polls GET /api/v1/health every 2s      |     (FastAPI + DeviceTracker)   |
|   - 2s Health Polling Loop     |                                          |   - 8s Inactivity Timeout       |
|   - Dynamic Status Pill        |                                          |   - Dynamic OFFLINE Transition  |
+--------------------------------+                                          |   - GET /api/v1/devices         |
                                                                            +---------------------------------+
                                                                                             ^
                                                                                             | Polls GET /api/v1/devices
                                                                                             | every 3s
                                                                            +---------------------------------+
                                                                            |     Web Management Dashboard    |
                                                                            |          (Header.tsx)           |
                                                                            |   - 0 FIELD UNITS (OFFLINE)     |
                                                                            |   - Live Unit Count & Latency   |
                                                                            +---------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Android Live Health Polling | 2-second background coroutine loop in `SsbScreeningViewModel.kt` polling `/api/v1/health` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Android UI Telemetry State | Live update of `gatewayHealth` and `gatewayLatencyMs` in HeaderBar and GatewayDiagnosticsView | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Backend Inactivity Timeout | 8.0-second timeout in `DeviceTracker` marking inactive clients as `OFFLINE` | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Backend Active Device Filtering | `GET /api/v1/devices` returns only active devices, excluding `OFFLINE` units | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Web 3-Second Device Polling | Header component polls `/api/v1/devices` every 3 seconds | M3 | ORIGINAL_REQUEST §R3 |
| 6 | Web Zero-Device Capsule State | Remove `Math.max(1, ...)`, render `0 FIELD UNITS (OFFLINE)` when no active units | M3 | ORIGINAL_REQUEST §R3 |
| 7 | Web Live Latency Display | Display dynamic active unit count and live millisecond latency from `last_active_device` | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Multi-Subsystem Build & Verification | Android `./gradlew assembleDebug`, Backend `pytest tests/`, Frontend `npm run build` | M4 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Android Health Polling Loop | Implement 2s coroutine polling in `SsbScreeningViewModel.kt`, build & test APK | none | PLANNED |
| 2 | M2: Backend Device Tracker Timeout | Implement 8s timeout, `get_active_devices()`, endpoint filtering, pytest suite | none | PLANNED |
| 3 | M3: Web UI Live Device Tracking | Implement 3s polling, remove hardcoding, dynamic capsule styling in `Header.tsx` | M2 | PLANNED |
| 4 | M4: End-to-End Verification & Gate | Run full multi-tier verification: `./gradlew assembleDebug`, `pytest tests/`, `npm run build` | M1, M2, M3 | PLANNED |

## Interface Contracts

### Android ↔ Edge Gateway API
- **Endpoint**: `GET /api/v1/health`
- **Request Headers**: `User-Agent: SSB-Android-FieldApp/1.0`, `X-Checkpoint-ID: SSB_SONAULI_01`
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "engineMode": "Edge Rugged CPU/NPU",
    "modelsLoaded": { "tamper_detector": true, "doc_classifier": true }
  }
  ```
- **Cadence**: Every 2000ms from Android client.

### Edge Gateway ↔ Web Frontend API
- **Endpoint**: `GET /api/v1/devices`
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "total_devices": 1,
    "devices": [
      {
        "client_ip": "192.168.43.50",
        "user_agent": "SSB-Android-FieldApp/1.0",
        "checkpoint_id": "SSB_SONAULI_01",
        "last_seen": "2026-08-23T17:25:00.000Z",
        "last_endpoint": "/api/v1/health",
        "total_requests": 42,
        "latency_ms": 14.2,
        "status": "ONLINE"
      }
    ],
    "last_active_device": {
      "client_ip": "192.168.43.50",
      "latency_ms": 14.2
    }
  }
  ```
- **Zero-Device Response**: When no active clients have pinged within 8.0s:
  ```json
  {
    "status": "ok",
    "total_devices": 0,
    "devices": [],
    "last_active_device": null
  }
  ```
- **Cadence**: Every 3000ms from Web Dashboard Header.

## Code Layout & Ownership
- **Android Subsystem**: `/Users/iamsparsh00321/Downloads/ssb-field-screening/`
  - `app/src/main/java/com/ssb/fieldscreening/ui/viewmodel/SsbScreeningViewModel.kt`
- **Backend Subsystem**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend/`
  - `app/core/device_tracker.py`
  - `app/core/config.py`
  - `app/main.py`
  - `tests/test_challenger_m4_m5_backend.py`
- **Frontend Subsystem**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend/`
  - `src/components/Header.tsx`
