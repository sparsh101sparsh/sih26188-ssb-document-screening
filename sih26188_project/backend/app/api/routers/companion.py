"""
SIH26188 — Android Companion Camera Sync Router
Provides real-time camera ingestion and streaming between frontline Android field units
and the central edge desktop terminal.
"""

import base64
import threading
import time
from collections import deque
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/companion", tags=["Companion Camera Sync"])


class CompanionCaptureState(BaseModel):
    has_capture: bool = False
    sequence_id: int = 0
    capture_type: str = "selfie"  # "selfie" | "document"
    device_id: str = "unknown"
    checkpoint_id: str = "WB-JAI-01"
    image_data: Optional[str] = None  # Base64 data URI
    filename: Optional[str] = None
    timestamp: float = 0.0


class CompanionUploadRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Raw base64 or Data URI encoded image")
    image_data: Optional[str] = Field(None, description="Alias for image_base64 / Data URI")
    image: Optional[str] = Field(None, description="Alias for image_base64")
    capture_type: str = Field("selfie", description="Type of capture: 'selfie' or 'document'")
    device_id: str = Field("field-unit-1", description="Identifier of the sending field device")
    checkpoint_id: str = Field("WB-JAI-01", description="SSB border checkpost code")
    filename: Optional[str] = Field("capture.jpg", description="Original or preferred filename")


class CompanionStore:
    """
    Thread-safe singleton in-memory buffer storing the latest companion camera capture
    and an in-transit frame buffer ring history.
    """

    def __init__(self, max_buffer_size: int = 50):
        self._lock = threading.RLock()
        self._max_buffer_size = max_buffer_size
        self._buffer: deque = deque(maxlen=max_buffer_size)
        self.state = CompanionCaptureState()

    def set_capture(
        self,
        capture_type: str,
        image_bytes: bytes,
        filename: str = "capture.jpg",
        device_id: str = "unknown",
        checkpoint_id: str = "WB-JAI-01",
        mime_type: Optional[str] = None,
    ) -> CompanionCaptureState:
        with self._lock:
            if not mime_type:
                mime_type = self._detect_mime_type(image_bytes, filename)
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            data_uri = f"data:{mime_type};base64,{b64}"

            new_seq = self.state.sequence_id + 1
            new_state = CompanionCaptureState(
                has_capture=True,
                sequence_id=new_seq,
                capture_type=capture_type,
                device_id=device_id,
                checkpoint_id=checkpoint_id,
                image_data=data_uri,
                filename=filename,
                timestamp=time.time(),
            )
            self.state = new_state
            self._buffer.append(new_state)
            return new_state

    def get_latest(self) -> CompanionCaptureState:
        with self._lock:
            return self.state.model_copy()

    def clear(self) -> Dict[str, str]:
        with self._lock:
            self.state = CompanionCaptureState(sequence_id=self.state.sequence_id)
            return {"status": "cleared"}

    def reset(self, hard: bool = False) -> None:
        """Reset state; hard=True resets sequence_id back to 0."""
        with self._lock:
            seq = 0 if hard else self.state.sequence_id
            self.state = CompanionCaptureState(sequence_id=seq)
            self._buffer.clear()

    def get_buffer(self, limit: int = 10) -> List[CompanionCaptureState]:
        with self._lock:
            items = list(self._buffer)
            return items[-limit:] if limit > 0 else items

    def get_buffer_size(self) -> int:
        with self._lock:
            return len(self._buffer)

    @staticmethod
    def _detect_mime_type(image_bytes: bytes, filename: str) -> str:
        if image_bytes.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if image_bytes.startswith(b"RIFF") and len(image_bytes) >= 12 and image_bytes[8:12] == b"WEBP":
            return "image/webp"
        if image_bytes.startswith((b"GIF87a", b"GIF89a")):
            return "image/gif"

        fn_lower = filename.lower()
        if fn_lower.endswith(".png"):
            return "image/png"
        if fn_lower.endswith(".webp"):
            return "image/webp"
        if fn_lower.endswith(".gif"):
            return "image/gif"
        return "image/jpeg"


companion_store = CompanionStore()


