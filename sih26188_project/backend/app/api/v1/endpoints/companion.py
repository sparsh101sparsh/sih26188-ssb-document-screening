"""
SIH26188 — Android Companion Camera Sync v1 Endpoints
Exposes the companion sync API endpoints and singleton store for real-time camera ingestion.
"""

from app.api.routers.companion import (
    CompanionCaptureState,
    CompanionStore,
    CompanionUploadRequest,
    PairingQRResponse,
    clear_companion_capture,
    companion_store,
    get_latest_companion_capture,
    get_pairing_qr,
    router,
    upload_companion_capture,
)

__all__ = [
    "router",
    "companion_store",
    "CompanionStore",
    "CompanionCaptureState",
    "CompanionUploadRequest",
    "PairingQRResponse",
    "get_pairing_qr",
    "upload_companion_capture",
    "get_latest_companion_capture",
    "clear_companion_capture",
]
