"""
SIH26188 — Master API v1 Router Registration
Aggregates and mounts all modular sub-routers for API v1.
"""

from fastapi import APIRouter

from app.api.routers import biometrics, forensics, ocr, scan
from app.api.v1.endpoints import companion

api_router = APIRouter()

# Include companion camera sync router
api_router.include_router(companion.router)
