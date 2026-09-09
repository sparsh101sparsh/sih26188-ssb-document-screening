"""
SIH26188 — Connected Device Tracker & Observability Module
Architecture Reference: R4, R5, Section 7.2

Maintains thread-safe in-memory state of connected Android screening clients and edge terminals.
Tracks explicit device identity (device_id), connection mode (wifi/usb), battery level,
app version, activity timestamps, and round-trip request latency.
"""

import threading
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ConnectedClient(BaseModel):
    """
    Schema representing a registered client device accessing the edge gateway.
    """
    device_id: str = Field(description="Unique device identifier (e.g. FIELD-DEV-XXXX or client IP)")
    device_name: Optional[str] = Field(default=None, description="Human-readable device model / label")
    client_ip: str = Field(default="127.0.0.1", description="Client IPv4/IPv6 address")
    connection_type: str = Field(default="wifi", description="Connection medium: wifi | usb | ethernet")
    app_version: Optional[str] = Field(default=None, description="Client software version")
    battery_level: Optional[int] = Field(default=None, description="Reported battery percentage (0-100)")
    user_agent: Optional[str] = Field(default=None, description="HTTP User-Agent header from screening client")
    checkpoint_id: Optional[str] = Field(default="SSB_SONAULI_01", description="Assigned SSB border checkpost identifier")
    last_seen: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp of most recent client activity",
    )
    last_seen_ts: float = Field(
        default_factory=time.time,
        description="Unix epoch timestamp of most recent client activity",
    )
    last_endpoint: str = Field(default="/api/v1/inspect", description="Last HTTP endpoint accessed by client")
    total_requests: int = Field(default=1, description="Total number of requests served for this client")
    latency_ms: Optional[float] = Field(default=None, description="Latency in milliseconds of most recent request")
    status: str = Field(default="ONLINE", description="Device status: ONLINE | STALE | OFFLINE")


# Timeout thresholds (seconds)
ONLINE_THRESHOLD_SECONDS: float = 10.0
STALE_THRESHOLD_SECONDS: float = 30.0


class DeviceTracker:
    """
    Thread-safe in-memory device registry for edge appliance monitoring.
    Keyed primarily by device_id to support multiple devices over USB ADB reverse
    (where all incoming requests share client_ip=127.0.0.1).
    """

    def __init__(self) -> None:
        self._devices: Dict[str, ConnectedClient] = {}
        self._lock = threading.RLock()

    def _evaluate_device_status(self, dev: ConnectedClient) -> str:
        """
        Evaluates dynamic device status based on elapsed time since last_seen_ts.
        < 10s: ONLINE
        10s - 30s: STALE
        > 30s: OFFLINE
        """
        now = time.time()
        elapsed = now - dev.last_seen_ts
        if elapsed <= ONLINE_THRESHOLD_SECONDS:
            return "ONLINE"
        elif elapsed <= STALE_THRESHOLD_SECONDS:
            return "STALE"
        else:
            return "OFFLINE"

    def update_statuses(self) -> None:
        """
        Refreshes the status attribute of all tracked devices.
        """
        with self._lock:
            for dev in self._devices.values():
                dev.status = self._evaluate_device_status(dev)

    def record_activity(
        self,
        client_ip: str,
        device_id: Optional[str] = None,
        device_name: Optional[str] = None,
        connection_type: Optional[str] = None,
        battery_level: Optional[int] = None,
        app_version: Optional[str] = None,
        user_agent: Optional[str] = None,
        endpoint: str = "/api/v1/inspect",
        checkpoint_id: Optional[str] = None,
        latency_ms: Optional[float] = None,
    ) -> ConnectedClient:
        """
        Records or updates an activity event from a field screening client.
        Primary key is device_id if provided; falls back to client_ip.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        now_ts = time.time()

        # Resolve primary key
        key = (device_id or "").strip()
        if not key:
            key = f"ip_{client_ip}"

        # Detect USB connection if client_ip is loopback
        inferred_conn = connection_type
        if not inferred_conn:
            inferred_conn = "usb" if client_ip in ("127.0.0.1", "::1", "localhost") else "wifi"

        with self._lock:
            if key in self._devices:
                dev = self._devices[key]
                dev.client_ip = client_ip
                dev.last_seen = now_iso
                dev.last_seen_ts = now_ts
                dev.last_endpoint = endpoint
                dev.total_requests += 1
                if device_name:
                    dev.device_name = device_name
                if connection_type:
                    dev.connection_type = connection_type
                elif inferred_conn:
                    dev.connection_type = inferred_conn
                if battery_level is not None:
                    dev.battery_level = battery_level
                if app_version:
                    dev.app_version = app_version
                if user_agent:
                    dev.user_agent = user_agent
                if checkpoint_id:
                    dev.checkpoint_id = checkpoint_id
                if latency_ms is not None:
                    dev.latency_ms = round(latency_ms, 2)
                dev.status = "ONLINE"
                return dev

            dev = ConnectedClient(
                device_id=device_id or key,
                device_name=device_name or "Android Field Scanner",
                client_ip=client_ip,
                connection_type=inferred_conn,
                app_version=app_version,
                battery_level=battery_level,
                user_agent=user_agent,
                checkpoint_id=checkpoint_id or "SSB_SONAULI_01",
                last_seen=now_iso,
                last_seen_ts=now_ts,
                last_endpoint=endpoint,
                total_requests=1,
                latency_ms=round(latency_ms, 2) if latency_ms is not None else None,
                status="ONLINE",
            )
            self._devices[key] = dev
            if client_ip and client_ip != key:
                self._devices[client_ip] = dev
            return dev

    def get_all_devices(self, active_only: bool = False, timeout_seconds: Optional[float] = None) -> List[ConnectedClient]:
        """
        Returns a list of all recorded field devices sorted by last_seen_ts descending.
        If timeout_seconds is provided, devices with elapsed time > timeout_seconds are treated as OFFLINE.
        """
        self.update_statuses()
        now = time.time()
        with self._lock:
            # Sync last_seen_ts from last_seen if last_seen was manually manipulated in tests
            for dev in self._devices.values():
                try:
                    dt = datetime.fromisoformat(dev.last_seen.replace("Z", "+00:00"))
                    dev.last_seen_ts = dt.timestamp()
                except Exception:
                    pass
                if timeout_seconds is not None:
                    if (now - dev.last_seen_ts) > timeout_seconds:
                        dev.status = "OFFLINE"
                    else:
                        dev.status = "ONLINE"
                else:
                    dev.status = self._evaluate_device_status(dev)

            unique_map: Dict[str, ConnectedClient] = {}
            for d in self._devices.values():
                unique_map[d.device_id] = d
            devices = list(unique_map.values())

        if active_only:
            devices = [d for d in devices if d.status == "ONLINE"]
        return sorted(devices, key=lambda d: d.last_seen_ts, reverse=True)

    def get_active_devices(self, timeout_seconds: Optional[float] = None) -> List[ConnectedClient]:
        """
        Returns a list of currently active (ONLINE) field devices sorted by last_seen descending.
        """
        return self.get_all_devices(active_only=True, timeout_seconds=timeout_seconds)

    def get_last_active_device(self, timeout_seconds: Optional[float] = None) -> Optional[ConnectedClient]:
        """
        Returns the most recently seen active field device, or None if no device is active.
        """
        active = self.get_active_devices(timeout_seconds=timeout_seconds)
        return active[0] if active else None

    def clear(self) -> None:
        """
        Clears device tracking registry (used for tests/reset).
        """
        with self._lock:
            self._devices.clear()


# Global Singleton Instance
device_tracker = DeviceTracker()
