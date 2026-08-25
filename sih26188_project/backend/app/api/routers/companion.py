"""
SIH26188 — Android Companion Camera Sync Router with Persistent Process Storage & SSE Handshake
Provides durable SQLite process storage, SHA-256 integrity verification, disk enclaves,
real-time SSE push streams, and two-way delivery handshake confirmation between frontline
Android field units and the central edge desktop terminal.
"""

import asyncio
import base64
import hashlib
import json
import os
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional, Set

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/companion", tags=["Companion Camera Sync"])

# Base Directories for Persistent Storage Enclave
BASE_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
COMPANION_STORE_DIR = BASE_DATA_DIR / "companion_store"
COMPANION_DB_PATH = BASE_DATA_DIR / "companion.db"


class CompanionCaptureState(BaseModel):
    has_capture: bool = False
    sequence_id: int = 0
    capture_uuid: str = ""
    capture_type: str = "selfie"  # "selfie" | "document"
    device_id: str = "unknown"
    checkpoint_id: str = "WB-JAI-01"
    image_data: Optional[str] = None  # Base64 data URI
    filename: Optional[str] = None
    file_path: Optional[str] = None
    sha256_hash: Optional[str] = None
    file_size_bytes: int = 0
    status: str = "RECEIVED"
    timestamp: float = 0.0


class CompanionUploadRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Raw base64 or Data URI encoded image")
    image_data: Optional[str] = Field(None, description="Alias for image_base64 / Data URI")
    image: Optional[str] = Field(None, description="Alias for image_base64")
    capture_type: str = Field("selfie", description="Type of capture: 'selfie' or 'document'")
    device_id: str = Field("field-unit-1", description="Identifier of the sending field device")
    checkpoint_id: str = Field("WB-JAI-01", description="SSB border checkpost code")
    filename: Optional[str] = Field("capture.jpg", description="Original or preferred filename")


class SSEBroadcaster:
    """Pub/Sub manager for real-time Server-Sent Events (SSE) push notifications."""

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()
        self._lock = threading.Lock()

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        with self._lock:
            self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        with self._lock:
            self._subscribers.discard(q)

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        message = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
        with self._lock:
            subs = list(self._subscribers)
        for q in subs:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                pass


sse_broadcaster = SSEBroadcaster()


