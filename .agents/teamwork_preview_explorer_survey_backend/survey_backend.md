# Backend Codebase Survey & Technical Specification
**Project:** SIH26188 AI-Based Fake Identity & Document Screening System  
**Component:** Edge Backend (`sih26188_project/backend`)  
**Investigator:** teamwork_preview_explorer (Survey Backend)  
**Date:** 2026-08-25  
**Target Requirements:** R1, R4, R5, R6, R9  

---

## 1. Executive Summary & Codebase Map

The backend service is an air-gapped, high-throughput edge appliance built with **FastAPI**, **SQLite (WAL mode)**, **Pydantic v2**, and modular ML/forensic pipelines. It exposes REST endpoints and Server-Sent Events (SSE) for frontline Android field devices and desktop operator workstations.

### 1.1 Codebase File Organization

```
backend/
├── app/
│   ├── main.py                     # FastAPI entrypoint, lifespan context manager, mDNS Zeroconf registration
│   ├── api/
│   │   ├── routers/
│   │   │   ├── companion.py        # PersistentCompanionStore (SQLite + Disk Enclave), SSE broadcaster, uploads
│   │   │   ├── scan.py             # Master 3-Stream multi-modal inspection endpoint (/api/v1/scan/inspect)
│   │   │   ├── biometrics.py       # Face detection, 1:1 matching, liveness inspection
│   │   │   ├── forensics.py        # ELA, tamper detection, metadata, stamp verification
│   │   │   ├── ocr.py              # Multilingual PP-OCRv4, MRZ parser, Aadhaar QR decoder
│   │   │   └── models.py           # Model status and hardware telemetry
│   │   └── v1/
│   │       ├── api.py              # API v1 router aggregator
│   │       └── endpoints/
│   │           └── companion.py    # Companion router re-exports
│   ├── core/
│   │   ├── config.py               # Central Settings (Pydantic BaseSettings), thresholds, ports
│   │   ├── device_tracker.py       # Thread-safe in-memory client telemetry tracker
│   │   ├── backend_selector.py     # Hardware accelerator detection (CoreML / CUDA / CPU)
│   │   └── logging.py              # Structured logging configuration
│   └── data/
│       ├── companion.db            # Persistent SQLite database (WAL journal mode)
│       └── companion_store/        # File enclave: YYYY-MM-DD/{uuid}_{filename}
└── tests/
    ├── test_risk_engine.py         # 23 tests (Stage 1 tripwires, Stage 2 log-odds Bayesian fusion) -> PASSING (23/23)
    ├── test_companion_sync.py      # 20 tests (Lifecycle, multipart, base64, concurrency, buffer) -> PASSING (20/20)
    └── ... (Additional integration and challenger test suites)
```

---

## 2. Deep-Dive Investigation of Backend Subsystems

### 2.1 Main Lifespan & mDNS / Zeroconf Registration (`app/main.py`)
- **Lifecycle Setup:** `lifespan(app: FastAPI)` context manager initializes hardware execution providers, checks ONNX model checkpoints, loads stamp registry and UIDAI root certs, and registers mDNS Zeroconf service on startup; unregisters on shutdown.
- **Observed Flaws in `main.py` lines 90–115:**
  1. `socket.gethostbyname(socket.gethostname())` (line 99):
     - On macOS and many Linux distros, `socket.gethostname()` resolves to `127.0.0.1` or `127.0.1.1` in `/etc/hosts`.
     - When Zeroconf broadcasts `addresses=[socket.inet_aton(_host_ip)]` with `127.0.0.1`, Android devices on LAN receive loopback address and fail to connect.
  2. Hardcoded port: `port=8000` is used directly in `ServiceInfo` instead of `settings.PORT`.
  3. No fallback or logging of interface selection rationale.

