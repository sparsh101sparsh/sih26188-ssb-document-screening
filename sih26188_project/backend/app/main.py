"""
SIH26188 — Master FastAPI Application Entrypoint
AI-Based Fake Identity & Document Screening System (Version 3.0)
Architecture Reference: Sections 1.4, 3.2, 5.2, 6.1-6.4

Provides high-performance asynchronous REST endpoints for:
- Health telemetry & hardware backend detection (/health, /api/v1/health)
- Parallel 3-Stream multi-modal document inspection (/api/v1/scan/inspect)
- Modality-specific inspection (OCR/MRZ, Biometrics, Forensics/Stamps)
- Offline DPDP-compliant RAM-only ephemeral screening
"""

import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import biometrics, forensics, ocr, scan
from app.core.backend_selector import get_hardware_status, get_optimal_execution_providers
from app.core.config import settings
from app.core.device_tracker import device_tracker
from app.core.logging import get_logger, setup_logging
from app.schemas.scan import DocumentInspectResponse

# Initialize Structured Logging
setup_logging()
logger = get_logger("sih26188.main")

# Global Startup State
APP_START_TIME = time.time()
MODELS_STATE: Dict[str, bool] = {
    "pp_ocrv4_det": False,
    "pp_ocrv4_rec": False,
    "omnimrz": False,
    "scrfd_10gf": False,
    "adaface_r100": False,
    "minifasnet_v2": False,
    "doctamper_dtd": False,
    "trufor": False,
    "stamp_verifier": False,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    Initializes hardware execution providers and inspects model checkpoint registry.
    """
    logger.info("Initializing SIH26188 Edge Screening Appliance...")
    logger.info(f"Active Environment: {settings.ENVIRONMENT}")
    logger.info(f"Target Models Directory: {settings.MODELS_DIR}")

    # Detect Hardware Accelerators
    providers = get_optimal_execution_providers()
    logger.info(f"Configured ONNX Execution Providers: {providers}")

    # Verify model presence in storage (without crashing if missing)
    for model_key, filename in [
        ("pp_ocrv4_det", settings.PPOCR_DET_MODEL),
        ("pp_ocrv4_rec", settings.PPOCR_REC_DEV_MODEL),
        ("omnimrz", settings.OMNIMRZ_MODEL),
        ("scrfd_10gf", settings.SCRFD_MODEL),
        ("adaface_r100", settings.ADAFACE_MODEL),
        ("minifasnet_v2", settings.MINIFASNET_2_7X_MODEL),
        ("doctamper_dtd", settings.DOCTAMPER_MODEL),
        ("trufor", settings.TRUFOR_MODEL),
    ]:
        model_path = settings.get_model_path(filename)
        if model_path.exists():
            MODELS_STATE[model_key] = True
            logger.info(f"[MODEL READY] {model_key} -> {model_path}")
        else:
            MODELS_STATE[model_key] = False
            logger.warning(
                f"[MODEL PENDING] {model_key} ({filename}) not found at {model_path}. "
                f"Ensure weights are downloaded via backend/scripts/download_weights.sh."
            )

    # Verify Stamp Registry & Root Cert
    if settings.STAMP_REGISTRY_PATH.exists():
        MODELS_STATE["stamp_verifier"] = True
        logger.info(f"[DATA READY] Stamp Registry loaded from {settings.STAMP_REGISTRY_PATH}")
    if settings.UIDAI_ROOT_CERT_PATH.exists():
        logger.info(f"[DATA READY] UIDAI Offline Root Certificate loaded from {settings.UIDAI_ROOT_CERT_PATH}")

    yield

    logger.info("Gracefully shutting down SIH26188 Screening Service...")


# FastAPI Application Instance
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Offline Air-Gapped Multi-Modal Fake Identity & Document Screening System",
    lifespan=lifespan,
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def track_device_activity_middleware(request: Request, call_next):
    """
    Middleware intercepting incoming HTTP requests to track connected field devices,
    recording IP, user-agent, target endpoint, and execution latency in the DeviceTracker registry.
    """
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    path = request.url.path
    if (path.startswith("/api/v1/") or path in ("/health", "/api/v1/health")) and not path.startswith("/api/v1/devices"):
        # Resolve client IP (support reverse proxy headers)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "127.0.0.1")

        user_agent = request.headers.get("user-agent")
        checkpoint_id = request.headers.get("x-checkpoint-id")

        device_tracker.record_activity(
            client_ip=client_ip,
            user_agent=user_agent,
            endpoint=path,
            checkpoint_id=checkpoint_id,
            latency_ms=duration_ms,
        )

    return response

# Mount all API Routers
app.include_router(ocr.router)
app.include_router(biometrics.router)
app.include_router(forensics.router)
app.include_router(scan.router)

# Mount backward-compatible alias route for Android client
app.add_api_route(
    "/api/v1/inspect",
    scan.inspect_document,
    methods=["POST"],
    response_model=DocumentInspectResponse,
    tags=["Master Screening"],
    summary="Master 3-Stream Parallel Document Inspection Endpoint (Android Alias)",
    description="Backward-compatible alias route delegating directly to scan.inspect_document.",
)


@app.get("/health", tags=["Telemetry"])
async def get_health():
    """
    Standard edge health check endpoint returning system status and active models.
    """
    loaded_list = [k for k, v in MODELS_STATE.items() if v]
    return {
        "status": "ok",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "models_loaded": loaded_list,
        "models_total": len(MODELS_STATE),
        "hardware": get_hardware_status(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - APP_START_TIME, 2),
    }


@app.get("/api/v1/health", tags=["Telemetry"])
async def get_api_v1_health():
    """
    API v1 health contract matching mobile & Tauri desktop requirements.
    """
    aggregated_models = {
        "pp_ocrv4": bool(MODELS_STATE.get("pp_ocrv4_det") or MODELS_STATE.get("pp_ocrv4_rec")),
        "adaface": bool(MODELS_STATE.get("adaface_r100")),
        "minifasnet": bool(MODELS_STATE.get("minifasnet_v2")),
        "trufor": bool(MODELS_STATE.get("trufor")),
        "doctamper": bool(MODELS_STATE.get("doctamper_dtd")),
        "stamp_verifier": bool(MODELS_STATE.get("stamp_verifier")),
        **MODELS_STATE,
    }
    return {
        "status": "healthy",
        "engine_mode": "darwin_arm64_coreml" if "CoreMLExecutionProvider" in get_optimal_execution_providers() else "cuda_tensorrt",
        "models_loaded": aggregated_models,
        "uptime_seconds": round(time.time() - APP_START_TIME, 2),
    }


@app.get("/api/v1/devices", tags=["Telemetry"])
async def get_connected_devices():
    """
    Returns list of connected Android screening clients and edge terminals,
    providing IP, checkpoint ID, request counts, and round-trip latency metrics.
    Excludes OFFLINE devices (inactive > 8.0s) from active device count and listing.
    """
    active_devices = device_tracker.get_active_devices(timeout_seconds=settings.DEVICE_OFFLINE_TIMEOUT_SECONDS)
    last_device = device_tracker.get_last_active_device(timeout_seconds=settings.DEVICE_OFFLINE_TIMEOUT_SECONDS)
    return {
        "status": "ok",
        "total_devices": len(active_devices),
        "devices": [d.model_dump() for d in active_devices],
        "last_active_device": last_device.model_dump() if last_device else None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
