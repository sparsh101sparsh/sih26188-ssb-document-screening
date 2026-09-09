# Explorer Handoff Report — Backend Codebase Survey

## 1. Observation
- **`backend/app/main.py:99`**: `_host_ip = socket.gethostbyname(socket.gethostname())` resolves to `127.0.0.1` on macOS and Linux with default `/etc/hosts` configurations. Zeroconf advertises loopback IP across mDNS.
- **`backend/app/main.py:105`**: `port=8000` hardcoded in `ServiceInfo` instead of `settings.PORT`.
- **`backend/app/api/routers/companion.py:713-720`**: `s.connect(("8.8.8.8", 80))` raises `[Errno 1] Operation not permitted` in sandboxed environments and fails in air-gapped deployments without internet routing.
- **`backend/app/api/routers/companion.py:118-132`**: SQLite table `companion_captures` lacks a `capture_id` column and deduplication logic. Multiple uploads with the same `sessionId` from Android create duplicate rows in SQLite, duplicate files in `companion_store/`, and duplicate SSE events.
- **`backend/app/api/routers/companion.py`**: Lacks the `GET /api/v1/companion/pairing-qr` endpoint required by R4 for `SSBPAIR://` QR protocol.
- **Existing Test Execution**:
  - `sih26188_project/.venv311/bin/pytest tests/test_risk_engine.py` passes 23/23 tests.
  - `sih26188_project/.venv311/bin/pytest tests/test_companion_sync.py` passes 20/20 tests.
- **Available System Tools**: `psutil` is installed in `.venv311`, allowing `psutil.net_if_addrs()` and `psutil.net_if_stats()`. Subprocess fallback `netstat -rn` correctly identifies default gateway interface `en0`.

## 2. Logic Chain
1. **mDNS & Interface Selection (R1)**: Since `socket.gethostname()` returns loopback and UDP probe to `8.8.8.8` fails without internet or permissions, IP discovery must prioritize physical interfaces (`en0`, `eth0`, `wlan0`) over VPN/virtual interfaces (`utun*`, `docker*`), cross-reference with default routing table (`netstat -rn` / `ip route`), and support RFC 1918 subnets (including 10.x.x.x without blacklisting).
2. **Pairing Endpoint (R4)**: Frontend `ConnectModal.tsx` and Android `QrCodeAnalyzer.kt` need standard `SSBPAIR://` protocol representation. Backend must generate an 8-character ephemeral pairing token on startup and expose `GET /api/v1/companion/pairing-qr` returning `qr_payload`, `gateway_id`, `pairing_token`, `current_lan_ip`, `port`, and `fallback_url`.
3. **Upload Deduplication (R5)**: In poor field Wi-Fi conditions, Android outbox sync retries. By adding `capture_id` to `companion_captures` (with a unique index) and checking `capture_id` in `set_capture()` / `upload_companion_capture()`, the backend guarantees idempotency and returns `status: "duplicate"` with the existing `capture_uuid`.
4. **Hardcoded IP Elimination (R6)**: Hardcoded references such as `192.168.1.61` and static IPs in client/simulation must be removed or replaced with dynamic/empty defaults.
5. **Testing (R9)**: `test_network_interface.py` must be added to cover interface priority scoring, routing fallback, QR pairing endpoint, and duplicate upload deduplication.

## 3. Caveats
- No model weight files are downloaded locally in `models/` (they default to external volume `/Volumes/issparsh/sih26188_models`); tests relying on live ONNX model weights fall back or need mock stubs, but pure unit tests (`test_risk_engine.py`, `test_companion_sync.py`, and the new `test_network_interface.py`) run entirely standalone.
- In macOS sandbox, `route -n get default` requires raw socket privileges and returns exit status 71 (`Operation not permitted`), whereas `netstat -rn` executes without errors. The routing detector must try `netstat -rn` first or fallback gracefully.

## 4. Conclusion
The backend investigation is complete. All flaws and exact code paths have been mapped, and a comprehensive specification is recorded in `survey_backend.md`. The implementation plan provides clear designs for `backend/app/core/network.py` (R1), `GET /api/v1/companion/pairing-qr` (R4), SQLite `capture_id` deduplication in `companion.py` (R5), hardcoded IP cleanup (R6), and `backend/tests/test_network_interface.py` (R9).

## 5. Verification Method
1. Inspect survey report:
   `view_file` on `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_backend/survey_backend.md`
2. Validate existing backend test suites:
   `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/.venv311/bin/pytest tests/test_risk_engine.py tests/test_companion_sync.py`
