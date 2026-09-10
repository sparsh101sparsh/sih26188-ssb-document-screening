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
import logging
import os
import shutil
import sqlite3
import subprocess
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional, Set, Tuple

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

logger = logging.getLogger("sih26188.companion")

# Ephemeral pairing token generated per backend startup
PAIRING_TOKEN = uuid.uuid4().hex[:8]
_MAIN_LOOP: Optional[asyncio.AbstractEventLoop] = None


def set_main_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _MAIN_LOOP
    _MAIN_LOOP = loop


def _normalize_capture_type(raw: Optional[str]) -> str:
    value = (raw or "selfie").strip().lower()
    if value in {"document", "doc", "id", "passport", "aadhaar"}:
        return "document"
    if value in {"selfie", "live", "traveler_live", "face", "photo"}:
        return "selfie"
    return "selfie"


def _unlink_capture_file(path_str: str) -> None:
    try:
        path = Path(path_str)
        path.unlink(missing_ok=True)
        parent = path.parent
        if parent != COMPANION_STORE_DIR and parent.is_dir():
            try:
                parent.rmdir()
            except OSError:
                pass
    except Exception as exc:
        logger.debug("Failed to prune capture file %s: %s", path_str, exc)

router = APIRouter(prefix="/api/v1/companion", tags=["Companion Camera Sync"])

# Base Directories for Persistent Storage Enclave
BASE_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
COMPANION_STORE_DIR = BASE_DATA_DIR / "companion_store"
COMPANION_DB_PATH = BASE_DATA_DIR / "companion.db"


class CompanionCaptureState(BaseModel):
    has_capture: bool = False
    sequence_id: int = 0
    capture_uuid: str = ""
    capture_id: Optional[str] = None
    capture_type: str = "selfie"  # "selfie" | "document"
    session_id: Optional[str] = None
    device_id: str = "unknown"
    checkpoint_id: str = "WB-JAI-01"
    image_data: Optional[str] = None  # Base64 data URI (latest only)
    image_url: Optional[str] = None
    filename: Optional[str] = None
    file_path: Optional[str] = None
    sha256_hash: Optional[str] = None
    file_size_bytes: int = 0
    status: str = "RECEIVED"
    timestamp: float = 0.0
    is_duplicate: bool = False


class CompanionUploadRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Raw base64 or Data URI encoded image")
    image_data: Optional[str] = Field(None, description="Alias for image_base64 / Data URI")
    image: Optional[str] = Field(None, description="Alias for image_base64")
    capture_type: str = Field("selfie", description="Type of capture: 'selfie' or 'document'")
    device_id: str = Field("field-unit-1", description="Identifier of the sending field device")
    checkpoint_id: str = Field("WB-JAI-01", description="SSB border checkpost code")
    filename: Optional[str] = Field("capture.jpg", description="Original or preferred filename")
    capture_id: Optional[str] = Field(None, description="Unique client session/capture identifier for idempotency")


class PairingQRResponse(BaseModel):
    status: str = "active"
    qr_payload: str
    gateway_id: str = "SSBGateway"
    pairing_token: str
    current_lan_ip: str
    port: int
    fallback_url: str
    timestamp: Optional[float] = None