### 2.2 Companion Ingestion & Storage Architecture (`app/api/routers/companion.py`)
- **Class `PersistentCompanionStore` (lines 90–435):**
  - Thread-safe RLock protection (`self._lock = threading.RLock()`).
  - SQLite database initialized at `backend/data/companion.db` with `PRAGMA journal_mode=WAL;`.
  - Schema:
    ```sql
    CREATE TABLE IF NOT EXISTS companion_captures (
        sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
        capture_uuid TEXT UNIQUE NOT NULL,
        capture_type TEXT NOT NULL,
        device_id TEXT NOT NULL,
        checkpoint_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        sha256_hash TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
        status TEXT NOT NULL DEFAULT 'RECEIVED',
        created_at REAL NOT NULL
    );
    ```
  - Disk Enclave: Writes raw binary bytes to `backend/data/companion_store/YYYY-MM-DD/{capture_uuid[:8]}_{safe_filename}`.
  - SSE Broadcast: Triggers `sse_broadcaster.broadcast("NEW_CAPTURE", {...})` on every successful save.
  - Ring buffer maintenance: Prunes oldest records beyond `max_buffer_size` (default 50).
- **Observed Flaws in `companion.py`:**
  1. **No `capture_id` deduplication:** The table lacks a `capture_id` column. When Android retries an upload with the same `sessionId`, `set_capture` generates a new `capture_uuid`, creates a new SQLite row, writes another file to disk, and triggers duplicate SSE broadcasts.
  2. **UDP Probe Network Detection Flaw (`_get_local_ip_addresses` lines 705–748):**
     - Uses `s.connect(("8.8.8.8", 80))`. In air-gapped military/border environments (or sandboxed macOS environments), external IP probe fails with `[Errno 1] Operation not permitted` or connection timeout.
     - Fallback uses unstructured `ifconfig` regex without interface priority ranking.
  3. **Missing `GET /api/v1/companion/pairing-qr` (R4):**
     - Only `GET /api/v1/companion/info` exists.
     - Lacks `SSBPAIR://` QR protocol payload, gateway ID, and per-restart ephemeral pairing token.
  4. **Hardcoded IP in Simulation (`companion.py:803`):**
     - Hardcoded `client_ip="192.168.1.105"` in `simulate_companion_capture`.

### 2.3 Existing Test Suite & Environment
- Python Virtual Environment: `sih26188_project/.venv311/bin/pytest`
- Pytest execution verified:
  - `tests/test_risk_engine.py`: **23 passed** in 5.41s
  - `tests/test_companion_sync.py`: **20 passed** in 4.39s
- Python network modules available in environment: `psutil` (available), `socket` (available), `subprocess` (available), `zeroconf` (available/optional).

---

## 3. Requirement-by-Requirement Implementation Plan

### R1. Robust Backend Interface Selection (`select_lan_ip`)

#### Current Problem
1. `socket.gethostbyname(socket.gethostname())` resolves to `127.0.0.1` on macOS.
2. UDP probe `("8.8.8.8", 80)` fails in air-gapped environments.
3. Active VPNs (`utun0`, `wg0`, `tailscale0`) or VM bridges (`docker0`, `vboxnet0`) take precedence over physical Wi-Fi/Ethernet (`en0`, `eth0`, `wlan0`), causing Android companion pairing to fail.

#### Recommended Solution Architecture
Create a dedicated network discovery module `backend/app/core/network.py` implementing `select_lan_ip(interfaces_dict=None)`.

**Algorithm Specification:**
1. **Interface Discovery:**
   - Use `psutil.net_if_addrs()` and `psutil.net_if_stats()` if available.
   - If `interfaces_dict` is passed (for unit testing), use it directly.
2. **Default Route Detection:**
   - Query system routing table via `netstat -rn` (macOS/Linux) or `ip route show default` (Linux) or `route -n get default` (macOS fallback).
   - Identify default gateway interface (e.g. `en0`).
