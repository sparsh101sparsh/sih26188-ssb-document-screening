"""
SIH26188 — Android Companion Camera Sync Router
Provides real-time camera ingestion and streaming between frontline Android field units
and the central edge desktop terminal.
"""

import base64
import time
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

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

class CompanionStore:
    def __init__(self):
        self.state = CompanionCaptureState()

    def set_capture(self, capture_type: str, image_bytes: bytes, filename: str, device_id: str, checkpoint_id: str):
        b64 = base64.b64encode(image_bytes).decode('utf-8')
        mime_type = "image/jpeg" if filename.lower().endswith(('.jpg', '.jpeg')) else "image/png"
        data_uri = f"data:{mime_type};base64,{b64}"
        
        self.state = CompanionCaptureState(
            has_capture=True,
            sequence_id=self.state.sequence_id + 1,
            capture_type=capture_type,
            device_id=device_id,
            checkpoint_id=checkpoint_id,
            image_data=data_uri,
            filename=filename,
            timestamp=time.time(),
        )
        return self.state

    def get_latest(self) -> CompanionCaptureState:
        return self.state

    def clear(self):
        self.state = CompanionCaptureState(sequence_id=self.state.sequence_id)
        return {"status": "cleared"}

companion_store = CompanionStore()


@router.post("/upload", summary="Upload Companion Camera Capture from Android Field Unit")
async def upload_companion_capture(
    file: UploadFile = File(...),
    capture_type: str = Form("selfie"),
    device_id: str = Form("field-unit-1"),
    checkpoint_id: str = Form("WB-JAI-01")
):
    """
    Receives live camera snapshot from Android field unit and buffers it for instant desktop consumption.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
    state = companion_store.set_capture(
        capture_type=capture_type,
        image_bytes=contents,
        filename=file.filename or "capture.jpg",
        device_id=device_id,
        checkpoint_id=checkpoint_id
    )
    return {
        "status": "success",
        "message": "Capture synced to Edge Terminal",
        "sequence_id": state.sequence_id,
        "capture_type": state.capture_type,
        "device_id": state.device_id,
        "timestamp": state.timestamp
    }


@router.get("/latest", summary="Poll Latest Companion Capture on Desktop Terminal")
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
