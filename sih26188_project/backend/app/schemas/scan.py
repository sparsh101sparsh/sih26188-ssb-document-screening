"""
SIH26188 — Master Inspection & Pipeline Scan Schemas
Architecture Reference: Section 1.4, 5.2
"""

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.biometrics import FaceMatchResult, LivenessResult
from app.schemas.forensics import ForensicsResult
from app.schemas.mrz import CrossValidationResult, MRZResult
from app.schemas.ocr import OCRResult
from app.schemas.risk import RiskAssessment
from app.schemas.stamp import StampResult


class ScanResponse(BaseModel):
    """Consolidated response payload from the 3-Stream Parallel Inspection Pipeline."""
    model_config = ConfigDict(from_attributes=True)

    session_id: str = Field(..., description="Unique inspection transaction identifier")
    document_type: str = Field(default="unknown", description="aadhaar | passport | voter_id | citizenship | unknown")
    ocr: OCRResult = Field(..., description="Stream 1 OCR text & QR results")
    mrz: MRZResult = Field(..., description="Stream 1 MRZ checksum results")
    biometrics: Optional[FaceMatchResult] = Field(default=None, description="Stream 2 Face verification results")
    liveness: Optional[LivenessResult] = Field(default=None, description="Stream 2 Anti-spoofing results")
    forensics: ForensicsResult = Field(..., description="Stream 3 Tampering & splicing results")
    stamp: Optional[StampResult] = Field(default=None, description="Stream 3 Stamp authentication results")
    cross_validation: CrossValidationResult = Field(..., description="Stage 2.5 Multi-modal cross-validation results")
    risk: RiskAssessment = Field(..., description="Stage 3 Final hybrid risk decision & explainability report")
    processing_time_ms: float = Field(..., description="Total end-to-end multi-stream pipeline latency")


class DocumentInspectResponse(BaseModel):
    """Convenience response for the primary /api/v1/scan/inspect endpoint."""
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    status: str = "completed"
    assessment: RiskAssessment
    details: Optional[ScanResponse] = None
