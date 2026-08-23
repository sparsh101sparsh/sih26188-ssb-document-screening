"""
SIH26188 — Forensics & Stamp Verification API Router
Architecture Reference: Section 2.3, 2.4, 5.2

Provides REST endpoints for:
- POST /api/v1/forensics/analyze -> ForensicsResult (DocTamper, TruFor, ELA, EXIF/DQT)
- POST /api/v1/forensics/stamp   -> StampResult (4-Stage Stamp Verification)
- POST /api/v1/forensics/ela     -> ELAResult (Error Level Analysis)
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.logging import get_logger
from app.modules.forensics.ela_engine import ela_engine
from app.modules.forensics.tamper_detector import tamper_detector
from app.modules.stamp_verifier import stamp_verifier
from app.schemas.forensics import ELAResult, ForensicsResult
from app.schemas.stamp import StampResult

logger = get_logger("sih26188.api.forensics")

router = APIRouter(
    prefix="/api/v1/forensics",
    tags=["Forensics & Stamps"],
)


@router.post(
    "/analyze",
    response_model=ForensicsResult,
    status_code=status.HTTP_200_OK,
    summary="Multi-Modal Forensic Tamper Analysis",
    description="Performs DocTamper DTD text tampering localization, TruFor splicing detection, ELA, and EXIF/DQT parsing.",
)
async def analyze_document_forensics(
    document_image: UploadFile = File(..., description="Document image file (JPEG/PNG)"),
    ocr_boxes: Optional[str] = Form(None, description="Optional JSON array of OCR text bounding boxes"),
    photo_bbox: Optional[str] = Form(None, description="Optional JSON array [x1, y1, x2, y2] for portrait box"),
) -> ForensicsResult:
    """
    Executes forensic tamper analysis on uploaded document image.
    """
    if not document_image.content_type or not document_image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document image file type: {document_image.content_type}. Expected image/jpeg or image/png.",
        )

    image_bytes = await document_image.read()
    if len(image_bytes) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document image payload is empty or corrupted (< 50 bytes).",
        )

    # Parse optional JSON parameters
    parsed_ocr_boxes: Optional[List[Dict[str, Any]]] = None
    if ocr_boxes:
        try:
            parsed_ocr_boxes = json.loads(ocr_boxes)
        except Exception:
            logger.warning(f"Could not parse ocr_boxes JSON: {ocr_boxes}")

    parsed_photo_bbox: Optional[List[int]] = None
    if photo_bbox:
        try:
            parsed_photo_bbox = json.loads(photo_bbox)
        except Exception:
            logger.warning(f"Could not parse photo_bbox JSON: {photo_bbox}")

    result = tamper_detector.analyze(
        image_bytes=image_bytes,
        ocr_boxes=parsed_ocr_boxes,
        photo_bbox=parsed_photo_bbox,
    )
    return result


@router.post(
    "/stamp",
    response_model=StampResult,
    status_code=status.HTTP_200_OK,
    summary="4-Stage Border Stamp Verification",
    description="Locates official border stamps, matches against SSB registry with SSIM/ORB, evaluates forensic integrity, and checks context.",
)
async def verify_border_stamp(
    document_image: UploadFile = File(..., description="Document image containing border stamp (JPEG/PNG)"),
    declared_checkpost: Optional[str] = Form(None, description="Declared border checkpost identifier or location"),
    declared_date: Optional[str] = Form(None, description="Declared transit date (DD-MM-YYYY or DD/MM/YYYY)"),
    permit_expiry: Optional[str] = Form(None, description="Transit permit expiration date"),
) -> StampResult:
    """
    Executes 4-Stage Stamp Verification on uploaded document.
    """
    if not document_image.content_type or not document_image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file type: {document_image.content_type}. Expected image/jpeg or image/png.",
        )

    image_bytes = await document_image.read()
    if len(image_bytes) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document image payload is empty or corrupted (< 50 bytes).",
        )

    result = stamp_verifier.verify_stamp(
        image_bytes=image_bytes,
        declared_checkpost=declared_checkpost,
        declared_date=declared_date,
        permit_expiry=permit_expiry,
    )
    return result


@router.post(
    "/ela",
    response_model=ELAResult,
    status_code=status.HTTP_200_OK,
    summary="Classical Error Level Analysis (ELA)",
    description="Performs JPEG re-compression Error Level Analysis at quality 90 amplified 20x.",
)
async def analyze_ela(
    document_image: UploadFile = File(..., description="Document image file (JPEG/PNG)"),
    quality: int = Form(90, description="JPEG re-compression quality"),
    scale: float = Form(20.0, description="Error amplification scale factor"),
) -> ELAResult:
    """
    Executes classical ELA analysis on uploaded document.
    """
    if not document_image.content_type or not document_image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file type: {document_image.content_type}. Expected image/jpeg or image/png.",
        )

    image_bytes = await document_image.read()
    if len(image_bytes) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document image payload is empty or corrupted (< 50 bytes).",
        )

    result = ela_engine.analyze(
        image_bytes=image_bytes,
        quality=quality,
        scale=scale,
    )
    return result
