# Backend Codebase Survey Report: Device Tracking & Timeout Architecture

**Date**: 2026-08-23  
**Target Module**: `sih26188_project/backend`  
**Focus**: Requirement R2 (Device Tracker 8-Second Inactivity Timeout & Active Device Filtering)

---

## 1. Executive Summary

The Backend screening service runs FastAPI with an in-memory device registry (`DeviceTracker`) that intercepts all inbound client requests via FastAPI HTTP middleware (`track_device_activity_middleware`). Currently:
1. Activity is recorded on all `/api/v1/*`, `/health`, and `/api/v1/health` requests.
2. The device status is statically assigned as `"ONLINE"` on request receipt, with no background or on-demand expiration logic.
3. `GET /api/v1/devices` returns all recorded devices unconditionally (`total_devices = len(devices)`), retaining stale devices indefinitely until service restart or explicit test clearance.
4. Implementing Requirement R2 requires introducing dynamic status transition logic (8-second timeout threshold), filtering `GET /api/v1/devices` to return only active units, and adding comprehensive pytest unit and integration tests.

The backend test suite contains **242 passing tests** executed in ~6.8 seconds using the Python 3.11 virtualenv at `sih26188_project/.venv311`.

---

## 2. Codebase Inventory & Exact File Locations

| Component | File Path | Line Range | Purpose & Key Symbols |
|---|---|---|---|
| **Device Tracker Model & Registry** | `sih26188_project/backend/app/core/device_tracker.py` | `15–30` | `ConnectedClient` (Pydantic model: `client_ip`, `user_agent`, `checkpoint_id`, `last_seen`, `last_endpoint`, `total_requests`, `latency_ms`, `status`) |
| **Device Tracker Logic** | `sih26188_project/backend/app/core/device_tracker.py` | `32–101` | `DeviceTracker` class (`record_activity`, `get_all_devices`, `get_last_active_device`, `clear`), singleton `device_tracker` |
| **HTTP Interceptor Middleware** | `sih26188_project/backend/app/main.py` | `113–143` | `track_device_activity_middleware` intercepts `/api/v1/*`, `/health`, `/api/v1/health`, resolves `client_ip` from headers (`X-Forwarded-For`, `X-Real-IP`, `request.client.host`), measures round-trip latency, calls `device_tracker.record_activity(...)` |
| **Telemetry Health Endpoints** | `sih26188_project/backend/app/main.py` | `163–200` | `GET /health` (system telemetry, ONNX providers, models), `GET /api/v1/health` (Android/Tauri contract) |
| **Devices Telemetry Endpoint** | `sih26188_project/backend/app/main.py` | `203–217` | `GET /api/v1/devices` (returns `status`, `total_devices`, `devices`, `last_active_device`) |
| **Core Configuration** | `sih26188_project/backend/app/core/config.py` | `16–100` | `Settings` (Pydantic BaseSettings, calibrated thresholds, server host/port, CORS) |
| **Health API Tests** | `sih26188_project/backend/tests/test_api_health.py` | `204–225` | `test_devices_endpoint` (verifies `GET /api/v1/devices` JSON schema and basic count) |
| **Challenger Backend Tests** | `sih26188_project/backend/tests/test_challenger_m4_m5_backend.py` | `43–185` | `TestDeviceTrackerMechanics` (unit mechanics, concurrency, sorting) & `TestDevicesEndpointIntegration` (middleware, IP resolution, alias route tracking) |

---

## 3. Current Timeout Settings & Status Evaluation Analysis

### Current Implementation in `app/core/device_tracker.py`
```python
class ConnectedClient(BaseModel):
    client_ip: str = Field(description="Client IPv4/IPv6 address or hostname")
    user_agent: Optional[str] = Field(default=None, description="HTTP User-Agent header from screening client")
    checkpoint_id: Optional[str] = Field(default="SSB_SONAULI_01", description="Assigned SSB border checkpost identifier")
    last_seen: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp of most recent client activity",
    )
    last_endpoint: str = Field(default="/api/v1/inspect", description="Last HTTP endpoint accessed by client")
    total_requests: int = Field(default=1, description="Total number of requests served for this client")
    latency_ms: Optional[float] = Field(default=None, description="Latency in milliseconds of most recent request")
    status: str = Field(default="ONLINE", description="Device status: ONLINE | IDLE | OFFLINE")
```

### Analysis of Limitations
1. **Hardcoded ONLINE Status**: In `record_activity()`, `dev.status` is set to `"ONLINE"`. There is no expiration or transition logic to `"OFFLINE"`.
2. **Unfiltered Device Enumeration**: `get_all_devices()` returns `sorted(self._devices.values(), key=lambda d: d.last_seen, reverse=True)`. It does not calculate elapsed time since `last_seen`.
3. **Ghost Devices in API**: In `app/main.py:209-216`, `get_connected_devices()` returns `total_devices: len(devices)`. Once an Android tablet pings `/api/v1/health`, it remains counted in `total_devices` forever, preventing the desktop header from detecting when a handheld is disconnected or closed.

---

## 4. Proposed Precise Changes for Requirement R2

### 4.1 Changes in `sih26188_project/backend/app/core/device_tracker.py`

1. **Add Inactivity Timeout Constant**:
   ```python
   DEFAULT_OFFLINE_TIMEOUT_SECONDS: float = 8.0
   ```