class PersistentCompanionStore:
    """
    Durable, Thread-Safe SQLite + Disk Storage Enclave for Field Captures.
    Guarantees persistence across server reboots, calculates SHA-256 integrity hashes,
    and publishes push events to SSE desktop clients.
    """

    def __init__(
        self,
        db_path: Path = COMPANION_DB_PATH,
        store_dir: Path = COMPANION_STORE_DIR,
        max_buffer_size: int = 50,
    ):
        self.db_path = db_path
        self.store_dir = store_dir
        self.max_buffer_size = max_buffer_size
        self._lock = threading.RLock()
        self._init_storage()
        self._latest_state = self._load_latest_state()

    def _init_storage(self):
        self.store_dir.mkdir(parents=True, exist_ok=True)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        with sqlite3.connect(str(self.db_path)) as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute(
                """
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
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_companion_seq ON companion_captures(sequence_id DESC);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_companion_type ON companion_captures(capture_type);"
            )
            conn.commit()

    def _load_latest_state(self) -> CompanionCaptureState:
        with self._lock:
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT * FROM companion_captures ORDER BY sequence_id DESC LIMIT 1;"
                    )
                    row = cursor.fetchone()
                    if row:
                        file_p = Path(row["file_path"])
                        data_uri = None
                        if file_p.exists():
                            try:
                                b_data = file_p.read_bytes()
                                b64 = base64.b64encode(b_data).decode("utf-8")
                                data_uri = f"data:{row['mime_type']};base64,{b64}"
                            except Exception:
                                pass

                        return CompanionCaptureState(
                            has_capture=True,
                            sequence_id=row["sequence_id"],
                            capture_uuid=row["capture_uuid"],
                            capture_type=row["capture_type"],
                            device_id=row["device_id"],
                            checkpoint_id=row["checkpoint_id"],
                            image_data=data_uri,
                            filename=row["filename"],
                            file_path=row["file_path"],
                            sha256_hash=row["sha256_hash"],
                            file_size_bytes=row["file_size_bytes"],
                            status=row["status"],
                            timestamp=row["created_at"],
                        )
            except Exception as e:
                print(f"[PersistentCompanionStore] Error loading latest state: {e}")
            return CompanionCaptureState()

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

            capture_uuid = str(uuid.uuid4())
            sha256_hash = hashlib.sha256(image_bytes).hexdigest()
            file_size = len(image_bytes)
            now_ts = time.time()

            # 1. Write binary to disk enclave: data/companion_store/YYYY-MM-DD/{uuid}_{filename}
            date_dir = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            target_dir = self.store_dir / date_dir
            target_dir.mkdir(parents=True, exist_ok=True)

            safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-").strip() or "capture.jpg"
            target_file_path = target_dir / f"{capture_uuid[:8]}_{safe_filename}"
            target_file_path.write_bytes(image_bytes)

            # 2. Insert into SQLite table
            with sqlite3.connect(str(self.db_path)) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO companion_captures (
                        capture_uuid, capture_type, device_id, checkpoint_id,
                        filename, file_path, file_size_bytes, sha256_hash,
                        mime_type, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?);
                    """,
                    (
                        capture_uuid,
                        capture_type,
                        device_id,
                        checkpoint_id,
                        safe_filename,
                        str(target_file_path),
                        file_size,
                        sha256_hash,
                        mime_type,
                        now_ts,
                    ),
                )
                conn.commit()
                sequence_id = cursor.lastrowid or 1

                # Prune buffer to max_buffer_size if exceeded
                cursor.execute("SELECT COUNT(*) FROM companion_captures;")
                cur_count = cursor.fetchone()[0]
                if cur_count > self.max_buffer_size:
                    excess = cur_count - self.max_buffer_size
                    cursor.execute("SELECT sequence_id, file_path FROM companion_captures ORDER BY sequence_id ASC LIMIT ?;", (excess,))
                    for old_seq, old_path in cursor.fetchall():
                        try:
                            Path(old_path).unlink(missing_ok=True)
                        except Exception:
                            pass
                        cursor.execute("DELETE FROM companion_captures WHERE sequence_id = ?;", (old_seq,))
                    conn.commit()

            # 3. Form Data URI
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            data_uri = f"data:{mime_type};base64,{b64}"

            new_state = CompanionCaptureState(
                has_capture=True,
                sequence_id=sequence_id,
                capture_uuid=capture_uuid,
                capture_type=capture_type,
                device_id=device_id,
                checkpoint_id=checkpoint_id,
                image_data=data_uri,
                filename=safe_filename,
                file_path=str(target_file_path),
                sha256_hash=sha256_hash,
                file_size_bytes=file_size,
                status="RECEIVED",
                timestamp=now_ts,
            )
            self._latest_state = new_state

            # 4. Trigger asynchronous SSE broadcast
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(
                        sse_broadcaster.broadcast(
                            "NEW_CAPTURE",
                            {
                                "sequence_id": sequence_id,
                                "capture_uuid": capture_uuid,
                                "capture_type": capture_type,
                                "device_id": device_id,
                                "checkpoint_id": checkpoint_id,
                                "filename": safe_filename,
                                "sha256_hash": sha256_hash,
                                "timestamp": now_ts,
                                "status": "RECEIVED",
                            },
                        )
                    )
            except Exception:
                pass

            return new_state

    def get_latest(self) -> CompanionCaptureState:
        with self._lock:
            return self._latest_state.model_copy()

    def get_buffer(self, limit: int = 50, capture_type: Optional[str] = None) -> List[CompanionCaptureState]:
        with self._lock:
            results: List[CompanionCaptureState] = []
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    query = "SELECT * FROM companion_captures "
                    params = []
                    if capture_type:
                        query += "WHERE capture_type = ? "
                        params.append(capture_type)
                    query += "ORDER BY sequence_id DESC LIMIT ?;"
                    params.append(limit)

                    cursor.execute(query, params)
                    rows = cursor.fetchall()
                    for row in rows:
                        file_p = Path(row["file_path"])
                        data_uri = None
                        if file_p.exists():
                            try:
                                b_data = file_p.read_bytes()
                                b64 = base64.b64encode(b_data).decode("utf-8")
                                data_uri = f"data:{row['mime_type']};base64,{b64}"
                            except Exception:
                                pass

                        results.append(
                            CompanionCaptureState(
                                has_capture=True,
                                sequence_id=row["sequence_id"],
                                capture_uuid=row["capture_uuid"],
                                capture_type=row["capture_type"],
                                device_id=row["device_id"],
                                checkpoint_id=row["checkpoint_id"],
                                image_data=data_uri,
                                filename=row["filename"],
                                file_path=row["file_path"],
                                sha256_hash=row["sha256_hash"],
                                file_size_bytes=row["file_size_bytes"],
                                status=row["status"],
                                timestamp=row["created_at"],
                            )
                        )
            except Exception as e:
                print(f"[PersistentCompanionStore] Error reading buffer: {e}")
            results.reverse()
            return results

    def delete_item(self, sequence_id: int) -> bool:
        with self._lock:
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT file_path FROM companion_captures WHERE sequence_id = ?;",
                        (sequence_id,),
                    )
                    row = cursor.fetchone()
                    if row:
                        try:
                            Path(row["file_path"]).unlink(missing_ok=True)
                        except Exception:
                            pass
                    cursor.execute(
                        "DELETE FROM companion_captures WHERE sequence_id = ?;",
                        (sequence_id,),
                    )
                    conn.commit()
                return True
            except Exception as e:
                print(f"[PersistentCompanionStore] Error deleting item {sequence_id}: {e}")
                return False

    def clear(self, hard: bool = False) -> Dict[str, str]:
        with self._lock:
            try:
                last_seq = self._latest_state.sequence_id
                with sqlite3.connect(str(self.db_path)) as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT file_path FROM companion_captures;")
                    rows = cursor.fetchall()
                    for r in rows:
                        try:
                            Path(r[0]).unlink(missing_ok=True)
                        except Exception:
                            pass
                    cursor.execute("DELETE FROM companion_captures;")
                    if hard:
                        cursor.execute("DELETE FROM sqlite_sequence WHERE name='companion_captures';")
                        last_seq = 0
                    conn.commit()
                self._latest_state = CompanionCaptureState(has_capture=False, sequence_id=last_seq)
                return {"status": "cleared"}
            except Exception as e:
                return {"status": f"error: {str(e)}"}

    def reset(self, hard: bool = False):
        return self.clear(hard=hard)

    def get_buffer_size(self) -> int:
        with self._lock:
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM companion_captures;")
                    res = cursor.fetchone()
                    return res[0] if res else 0
            except Exception:
                return 0

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