@router.post("/upload", summary="Upload Companion Camera Capture from Android Field Unit")
async def upload_companion_capture(
    request: Request,
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    live_photo: Optional[UploadFile] = File(None),
    document_image: Optional[UploadFile] = File(None),
    capture_type: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    checkpoint_id: Optional[str] = Form(None),
    image_base64: Optional[str] = Form(None),
    image_data: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
):
    """
    Receives live camera snapshot from Android field unit (via multipart file or base64 payload)
    and buffers it in-memory for instant desktop consumption.
    """
    content_type = request.headers.get("content-type", "").lower()

    req_capture_type = capture_type
    req_device_id = device_id
    req_checkpoint_id = checkpoint_id
    req_filename = filename
    req_b64 = image_base64 or image_data
    raw_bytes: Optional[bytes] = None

    uploaded_file = file or image or live_photo or document_image

    if "application/json" in content_type:
        try:
            json_body = await request.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {str(e)}")

        if not isinstance(json_body, dict):
            raise HTTPException(status_code=400, detail="JSON body must be a valid JSON object.")

        req_capture_type = json_body.get("capture_type") or req_capture_type or "selfie"
        req_device_id = json_body.get("device_id") or req_device_id or "field-unit-1"
        req_checkpoint_id = json_body.get("checkpoint_id") or req_checkpoint_id or "WB-JAI-01"
        req_filename = json_body.get("filename") or req_filename or "capture.jpg"
        req_b64 = (
            json_body.get("image_base64")
            or json_body.get("image_data")
            or json_body.get("image")
            or json_body.get("file")
        )
        if not req_b64:
            raise HTTPException(status_code=400, detail="Uploaded image payload is missing or empty in JSON.")

    if uploaded_file is not None:
        contents = await uploaded_file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        raw_bytes = contents
        if not req_filename:
            req_filename = uploaded_file.filename or "capture.jpg"
    elif req_b64:
        b64_clean = req_b64.strip()
        mime_from_header = None
        if b64_clean.startswith("data:"):
            if "," in b64_clean:
                header, b64_clean = b64_clean.split(",", 1)
                if ";" in header:
                    mime_from_header = header.split(";")[0].replace("data:", "").strip()
            else:
                raise HTTPException(status_code=400, detail="Invalid data URI format.")

        missing_padding = len(b64_clean) % 4
        if missing_padding:
            b64_clean += "=" * (4 - missing_padding)

        try:
            decoded_bytes = base64.b64decode(b64_clean, validate=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")

        if not decoded_bytes:
            raise HTTPException(status_code=400, detail="Base64 decoded image is empty.")
        raw_bytes = decoded_bytes
        if not req_filename:
            req_filename = "capture.png" if mime_from_header and "png" in mime_from_header else "capture.jpg"

    if raw_bytes is None or len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    final_capture_type = req_capture_type or "selfie"
    final_device_id = req_device_id or "field-unit-1"
    final_checkpoint_id = req_checkpoint_id or "WB-JAI-01"
    final_filename = req_filename or "capture.jpg"

    state = companion_store.set_capture(
        capture_type=final_capture_type,
        image_bytes=raw_bytes,
        filename=final_filename,
        device_id=final_device_id,
        checkpoint_id=final_checkpoint_id,
    )
    return {
        "status": "success",
        "message": "Capture synced to Edge Terminal",
        "sequence_id": state.sequence_id,
        "capture_type": state.capture_type,
        "device_id": state.device_id,
        "checkpoint_id": state.checkpoint_id,
        "filename": state.filename,
        "timestamp": state.timestamp,
    }


@router.get("/latest", summary="Poll Latest Companion Capture on Desktop Terminal", response_model=CompanionCaptureState)
async def get_latest_companion_capture():
    """
    Returns the latest buffered camera capture from the Android companion unit.
    """
    return companion_store.get_latest()


@router.post("/clear", summary="Clear Active Companion Capture Buffer")
async def clear_companion_capture():
    """
    Clears the companion capture once processed by the desktop screening pipeline.
    """
    return companion_store.clear()


class CompanionVerdictPayload(BaseModel):
    sequence_id: int = 0
    verdict: str = "PASS"
    risk_level: str = "GREEN"
    risk_score: float = 0.0
    details: str = "1:1 Biometric Verified"


# In-memory verdict registry
_verdicts_lock = threading.RLock()
_verdicts: Dict[int, Dict[str, Any]] = {}
_latest_verdict: Dict[str, Any] = {
    "has_verdict": False,
    "sequence_id": 0,
    "verdict": "PENDING",
    "risk_level": "GREEN",
    "risk_score": 0.0,
    "details": "",
}


@router.post("/verdict", summary="Post Screening Verdict from Desktop Terminal")
async def post_companion_verdict(payload: CompanionVerdictPayload):
    """
    Sets the screening verdict for a companion sequence ID so the Android client can display it.
    """
    global _latest_verdict
    with _verdicts_lock:
        v_data = {
            "has_verdict": True,
            "sequence_id": payload.sequence_id,
            "verdict": payload.verdict,
            "risk_level": payload.risk_level,
            "risk_score": payload.risk_score,
            "details": payload.details,
            "timestamp": time.time(),
        }
        _verdicts[payload.sequence_id] = v_data
        _latest_verdict = v_data
        if len(_verdicts) > 500:
            oldest_keys = sorted(_verdicts.keys())[: len(_verdicts) - 500]
            for k in oldest_keys:
                _verdicts.pop(k, None)
    return {"status": "ok", "verdict": v_data}


@router.get("/result/{sequence_id}", summary="Fetch Verdict for Given Sequence ID")
async def get_verdict_by_sequence(sequence_id: int):
    """
    Returns the screening verdict for a specific capture sequence ID.
    """
    with _verdicts_lock:
        if sequence_id in _verdicts:
            return _verdicts[sequence_id]
        if _latest_verdict.get("sequence_id") == sequence_id:
            return _latest_verdict
    return {
        "has_verdict": False,
        "sequence_id": sequence_id,
        "verdict": "PROCESSING",
        "risk_level": "UNKNOWN",
        "risk_score": 0.0,
        "details": "Screening in progress",
    }


@router.get("/verdict", summary="Fetch Latest Screening Verdict")
async def get_latest_verdict():
    """
    Returns the most recent screening verdict.
    """
    with _verdicts_lock:
        return _latest_verdict


def _get_local_ip_addresses() -> List[str]:
    """Helper to detect reachable IPv4 LAN addresses."""
    import socket
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        primary = s.getsockname()[0]
        s.close()
        if primary and primary != "127.0.0.1":
            ips.add(primary)
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127."):
                ips.add(ip)
    except Exception:
        pass

    if not ips:
        ips.add("127.0.0.1")
    return sorted(list(ips))


@router.get("/info", summary="Fetch Edge Gateway Companion Pairing & Network Info")
async def get_companion_info():
    """
    Returns detected network interfaces, pairing URLs for Wi-Fi, Emulator, ADB USB,
    and live connected device status for the Connect Modal and QR code generator.
    """
    from app.core.device_tracker import device_tracker
    from app.core.config import settings

    local_ips = _get_local_ip_addresses()
    primary_ip = local_ips[0] if local_ips else "127.0.0.1"
    port = getattr(settings, "PORT", 8000)

    gateway_url = f"http://{primary_ip}:{port}"
    emulator_url = f"http://10.0.2.2:{port}"
    adb_command = f"adb reverse tcp:{port} tcp:{port}"

    active_devices = device_tracker.get_active_devices()
    return {
        "status": "ok",
        "primary_ip": primary_ip,
        "local_ips": local_ips,
        "port": port,
        "gateway_url": gateway_url,
        "emulator_url": emulator_url,
        "adb_command": adb_command,
        "active_devices_count": len(active_devices),
        "devices": [d.model_dump() for d in active_devices],
        "checkpoint_id": "SSB-WB-JAI-01",
        "timestamp": time.time(),
    }


class CompanionSimulateRequest(BaseModel):
    capture_type: str = "document"  # "document" | "selfie"
    device_id: str = "Android-Pixel-7 (Field Unit #01)"
    checkpoint_id: str = "SSB-WB-JAI-01"


# Ultra-compact 1x1 base64 transparent/tinted PNGs for fallback simulation if needed
_MOCK_DOC_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


@router.post("/simulate", summary="Simulate Field Unit Camera Capture Upload")
async def simulate_companion_capture(payload: CompanionSimulateRequest):
    """
    Simulates a companion camera upload for instant operator testing directly
    from the web connect modal without requiring physical hardware.
    """
    from app.core.device_tracker import device_tracker

    device_tracker.record_activity(
        client_ip="192.168.1.105",
        user_agent="SSB-Android-Companion/2.0 (Simulated)",
        endpoint="/api/v1/companion/upload",
        checkpoint_id=payload.checkpoint_id,
        latency_ms=12.5,
    )

    filename = f"simulated_{payload.capture_type}_{int(time.time())}.jpg"
    state = companion_store.set_capture(
        capture_type=payload.capture_type,
        image_bytes=_MOCK_DOC_PNG_BYTES,
        filename=filename,
        device_id=payload.device_id,
        checkpoint_id=payload.checkpoint_id,
        mime_type="image/png",
    )

    return {
        "status": "success",
        "message": f"Simulated {payload.capture_type} capture delivered to workstation",
        "sequence_id": state.sequence_id,
        "capture_type": state.capture_type,
        "device_id": state.device_id,
        "checkpoint_id": state.checkpoint_id,
        "filename": state.filename,
        "timestamp": state.timestamp,
    }


