"""
SIH26188 — OCR, MRZ & QR FastAPI Router
Architecture Reference: Section 2.1, 2.5, 5.2

Exposes REST endpoints for:
- POST /api/v1/ocr/extract : Extract multilingual text, structured fields & confidences
- POST /api/v1/mrz/validate: Parse and mathematically validate ICAO Doc 9303 MRZ strings
- POST /api/v1/qr/decode   : Decode Aadhaar Secure QR & verify offline RSA-2048 PKI signature
"""

from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.modules.mrz.mrz_engine import mrz_engine
from app.modules.ocr.pp_ocr_engine import pp_ocr_engine
from app.modules.ocr.qr_decoder import qr_decoder
from app.schemas.mrz import MRZResult
from app.schemas.ocr import OCRResult, QRPayload

logger = get_logger("sih26188.api.ocr")

router = APIRouter(tags=["OCR & MRZ"])


class MRZValidateRequest(BaseModel):
    """Request schema for MRZ string validation."""
    lines: List[str] = Field(..., min_length=1, description="List of raw MRZ text lines (2 or 3 lines)")


class QRDecodeRequest(BaseModel):
    """Optional JSON request schema for direct base64/hex/string QR decoding."""
    raw_payload: str = Field(..., description="Raw string or base64-encoded QR payload")


@router.post(
    "/api/v1/ocr/extract",
    response_model=OCRResult,
    status_code=status.HTTP_200_OK,
    summary="Extract structured demographic fields from document image or raw text",
)
async def extract_ocr(
    request: Request,
    document_image: Optional[UploadFile] = File(None, description="Document image file (JPEG/PNG)"),
    raw_text: Optional[str] = Form(None, description="Optional raw text input for direct parsing"),
):
    """
    Synchronous Tier-1 OCR extraction endpoint.
    Accepts multipart document image, form data, or JSON payload with 'raw_text'.
    Returns structured identity fields, bounding polygons, script detection, and quality-gate flag.
    """
    content_type = request.headers.get("content-type", "")

    # Check JSON body if provided
    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict) and "raw_text" in body:
                raw_text = body["raw_text"]
        except Exception:
            pass

    # Check multipart image
    if document_image is not None:
        img_bytes = await document_image.read()
        if len(img_bytes) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded document image payload is empty or invalid.",
            )

        try:
            from io import BytesIO
            from PIL import Image

            pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")
            ocr_result = pp_ocr_engine.extract_text(pil_img)

            # Attempt embedded QR decoding if present
            qr_res = qr_decoder.decode(pil_img)
            if qr_res.raw_qr_found:
                ocr_result.qr_payload = qr_res

            return ocr_result
        except Exception as e:
            logger.warning(f"PIL/OpenCV image decode error: {e}. Falling back to byte inspection.")
            return pp_ocr_engine.extract_text(img_bytes)

    elif raw_text is not None and raw_text.strip():
        return pp_ocr_engine.extract_text(raw_text)

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'document_image' file or 'raw_text' parameter must be provided.",
        )


@router.post(
    "/api/v1/mrz/validate",
    response_model=MRZResult,
    status_code=status.HTTP_200_OK,
    summary="Validate ICAO Doc 9303 MRZ strings across TD1, TD2, TD3",
)
async def validate_mrz(
    request: Request,
):
    """
    Pure Python ICAO Doc 9303 Modulo-10 7-3-1 Checksum Validation Endpoint.
    Validates CD1, CD2, CD3, CD4 and Composite Check Digit across TD1 (3x30), TD2 (2x36), and TD3 (2x44).
    Accepts JSON body `{"lines": [...]}` or form-data `lines` / `line1`, `line2`, `line3`.
    """
    mrz_lines: List[str] = []
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                mrz_lines = body.get("lines", [])
            elif isinstance(body, list):
                mrz_lines = body
        except Exception as e:
            logger.warning(f"Failed to parse JSON body: {e}")

    if not mrz_lines and ("multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type):
        try:
            form = await request.form()
            if "lines" in form:
                val = form.getlist("lines")
                mrz_lines = val if val else [str(form["lines"])]
            elif "line1" in form and "line2" in form:
                mrz_lines = [str(form["line1"]), str(form["line2"])]
                if "line3" in form:
                    mrz_lines.append(str(form["line3"]))
        except Exception as e:
            logger.warning(f"Failed to parse form data: {e}")

    if not mrz_lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No MRZ lines provided. Supply 'lines' array in JSON body or form parameters.",
        )

    return mrz_engine.parse_mrz_lines(mrz_lines)


@router.post(
    "/api/v1/qr/decode",
    response_model=QRPayload,
    status_code=status.HTTP_200_OK,
    summary="Decode Aadhaar Secure QR & verify offline RSA-2048 PKI signature",
)
async def decode_qr(
    request: Request,
    document_image: Optional[UploadFile] = File(None, description="Document image containing QR code"),
):
    """
    Offline Aadhaar Secure QR Decoder and RSA-2048 PKI Signature Verifier.
    Extracts demographic fields and verifies cryptographic authenticity against UIDAI Root Certificate.
    Accepts multipart document image, form data, or JSON payload with 'raw_payload'.
    """
    content_type = request.headers.get("content-type", "")
    raw_payload = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                raw_payload = body.get("raw_payload")
        except Exception:
            pass

    if document_image is not None:
        img_bytes = await document_image.read()
        if len(img_bytes) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded QR image payload is empty.",
            )
        try:
            from io import BytesIO
            from PIL import Image

            pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")
            return qr_decoder.decode(pil_img)
        except Exception:
            return qr_decoder.decode(img_bytes)

    if not raw_payload and ("multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type):
        try:
            form = await request.form()
            raw_payload = form.get("raw_payload")
        except Exception:
            pass

    if raw_payload:
        return qr_decoder.decode(raw_payload)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Either 'document_image' file or 'raw_payload' must be provided.",
    )
