"""
SIH26188 — ICAO Doc 9303 MRZ & Cross-Validation Schemas
Architecture Reference: Section 2.5, 6.3
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MRZResult(BaseModel):
    """Parsed ICAO Doc 9303 Machine Readable Zone (MRZ) result with Modulo-10 checksum verifications."""
    model_config = ConfigDict(from_attributes=True)

    mrz_detected: bool = Field(default=False, description="Whether an MRZ zone was detected")
    mrz_type: Optional[str] = Field(default=None, description="TD1 (3x30) | TD2 (2x36) | TD3 (2x44)")
    valid: bool = Field(default=False, description="True if all ICAO check digits match")
    raw_lines: List[str] = Field(default_factory=list, description="Raw OCR MRZ string lines")
    document_type: Optional[str] = Field(default=None, description="P (Passport), I (ID Card), V (Visa), etc.")
    country_code: Optional[str] = Field(default=None, description="3-letter ICAO country code (e.g., IND, NPL, BTN)")
    surname: Optional[str] = Field(default=None, description="Primary identifier / surname")
    given_names: Optional[str] = Field(default=None, description="Secondary identifiers / given names")
    document_number: Optional[str] = Field(default=None, description="Passport or Identity document serial number")
    doc_number_checksum_valid: Optional[bool] = Field(default=None, description="CD1 verification status")
    nationality: Optional[str] = Field(default=None, description="3-letter nationality code")
    dob: Optional[str] = Field(default=None, description="Date of birth in YYMMDD format")
    dob_checksum_valid: Optional[bool] = Field(default=None, description="CD2 verification status")
    sex: Optional[str] = Field(default=None, description="M, F, or < (unspecified)")
    expiry: Optional[str] = Field(default=None, description="Expiration date in YYMMDD format")
    expiry_checksum_valid: Optional[bool] = Field(default=None, description="CD3 verification status")
    optional_data: Optional[str] = Field(default=None, description="Personal number / optional MRZ field")
    optional_data_checksum_valid: Optional[bool] = Field(default=None, description="CD4 verification status")
    composite_checksum_valid: Optional[bool] = Field(default=None, description="Composite check digit validation")
    checksum_failures: List[str] = Field(default_factory=list, description="List of failed check digit descriptions")
    parsed_fields: Dict[str, Any] = Field(default_factory=dict, description="Consolidated dictionary of parsed MRZ fields")
    processing_time_ms: float = Field(default=0.0, description="Execution latency in milliseconds")


class CrossViolation(BaseModel):
    """Represents a specific multi-modal cross-validation rule violation."""
    model_config = ConfigDict(from_attributes=True)

    rule_id: str = Field(..., description="Rule ID (CV-01 through CV-08)")
    rule_name: str = Field(..., description="Human-readable rule name")
    severity: str = Field(..., description="CRITICAL | WARNING | INFO")
    field_name: str = Field(..., description="Field under validation (e.g. dob, name, doc_number)")
    expected_value: Optional[str] = Field(default=None, description="Expected value from primary authority")
    actual_value: Optional[str] = Field(default=None, description="Observed value from secondary source")
    telemetry_code: str = Field(..., description="Granular telemetry identifier (e.g., ERR_DOB_MISMATCH)")
    details: str = Field(..., description="Detailed explanation of discrepancy")


class CrossValidationFlag(BaseModel):
    """Compatibility flag model for mobile/UI client consumption."""
    model_config = ConfigDict(from_attributes=True)

    rule_id: str
    rule_description: str
    passed: bool
    telemetry_message: str


class CrossValidationResult(BaseModel):
    """Aggregated results across all 8 multi-modal cross-validation rules (Section 6.3)."""
    model_config = ConfigDict(from_attributes=True)

    cross_validation_passed: bool = Field(..., description="True if zero CRITICAL violations are present")
    violation_count: int = Field(default=0, description="Total number of violations detected")
    critical_violations: List[CrossViolation] = Field(default_factory=list, description="Critical rule failures")
    warnings: List[CrossViolation] = Field(default_factory=list, description="Non-critical warning discrepancies")
    violations: List[CrossViolation] = Field(default_factory=list, description="All detected violations")
    flags: List[CrossValidationFlag] = Field(default_factory=list, description="List of boolean status flags per rule")
    rules_checked: int = Field(default=8, description="Number of rules evaluated in cross-validation matrix")
    processing_time_ms: float = Field(default=0.0, description="Execution latency in milliseconds")
