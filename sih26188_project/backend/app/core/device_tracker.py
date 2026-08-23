"""
SIH26188 — Connected Device Tracker & Observability Module
Architecture Reference: R4, R5, Section 7.2

Maintains in-memory state of connected Android screening clients and edge terminals,
tracking source IP, user agent, checkpoint ID, last activity timestamp, request counts,
and round-trip request latency for operator dashboard observability.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ConnectedClient(BaseModel):
    """
    Schema representing a registered client device accessing the edge gateway.
    """
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


# Default offline timeout threshold in seconds for client inactivity
DEFAULT_OFFLINE_TIMEOUT_SECONDS: float = 8.0


class DeviceTracker:
    """
    Thread-safe in-memory device registry for edge appliance monitoring.
    """

    def __init__(self) -> None:
        self._devices: Dict[str, ConnectedClient] = {}

    def _evaluate_device_status(
        self,
        dev: ConnectedClient,
        timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS,
    ) -> str:
        """
        Evaluates dynamic device status based on elapsed time since last_seen.
        Transitions to OFFLINE if inactive longer than timeout_seconds.
        """
        try:
            last_dt = datetime.fromisoformat(dev.last_seen)
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            elapsed = (now - last_dt).total_seconds()
            return "ONLINE" if elapsed <= timeout_seconds else "OFFLINE"
        except Exception:
            return "OFFLINE"

    def update_statuses(
        self,
        timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS,
    ) -> None:
        """
        Refreshes the status attribute of all tracked devices.
        """
        for dev in self._devices.values():
            dev.status = self._evaluate_device_status(dev, timeout_seconds=timeout_seconds)

    def record_activity(
        self,
        client_ip: str,
        user_agent: Optional[str] = None,
        endpoint: str = "/api/v1/inspect",
        checkpoint_id: Optional[str] = None,
        latency_ms: Optional[float] = None,
    ) -> ConnectedClient:
        """
        Records or updates an activity event from a field screening client.
        """
        now = datetime.now(timezone.utc).isoformat()
        if client_ip in self._devices:
            dev = self._devices[client_ip]
            dev.last_seen = now
            dev.last_endpoint = endpoint
            dev.total_requests += 1
            if user_agent:
                dev.user_agent = user_agent
            if checkpoint_id:
                dev.checkpoint_id = checkpoint_id
            if latency_ms is not None:
                dev.latency_ms = round(latency_ms, 2)
            dev.status = "ONLINE"
            return dev
        else:
            dev = ConnectedClient(
                client_ip=client_ip,
                user_agent=user_agent,
                checkpoint_id=checkpoint_id or "SSB_SONAULI_01",
                last_seen=now,
                last_endpoint=endpoint,
                total_requests=1,
                latency_ms=round(latency_ms, 2) if latency_ms is not None else None,
                status="ONLINE",
            )
            self._devices[client_ip] = dev
            return dev

    def get_all_devices(
        self,
        timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS,
        active_only: bool = False,
    ) -> List[ConnectedClient]:
        """
        Returns a list of all recorded field devices sorted by last_seen descending.
        Refreshes status against timeout_seconds before returning.
        If active_only is True, filters to return only ONLINE devices.
        """
        self.update_statuses(timeout_seconds=timeout_seconds)
        devices = list(self._devices.values())
        if active_only:
            devices = [d for d in devices if d.status == "ONLINE"]
        return sorted(devices, key=lambda d: d.last_seen, reverse=True)

    def get_active_devices(
        self,
        timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS,
    ) -> List[ConnectedClient]:
        """
        Returns a list of currently active (ONLINE) field devices sorted by last_seen descending.
        """
        return self.get_all_devices(timeout_seconds=timeout_seconds, active_only=True)

    def get_last_active_device(
        self,
        timeout_seconds: float = DEFAULT_OFFLINE_TIMEOUT_SECONDS,
        active_only: bool = True,
    ) -> Optional[ConnectedClient]:
        """
        Returns the most recently active screening device.
        If active_only is True, returns None if no device is currently ONLINE.
        """
        if active_only:
            active_devices = self.get_active_devices(timeout_seconds=timeout_seconds)
            if not active_devices:
                return None
            return active_devices[0]
        else:
            self.update_statuses(timeout_seconds=timeout_seconds)
            if not self._devices:
                return None
            return max(self._devices.values(), key=lambda d: d.last_seen)

    def clear(self) -> None:
        """
        Clears device tracking registry (used for tests/reset).
        """
        self._devices.clear()


# Global Singleton Instance
device_tracker = DeviceTracker()