3. **Scoring & Priority Matrix:**
   - Physical Wi-Fi/Ethernet (`en0`, `en1`, `eth0`, `eth1`, `wlan0`, `wlan1`, `wlp*`): Base score **+100**
   - Matches Default Routing Interface: **+50**
   - Interface is UP (`isup=True` via `psutil.net_if_stats`): **+30**
   - RFC 1918 Private IPv4 Addresses:
     - `192.168.0.0/16`: **+20**
     - `172.16.0.0/12`: **+15**
     - `10.0.0.0/8`: **+10** (DO NOT blacklist 10.x.x.x globally; physical interfaces on 10.x.x.x remain valid LANs)
   - Virtual / VPN Interfaces (`utun*`, `tun*`, `tap*`, `wg*`, `tailscale*`, `docker*`, `bridge*`, `vbox*`, `vmnet*`, `virbr*`): Penalty **-100** (or score = 0)
   - Loopback (`lo`, `lo0`, `127.*`): Score **-200**
4. **Tie-Breaker:**
   - Sort candidates by `(priority_score, interface_name)` descending.
   - Return IPv4 of top-scoring interface.
   - If no valid LAN interface is found, fallback to `"127.0.0.1"`.
5. **Structured Logging:**
   - Log evaluated interfaces with their assigned scores and chosen IP.

#### Integration Points:
- `backend/app/main.py`:
  ```python
  from app.core.network import select_lan_ip
  _host_ip = select_lan_ip()
  _zc_info = ServiceInfo(
      "_ssb-gateway._tcp.local.",
      "SSBGateway._ssb-gateway._tcp.local.",
      addresses=[socket.inet_aton(_host_ip)],
      port=settings.PORT,
      properties={"path": "/", "version": settings.APP_VERSION},
      server=f"{socket.gethostname()}.local.",
  )
  ```
- `backend/app/api/routers/companion.py`:
  - Replace `_get_local_ip_addresses()` with `get_lan_ip_addresses()` and `select_lan_ip()`.

---

### R4. QR Idempotent Pairing with `SSBPAIR` Protocol (`GET /api/v1/companion/pairing-qr`)

#### Endpoint Specification
- **Path:** `GET /api/v1/companion/pairing-qr`
- **Tags:** `["Companion Camera Sync"]`
- **Summary:** `Fetch SSBPAIR QR Code Pairing Payload & Gateway Metadata`

#### Response Schema (`PairingQRResponse`):
```json
{
  "status": "ok",
  "qr_payload": "SSBPAIR://SSBGateway/a1b2c3d4",
  "gateway_id": "SSBGateway",
  "pairing_token": "a1b2c3d4",
  "current_lan_ip": "172.16.65.119",
  "port": 8000,
  "fallback_url": "http://172.16.65.119:8000",
  "timestamp": 1771995840.12
}
```

#### Technical Design Details:
1. **Pairing Token Generation:**
   - Generate an 8-character hex token on backend startup: `_PAIRING_TOKEN = uuid.uuid4().hex[:8]`.
   - Store on `companion_store.pairing_token`.
2. **Payload Formatting:**
   - `qr_payload`: `f"SSBPAIR://SSBGateway/{companion_store.pairing_token}"`
   - `fallback_url`: `f"http://{current_lan_ip}:{settings.PORT}"`
3. **Compatibility:**
   - Existing `GET /api/v1/companion/info` endpoint remains intact for backward compatibility.
   - Frontend `ConnectModal.tsx` fetches from `/api/v1/companion/pairing-qr` to render the pairing QR code.

---

### R5. Upload Idempotency with `capture_id`

#### Current Vulnerability
Android field client stores pending captures in SQLite outbox with a unique `sessionId` (e.g. `uuid4`). If Wi-Fi signal drops during HTTP response delivery, Android re-transmits the capture. Backend currently treats this as a brand new capture, duplicating sequence IDs, disk storage, and operator alerts.

