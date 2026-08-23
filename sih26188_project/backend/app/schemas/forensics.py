"""
SIH26188 — Document Forensics & Tamper Detection Schemas
Architecture Reference: Section 2.3
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TamperRegion(BaseModel):
    """Localized bounding box of anomalous pixel region."""
    model_config = ConfigDict(from_attributes=True)

    bbox: List[int] = Field(..., description="[x1, y1, x2, y2] bounding coordinates")
    peak_tamper_probability: float = Field(..., ge=0.0, le=1.0, description="Max anomaly probability in region")
    tamper_type: str = Field(..., description="TEXT_SCRAPING | PHOTO_SPLICING | INPAINTING | COPY_MOVE | EXIF_MISMATCH")
    affected_field: Optional[str] = Field(default=None, description="Associated document field name if intersecting")


class ELAResult(BaseModel):
    """Classical Error Level Analysis (ELA) on photo/document regions."""
    model_config = ConfigDict(from_attributes=True)

    max_intensity: float = Field(default=0.0, ge=0.0, le=255.0, description="Maximum pixel error amplitude")
    mean_intensity: float = Field(default=0.0, ge=0.0, le=255.0, description="Mean background compression error")
    photo_area_anomaly: bool = Field(default=False, description="True if portrait area shows higher error level than background")


class ForensicsResult(BaseModel):
    """Aggregated forensic analysis from DocTamper, TruFor, ELA, and EXIF/DQT parsers."""
    model_config = ConfigDict(from_attributes=True)

    tamper_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Fused continuous tamper probability score (0.0 = clean, 1.0 = highly tampered)"
    )
    is_tampered: bool = Field(
        ...,
        description="True if tamper_score >= tau_adapt (0.18)"
    )
    photo_region_tampered: bool = Field(
        default=False,
        description="True if portrait window shows high splicing energy (TruFor/PRNU)"
    )
    heatmap_base64: Optional[str] = Field(
        default=None,
        description="Alpha-blended Turbo colormap PNG overlay encoded in Base64"
    )
    reasons: List[str] = Field(
        default_factory=list,
        description="Human-readable forensic findings and telemetry codes"
    )
    detected_anomalies: List[str] = Field(
        default_factory=list,
        description="List of detected anomaly category identifiers"
    )
    tampered_regions: List[TamperRegion] = Field(
        default_factory=list,
        description="List of localized bounding boxes with high tamper probability"
    )
    doctamper_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="DocTamper ResNet-50 FPH text alteration score"
    )
    trufor_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="TruFor SegFormer-B0 + Noiseprint++ splicing score"
    )
    ela_result: Optional[ELAResult] = Field(
        default=None,
        description="Error Level Analysis intermediate measurements"
    )
    exif_suspicious: bool = Field(
        default=False,
        description="True if EXIF metadata contains editing software traces (Photoshop, GIMP, Canva)"
    )
    dqt_quantization_altered: bool = Field(
        default=False,
        description="True if JPEG DQT tables show multiple non-standard compression matrices"
    )
    processing_time_ms: float = Field(default=0.0, description="Forensic pipeline latency in milliseconds")