CompanionStore = PersistentCompanionStore
companion_store = PersistentCompanionStore()


@router.post("/upload", summary="Upload Companion Camera Capture with Two-Way Delivery Handshake")
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
    Receives live camera snapshot from Android field unit, persists to SQLite and Disk enclave,
    broadcasts push notification via SSE, and returns confirmed delivery handshake JSON (HTTP 201).
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

    # Return explicit Two-Way Handshake ACK Response
    return {
        "status": "success",
        "message": f"Capture #{state.sequence_id} successfully persisted in Edge Enclave",
        "sequence_id": state.sequence_id,
        "capture_uuid": state.capture_uuid,
        "capture_type": state.capture_type,
        "device_id": state.device_id,
        "checkpoint_id": state.checkpoint_id,
        "filename": state.filename,
        "sha256_hash": state.sha256_hash,
        "file_size_bytes": state.file_size_bytes,
        "timestamp": state.timestamp,
    }


@router.get("/stream", summary="Server-Sent Events (SSE) Push Stream for Real-Time Terminal Alerts")
async def stream_companion_events(request: Request):
    """
    Subscribes the desktop workstation to real-time companion capture push notifications.
    Emits instant 'NEW_CAPTURE' events whenever an Android field officer snaps a photo.
    """
    queue = sse_broadcaster.subscribe()

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Send initial connection handshake
            yield f"event: CONNECTED\ndata: {json.dumps({'status': 'connected', 'timestamp': time.time()})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield message
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat ping
                    yield f"event: PING\ndata: {json.dumps({'heartbeat': time.time()})}\n\n"
        finally:
            sse_broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/latest", summary="Poll Latest Companion Capture on Desktop Terminal", response_model=CompanionCaptureState)
