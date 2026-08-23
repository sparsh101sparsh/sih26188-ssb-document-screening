"""
SIH26188 — Border Stamp Authentication Schemas
Architecture Reference: Section 2.4
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StampSpecification(BaseModel):
    """Specification of an official immigration/transit seal in the stamp registry."""
    model_config = ConfigDict(from_attributes=True)

    checkpost_id: str = Field(..., description="Unique checkpost identifier (e.g. SSB-WB-JAI-01)")
    location: str = Field(..., description="Geographical location description")
    geometry: str = Field(..., description="circle | rectangle | oval")
    outer_diameter_mm: Optional[float] = Field(default=None, description="Diameter in mm for circular stamps")
    dimensions_mm: Optional[List[float]] = Field(default=None, description="[width, height] in mm for rectangular stamps")
    authorized_ink_colors: List[str] = Field(default_factory=list, description="Authorized ink colors")
    reference_template_path: str = Field(..., description="Relative path to reference template image")
    text_layout: Dict[str, Any] = Field(default_factory=dict, description="Header, subtext, and date format specs")


class StampResult(BaseModel):
    """4-Stage Hybrid Stamp Authentication output."""
    model_config = ConfigDict(from_attributes=True)

    stamp_found: bool = Field(default=False, description="Whether a valid stamp contour/region was located")
    stamp_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Fused stamp anomaly score (0.0 = authentic, 1.0 = counterfeit/tampered)"
    )
    verdict: str = Field(
        default="NOT_FOUND",
        description="AUTHENTIC | SUSPICIOUS | FORGED | NOT_FOUND"
    )
    checkpost_id: Optional[str] = Field(default=None, description="Identified checkpost seal type")
    location_name: Optional[str] = Field(default=None, description="Human readable location of checkpost")
    ssim_score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Structural Similarity Index against offline registry template"
    )
    orb_match_count: Optional[int] = Field(default=None, description="Number of homography keypoint inliers")
    tamper_energy: Optional[float] = Field(default=None, description="DocTamper/TruFor internal seal anomaly score")
    context_consistent: Optional[bool] = Field(
        default=None,
        description="True if transit date and checkpost align with traveler declaration"
    )
    stamp_bbox: Optional[List[int]] = Field(default=None, description="[x1, y1, x2, y2] bounding box of stamp")
    reasons: List[str] = Field(default_factory=list, description="Audit and explanation telemetry strings")
    processing_time_ms: float = Field(default=0.0, description="Stamp verification execution time in milliseconds")