#### Recommended Implementation
1. **SQLite Schema Migration (`backend/app/api/routers/companion.py`):**
   Update `_init_storage()`:
   ```python
   conn.execute("""
       CREATE TABLE IF NOT EXISTS companion_captures (
           sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
           capture_uuid TEXT UNIQUE NOT NULL,
           capture_id TEXT,
           capture_type TEXT NOT NULL,
           device_id TEXT NOT NULL,
           checkpoint_id TEXT NOT NULL,
           filename TEXT NOT NULL,
           file_path TEXT NOT NULL,
           file_size_bytes INTEGER NOT NULL,
           sha256_hash TEXT NOT NULL,
           mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
           status TEXT NOT NULL DEFAULT 'RECEIVED',
           created_at REAL NOT NULL
       );
   """)
   # Ensure migration for existing databases without recreate:
   try:
       conn.execute("ALTER TABLE companion_captures ADD COLUMN capture_id TEXT;")
   except sqlite3.OperationalError:
       pass  # Column already exists
   conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_companion_capture_id ON companion_captures(capture_id) WHERE capture_id IS NOT NULL;")
   ```

2. **`CompanionStore.set_capture()` Update:**
   - Signature:
     ```python
     def set_capture(
         self,
         capture_type: str,
         image_bytes: bytes,
         filename: str = "capture.jpg",
         device_id: str = "unknown",
         checkpoint_id: str = "WB-JAI-01",
         mime_type: Optional[str] = None,
         capture_id: Optional[str] = None,
     ) -> Tuple[CompanionCaptureState, bool]:  # (state, is_duplicate)
     ```
   - Deduplication Check:
     ```python
     if capture_id:
         cursor.execute("SELECT * FROM companion_captures WHERE capture_id = ? LIMIT 1;", (capture_id,))
         existing_row = cursor.fetchone()
         if existing_row:
             logger.info(f"[PersistentCompanionStore] Duplicate capture_id '{capture_id}' detected (seq #{existing_row['sequence_id']}). Returning existing record.")
             return self._row_to_state(existing_row), True
     ```

3. **`upload_companion_capture` Endpoint Update:**
   - Accept `capture_id: Optional[str] = Form(None)` in multipart requests.
   - Accept `capture_id` in JSON body and `CompanionUploadRequest` schema.
   - If `is_duplicate` is True, return HTTP 200:
     ```json
     {
       "status": "duplicate",
       "message": "Already received",
       "sequence_id": state.sequence_id,
       "capture_uuid": state.capture_uuid,
       "capture_id": capture_id,
       "capture_type": state.capture_type,
       "device_id": state.device_id,
       "checkpoint_id": state.checkpoint_id,
       "filename": state.filename,
       "sha256_hash": state.sha256_hash,
       "file_size_bytes": state.file_size_bytes,
       "timestamp": state.timestamp
     }
     ```
   - If not duplicate, return existing HTTP 201/200 format with `"status": "success"` and trigger SSE broadcast.

---

### R6. Elimination of Hardcoded IPs

#### Audit of Hardcoded IP Instances:
1. `backend/app/api/routers/companion.py:803`: `client_ip="192.168.1.105"` in simulation endpoint -> Change to dynamic or `"127.0.0.1"`.
2. `backend/app/main.py:99`: `socket.gethostbyname(...)` -> Replaced by `select_lan_ip()`.
3. `android-screening/.../WifiConnectScreen.kt:95`: `currentGatewayUrl = "http://192.168.1.61:8000"` -> Replace default with `""`.
4. `android-screening/.../SsbScreeningViewModel.kt:62, 89`: `customGatewayUrl = "http://192.168.1.61:8000"` -> Replace with `""`.
5. `android-screening/.../WifiUtils.kt:106`: `if (input.isBlank()) return "http://192.168.1.61:8000"` -> Replace with `if (input.isBlank()) return ""`.

---

### R9. Backend Test Suite Specification (`backend/tests/test_network_interface.py`)

A new test file `backend/tests/test_network_interface.py` must be added to provide comprehensive verification:

