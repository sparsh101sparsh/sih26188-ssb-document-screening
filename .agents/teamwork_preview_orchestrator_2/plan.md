# Plan — SIH26188 Android-Laptop Connection & Screening Fix

## Objectives
Fix the unreliable Android <-> Laptop local network connection system in the SIH26188 document-screening project so pairing happens once via QR scan, Android reconnects automatically on every subsequent launch (including after DHCP IP changes), and captured images upload reliably with no silent loss.

## Step-by-Step Execution Plan

1. **Phase 0: Architecture & Codebase Survey (3 Parallel Explorers)**
   - Explorer 1 (Backend): Investigate `backend/app/main.py`, `companion.py`, zeroconf/mDNS setup, network interface discovery, SQLite schema, current test suite.
   - Explorer 2 (Android): Investigate `SsbScreeningViewModel.kt`, `WifiUtils.kt`, `QrCodeAnalyzer.kt`, `SsbApiService.kt`, `SsbRepository.kt`, network callbacks, SharedPreferences.
   - Explorer 3 (Frontend & Integration): Investigate `frontend/src/components/ConnectModal.tsx`, companion API usage, build setup (`npm run build`), Android build setup (`./gradlew assembleDebug`).

2. **Phase 1: Project Plan & Interface Contracts**
   - Synthesize survey findings into `PROJECT.md` at project root.
   - Create `TEST_INFRA.md` for test coverage.

3. **Phase 2: Milestone Execution**
   - **Milestone 1: Backend Interface Selection, Pairing QR & Upload Idempotency**
     - R1: `select_lan_ip`, default route detection, physical interface prioritization over VPNs, mDNS registration.
     - R4: `GET /api/v1/companion/pairing-qr` endpoint.
     - R5: `capture_id` deduplication in `companion.py`.
     - R6: Remove hardcoded IP addresses.
     - R10: Structured logging.
   - **Milestone 2: Android Auto-Connect, Discovery Tiers, QR Handling, Upload Retry & Idempotency**
     - R2: Immediate background connect on init, mDNS fallback, NetworkCallback Wi-Fi change listener.
     - R3: Tier 0 (Saved) -> Tier 1 (Emulator) -> Tier 2 (mDNS 3s) -> Tier 3 (13 priority IPs).
     - R4: `QrCodeAnalyzer.kt` support for `SSBPAIR://` & `http://`.
     - R5: `capture_id` passing via `uploadCompanionCapture`.
     - R6: Normalize gateway URL blank default, eliminate hardcoded IPs.
     - R7: Retry with exponential backoff (1s, 2s, 8s, 30s, 60s), preserve image until 200 OK.
     - R10: Structured logging.
   - **Milestone 3: Desktop Connect Modal UI & Pairing QR Integration**
     - R4 & R8: ConnectModal UI with green dot for CONNECTED, spinner for CONNECTING/DISCOVERING, prominent QR code for DISCONNECTED, manual IP expandable section.
   - **Milestone 4: Backend Tests, Integration Tests & Forensic Audit**
     - R9: `backend/tests/test_network_interface.py` covering interface selection, pairing QR, upload deduplication, all existing tests passing.
     - Forensic Auditor verification.
   - **Milestone 5: Full Build, APK Delivery, Git Commit & Verification**
     - R11: `npm run build`, `./gradlew assembleDebug`, copy APK to `~/Desktop/SSB-FieldScreening.apk`, git commit.
