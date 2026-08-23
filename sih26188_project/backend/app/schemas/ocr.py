"""
SIH26188 — OCR & QR Code Extraction Pydantic v2 Schemas
Architecture Reference: Section 2.1, 2.5
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OCRBox(BaseModel):
    """Represents a detected text bounding polygon with coordinates and confidence."""
    model_config = ConfigDict(from_attributes=True)

    text: str = Field(..., description="Recognized text string")
    confidence: float = Field(..., ge=0.0, le=1.0, description="OCR recognition confidence (0.0 - 1.0)")
    polygon: List[List[int]] = Field(
        ...,
        description="4-point polygon coordinates [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]"
    )
    bbox: Optional[List[int]] = Field(
        default=None,
        description="Axis-aligned bounding box [x_min, y_min, x_max, y_max]"
    )


class OCRFieldResult(BaseModel):
    """Structured key-value field extracted from document."""
    model_config = ConfigDict(from_attributes=True)

    field_name: str = Field(..., description="Standardized field name (e.g., full_name, dob, doc_number)")
    extracted_text: str = Field(..., description="Extracted textual value")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Field-level confidence score")
    bounding_box: Optional[List[int]] = Field(
        default=None,
        description="Bounding box [x1, y1, x2, y2]"
    )


class QRPayload(BaseModel):
    """Decoded Aadhaar Secure QR or 2D barcode payload."""
    model_config = ConfigDict(from_attributes=True)

    raw_qr_found: bool = Field(default=False, description="Whether QR code was located in document")
    qr_type: Optional[str] = Field(default=None, description="AADHAAR_SECURE_V2 | BARCODE_PDF417 | QR_GENERIC")
    signature_valid: bool = Field(default=False, description="Offline RSA-2048 PKI signature validity")
    signature_algorithm: Optional[str] = Field(default="SHA256withRSA", description="PKCS#1 v1.5 algorithm")
    demographics: Dict[str, Any] = Field(default_factory=dict, description="Parsed demographic payload")
    photo_jp2_extracted: bool = Field(default=False, description="Whether embedded JP2000 face photo was extracted")
    error_message: Optional[str] = Field(default=None, description="Signature or decode error description")


class OCRResult(BaseModel):
    """Aggregated multi-script OCR extraction output."""
    model_config = ConfigDict(from_attributes=True)

    status: str = Field(default="success", description="success | low_confidence | unavailable | failed")
    script_detected: str = Field(default="latin", description="devanagari | latin | mixed | unknown")
    fields: Dict[str, str] = Field(default_factory=dict, description="Key-value mapping of extracted fields")
    field_confidences: Dict[str, float] = Field(default_factory=dict, description="Per-field confidence scores")
    raw_boxes: List[OCRBox] = Field(default_factory=list, description="Raw detected bounding polygons")
    mean_confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Mean document OCR confidence")
    requires_tier2_vlm: bool = Field(
        default=False,
        description="True if mean_confidence < tau_ocr (0.82) triggering async Qwen2.5-VL"
    )
    raw_text: str = Field(default="", description="Full concatenated text string")
    qr_payload: Optional[QRPayload] = Field(default=None, description="Embedded cryptographic QR payload")
    processing_time_ms: float = Field(default=0.0, description="OCR execution latency in milliseconds")
