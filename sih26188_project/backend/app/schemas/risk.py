"""
SIH26188 — Two-Stage Hybrid Risk Engine Schemas
Architecture Reference: Section 6
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RiskLevel(str, Enum):
    """Tri-band operational risk classification tiers."""
    GREEN = "GREEN"  # Auto-Clear Pass (Score 0-30)
    AMBER = "AMBER"  # Secondary Inspection (Score 31-69)
    RED = "RED"      # Critical Security Alert / Detain (Score 70-100)


class TripwireCode(str, Enum):
    """Deterministic Stage 1 Hard Tripwire Override Codes (Instant RED = Score 95-100)."""
    TRIPWIRE_1_MRZ_CHECKSUM_FAIL = "TRIPWIRE_1: ICAO 9303 Checksum Failure on Mandatory Digits"
    TRIPWIRE_2_RSA_SIG_FAIL = "TRIPWIRE_2: UIDAI RSA-2048 PKI Signature Invalid or Forged"
    TRIPWIRE_3_PHOTO_SPLICE = "TRIPWIRE_3: Portrait Photo Splicing Detected in ID Window"
    TRIPWIRE_4_BIOMETRIC_SPOOF = "TRIPWIRE_4: Biometric Presentation Attack / Screen Spoofing Detected"
    TRIPWIRE_5_FACE_MISMATCH = "TRIPWIRE_5: Biometric Cosine Similarity Below Minimum Identity Threshold"
    TRIPWIRE_6_WATCHLIST_HIT = "TRIPWIRE_6: High-Risk Border Security Watchlist Vector Match"


class RiskScoreBreakdown(BaseModel):
    """Detailed log-odds decomposition from Stage 2 Bayesian Evidence Fusion."""
    model_config = ConfigDict(from_attributes=True)

    base_prior_log_odds: float = Field(default=-3.8918, description="Initial border prior ln(0.02/0.98)")
    tamper_log_odds_delta: float = Field(default=0.0, description="Penalty from DocTamper/TruFor anomaly deadband")
    face_log_odds_delta: float = Field(default=0.0, description="Penalty from biometric distance deadband")
    mrz_log_odds_delta: float = Field(default=0.0, description="Penalty from MRZ field checks")
    cross_val_log_odds_delta: float = Field(default=0.0, description="Penalty from 8-rule cross-validation matrix")
    stamp_log_odds_delta: float = Field(default=0.0, description="Penalty from stamp verification deadband")
    metadata_log_odds_delta: float = Field(default=0.0, description="Penalty from EXIF/DQT quantization flags")
    posterior_log_odds: float = Field(default=-3.8918, description="Fused posterior log-odds")
    raw_posterior_probability: float = Field(default=0.02, description="Sigmoid posterior fraud probability")


class RiskAssessment(BaseModel):
    """Master screening risk assessment and explainability report."""
    model_config = ConfigDict(from_attributes=True)

    risk_score: float = Field(..., ge=0.0, le=100.0, description="Aggregated risk score on 0-100 scale")
    risk_level: RiskLevel = Field(..., description="GREEN (0-30) | AMBER (31-69) | RED (70-100)")
    auto_clear: bool = Field(..., description="True if safe for fast-path border clearance")
    tripwire_triggered: bool = Field(default=False, description="True if any Stage 1 Hard Tripwire was asserted")
    tripwire_codes: List[str] = Field(default_factory=list, description="Triggered tripwire identifiers")
    reasons: List[str] = Field(default_factory=list, description="Human-readable decision explanation bullet points")
    cross_validation_violations: List[str] = Field(default_factory=list, description="Cross-validation discrepancy summary")
    heatmap_url: Optional[str] = Field(default=None, description="Static URL or path to rendered forensic heatmap")
    heatmap_base64: Optional[str] = Field(default=None, description="Base64 encoded alpha-blended heatmap PNG")
    score_breakdown: Optional[RiskScoreBreakdown] = Field(default=None, description="Bayesian log-odds decomposition")
    model_versions: Dict[str, str] = Field(default_factory=dict, description="Active model checkpoint identifiers")
    processing_time_ms: float = Field(default=0.0, description="Total pipeline execution latency in milliseconds")
    audit_hash: Optional[str] = Field(default=None, description="Immutable SHA-256 transaction audit record hash")