```python
"""
SIH26188 — Backend Network Interface Selection & Pairing Test Suite
Covers:
1. select_lan_ip interface priority scoring (Physical Wi-Fi over VPN, Ethernet over bridge)
2. select_lan_ip routing table default gateway integration
3. Non-blacklisting of RFC 1918 10.x.x.x LAN subnets
4. Fallback to loopback 127.0.0.1 when no interface is available
5. GET /api/v1/companion/pairing-qr endpoint payload and SSBPAIR protocol compliance
6. Upload deduplication with duplicate capture_id
"""
```

**Key Test Cases to Implement:**
1. `test_select_lan_ip_wifi_over_vpn`:
   - Mock interfaces: `utun0` (10.8.0.5, VPN) and `en0` (192.168.1.45, Wi-Fi).
   - Expected output: `192.168.1.45`.
2. `test_select_lan_ip_ethernet_only`:
   - Mock interfaces: `eth0` (10.10.5.20, Physical Ethernet) and `docker0` (172.17.0.1, Bridge).
   - Expected output: `10.10.5.20`.
3. `test_select_lan_ip_10_dot_lan_preserved`:
   - Validates that a 10.x.x.x IP on physical `en0` / `eth0` is chosen and NOT discarded as VPN.
4. `test_select_lan_ip_fallback_loopback`:
   - Mock interfaces: `lo0` (127.0.0.1).
   - Expected output: `127.0.0.1`.
5. `test_pairing_qr_endpoint_contract`:
   - Client calls `GET /api/v1/companion/pairing-qr`.
   - Asserts HTTP 200, `qr_payload.startswith("SSBPAIR://SSBGateway/")`, `len(pairing_token) == 8`, `current_lan_ip` is valid IPv4, `port == 8000`, `fallback_url.startswith("http://")`.
6. `test_upload_deduplication_with_capture_id`:
   - First upload with `capture_id="batch-uuid-001"`, `capture_type="selfie"`:
     - Returns HTTP 200, `status == "success"`, `sequence_id == 1`.
   - Second upload with same `capture_id="batch-uuid-001"`, `capture_type="selfie"`:
     - Returns HTTP 200, `status == "duplicate"`, `sequence_id == 1`, `capture_uuid` matches first upload.
     - CompanionStore buffer count remains 1 (no duplicate row created in SQLite).
7. `test_upload_without_capture_id_backwards_compatible`:
   - Standard upload without `capture_id` parameter continues to increment sequence IDs normally.

---

## 4. Exact File Modification Checklist

| File | Change Summary |
|---|---|
| `backend/app/core/network.py` | **NEW FILE**: Implement `select_lan_ip`, `get_all_lan_interfaces`, interface priority scoring, and routing table detection. |
| `backend/app/main.py` | Import `select_lan_ip`. Update Zeroconf lifespan registration with `select_lan_ip()` and `settings.PORT`. |
| `backend/app/api/routers/companion.py` | 1. Add `capture_id` column and unique index to `companion_captures`.<br>2. Update `CompanionStore.set_capture()` with duplicate check.<br>3. Add `GET /api/v1/companion/pairing-qr` endpoint.<br>4. Update `upload_companion_capture` to accept `capture_id` and return duplicate payload.<br>5. Update `_get_local_ip_addresses()` to use `select_lan_ip()`.<br>6. Clean up hardcoded simulated client IP. |
| `backend/app/api/v1/endpoints/companion.py` | Re-export new functions and models (`PairingQRResponse`, etc.) if needed. |
| `backend/tests/test_network_interface.py` | **NEW FILE**: Complete test suite verifying R1, R4, R5, R6. |

---

## 5. Verification Commands

To verify backend changes once implemented:
1. **Network Interface & QR Test Suite:**
   ```bash
   .venv311/bin/pytest tests/test_network_interface.py -v
   ```
2. **Companion Sync Test Suite:**
   ```bash
   .venv311/bin/pytest tests/test_companion_sync.py -v
   ```
3. **Risk Engine Test Suite:**
   ```bash
   .venv311/bin/pytest tests/test_risk_engine.py -v
   ```
4. **All Backend Tests:**
   ```bash
   .venv311/bin/pytest tests/
   ```
