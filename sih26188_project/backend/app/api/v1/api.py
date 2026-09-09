"""
SIH26188 — Master API v1 Router Registration (Legacy Facade)

NOTE: This router module is preserved for backward compatibility.
All active production endpoints are mounted directly from app.main:app via:
  app.include_router(health.router)
  app.include_router(scan.router)
  app.include_router(biometrics.router)
  app.include_router(forensics.router)
  app.include_router(ocr.router)
  app.include_router(models.router)
  app.include_router(companion.router)
"""

from fastapi import APIRouter

from app.api.routers import biometrics, forensics, ocr, scan
from app.api.v1.endpoints import companion

api_router = APIRouter()

# Include companion camera sync router
api_router.include_router(companion.router)
