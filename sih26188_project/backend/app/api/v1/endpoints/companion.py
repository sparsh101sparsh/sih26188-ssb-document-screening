"""
SIH26188 — Android Companion Camera Sync v1 Endpoints
Exposes the companion sync API endpoints and singleton store for real-time camera ingestion.
"""

from app.api.routers.companion import (
    CompanionCaptureState,
    CompanionStore,
    CompanionUploadRequest,
    clear_companion_capture,
    companion_store,
    get_latest_companion_capture,
    router,
    upload_companion_capture,
)

__all__ = [
    "router",
    "companion_store",
    "CompanionStore",
    "CompanionCaptureState",
    "CompanionUploadRequest",
    "upload_companion_capture",
    "get_latest_companion_capture",
    "clear_companion_capture",
]
