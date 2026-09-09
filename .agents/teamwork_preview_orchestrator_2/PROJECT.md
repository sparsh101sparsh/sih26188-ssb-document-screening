# Project: SIH26188 Document Screening System — Network & Companion Resilience

## Architecture
The system consists of three interconnected subsystems:
1. **Python FastAPI Backend (`sih26188_project/backend`)**:
   - Manages mDNS Zeroconf registration with smart LAN IP selection (`select_lan_ip`).
   - Provides pairing metadata endpoint `GET /api/v1/companion/pairing-qr` returning `SSBPAIR://` payload.
   - Handles companion image upload with SQLite `capture_id` deduplication.
2. **Android Screening App (`sih26188_project/android-screening`)**:
   - Zero-tap auto-reconnect on launch with 4-tier discovery (Tier 0: Saved URL -> Tier 1: Emulator 10.0.2.2 -> Tier 2: mDNS 3s -> Tier 3: 13 priority subnet IPs).
   - Network callback for automatic reconnection upon Wi-Fi network handover.
   - QR code scanner supporting `SSBPAIR://` protocol and legacy `http://`.
   - Outbox sync with 5-step exponential backoff retry (0s, 2s, 8s, 30s, 60s), `capture_id` tracking, and local blob retention until HTTP 200 OK.
   - Clean default URLs without hardcoded static IPs.
3. **React/TypeScript Frontend (`sih26188_project/frontend`)**:
   - `ConnectModal.tsx` integrating `GET /api/v1/companion/pairing-qr`.
   - Distinct connection states (CONNECTED green dot, CONNECTING/DISCOVERING spinner, DISCONNECTED QR code).
   - Expandable manual IP configuration drawer with validation and health check ping.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Robust LAN IP Selector | `select_lan_ip` evaluating physical interfaces (en0, eth0, wlan0) over VPNs (utun, tun) with default route detection | M1 | R1 | DONE |
| 2 | Zeroconf mDNS Broadcast | mDNS registration using the selected LAN IP and dynamic port | M1 | R1 | DONE |
| 3 | Pairing QR API | `GET /api/v1/companion/pairing-qr` generating `SSBPAIR://SSBGateway/TOKEN` payload | M1 | R4 | DONE |
| 4 | Upload Idempotency (Backend) | SQLite `companion_captures` schema migration + `capture_id` duplicate detection | M1 | R5 | DONE |
| 5 | Clean Backend Defaults | Remove hardcoded IPs from backend, dynamic configuration | M1 | R6 | DONE |
| 6 | Structured Backend Logging | Structured logging with `[Network]`, `[Companion]`, `[Zeroconf]` tags | M1 | R10 | DONE |
| 7 | Android Auto-Connect on Launch | Asynchronous background check on startup (1.5s timeout) + silent mDNS discovery | M2 | R2 | DONE |
| 8 | Wi-Fi Network Change Detection | `ConnectivityManager.NetworkCallback` triggering re-discovery on Wi-Fi changes | M2 | R2 | DONE |
| 9 | 4-Tier Discovery Order | Tier 0 (Saved) -> Tier 1 (Emulator) -> Tier 2 (mDNS 3s) -> Tier 3 (13 priority IPs) | M2 | R3 | DONE |
| 10 | Android SSBPAIR QR Parser | Support `SSBPAIR://` and legacy `http://` in `QrCodeAnalyzer.kt` & `WifiUtils.kt` | M2 | R4 | DONE |
| 11 | Android Upload Idempotency | Pass `capture_id` (`sessionId`) in `SsbApiService.kt` upload multipart form | M2 | R5 | DONE |
| 12 | Clean Android Defaults | Empty default gateway URL, show "No gateway configured", remove `192.168.1.61` | M2 | R6 | DONE |
| 13 | Exponential Backoff Retry | 5 attempts (0s, 2s, 8s, 30s, 60s) with local image retention in Room until 200 OK | M2 | R7 | DONE |
| 14 | Structured Android Logging | Structured logging in `WifiUtils.kt` and `SsbRepository.kt` | M2 | R10 | DONE |
| 15 | Desktop Connect Modal UI | Clean state machine (CONNECTED green dot, CONNECTING spinner, DISCONNECTED QR) | M3 | R8 | DONE |
| 16 | Desktop Pairing QR Integration | Fetch and render `SSBPAIR://` QR code from `pairing-qr` endpoint | M3 | R4, R8 | DONE |
| 17 | Desktop Manual IP Entry Drawer | Expandable drawer with IPv4 regex validation, port input, and health ping | M3 | R8 | DONE |
| 18 | Backend Unit & Integration Tests | `test_network_interface.py` covering IP selection, pairing QR, and upload deduplication | M4 | R9 | DONE |
| 19 | Test Suite Passing | `pytest tests/` in backend passing (56/56 total, 23/23 on risk engine) | M4 | R9 | DONE |
| 20 | Forensic Audit Verification | Clean audit verdict on zero cheating, no hardcoded responses, authentic logic | M4 | Audit | DONE |
| 21 | Full System Build & APK Delivery | `npm run build`, `./gradlew assembleDebug`, copy APK to `~/Desktop/SSB-FieldScreening.apk`, local git commit | M5 | R11 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Network, Pairing & Idempotency | `backend/app/core/network.py`, `backend/app/main.py`, `backend/app/api/routers/companion.py` | none | DONE |
| M2 | Android Network, Auto-Connect, QR & Retry | `android-screening/.../SsbScreeningViewModel.kt`, `WifiUtils.kt`, `QrCodeAnalyzer.kt`, `SsbApiService.kt`, `SsbRepository.kt`, UI screens | M1 (Interface contract) | DONE |
| M3 | Frontend ConnectModal & QR Integration | `frontend/src/components/ConnectModal.tsx`, `frontend/src/services/api.ts`, `frontend/src/types/api.ts` | M1 (Pairing QR API) | DONE |
| M4 | Backend Tests, Integration Tests & Forensic Audit | `backend/tests/test_network_interface.py`, run full pytest suite, run forensic auditor | M1, M2, M3 | DONE (GATE PASSED) |
| M5 | Build Health, APK Delivery & Git Commit | Frontend build, Android assembleDebug, copy APK to ~/Desktop, local git commit | M1, M2, M3, M4 | DONE |

