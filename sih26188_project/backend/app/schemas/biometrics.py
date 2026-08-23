"""
SIH26188 — Biometric Face Verification & Anti-Spoofing Schemas
Architecture Reference: Section 2.2
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FaceBBox(BaseModel):
    """Bounding box and 5-point facial landmark coordinates for detected face."""
    model_config = ConfigDict(from_attributes=True)

    bbox: List[int] = Field(..., description="[x1, y1, x2, y2] bounding box coordinates")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    landmarks: Optional[List[List[float]]] = Field(
        default=None,
        description="5 facial landmarks [[left_eye_x, y], [right_eye_x, y], [nose_x, y], [left_mouth_x, y], [right_mouth_x, y]]"
    )


class FaceDetectionResult(BaseModel):
    """Face detector output from InsightFace SCRFD-10GF."""
    model_config = ConfigDict(from_attributes=True)

    faces_found: int = Field(default=0, description="Number of detected facial instances")
    faces: List[FaceBBox] = Field(default_factory=list, description="List of detected faces")
    primary_face: Optional[FaceBBox] = Field(default=None, description="Primary candidate face for verification")
    aligned_face_extracted: bool = Field(default=False, description="Whether 112x112 Umeyama aligned crop was generated")
    processing_time_ms: float = Field(default=0.0, description="Detection latency in milliseconds")


class LivenessResult(BaseModel):
    """Passive Presentation Attack Detection (PAD) from MiniFASNetV2-SE Dual-Scale."""
    model_config = ConfigDict(from_attributes=True)

    is_live: bool = Field(..., description="True if traveler is determined to be a live human presence")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Liveness confidence score (0.0 = spoof, 1.0 = genuine live)")
    attack_type: Optional[str] = Field(
        default=None,
        description="Detected spoof modality (e.g. SCREEN_REPLAY, PRINT_ATTACK, 3D_MASK, None)"
    )
    score_2_7x: Optional[float] = Field(default=None, description="Scale 2.7x patch score")
    score_4_0x: Optional[float] = Field(default=None, description="Scale 4.0x patch score")
    fourier_anomaly_score: Optional[float] = Field(default=None, description="2D FFT frequency anomaly metric")
    processing_time_ms: float = Field(default=0.0, description="PAD inference latency in milliseconds")


class FaceMatchResult(BaseModel):
    """AdaFace-ResNet100 1:1 Cosine Similarity & Watchlist screening result."""
    model_config = ConfigDict(from_attributes=True)

    similarity: float = Field(..., ge=-1.0, le=1.0, description="Cosine similarity score (-1.0 to 1.0)")
    match: bool = Field(..., description="True if similarity >= threshold (default: 0.35)")
    threshold: float = Field(default=0.35, description="Active decision threshold")
    embedding_model_used: str = Field(
        default="AdaFace-ResNet100",
        description="Identifier of model used for 512-D embedding extraction"
    )
    apparent_age_id: Optional[int] = Field(default=None, description="Estimated age from ID photo")
    apparent_age_live: Optional[int] = Field(default=None, description="Estimated age from live capture")
    age_drift_years: Optional[int] = Field(default=None, description="Difference in years between ID photo and live face")
    watchlist_hit: bool = Field(default=False, description="True if matched against offline high-risk vector index")
    watchlist_distance: Optional[float] = Field(default=None, description="Cosine distance to nearest watchlist neighbor")
    processing_time_ms: float = Field(default=0.0, description="Matching execution latency in milliseconds")


class BiometricMatchResponse(BaseModel):
    """Consolidated response for /api/v1/biometrics/match endpoint."""
    model_config = ConfigDict(from_attributes=True)

    match_result: FaceMatchResult = Field(..., description="1:1 Face verification result")
    liveness_result: Optional[LivenessResult] = Field(default=None, description="Passive anti-spoofing result for live camera face")
    document_face_detected: bool = Field(default=False, description="Whether face was located on document")
    live_face_detected: bool = Field(default=False, description="Whether face was located on live capture")
    deadband_penalty: float = Field(default=0.0, description="Calibrated facial deadband penalty psi_face(similarity)")
    processing_time_ms: float = Field(default=0.0, description="Total biometric matching latency in milliseconds")
