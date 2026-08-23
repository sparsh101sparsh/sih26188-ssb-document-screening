"""
SIH26188 — Biometrics API Router
Endpoints for Face Detection, 1:1 Biometric Verification, and Passive Anti-Spoofing.
Architecture Reference: Sections 1.4, 2.2, 5.2
"""

import time
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.core.backend_selector import get_optimal_execution_providers
from app.core.config import settings
from app.core.logging import get_logger
from app.modules.biometrics.face_detector import face_detector
from app.modules.biometrics.face_matcher import compute_face_deadband, face_matcher
from app.modules.biometrics.liveness_detector import liveness_detector
from app.schemas.biometrics import (
    BiometricMatchResponse,
    FaceDetectionResult,
    FaceMatchResult,
    LivenessResult,
)

logger = get_logger("sih26188.api.biometrics")

router = APIRouter(prefix="/api/v1/biometrics", tags=["Biometrics"])


@router.get("/status")
async def get_biometrics_status():
    """
    Telemetry endpoint returning biometric model readiness and active execution providers.
    """
    providers = get_optimal_execution_providers()
    return {
        "scrfd_detector_loaded": face_detector.is_model_loaded,
        "adaface_matcher_loaded": face_matcher.is_model_loaded,
        "minifasnet_liveness_loaded": liveness_detector.is_model_loaded,
        "tau_face_match": settings.TAU_FACE_MATCH,
        "tau_face_deadband": settings.TAU_FACE,
        "tau_live_deadband": settings.TAU_LIVE,
        "execution_providers": providers,
    }


@router.post(
    "/detect",
    response_model=FaceDetectionResult,
    status_code=status.HTTP_200_OK,
    summary="Detect faces and 5 canonical facial landmarks",
)
async def detect_faces(
    image: UploadFile = File(..., description="Target image file (JPEG/PNG)"),
    conf_threshold: float = Query(0.50, ge=0.0, le=1.0, description="Detection confidence threshold"),
):
    """
    Executes InsightFace SCRFD-10GF face and 5-point landmark detection.
    Extracts canonical 112x112 Umeyama aligned crops for primary candidate face.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file type: {image.content_type}. Expected image/jpeg or image/png.",
        )

    img_bytes = await image.read()
    if len(img_bytes) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image payload is empty or corrupted.",
        )

    result, _ = face_detector.detect_faces(img_bytes, conf_threshold=conf_threshold)
    return result


@router.post(
    "/liveness",
    response_model=LivenessResult,
    status_code=status.HTTP_200_OK,
    summary="Evaluate passive facial anti-spoofing",
)
async def evaluate_liveness(
    face_image: UploadFile = File(..., description="Live camera face image (JPEG/PNG)"),
):
    """
    Executes MiniFASNetV2-SE dual-scale anti-spoofing and 2D FFT Fourier frequency analysis.
    Detects screen replays, printed photos, and 3D latex presentation attack spoofs.
    """
    if not face_image.content_type or not face_image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file type: {face_image.content_type}",
        )

    img_bytes = await face_image.read()
    if len(img_bytes) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded face image payload is empty or corrupted.",
        )

    # Detect face to localize bounding box
    det_result, _ = face_detector.detect_faces(img_bytes, conf_threshold=0.30)
    primary_bbox = det_result.primary_face.bbox if det_result.primary_face else None

    # Evaluate liveness
    liveness = liveness_detector.evaluate_liveness(img_bytes, face_bbox=primary_bbox)
    return liveness


@router.post(
    "/match",
    response_model=BiometricMatchResponse,
    status_code=status.HTTP_200_OK,
    summary="1:1 Biometric face verification and live anti-spoofing",
)
async def match_faces(
    document_image: UploadFile = File(..., description="Document photo containing identity face (JPEG/PNG)"),
    live_image: UploadFile = File(..., description="Live traveler camera selfie (JPEG/PNG)"),
    threshold: Optional[float] = Form(None, ge=-1.0, le=1.0, description="Optional custom cosine threshold"),
    check_liveness: bool = Form(True, description="Whether to evaluate passive anti-spoofing on live image"),
):
    """
    Executes 1:1 facial biometric verification:
    1. Localizes faces in document photo and live selfie.
    2. Computes Umeyama 5-point canonical 112x112 affine aligned crops.
    3. Extracts AdaFace-ResNet100 512-D quality-adaptive feature embeddings.
    4. Computes 1:1 Cosine Similarity and calibrated facial deadband penalty.
    5. Optionally runs MiniFASNetV2-SE dual-scale anti-spoofing on live traveler selfie.
    """
    start_time = time.perf_counter()

    # Validate Document Image
    if not document_image.content_type or not document_image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document image file type: {document_image.content_type}",
        )
    doc_bytes = await document_image.read()
    if len(doc_bytes) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document image payload is empty or corrupted.",
        )

    # Validate Live Image
    if not live_image.content_type or not live_image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid live image file type: {live_image.content_type}",
        )
    live_bytes = await live_image.read()
    if len(live_bytes) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Live image payload is empty or corrupted.",
        )

    # 1. Detect faces and extract 112x112 aligned crops
    doc_det, doc_crops = face_detector.detect_faces(doc_bytes, conf_threshold=0.30)
    live_det, live_crops = face_detector.detect_faces(live_bytes, conf_threshold=0.30)

    doc_crop = doc_crops[0] if doc_crops else None
    live_crop = live_crops[0] if live_crops else None

    # 2. Match faces via AdaFace
    match_result = face_matcher.match_faces(doc_crop, live_crop, threshold=threshold)

    # 3. Calculate calibrated deadband penalty
    deadband_penalty = round(compute_face_deadband(match_result.similarity, settings.TAU_FACE), 4)

    # 4. Optional Live Anti-Spoofing evaluation
    liveness_res: Optional[LivenessResult] = None
    if check_liveness:
        live_bbox = live_det.primary_face.bbox if live_det.primary_face else None
        liveness_res = liveness_detector.evaluate_liveness(live_bytes, face_bbox=live_bbox)

    total_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return BiometricMatchResponse(
        match_result=match_result,
        liveness_result=liveness_res,
        document_face_detected=doc_det.faces_found > 0,
        live_face_detected=live_det.faces_found > 0,
        deadband_penalty=deadband_penalty,
        processing_time_ms=total_latency_ms,
    )