## Interface Contracts

### 1. Backend Pairing Endpoint (`GET /api/v1/companion/pairing-qr`)
**Response Schema (JSON 200 OK):**
```json
{
  "status": "active",
  "qr_payload": "SSBPAIR://192.168.1.50:8000/a1b2c3d4",
  "gateway_id": "SSBGateway",
  "pairing_token": "a1b2c3d4",
  "current_lan_ip": "192.168.1.50",
  "port": 8000,
  "fallback_url": "http://192.168.1.50:8000"
}
```

### 2. Backend Companion Capture Upload (`POST /api/v1/companion/capture` & `/upload`)
**Request Multipart Form:**
- `file`: image file bytes
- `capture_type`: `"DOCUMENT"` | `"LIVE_FACE"`
- `capture_id`: string (UUID or session ID `CAP-...`) [Optional/Recommended]
- `metadata`: JSON string [Optional]

**Response Schema (New Upload - 200 OK):**
```json
{
  "status": "success",
  "capture_uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "capture_id": "CAP-20260825-103323",
  "message": "Capture uploaded successfully"
}
```

**Response Schema (Duplicate Upload - 200 OK):**
```json
{
  "status": "duplicate",
  "capture_uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "capture_id": "CAP-20260825-103323",
  "message": "Already received"
}
```

### 3. QR Payload Protocol Specification
- Protocol prefix: `SSBPAIR://`
- Format: `SSBPAIR://<host>:<port>/<pairing_token>` or `SSBPAIR://<host>/<pairing_token>` (default port 8000)
- Backward compatibility: `http://<host>:<port>` and `http://<host>:<port>/api/v1/companion` and raw `<host>:<port>` are accepted.

## Code Layout
- `backend/app/core/network.py`: Network interface selector and IP discovery module.
- `backend/app/main.py`: Lifespan event with robust mDNS Zeroconf registration.
- `backend/app/api/routers/companion.py`: Pairing QR endpoint, SQLite migration, capture_id deduplication.
- `backend/tests/test_network_interface.py`: Unit and integration tests for network and companion APIs.
- `android-screening/app/src/main/java/com/ssb/fieldscreening/`:
  - `util/WifiUtils.kt`: 4-tier discovery, `SSBPAIR://` parser, blank normalizer.
  - `util/QrCodeAnalyzer.kt`: QR parsing with `SSBPAIR://` support.
  - `ui/viewmodel/SsbScreeningViewModel.kt`: Startup auto-connect, network callback, empty default URL.
  - `data/remote/SsbApiService.kt`: Multipart `capture_id` parameter.
  - `data/repository/SsbRepository.kt`: 5-step exponential backoff, Room image retention.
  - `ui/components/WifiConnectScreen.kt`: UI fallback cleanup.
- `frontend/src/`:
  - `components/ConnectModal.tsx`: State machine UI, QR code rendering, manual IP entry.
  - `services/api.ts`: `getPairingQr()` API client method.
  - `types/api.ts`: `PairingQrResponse` type definition.