async def get_latest_companion_capture():
    """
    Returns the latest buffered camera capture from the Android companion unit.
    """
    return companion_store.get_latest()


@router.get("/gallery", summary="Get All Captured Photos in Companion Gallery")
async def get_companion_gallery(limit: int = 50, capture_type: Optional[str] = None):
    """
    Returns all buffered companion captures from persistent SQLite store in reverse-chronological order
    for operator gallery browsing, drag-and-drop ingestion, and bay verification.
    """
    items = companion_store.get_buffer(limit=limit, capture_type=capture_type)
    return {
        "status": "success",
        "total": len(items),
        "items": [item.model_dump() for item in items],
    }


@router.delete("/gallery/{sequence_id}", summary="Delete a Single Photo from Companion Gallery")
async def delete_companion_gallery_item(sequence_id: int):
    """
    Removes a specific capture from the SQLite database and deletes the physical file.
    """
    success = companion_store.delete_item(sequence_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Capture with sequence_id {sequence_id} not found.")
    return {"status": "success", "message": f"Deleted sequence {sequence_id}", "remaining": companion_store.get_buffer_size()}


@router.post("/clear", summary="Clear Active Companion Capture Buffer")
async def clear_companion_capture():
    """
    Clears all companion captures from SQLite and the storage directory.
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
    """Helper to detect reachable IPv4 LAN addresses with fallback to ifconfig/network interfaces."""
    import socket
    import subprocess
    import re

    ips = []
    # 1. UDP probe
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        primary = s.getsockname()[0]
        s.close()
        if primary and not primary.startswith("127.") and not primary.startswith("169.254."):
            ips.append(primary)
    except Exception:
        pass

    # 2. ifconfig / ip addr fallback
    try:
        out = subprocess.check_output(["ifconfig"], text=True)
        for match in re.finditer(r"inet (\d+\.\d+\.\d+\.\d+)", out):
            ip = match.group(1)
            if not ip.startswith("127.") and not ip.startswith("169.254."):
                if ip not in ips:
                    ips.append(ip)
    except Exception:
        pass

    # 3. getaddrinfo fallback
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
                if ip not in ips:
                    ips.append(ip)
    except Exception:
        pass

    if not ips:
        ips.append("127.0.0.1")
    return ips


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


_MOCK_DOC_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


@router.post("/simulate", summary="Simulate Field Unit Camera Capture Upload")
async def simulate_companion_capture(payload: CompanionSimulateRequest):
    """
    Simulates a companion camera upload with complete SQLite persistence, disk storage,
    and SSE push broadcast for testing directly from the web connect modal.
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
        "message": f"Simulated {payload.capture_type} capture delivered and persisted in Edge Enclave",
        "sequence_id": state.sequence_id,
        "capture_uuid": state.capture_uuid,
        "capture_type": state.capture_type,
        "device_id": state.device_id,
        "checkpoint_id": state.checkpoint_id,
        "filename": state.filename,
        "sha256_hash": state.sha256_hash,
        "timestamp": state.timestamp,
    }
