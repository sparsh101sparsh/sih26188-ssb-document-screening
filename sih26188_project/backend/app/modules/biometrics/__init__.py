"""
SIH26188 — Biometrics Module
Face Detection (InsightFace SCRFD-10GF), Canonical Umeyama 5-Point Alignment (112x112),
AdaFace-ResNet100 512-D Verification & MiniFASNetV2-SE Dual-Scale Anti-Spoofing.
"""

from app.modules.biometrics.face_detector import (
    REFERENCE_FACIAL_POINTS_112x112,
    SCRFDFaceDetector,
    align_face_112x112,
    face_detector,
    umeyama_alignment,
)
from app.modules.biometrics.face_matcher import (
    AdaFaceMatcher,
    compute_cosine_similarity,
    compute_face_deadband,
    face_matcher,
)
from app.modules.biometrics.liveness_detector import (
    MiniFASNetLivenessDetector,
    compute_liveness_deadband,
    liveness_detector,
)

__all__ = [
    "SCRFDFaceDetector",
    "face_detector",
    "REFERENCE_FACIAL_POINTS_112x112",
    "umeyama_alignment",
    "align_face_112x112",
    "AdaFaceMatcher",
    "face_matcher",
    "compute_cosine_similarity",
    "compute_face_deadband",
    "MiniFASNetLivenessDetector",
    "liveness_detector",
    "compute_liveness_deadband",
]
