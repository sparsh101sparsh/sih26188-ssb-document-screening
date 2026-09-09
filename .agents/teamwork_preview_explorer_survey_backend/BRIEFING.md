# BRIEFING — 2026-08-25T05:07:35Z

## Mission
Investigate backend codebase for SSB document screening, analyzing mDNS/zeroconf, IP discovery, companion endpoints, pairing/QR handling, capture deduplication, DB models, test suites, and provide actionable recommendations for R1, R4, R5, R6, R9.

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, analysis, synthesis
- Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_backend
- Original parent: beb15e66-6467-4738-85f3-26af35b2238d
- Milestone: survey_backend

## 🔒 Key Constraints
- Read-only investigation — do NOT implement backend code changes directly
- Document code paths, line numbers, flaws, and concrete design proposals

## Current Parent
- Conversation ID: beb15e66-6467-4738-85f3-26af35b2238d
- Updated: 2026-08-25T05:07:35Z

## Investigation State
- **Explored paths**:
  - `backend/app/main.py` (lifespan, mDNS zeroconf setup, middleware)
  - `backend/app/api/routers/companion.py` (PersistentCompanionStore, SQLite WAL setup, upload ingestion, SSE broadcast)
  - `backend/app/api/v1/endpoints/companion.py` & `backend/app/api/v1/api.py` (sub-router exports)
  - `backend/app/core/config.py`, `device_tracker.py`, `logging.py`, `backend_selector.py`
  - `backend/tests/test_risk_engine.py` (23/23 passing)
  - `backend/tests/test_companion_sync.py` (20/20 passing)
  - `android-screening/` (QrCodeAnalyzer.kt, SsbApiService.kt, SsbScreeningViewModel.kt, WifiUtils.kt)
  - `frontend/src/components/ConnectModal.tsx` & `frontend/src/services/api.ts`
- **Key findings**:
  - `socket.gethostbyname(socket.gethostname())` resolves to `127.0.0.1` on macOS/Linux, breaking Zeroconf mDNS advertisement.
  - UDP probe `("8.8.8.8", 80)` fails in air-gapped / sandboxed environments.
  - Interface classification is missing; VPN tunnels (`utun*`) and bridges (`docker0`) override physical Wi-Fi (`en0`).
  - No `capture_id` deduplication column in SQLite `companion_captures`, causing duplicate storage and SSE events on client upload retries.
  - Missing `GET /api/v1/companion/pairing-qr` endpoint for `SSBPAIR://` protocol.
  - Hardcoded IPs (`192.168.1.61`, etc.) found across client modules.
- **Unexplored areas**: None for backend scope.

## Key Decisions Made
- Recommended new module `backend/app/core/network.py` implementing `select_lan_ip(interfaces_dict=None)`.
- Recommended SQLite schema update with `capture_id` column and unique index in `companion_captures`.
- Specified `PairingQRResponse` schema and `GET /api/v1/companion/pairing-qr` handler.
- Specified new test suite `backend/tests/test_network_interface.py`.

## Artifact Index
- survey_backend.md — Comprehensive backend survey report (R1, R4, R5, R6, R9)
- handoff.md — Explorer handoff report
