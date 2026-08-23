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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import biometrics, forensics, ocr, scan
from app.core.backend_selector import get_hardware_status, get_optimal_execution_providers
from app.core.config import settings
from app.core.logging import get_logger, setup_logging

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

# Mount all API Routers
app.include_router(ocr.router)
app.include_router(biometrics.router)
app.include_router(forensics.router)
app.include_router(scan.router)


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
    return {
        "status": "healthy",
        "engine_mode": "darwin_arm64_coreml" if "CoreMLExecutionProvider" in get_optimal_execution_providers() else "cuda_tensorrt",
        "models_loaded": MODELS_STATE,
        "uptime_seconds": round(time.time() - APP_START_TIME, 2),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
