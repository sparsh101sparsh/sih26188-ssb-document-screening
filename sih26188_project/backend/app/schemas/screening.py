"""
SIH26188 — Android Mobile Field Screening OpenAPI Schemas
Architecture Reference: Section 11 (Android Specialist Agent Master Specification)
"""

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class DocumentScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    session_id: str
    document_type_hint: str = "auto"
    image_base64: str
    capture_metadata: Optional[dict[str, Any]] = None

    @field_validator("image_base64")
    @classmethod
    def validate_image_base64(cls, v: str) -> str:
        if len(v) < 50:
            raise ValueError("image_base64 string too short")
        return v


class OCRFieldResultMobile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    field_name: str
    extracted_text: str
    confidence: float = Field(ge=0.0, le=1.0)
    bounding_box: list[int]


class MRZResultMobile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mrz_detected: bool
    doc_type: Optional[str] = None
    country_code: Optional[str] = None
    document_number: Optional[str] = None
    doc_number_checksum_valid: Optional[bool] = None
    dob: Optional[str] = None
    dob_checksum_valid: Optional[bool] = None
    expiry: Optional[str] = None
    expiry_checksum_valid: Optional[bool] = None
    composite_checksum_valid: Optional[bool] = None


class ForensicResultMobile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tamper_probability: float = Field(ge=0.0, le=1.0)
    photo_region_tampered: bool
    tamper_heatmap_base64: Optional[str] = None
    detected_anomalies: list[str] = Field(default_factory=list)


class DocumentScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    ocr_results: list[OCRFieldResultMobile]
    mrz_results: MRZResultMobile
    forensic_results: ForensicResultMobile
    processing_time_ms: float


class FaceScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    session_id: str
    live_image_base64: str


class FaceScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    face_detected: bool
    liveness_score: float = Field(ge=0.0, le=1.0)
    is_live: bool
    apparent_age_estimate: Optional[int] = None
    processing_time_ms: float


class CrossValidationFlagMobile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_id: str
    rule_description: str
    passed: bool
    telemetry_message: str


class ScreeningCompleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    checkpoint_id: str
    officer_id: str


class ScreeningCompleteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    risk_score: int = Field(ge=0, le=100)
    risk_tier: str
    auto_clear: bool
    biometric_similarity: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    watchlist_hit: bool
    cross_validation_flags: list[CrossValidationFlagMobile]
    flag_reasons: list[str]
    audit_record_hash: str
    total_pipeline_latency_ms: float


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: str
    session_id: str
    timestamp: datetime
    checkpoint_id: str
    officer_id: str
    document_type: str
    risk_score: int = Field(ge=0, le=100)
    risk_tier: str
    watchlist_hit: bool
    sha256_hash: str
    sync_status: str


class AuditLogQueryFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    checkpoint_id: Optional[str] = None
    officer_id: Optional[str] = None
    risk_tier: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class AuditLogsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_count: int
    entries: list[AuditLogEntry]
    offset: int
    limit: int