class SSEBroadcaster:
    """Pub/Sub manager for real-time Server-Sent Events (SSE) push notifications with ID and retry support."""

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

    async def broadcast(self, event_type: str, data: Dict[str, Any], event_id: Optional[int] = None):
        id_str = f"id: {event_id}\n" if event_id is not None else ""
        message = f"{id_str}retry: 3000\nevent: {event_type}\ndata: {json.dumps(data)}\n\n"
        with self._lock:
            subs = list(self._subscribers)
        for q in subs:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                pass

    def broadcast_threadsafe(self, event_type: str, data: Dict[str, Any], event_id: Optional[int] = None) -> None:
        loop = _MAIN_LOOP
        if loop is None or not loop.is_running():
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                logger.debug("SSE broadcast dropped: no running event loop")
                return
        try:
            fut = asyncio.run_coroutine_threadsafe(self.broadcast(event_type, data, event_id=event_id), loop)
        except Exception as exc:
            logger.debug("SSE broadcast failed: %s", exc, exc_info=True)


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
        self.pairing_token = PAIRING_TOKEN
        self._lock = threading.RLock()
        self._init_storage()
        self._latest_state = self._load_latest_state()

    @property
    def state(self) -> CompanionCaptureState:
        return self.get_latest()

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
                """
            )
            # Ensure migration for existing databases without recreate
            try:
                conn.execute("ALTER TABLE companion_captures ADD COLUMN capture_id TEXT;")
            except sqlite3.OperationalError:
                pass  # Column already exists

            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_companion_captures_capture_id ON companion_captures (capture_id);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_companion_seq ON companion_captures(sequence_id DESC);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_companion_type ON companion_captures(capture_type);"
            )
            for col_sql in (
                "ALTER TABLE companion_captures ADD COLUMN session_id TEXT;",
            ):
                try:
                    conn.execute(col_sql)
                except sqlite3.OperationalError:
                    pass
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_companion_session ON companion_captures(session_id, capture_type);"
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS companion_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS companion_verdicts (
                    sequence_id INTEGER PRIMARY KEY,
                    verdict TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    risk_score REAL NOT NULL,
                    details TEXT,
                    timestamp REAL NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS companion_devices (
                    device_id TEXT PRIMARY KEY,
                    device_token TEXT NOT NULL,
                    device_name TEXT,
                    connection_type TEXT DEFAULT 'wifi',
                    app_version TEXT,
                    battery_level INTEGER,
                    paired_at REAL NOT NULL,
                    last_seen REAL NOT NULL,
                    ip_address TEXT,
                    status TEXT DEFAULT 'ONLINE'
                );
                """
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
                        return self._row_to_state(row, include_bytes=True)
                    last_seq = self._read_last_sequence(conn)
                    return CompanionCaptureState(has_capture=False, sequence_id=last_seq)
            except Exception as e:
                logger.warning(f"[Companion] Error loading latest state: {e}")
            return CompanionCaptureState()

    def _read_last_sequence(self, conn: sqlite3.Connection) -> int:
        try:
            cur = conn.execute("SELECT value FROM companion_meta WHERE key = 'last_sequence_id';")
            row = cur.fetchone()
            if row:
                return int(row[0] if not isinstance(row, sqlite3.Row) else row["value"])
        except Exception:
            pass
        try:
            cur = conn.execute("SELECT seq FROM sqlite_sequence WHERE name = 'companion_captures';")
            row = cur.fetchone()
            if row:
                return int(row[0])
        except Exception:
            pass
        return 0

    def _write_last_sequence(self, conn: sqlite3.Connection, sequence_id: int) -> None:
        conn.execute(
            "INSERT INTO companion_meta(key, value) VALUES('last_sequence_id', ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value;",
            (str(sequence_id),),
        )

    def _row_to_state(self, row: sqlite3.Row, include_bytes: bool = False) -> CompanionCaptureState:
        row_keys = row.keys()
        capture_uuid = row["capture_uuid"]
        mime = row["mime_type"] if "mime_type" in row_keys else "image/jpeg"
        data_uri = None
        if include_bytes:
            file_p = Path(row["file_path"])
            if not file_p.exists():
                for alt_cand in (
                    self.store_dir / file_p.name,
                    self.store_dir / f"{capture_uuid[:8]}_{row['filename']}",
                ):
                    if alt_cand.exists():
                        file_p = alt_cand
                        break
            if file_p.exists():
                try:
                    b_data = file_p.read_bytes()
                    b64 = base64.b64encode(b_data).decode("utf-8")
                    data_uri = f"data:{mime};base64,{b64}"
                except Exception as exc:
                    logger.debug("Could not encode capture bytes: %s", exc, exc_info=True)
        return CompanionCaptureState(
            has_capture=True,
            sequence_id=row["sequence_id"],
            capture_uuid=capture_uuid,
            capture_id=row["capture_id"] if "capture_id" in row_keys else None,
            capture_type=row["capture_type"],
            session_id=row["session_id"] if "session_id" in row_keys else None,
            device_id=row["device_id"],
            checkpoint_id=row["checkpoint_id"],
            image_data=data_uri,
            image_url=f"/api/v1/companion/file/{capture_uuid}",
            filename=row["filename"],
            file_path=row["file_path"],
            sha256_hash=row["sha256_hash"],
            file_size_bytes=row["file_size_bytes"],
            status=row["status"],
            timestamp=row["created_at"],
            is_duplicate=False,
        )

    def set_capture(
        self,
        capture_type: str,
        image_bytes: bytes,
        filename: str = "capture.jpg",
        device_id: str = "unknown",
        checkpoint_id: str = "WB-JAI-01",
        mime_type: Optional[str] = None,
        capture_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> CompanionCaptureState:
        capture_type = _normalize_capture_type(capture_type)
        with self._lock:
            # 0. Deduplication check: if capture_id provided, query SQLite
            clean_capture_id = capture_id.strip() if (capture_id and isinstance(capture_id, str) and capture_id.strip()) else None
            if clean_capture_id:
                try:
                    with sqlite3.connect(str(self.db_path)) as conn:
                        conn.row_factory = sqlite3.Row
                        cursor = conn.cursor()
                        cursor.execute(
                            "SELECT * FROM companion_captures WHERE capture_id = ? LIMIT 1;",
                            (clean_capture_id,),
                        )
                        row = cursor.fetchone()
                        if row:
                            logger.info(
                                f"[Companion] Duplicate capture_id '{clean_capture_id}' detected (seq #{row['sequence_id']}). Returning existing record."
                            )
                            state = self._row_to_state(row, include_bytes=True)
                            state.status = "DUPLICATE"
                            state.is_duplicate = True
                            return state
                except Exception as e:
                    logger.warning(f"[Companion] Error querying capture_id duplicate: {e}")

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
                        capture_uuid, capture_id, capture_type, device_id, checkpoint_id,
                        filename, file_path, file_size_bytes, sha256_hash,
                        mime_type, status, created_at, session_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?);
                    """,
                    (
                        capture_uuid,
                        clean_capture_id,
                        capture_type,
                        device_id,
                        checkpoint_id,
                        safe_filename,
                        str(target_file_path),
                        file_size,
                        sha256_hash,
                        mime_type,
                        now_ts,
                        session_id,
                    ),
                )
                conn.commit()
                sequence_id = cursor.lastrowid
                self._write_last_sequence(conn, sequence_id)
                conn.commit()

                # Ring buffer capacity check
                cursor.execute("SELECT COUNT(*) FROM companion_captures;")
                cur_count = cursor.fetchone()[0]
                if cur_count > self.max_buffer_size:
                    excess = cur_count - self.max_buffer_size
                    cursor.execute("SELECT sequence_id, file_path FROM companion_captures ORDER BY sequence_id ASC LIMIT ?;", (excess,))
                    for old_seq, old_path in cursor.fetchall():
                        _unlink_capture_file(old_path)
                        cursor.execute("DELETE FROM companion_captures WHERE sequence_id = ?;", (old_seq,))
                    conn.commit()

            # 3. Form Data URI
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            data_uri = f"data:{mime_type};base64,{b64}"

            new_state = CompanionCaptureState(
                has_capture=True,
                sequence_id=sequence_id,
                capture_uuid=capture_uuid,
                capture_id=clean_capture_id,
                capture_type=capture_type,
                session_id=session_id,
                device_id=device_id,
                checkpoint_id=checkpoint_id,
                image_data=data_uri,
                image_url=f"/api/v1/companion/file/{capture_uuid}",
                filename=safe_filename,
                file_path=str(target_file_path),
                sha256_hash=sha256_hash,
                file_size_bytes=file_size,
                status="RECEIVED",
                timestamp=now_ts,
                is_duplicate=False,
            )
            self._latest_state = new_state

            sse_broadcaster.broadcast_threadsafe(
                "NEW_CAPTURE",
                {
                    "sequence_id": sequence_id,
                    "capture_uuid": capture_uuid,
                    "capture_id": clean_capture_id,
                    "session_id": session_id,
                    "capture_type": capture_type,
                    "device_id": device_id,
                    "checkpoint_id": checkpoint_id,
                    "filename": safe_filename,
                    "image_data": data_uri,
                    "image_url": new_state.image_url,
                    "sha256_hash": sha256_hash,
                    "timestamp": now_ts,
                    "status": "RECEIVED",
                },
                event_id=sequence_id,
            )

            logger.info(f"[Companion] Persisted capture #{sequence_id} (uuid: {capture_uuid}, type: {capture_type})")
            return new_state

    def get_latest(self) -> CompanionCaptureState:
        with self._lock:
            return self._latest_state.model_copy()

    def get_buffer(self, limit: int = 50, capture_type: Optional[str] = None, include_bytes: bool = True) -> List[CompanionCaptureState]:
        with self._lock:
            results: List[CompanionCaptureState] = []
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    where_clause = "WHERE capture_type = ? " if capture_type else ""
                    query = f"SELECT * FROM (SELECT * FROM companion_captures {where_clause}ORDER BY sequence_id DESC LIMIT ?) ORDER BY sequence_id ASC;"
                    params = [capture_type, limit] if capture_type else [limit]

                    cursor.execute(query, params)
                    rows = cursor.fetchall()
                    for row in rows:
                        results.append(self._row_to_state(row, include_bytes=include_bytes))
            except Exception as e:
                logger.warning(f"[PersistentCompanionStore] Error reading buffer: {e}")
            return results

    def get_buffer_since(self, since_seq: int, include_bytes: bool = True) -> List[CompanionCaptureState]:
        with self._lock:
            results: List[CompanionCaptureState] = []
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT * FROM companion_captures WHERE sequence_id > ? ORDER BY sequence_id ASC LIMIT 50;",
                        (since_seq,),
                    )
                    rows = cursor.fetchall()
                    for row in rows:
                        results.append(self._row_to_state(row, include_bytes=include_bytes))
            except Exception as e:
                logger.warning(f"[PersistentCompanionStore] Error reading buffer since {since_seq}: {e}")
            return results

    def register_device(
        self,
        device_id: str,
        device_token: str,
        device_name: Optional[str] = None,
        connection_type: str = "wifi",
        app_version: Optional[str] = None,
        ip_address: str = "127.0.0.1",
    ) -> Dict[str, Any]:
        now = time.time()
        with self._lock:
            with sqlite3.connect(str(self.db_path)) as conn:
                conn.execute(
                    """
                    INSERT INTO companion_devices (
                        device_id, device_token, device_name, connection_type,
                        app_version, battery_level, paired_at, last_seen, ip_address, status
                    ) VALUES (?, ?, ?, ?, ?, 100, ?, ?, ?, 'ONLINE')
                    ON CONFLICT(device_id) DO UPDATE SET
                        device_token = excluded.device_token,
                        device_name = coalesce(excluded.device_name, companion_devices.device_name),
                        connection_type = excluded.connection_type,
                        app_version = coalesce(excluded.app_version, companion_devices.app_version),
                        last_seen = excluded.last_seen,
                        ip_address = excluded.ip_address,
                        status = 'ONLINE';
                    """,
                    (device_id, device_token, device_name, connection_type, app_version, now, now, ip_address),
                )
                conn.commit()
            return {
                "device_id": device_id,
                "device_token": device_token,
                "device_name": device_name,
                "paired_at": now,
                "status": "ONLINE",
            }

    def update_device_heartbeat(
        self,
        device_id: str,
        battery: Optional[int] = None,
        connection_type: Optional[str] = None,
        app_version: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> bool:
        now = time.time()
        with self._lock:
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    conn.execute(
                        """
                        UPDATE companion_devices SET
                            last_seen = ?,
                            battery_level = coalesce(?, battery_level),
                            connection_type = coalesce(?, connection_type),
                            app_version = coalesce(?, app_version),
                            ip_address = coalesce(?, ip_address),
                            status = 'ONLINE'
                        WHERE device_id = ?;
                        """,
                        (now, battery, connection_type, app_version, ip_address, device_id),
                    )
                    conn.commit()
                return True
            except Exception as e:
                logger.debug("Failed updating device heartbeat in db: %s", e)
                return False

    def list_devices(self) -> List[Dict[str, Any]]:
        with self._lock:
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM companion_devices ORDER BY last_seen DESC;")
                    rows = cursor.fetchall()
                    return [dict(r) for r in rows]
            except Exception:
                return []

    def get_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            try:
                with sqlite3.connect(str(self.db_path)) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    cursor.execute("SELECT * FROM companion_devices WHERE device_id = ? LIMIT 1;", (device_id,))
                    row = cursor.fetchone()
                    return dict(row) if row else None
            except Exception:
                return None

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
                        _unlink_capture_file(row["file_path"])
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
                        _unlink_capture_file(r[0])
                    cursor.execute("DELETE FROM companion_captures;")
                    if hard:
                        cursor.execute("DELETE FROM sqlite_sequence WHERE name='companion_captures';")
                        cursor.execute("DELETE FROM companion_verdicts;")
                        last_seq = 0
                    self._write_last_sequence(conn, last_seq)
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


class CompanionPairRequest(BaseModel):
    pairing_token: str = Field(description="Pairing token from desktop QR code")
    device_id: Optional[str] = Field(default=None, description="Optional stable client hardware/app ID")
    device_name: Optional[str] = Field(default="Android Field Scanner", description="Device model / label")
    app_version: Optional[str] = Field(default="1.0", description="Installed Android app version")
    connection_type: Optional[str] = Field(default="wifi", description="wifi | usb")


class CompanionPairResponse(BaseModel):
    status: str = "paired"
    device_id: str
    device_token: str
    gateway_id: str = "SSBGateway"
    timestamp: float


class CompanionHeartbeatRequest(BaseModel):
    device_id: str
    gateway_id: Optional[str] = "SSBGateway"
    device_token: Optional[str] = None
    battery: Optional[int] = None
    connection: Optional[str] = "wifi"
    app_version: Optional[str] = "1.0"


class CompanionHeartbeatResponse(BaseModel):
    status: str = "acknowledged"
    device_id: str
    server_time: float
    latest_sequence_id: int


@router.post("/pair", response_model=CompanionPairResponse, summary="Pair & Authenticate Android Companion Unit")
async def pair_companion_device(request: Request, body: CompanionPairRequest):
    """
    Validates pairing token, issues persistent device_id and device_token,
    and registers the Android field scanner in the companion device registry.
    """
    from app.core.device_tracker import device_tracker

    client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "127.0.0.1")

    clean_token = body.pairing_token.strip()
    if clean_token != companion_store.pairing_token:
        existing = companion_store.get_device(body.device_id or "") if body.device_id else None
        if not existing or existing.get("device_token") != clean_token:
            raise HTTPException(status_code=401, detail="Invalid or expired pairing token. Please scan the QR code again.")

    assigned_id = body.device_id.strip() if body.device_id and body.device_id.strip() else f"FIELD-DEV-{uuid.uuid4().hex[:6].upper()}"
    assigned_token = f"dtoken_{uuid.uuid4().hex[:12]}"
    conn_type = body.connection_type or ("usb" if client_ip in ("127.0.0.1", "::1", "localhost") else "wifi")

    companion_store.register_device(
        device_id=assigned_id,
        device_token=assigned_token,
        device_name=body.device_name or "Android Field Scanner",
        connection_type=conn_type,
        app_version=body.app_version or "1.0",
        ip_address=client_ip,
    )

    device_tracker.record_activity(
        client_ip=client_ip,
        device_id=assigned_id,
        device_name=body.device_name,
        connection_type=conn_type,
        app_version=body.app_version,
        endpoint="/api/v1/companion/pair",
    )

    logger.info(f"[Companion] Successfully paired device '{assigned_id}' from {client_ip} ({conn_type})")
    return CompanionPairResponse(
        status="paired",
        device_id=assigned_id,
        device_token=assigned_token,
        gateway_id="SSBGateway",
        timestamp=time.time(),
    )


@router.post("/heartbeat", response_model=CompanionHeartbeatResponse, summary="Android Companion Device Heartbeat")
async def companion_heartbeat(request: Request, body: CompanionHeartbeatRequest):
    """
    Periodic liveness heartbeat from Android field unit (called every 5-10s).
    Updates device_tracker and companion_devices to keep connection state strictly ONLINE.
    """
    from app.core.device_tracker import device_tracker

    client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "127.0.0.1")
    conn_type = body.connection or ("usb" if client_ip in ("127.0.0.1", "::1", "localhost") else "wifi")

    companion_store.update_device_heartbeat(
        device_id=body.device_id,
        battery=body.battery,
        connection_type=conn_type,
        app_version=body.app_version,
        ip_address=client_ip,
    )

    device_tracker.record_activity(
        client_ip=client_ip,
        device_id=body.device_id,
        connection_type=conn_type,
        battery_level=body.battery,
        app_version=body.app_version,
        endpoint="/api/v1/companion/heartbeat",
    )

    latest_seq = companion_store.state.sequence_id
    return CompanionHeartbeatResponse(
        status="acknowledged",
        device_id=body.device_id,
        server_time=time.time(),
        latest_sequence_id=latest_seq,
    )


@router.post("/upload", summary="Upload Companion Camera Capture with Two-Way Delivery Handshake")
@router.post("/capture", summary="Upload Companion Camera Capture (Alias)", include_in_schema=False)
async def upload_companion_capture(
    request: Request,
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    live_photo: Optional[UploadFile] = File(None),
    document_image: Optional[UploadFile] = File(None),
    capture_type: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    checkpoint_id: Optional[str] = Form(None),
    capture_id: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    image_base64: Optional[str] = Form(None),
    image_data: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
):
    """
    Receives live camera snapshot from Android field unit, persists to SQLite and Disk enclave,
    broadcasts push notification via SSE, and returns confirmed delivery handshake JSON (HTTP 200).
    Supports idempotent retries via capture_id.
    """
    content_type = request.headers.get("content-type", "").lower()

    req_capture_type = capture_type
    req_device_id = device_id
    req_checkpoint_id = checkpoint_id
    req_capture_id = capture_id
    req_session_id = session_id
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
        req_capture_id = json_body.get("capture_id") or req_capture_id
        req_session_id = json_body.get("session_id") or req_session_id
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

    final_capture_type = _normalize_capture_type(req_capture_type)
    header_device_id = request.headers.get("x-device-id")
    final_device_id = header_device_id or req_device_id or "field-unit-1"
    final_checkpoint_id = request.headers.get("x-checkpoint-id") or req_checkpoint_id or "WB-JAI-01"
    final_filename = req_filename or "capture.jpg"

    # Keep device registry updated
    from app.core.device_tracker import device_tracker
    client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "127.0.0.1")
    device_tracker.record_activity(
        client_ip=client_ip,
        device_id=final_device_id,
        endpoint="/api/v1/companion/upload",
        checkpoint_id=final_checkpoint_id,
        user_agent=request.headers.get("user-agent"),
    )

    state = companion_store.set_capture(
        capture_type=final_capture_type,
        image_bytes=raw_bytes,
        filename=final_filename,
        device_id=final_device_id,
        checkpoint_id=final_checkpoint_id,
        capture_id=req_capture_id,
        session_id=req_session_id,
    )

    if getattr(state, "is_duplicate", False):
        logger.info(f"[Companion] Returning duplicate ACK for capture_id '{req_capture_id}' (seq #{state.sequence_id})")
        return JSONResponse(
            status_code=200,
            content={
                "status": "duplicate",
                "capture_uuid": state.capture_uuid,
                "capture_id": req_capture_id,
                "session_id": state.session_id,
                "message": "Already received",
                "sequence_id": state.sequence_id,
                "capture_type": state.capture_type,
                "device_id": state.device_id,
                "checkpoint_id": state.checkpoint_id,
                "filename": state.filename,
                "image_url": state.image_url,
                "sha256_hash": state.sha256_hash,
                "file_size_bytes": state.file_size_bytes,
                "timestamp": state.timestamp,
            },
        )

    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "message": f"Capture #{state.sequence_id} successfully persisted in Edge Enclave",
            "sequence_id": state.sequence_id,
            "capture_uuid": state.capture_uuid,
            "capture_id": state.capture_id,
            "session_id": state.session_id,
            "capture_type": state.capture_type,
            "device_id": state.device_id,
            "checkpoint_id": state.checkpoint_id,
            "filename": state.filename,
            "image_url": state.image_url,
            "sha256_hash": state.sha256_hash,
            "file_size_bytes": state.file_size_bytes,
            "timestamp": state.timestamp,
        },
    )


@router.get("/stream", summary="Server-Sent Events (SSE) Push Stream for Real-Time Terminal Alerts")
async def stream_companion_events(request: Request):
    """
    Subscribes the desktop workstation to real-time companion capture push notifications.
    Emits instant 'NEW_CAPTURE' events whenever an Android field officer snaps a photo.
    Supports Last-Event-ID replay on reconnection.
    """
    last_event_id_str = request.headers.get("last-event-id") or request.query_params.get("last_event_id")
    last_event_id = 0
    if last_event_id_str:
        try:
            last_event_id = int(last_event_id_str.strip())
        except ValueError:
            pass

    queue = sse_broadcaster.subscribe()

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Send initial connection handshake with retry parameter
            yield f"retry: 3000\nevent: CONNECTED\ndata: {json.dumps({'status': 'connected', 'timestamp': time.time()})}\n\n"

            # Replay any missed events since last_event_id if client reconnected
            if last_event_id > 0:
                try:
                    missed = companion_store.get_buffer_since(last_event_id)
                    for item in missed:
                        yield f"id: {item.sequence_id}\nretry: 3000\nevent: NEW_CAPTURE\ndata: {json.dumps(item.model_dump())}\n\n"
                except Exception as exc:
                    logger.debug("Error replaying missed SSE events: %s", exc)

            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield message
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat ping
                    yield f"retry: 3000\nevent: PING\ndata: {json.dumps({'heartbeat': time.time()})}\n\n"
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


@router.get("/file/{capture_uuid}", summary="Stream a companion capture JPEG/PNG by UUID")
async def get_companion_file(capture_uuid: str):
    with companion_store._lock:
        try:
            with sqlite3.connect(str(companion_store.db_path)) as conn:
                conn.row_factory = sqlite3.Row
                row = conn.execute(
                    "SELECT file_path, mime_type, filename FROM companion_captures WHERE capture_uuid = ?;",
                    (capture_uuid,),
                ).fetchone()
        except Exception as exc:
            logger.debug("companion file lookup failed: %s", exc, exc_info=True)
            row = None
    if not row:
        raise HTTPException(status_code=404, detail="Capture not found")
    path = Path(row["file_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Capture file missing on disk")
    return FileResponse(path, media_type=row["mime_type"] or "image/jpeg", filename=row["filename"])


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
    try:
        with sqlite3.connect(str(companion_store.db_path)) as conn:
            conn.execute(
                """
                INSERT INTO companion_verdicts(sequence_id, verdict, risk_level, risk_score, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(sequence_id) DO UPDATE SET
                    verdict = excluded.verdict,
                    risk_level = excluded.risk_level,
                    risk_score = excluded.risk_score,
                    details = excluded.details,
                    timestamp = excluded.timestamp;
                """,
                (
                    payload.sequence_id,
                    payload.verdict,
                    payload.risk_level,
                    payload.risk_score,
                    payload.details,
                    v_data["timestamp"],
                ),
            )
            conn.commit()
    except Exception as exc:
        logger.warning("Failed to persist companion verdict: %s", exc)
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
    try:
        with sqlite3.connect(str(companion_store.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM companion_verdicts WHERE sequence_id = ?;",
                (sequence_id,),
            ).fetchone()
            if row:
                return {
                    "has_verdict": True,
                    "sequence_id": row["sequence_id"],
                    "verdict": row["verdict"],
                    "risk_level": row["risk_level"],
                    "risk_score": row["risk_score"],
                    "details": row["details"],
                    "timestamp": row["timestamp"],
                }
    except Exception as exc:
        logger.debug("verdict sqlite lookup failed: %s", exc, exc_info=True)
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
    """Helper to detect reachable IPv4 LAN addresses using select_lan_ip and network module."""
    from app.core.network import get_all_lan_interfaces, select_lan_ip

    primary = select_lan_ip()
    all_ifaces = get_all_lan_interfaces()
    ips = [primary] if primary != "127.0.0.1" else []
    for iface, addr_list in all_ifaces.items():
        for ip in addr_list:
            if ip and not ip.startswith("127.") and not ip.startswith("169.254.") and ip not in ips:
                ips.append(ip)
    if not ips:
        ips.append("127.0.0.1")
    return ips


@router.get("/pairing-qr", response_model=PairingQRResponse, summary="Fetch SSBPAIR QR Code Pairing Payload & Gateway Metadata")
async def get_pairing_qr():
    """
    Returns the QR code payload under structured JSON pairing protocol, ephemeral pairing token,
    selected LAN IP, dynamic port, and HTTP fallback URL for Android pairing.
    """
    from app.core.config import settings
    from app.core.network import select_lan_ip

    current_lan_ip = select_lan_ip()
    port = getattr(settings, "PORT", 8000)
    gateway_id = "SSBGateway"
    pairing_token = companion_store.pairing_token
    fallback_url = f"http://{current_lan_ip}:{port}"
    qr_payload = f"SSBPAIR://{current_lan_ip}:{port}/{pairing_token}"

    logger.info(f"[Companion] Generated pairing QR payload: {qr_payload}")

    return PairingQRResponse(
        status="active",
        qr_payload=qr_payload,
        gateway_id=gateway_id,
        pairing_token=pairing_token,
        current_lan_ip=current_lan_ip,
        port=port,
        fallback_url=fallback_url,
        timestamp=time.time(),
    )


@router.get("/info", summary="Fetch Edge Gateway Companion Pairing & Network Info")
async def get_companion_info():
    """
    Returns detected network interfaces, pairing URLs for Wi-Fi, Emulator, ADB USB,
    and live connected device status for the Connect Modal and QR code generator.
    """
    from app.core.device_tracker import device_tracker
    from app.core.config import settings
    from app.core.network import select_lan_ip

    local_ips = _get_local_ip_addresses()
    primary_ip = select_lan_ip()
    port = getattr(settings, "PORT", 8000)

    gateway_url = f"http://{primary_ip}:{port}"
    emulator_url = f"http://10.0.2.2:{port}"
    adb_command = f"adb reverse tcp:{port} tcp:{port}"

    all_devices = device_tracker.get_all_devices()
    online_count = sum(1 for d in all_devices if d.status == "ONLINE")

    return {
        "status": "ok",
        "primary_ip": primary_ip,
        "local_ips": local_ips,
        "port": port,
        "gateway_url": gateway_url,
        "emulator_url": emulator_url,
        "adb_command": adb_command,
        "active_devices_count": online_count,
        "devices": [d.model_dump() for d in all_devices],
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
async def simulate_companion_capture(request: Request, payload: CompanionSimulateRequest):
    """
    Simulates a companion camera upload with complete SQLite persistence, disk storage,
    and SSE push broadcast for testing directly from the web connect modal.
    """
    from app.core.device_tracker import device_tracker

    client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent") or "SSB-Android-Companion/2.0 (Simulated)"

    device_tracker.record_activity(
        client_ip=client_ip,
        user_agent=user_agent,
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


def _find_adb_binary() -> Optional[str]:
    """
    Locate the adb binary across PATH, common install directories, environment variables
    (ANDROID_HOME, ANDROID_SDK_ROOT), and Android Studio bundled SDK.
    """
    # 1. PATH lookup first
    resolved = shutil.which("adb")
    if resolved:
        return resolved

    # 2. Environment variable overrides
    for env_var in ("ANDROID_HOME", "ANDROID_SDK_ROOT", "ANDROID_SDK"):
        sdk_root = os.environ.get(env_var)
        if sdk_root:
            candidate = Path(sdk_root) / "platform-tools" / "adb"
            if candidate.exists() and os.access(candidate, os.X_OK):
                return str(candidate)

    # 3. Known hard-coded install paths (macOS + Linux + Windows via WSL)
    home = Path.home()
    for candidate in (
        "/opt/homebrew/bin/adb",
        "/usr/local/bin/adb",
        "/usr/bin/adb",
        home / "Library/Android/sdk/platform-tools/adb",      # macOS Android Studio default
        home / "Android/Sdk/platform-tools/adb",              # Linux Android Studio default
        home / "AppData/Local/Android/Sdk/platform-tools/adb",  # Windows (WSL unlikely but safe)
        Path("/Applications/Android Studio.app/sdk/platform-tools/adb"),
        home / ".local/share/android-sdk/platform-tools/adb",
    ):
        p = Path(candidate)
        if p.exists() and os.access(p, os.X_OK):
            return str(p)

    return None


def _parse_adb_devices(adb_bin: str) -> List[Dict[str, str]]:
    """Run 'adb devices -l' and return a list of device dicts with serial, state, model."""
    devices: List[Dict[str, str]] = []
    try:
        proc = subprocess.run(
            [adb_bin, "devices", "-l"],
            capture_output=True, text=True, timeout=8,
        )
        for line in proc.stdout.splitlines():
            line = line.strip()
            if not line or line.startswith("List of devices") or line.startswith("*"):
                continue
            parts = line.split()
            if len(parts) < 2:
                continue
            serial, state = parts[0], parts[1]
            model = next(
                (p.replace("model:", "") for p in parts[2:] if p.startswith("model:")),
                "Android Device",
            )
            devices.append({"serial": serial, "state": state, "model": model})
    except Exception as exc:
        logger.warning("[USB] _parse_adb_devices error: %s", exc)
    return devices


def _classify_error_code(devices: List[Dict[str, str]]) -> str:
    """Map device list states to a UI-friendly error_code string."""
    if not devices:
        return "no_devices"
    states = {d["state"] for d in devices}
    ready = [d for d in devices if d["state"] == "device"]
    if ready:
        return "ok"  # at least one ready device — shouldn't normally reach classify
    if "unauthorized" in states:
        return "unauthorized"
    if "offline" in states:
        return "offline"
    return "unknown_state"


@router.post("/usb-connect", summary="Trigger ADB Reverse USB Tunnel for Android Field Unit")
async def trigger_usb_connect(port: Optional[int] = None):
    """
    6-stage hardened ADB reverse tunnel setup:
    1. Find ADB binary (extended search)
    2. adb start-server — ensure daemon is alive
    3. adb devices -l — enumerate and classify attached devices
    4. Edge-case dispatch (no device, unauthorized, offline, multiple)
    5. adb -s <serial> reverse tcp:<port> tcp:<port> — targeted tunnel
    6. Tunnel verification via adb reverse --list

    Returns structured response with error_code, device_serial, tunnel_verified fields.
    """
    from app.core.config import settings

    target_port = port or getattr(settings, "PORT", 8000)

    # ── Stage 1: Find ADB ────────────────────────────────────────────────────
    adb_bin = _find_adb_binary()
    if not adb_bin:
        return {
            "success": False,
            "error_code": "adb_not_found",
            "port": target_port,
            "adb_path": None,
            "command": f"adb reverse tcp:{target_port} tcp:{target_port}",
            "devices": [],
            "device_count": 0,
            "error": (
                "ADB not found. Install Android Platform Tools:\n"
                "  macOS: brew install android-platform-tools\n"
                "  Or add ~/Library/Android/sdk/platform-tools to PATH"
            ),
        }

    # ── Stage 2: Ensure ADB daemon is running ────────────────────────────────
    try:
        subprocess.run(
            [adb_bin, "start-server"],
            capture_output=True, text=True, timeout=8,
        )
    except Exception as exc:
        logger.warning("[USB] adb start-server warning: %s", exc)

    # ── Stage 3: Enumerate devices ───────────────────────────────────────────
    devices = _parse_adb_devices(adb_bin)
    ready_devices = [d for d in devices if d["state"] == "device"]

    # ── Stage 4: Edge-case dispatch ──────────────────────────────────────────
    if not ready_devices:
        error_code = _classify_error_code(devices)
        error_messages = {
            "no_devices": (
                "No USB device detected. Plug in your Android phone via USB cable "
                "and ensure USB Debugging is enabled in Developer Options."
            ),
            "unauthorized": (
                "Device connected but USB Debugging not authorized. "
                "Check your phone screen and tap 'Allow USB Debugging', then retry."
            ),
            "offline": (
                "Device found but not responding (offline state). "
                "Try unplugging and replugging the USB cable."
            ),
            "unknown_state": (
                f"Device is in an unexpected state: {', '.join(d['state'] for d in devices)}. "
                "Ensure USB Debugging is enabled and the cable supports data transfer."
            ),
        }
        logger.warning("[USB] No ready devices. error_code=%s, devices=%s", error_code, devices)
        return {
            "success": False,
            "error_code": error_code,
            "port": target_port,
            "adb_path": adb_bin,
            "command": f"adb reverse tcp:{target_port} tcp:{target_port}",
            "devices": devices,
            "device_count": len(devices),
            "error": error_messages.get(error_code, "Unknown ADB error."),
        }

    # Pick the first ready device; if multiple, log the rest
    target_device = ready_devices[0]
    target_serial = target_device["serial"]
    if len(ready_devices) > 1:
        others = [d["serial"] for d in ready_devices[1:]]
        logger.info("[USB] Multiple ready devices — using %s, ignoring: %s", target_serial, others)

    # ── Stage 5: Establish reverse tunnel on target device ───────────────────
    cmd = [adb_bin, "-s", target_serial, "reverse", f"tcp:{target_port}", f"tcp:{target_port}"]
    try:
        proc_rev = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        if proc_rev.returncode != 0:
            raw_err = proc_rev.stderr.strip() or proc_rev.stdout.strip() or f"exit code {proc_rev.returncode}"
            logger.warning("[USB] adb reverse failed for %s: %s", target_serial, raw_err)
            # Re-check for unauthorized after the reverse attempt (race: user just tapped Allow)
            if "unauthorized" in raw_err.lower():
                return {
                    "success": False,
                    "error_code": "unauthorized",
                    "port": target_port,
                    "adb_path": adb_bin,
                    "command": " ".join(cmd),
                    "device_serial": target_serial,
                    "device_model": target_device["model"],
                    "devices": devices,
                    "device_count": len(devices),
                    "error": "Tap 'Allow USB Debugging' on your phone, then retry.",
                }
            return {
                "success": False,
                "error_code": "reverse_failed",
                "port": target_port,
                "adb_path": adb_bin,
                "command": " ".join(cmd),
                "device_serial": target_serial,
                "device_model": target_device["model"],
                "devices": devices,
                "device_count": len(devices),
                "error": raw_err,
            }
    except subprocess.TimeoutExpired:
        logger.warning("[USB] adb reverse timed out for %s", target_serial)
        return {
            "success": False,
            "error_code": "timeout",
            "port": target_port,
            "adb_path": adb_bin,
            "command": " ".join(cmd),
            "device_serial": target_serial,
            "device_model": target_device["model"],
            "devices": devices,
            "device_count": len(devices),
            "error": "ADB reverse command timed out (8s). Unplug and replug the USB cable, then retry.",
        }
    except Exception as exc:
        logger.warning("[USB] adb reverse exception for %s: %s", target_serial, exc)
        return {
            "success": False,
            "error_code": "reverse_failed",
            "port": target_port,
            "adb_path": adb_bin,
            "command": " ".join(cmd),
            "device_serial": target_serial,
            "device_model": target_device["model"],
            "devices": devices,
            "device_count": len(devices),
            "error": str(exc),
        }

    # ── Stage 6: Verify tunnel via reverse --list ────────────────────────────
    tunnel_verified = False
    active_reverses: List[str] = []
    try:
        proc_list = subprocess.run(
            [adb_bin, "-s", target_serial, "reverse", "--list"],
            capture_output=True, text=True, timeout=5,
        )
        active_reverses = [ln.strip() for ln in proc_list.stdout.splitlines() if ln.strip()]
        tunnel_entry = f"tcp:{target_port}"
        tunnel_verified = any(tunnel_entry in entry for entry in active_reverses)
    except Exception:
        pass

    logger.info(
        "[USB] Tunnel established: device=%s model=%s port=%s verified=%s",
        target_serial, target_device["model"], target_port, tunnel_verified,
    )

    return {
        "success": True,
        "error_code": "ok",
        "port": target_port,
        "adb_path": adb_bin,
        "command": f"adb -s {target_serial} reverse tcp:{target_port} tcp:{target_port}",
        "message": (
            f"USB reverse tunnel active on port {target_port}. "
            f"Device '{target_device['model']}' ({target_serial}) connected. "
            f"Android app → http://127.0.0.1:{target_port}"
        ),
        "device_serial": target_serial,
        "device_model": target_device["model"],
        "tunnel_verified": tunnel_verified,
        "devices": devices,
        "device_count": len(devices),
        "devices_found": len(ready_devices),
        "active_reverses": active_reverses,
    }


@router.get("/usb-status", summary="Lightweight ADB USB Device & Tunnel Status Poll")
async def get_usb_status():
    """
    Lightweight read-only status check — safe to call every 3 seconds.
    Queries ADB for connected devices and active reverse tunnels without
    modifying any state. Used by the frontend auto-poll for live USB indicator.
    """
    from app.core.config import settings

    target_port = getattr(settings, "PORT", 8000)
    adb_bin = _find_adb_binary()

    if not adb_bin:
        return {
            "adb_found": False,
            "devices": [],
            "device_count": 0,
            "ready_count": 0,
            "tunnel_active": False,
            "tunnel_port": target_port,
            "error_code": "adb_not_found",
        }

    devices = _parse_adb_devices(adb_bin)
    ready_devices = [d for d in devices if d["state"] == "device"]
    unauthorized_devices = [d for d in devices if d["state"] == "unauthorized"]

    # Check active reverse tunnels
    tunnel_active = False
    active_reverses: List[str] = []
    if ready_devices:
        try:
            target_serial = ready_devices[0]["serial"]
            proc = subprocess.run(
                [adb_bin, "-s", target_serial, "reverse", "--list"],
                capture_output=True, text=True, timeout=5,
            )
            active_reverses = [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]
            tunnel_entry = f"tcp:{target_port}"
            tunnel_active = any(tunnel_entry in entry for entry in active_reverses)
        except Exception:
            pass

    error_code = "ok"
    if not devices:
        error_code = "no_devices"
    elif not ready_devices and unauthorized_devices:
        error_code = "unauthorized"
    elif not ready_devices:
        error_code = "offline"

    return {
        "adb_found": True,
        "devices": devices,
        "device_count": len(devices),
        "ready_count": len(ready_devices),
        "unauthorized_count": len(unauthorized_devices),
        "tunnel_active": tunnel_active,
        "tunnel_port": target_port,
        "active_reverses": active_reverses,
        "error_code": error_code,
        "primary_device": ready_devices[0] if ready_devices else (
            unauthorized_devices[0] if unauthorized_devices else None
        ),
    }