2. **Add Dynamic Status Evaluator**:
   ```python
   def _evaluate_device_status(self, dev: ConnectedClient, timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS) -> str:
       try:
           last_dt = datetime.fromisoformat(dev.last_seen)
           if last_dt.tzinfo is None:
               last_dt = last_dt.replace(tzinfo=timezone.utc)
           elapsed = (datetime.now(timezone.utc) - last_dt).total_seconds()
           return "ONLINE" if elapsed <= timeout_seconds else "OFFLINE"
       except Exception:
           return "OFFLINE"

   def update_statuses(self, timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS) -> None:
       for dev in self._devices.values():
           dev.status = self._evaluate_device_status(dev, timeout_seconds=timeout_seconds)
   ```

3. **Enhance Query Methods**:
   ```python
   def get_all_devices(self, timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS, active_only: bool = False) -> List[ConnectedClient]:
       self.update_statuses(timeout_seconds=timeout_seconds)
       devices = list(self._devices.values())
       if active_only:
           devices = [d for d in devices if d.status == "ONLINE"]
       return sorted(devices, key=lambda d: d.last_seen, reverse=True)

   def get_active_devices(self, timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS) -> List[ConnectedClient]:
       return self.get_all_devices(timeout_seconds=timeout_seconds, active_only=True)

   def get_last_active_device(self, timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS, active_only: bool = True) -> Optional[ConnectedClient]:
       active_devices = self.get_active_devices(timeout_seconds=timeout_seconds)
       if not active_devices:
           return None
       return max(active_devices, key=lambda d: d.last_seen)
   ```

### 4.2 Changes in `sih26188_project/backend/app/main.py`

Update `GET /api/v1/devices` to call `device_tracker.get_active_devices()`:
```python
@app.get("/api/v1/devices", tags=["Telemetry"])
async def get_connected_devices():
    """
    Returns list of connected Android screening clients and edge terminals,
    providing IP, checkpoint ID, request counts, and round-trip latency metrics.
    Excludes OFFLINE devices (inactive > 8s) from active device count and listing.
    """
    active_devices = device_tracker.get_active_devices()
    last_device = device_tracker.get_last_active_device()
    return {
        "status": "ok",
        "total_devices": len(active_devices),
        "devices": [d.model_dump() for d in active_devices],
        "last_active_device": last_device.model_dump() if last_device else None,
    }
```

### 4.3 Changes in `sih26188_project/backend/app/core/config.py` (Recommended)
Add configurable timeout setting:
```python
DEVICE_OFFLINE_TIMEOUT_SECONDS: float = Field(
    default=8.0,
    description="Inactivity timeout in seconds before a connected field client is marked OFFLINE",
)
```

---

## 5. Pytest Test Suite Analysis & Required New Tests

### Existing Coverage (242 Tests Passing)
- `tests/test_api_health.py`: Verifies endpoints `/health`, `/api/v1/health`, `/api/v1/devices`, `/api/v1/scan/inspect`, and `/api/v1/inspect`.
- `tests/test_challenger_m4_m5_backend.py`: Verifies `DeviceTracker` lifecycle, concurrency, IP resolution from `X-Forwarded-For` and `X-Real-IP`, and empty device list.

### New Test Cases to Add in `tests/test_challenger_m4_m5_backend.py`

1. **`test_device_tracker_timeout_transition_to_offline`**:
   - Record activity for a client `192.168.2.50`.
   - Update `last_seen` timestamp to 10 seconds in the past (`datetime.now(timezone.utc) - timedelta(seconds=10)`).
   - Call `tracker.get_all_devices(active_only=False)` and verify `status == "OFFLINE"`.
   - Call `tracker.get_active_devices()` and verify result is empty `[]`.
   - Call `tracker.get_last_active_device()` and verify `None`.

2. **`test_device_tracker_reactivation_after_offline`**:
   - Set client to OFFLINE (older than 8s).
   - Call `tracker.record_activity("192.168.2.50")` to simulate fresh health ping.
   - Verify status transitions back to `"ONLINE"`, `total_requests` increments to 2, and `get_active_devices()` contains the client.

3. **`test_devices_endpoint_excludes_offline_devices`**:
   - Use FastAPI TestClient to ping `/api/v1/health` with `X-Real-IP: 192.168.2.99`.
   - Verify `/api/v1/devices` returns `total_devices == 1`.
   - Manually advance `device_tracker._devices["192.168.2.99"].last_seen` by -10 seconds.
   - Call `GET /api/v1/devices` and assert `total_devices == 0`, `devices == []`, and `last_active_device is None`.

4. **`test_devices_endpoint_mixed_active_and_offline`**:
   - Add two devices: `192.168.2.10` (active 1s ago) and `192.168.2.20` (active 12s ago).
   - Call `GET /api/v1/devices` and assert `total_devices == 1`, `devices[0]["client_ip"] == "192.168.2.10"`, and `last_active_device["client_ip"] == "192.168.2.10"`.

---

## 6. Execution Command & Environment Requirements

- **Python Version**: 3.11.16
- **Virtual Environment**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/.venv311`
- **Execution Command**:
  ```bash
  cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/backend
  /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/.venv311/bin/pytest tests/
  ```
- **Single Test Suite Execution**:
  ```bash
  /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/.venv311/bin/pytest tests/test_challenger_m4_m5_backend.py
  ```
- **Execution Output**: `242 passed in 6.81s`
