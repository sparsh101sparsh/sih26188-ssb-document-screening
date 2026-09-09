# Milestone 1 Backend Handoff Report

**Task:** Milestone 1: Backend Interface Selection, Pairing QR & Upload Idempotency  
**Agent:** teamwork_preview_worker (m1_backend)  
**Date:** 2026-08-25  

---

## 1. Observation

1. **Flaws in Network & Interface Selection:**
   - In `backend/app/main.py:99`, Zeroconf mDNS registration called `socket.gethostbyname(socket.gethostname())`, which on macOS resolves to `127.0.0.1` in `/etc/hosts` or fails on multi-interface systems. Port was hardcoded to `8000` (`main.py:105`) rather than referencing `settings.PORT`.
   - In `backend/app/api/routers/companion.py:705-748`, `_get_local_ip_addresses()` used UDP socket probe `s.connect(("8.8.8.8", 80))`, failing in air-gapped deployments, and lacked priority ranking between physical adapters and active VPNs (`utun*`).
   - In `backend/app/api/routers/companion.py:803`, a static IP (`192.168.1.105`) was hardcoded in `simulate_companion_capture`.

2. **Flaws in Upload Ingestion & Idempotency:**
   - In `backend/app/api/routers/companion.py:118-132`, SQLite table `companion_captures` lacked a `capture_id` column and deduplication logic. When Android field clients retried uploads with the same session ID, duplicate records and files were created with incremented sequence numbers.
   - Endpoint `GET /api/v1/companion/pairing-qr` required by the `SSBPAIR` protocol was absent.

3. **Verification Command & Exact Output:**
   Ran:
   ```bash
   .venv311/bin/pytest tests/test_risk_engine.py tests/test_companion_sync.py tests/test_network_interface.py
   ```
   Output:
   ```
   ============================= test session starts ==============================
   platform darwin -- Python 3.11.16, pytest-9.1.1, pluggy-1.6.0
   rootdir: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend
   plugins: asyncio-1.4.0, anyio-4.14.2
   asyncio: mode=Mode.STRICT, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
   collected 56 items

   tests/test_risk_engine.py .......................                        [ 41%]
   tests/test_companion_sync.py ....................                        [ 76%]
   tests/test_network_interface.py .............                            [100%]

   ================== 56 passed, 1 warning in 111.11s (0:01:51) ===================
   ```

---

## 2. Logic Chain

1. **Interface Priority Scoring (`backend/app/core/network.py`):**
   - Implemented `select_lan_ip(interfaces_dict=None)` using priority scoring formula:
     $$\text{Score} = (\text{is\_physical} \times 100) + (\text{is\_default\_route} \times 50) + (\text{is\_rfc1918} \times 20) - (\text{is\_vpn} \times 200) - (\text{is\_virtual} \times 150) - (\text{is\_loopback} \times 500)$$
   - Default route interface is determined through OS routing table queries (`netstat -rn -f inet` and `route -n get default` on macOS/BSD; `ip route show default` and `netstat -rn` on Linux; socket probe fallback).
   - Preserves RFC 1918 `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` addresses on physical adapters (`en0`, `eth0`, `wlan0`), while penalizing VPNs (`utun*`, `tun*`, `wg*`, `tailscale*`) and virtual bridges (`docker*`, `br*`, `vboxnet*`, `virbr*`).
   - Emits structured log entries tagged with `[Network]`.

2. **Dynamic Zeroconf Registration (`backend/app/main.py`):**
   - Lifespan context manager imports `select_lan_ip()` and dynamically obtains the primary LAN IPv4 address.
   - Binds `ServiceInfo` with `settings.PORT` (or dynamic port) instead of hardcoded 8000.
   - Emits structured log entries tagged with `[Zeroconf]`.

3. **Pairing QR & SSBPAIR Protocol (`backend/app/api/routers/companion.py`):**
   - Generates an 8-character hex `PAIRING_TOKEN` per backend startup (`uuid.uuid4().hex[:8]`).
   - Implemented `GET /api/v1/companion/pairing-qr` returning:
     ```json
     {
       "status": "active",
       "qr_payload": "SSBPAIR://<current_lan_ip>:<port>/<pairing_token>",
       "gateway_id": "SSBGateway",
       "pairing_token": "<pairing_token>",
       "current_lan_ip": "<current_lan_ip>",
       "port": 8000,
       "fallback_url": "http://<current_lan_ip>:<port>",
       "timestamp": 1771995840.12
     }
     ```

4. **Upload Idempotency with `capture_id`:**
   - In `PersistentCompanionStore._init_storage()`, added migration check `ALTER TABLE companion_captures ADD COLUMN capture_id TEXT;` and created index `idx_companion_captures_capture_id`.
   - In `set_capture()`, if `capture_id` is supplied and already present in SQLite, returns existing `CompanionCaptureState` with `is_duplicate=True` and status `"DUPLICATE"` without inserting new rows or writing duplicate files to disk.
   - In `upload_companion_capture()`, accepts `capture_id: Optional[str] = Form(None)` and JSON body `capture_id`. When duplicate is detected, responds with HTTP 200:
     ```json
     {
       "status": "duplicate",
       "capture_uuid": "<existing_uuid>",
       "capture_id": "<capture_id>",
       "message": "Already received",
       "sequence_id": 1,
       ...
     }
     ```
   - Added alias route `@router.post("/capture")` matching `/upload`.
   - Eliminated hardcoded simulated IP `192.168.1.105`.

---

## 3. Caveats

- **Network Interface Dynamic Changes:** While `select_lan_ip()` dynamically evaluates interfaces upon each invocation, mDNS Zeroconf service registration currently occurs at application startup in `main.py:lifespan`. If network adapters are plugged in or switched after launch, restarting the service or triggering re-registration will re-broadcast the new IP.
- No other caveats.

---

## 4. Conclusion

Milestone 1 requirements R1, R4, R5, and R6 for the backend are fully implemented and verified:
- `select_lan_ip` accurately discriminates physical Wi-Fi/Ethernet from VPNs and bridges while supporting 10.x.x.x LANs.
- `GET /api/v1/companion/pairing-qr` provides the standardized `SSBPAIR` payload and per-process ephemeral token.
- Capture upload idempotency guarantees that retried field transmissions do not create duplicate database entries, disk files, or sequence increments.
- Hardcoded static IP addresses have been completely eradicated from backend modules.
- All 56 tests across risk engine, companion sync, and network interface suites pass cleanly.

---

## 5. Verification Method

To independently verify:
```bash
cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend
.venv311/bin/pytest tests/test_network_interface.py tests/test_companion_sync.py tests/test_risk_engine.py -v
```

Files to inspect:
- `backend/app/core/network.py`
- `backend/app/main.py`
- `backend/app/api/routers/companion.py`
- `backend/app/api/v1/endpoints/companion.py`
- `backend/tests/test_network_interface.py`
