# Forensic Audit Report — Milestone 4

**Work Product**: SIH26188 Document Screening System (Backend, Android, Frontend)  
**Profile**: General Project  
**Verdict**: CLEAN  

---

## 1. Observation

### 1.1 Static Source Analysis
1. **Backend Interface Selection (`backend/app/core/network.py`)**:
   - `select_lan_ip()` and `score_interface()` implement priority scoring:
     $$\text{Score} = (\text{is\_physical} \times 100) + (\text{is\_default\_route} \times 50) + (\text{is\_rfc1918} \times 20) - (\text{is\_vpn} \times 200) - (\text{is\_virtual} \times 150) - (\text{is\_loopback} \times 500)$$
   - Default route detection via `netstat -rn -f inet`, `route -n get default`, `ip route show default`, with fallback to UDP socket probing (`app/core/network.py:128-193`).
   - Zeroconf broadcast in `backend/app/main.py:91-116` binds to `select_lan_ip()` output and `settings.PORT`.
2. **Pairing & Deduplication API (`backend/app/api/routers/companion.py`)**:
   - `GET /api/v1/companion/pairing-qr` dynamically outputs `SSBPAIR://<ip>:<port>/<token>`, ephemeral 8-char `pairing_token`, `current_lan_ip`, and `fallback_url` (`companion.py:845-873`).
   - SQLite migration in `PersistentCompanionStore._init_storage` adds `capture_id` with index `idx_companion_captures_capture_id` (`companion.py:161-168`).
   - `set_capture()` enforces idempotency: when duplicate `capture_id` is supplied, it returns existing record with `status: "DUPLICATE"` and does not insert duplicate rows (`companion.py:233-281`).
3. **Android Client Implementation**:
   - `WifiUtils.kt:127-154`: `parseQrPayload()` decodes `SSBPAIR://` protocols with host/port parsing and fallback.
   - `WifiUtils.kt:284-378`: `discoverGatewayOnSubnet()` strictly enforces 4-tier discovery order: Tier 0 (Saved URL, 1000ms) -> Tier 1 (Emulator 10.0.2.2, 400ms, guarded by `isEmulator()`) -> Tier 2 (mDNS NSD, 3000ms) -> Tier 3 (13 priority subnet IPs in parallel, 350ms).
   - `SsbScreeningViewModel.kt:117-154`: Registers `ConnectivityManager.NetworkCallback` for automatic Wi-Fi reconnection upon network handover and executes async 1.5s gateway verification on `init`.
   - `SsbApiService.kt:37-43`: Multipart upload accepts `@Part("capture_id") captureId: RequestBody?`.
   - `SsbRepository.kt:40-43, 298-355`: Outbox synchronization implements 5-stage exponential backoff retry delays `[0ms, 2000ms, 8000ms, 30000ms, 60000ms]` and caps at `MAX_RETRY_ATTEMPTS = 5` marking `sync_status = "FAILED"`.
4. **Frontend Connect Modal UI (`frontend/src/components/ConnectModal.tsx`)**:
   - Real-time connection state machine (`CONNECTED` green pulse, `CONNECTING` spinner, `DISCONNECTED` QR view) (`ConnectModal.tsx:338-386`).
   - Expandable drawer for manual IP/port entry with IPv4 regex validation (`ConnectModal.tsx:56, 647-800`).
   - Zero hardcoded static IPs (`192.168.1.61`, `10.198.211`) in production code.

### 1.2 Prohibited Patterns & Secret Scan
- Ripgrep scan across entire codebase for `192.168.1.61` and `10.198.211`:
  - Result: 0 matches in production source files. (Only present in test assertion files `connect_modal_pairing.test.tsx` and `connect_modal_pairing.test.bundle.cjs` where they are explicitly asserted NOT to exist).
- Zero mock facades in production modules (`network.py`, `companion.py`, `WifiUtils.kt`, `SsbRepository.kt`, `ConnectModal.tsx`).

### 1.3 Dynamic Test Execution Results
- **Backend Unit & Risk Engine Tests**:
  - Command: `.venv311/bin/pytest tests/test_network_interface.py tests/test_risk_engine.py -v`
  - Output: `36 passed, 1 warning in 106.25s` (13/13 `test_network_interface.py`, 23/23 `test_risk_engine.py`).
- **Android Unit Tests**:
  - Command: `JAVA_HOME="/opt/homebrew/Cellar/openjdk@21/21.0.12/libexec/openjdk.jdk/Contents/Home" ./gradlew testDebugUnitTest --rerun-tasks`
  - Output: `BUILD SUCCESSFUL in 34s (32 actionable tasks: 32 executed)`
  - XML Parse: `TOTAL: 54 tests, 0 failures, 0 errors, 0 skipped` across 10 test suites.
- **Frontend Unit Tests & Production Build**:
  - Command: `node tests/run_tests.mjs`
  - Output: `ALL TEST SUITES EXECUTED AND PASSED WITH ZERO ERRORS! (38 passed, 0 failed)`
  - Command: `npm run build`
  - Output: `✓ built in 1.67s`

---

## 2. Logic Chain

1. **Premise 1**: All modified files were analyzed for fake logic, hardcoded returns, and test facades.
   - Observation 1.1 confirms that LAN scoring, route table extraction, SQLite schema migration, idempotency checks, 4-tier Android discovery, exponential backoff, and vector QR generation are authentically implemented.
2. **Premise 2**: A clean work product must contain no forbidden static IP addresses in production code.
   - Observation 1.2 confirms that `192.168.1.61` and `10.198.211` have been eradicated from production source code.
3. **Premise 3**: Independent test execution across all modified subsystems must pass completely without bypassing core logic.
   - Observation 1.3 confirms backend network tests (13/13), backend risk engine (23/23), Android unit tests (54/54), and Frontend test suites (38/38) alongside production builds pass cleanly.
4. **Conclusion**: The codebase satisfies all integrity criteria under Development, Demo, and Benchmark standards.

---

## 3. Caveats

No caveats. All subsystems were empirically tested and validated.

---

## 4. Conclusion

The Milestone 4 work product is authentic, robust, and free of mock facades or hardcoded shortcuts. The forensic audit verdict is **CLEAN**.

---

## 5. Verification Method

To independently verify this verdict, execute the following commands in each respective project directory:

```bash
# 1. Backend Network & Risk Engine Tests
cd sih26188_project/backend
.venv311/bin/pytest tests/test_network_interface.py tests/test_risk_engine.py -v

# 2. Android Screening Unit Tests
cd ../android-screening
JAVA_HOME="/opt/homebrew/Cellar/openjdk@21/21.0.12/libexec/openjdk.jdk/Contents/Home" ./gradlew testDebugUnitTest

# 3. Frontend Unit Tests & Build
cd ../frontend
node tests/run_tests.mjs
npm run build
```
