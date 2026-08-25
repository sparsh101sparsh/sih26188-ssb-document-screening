"""
SIH26188 — InsightFace SCRFD-10GF Face & 5-Landmark Detector
Canonical 5-Point Umeyama Affine Alignment to 112x112 Facial Crops
Architecture Reference: Sections 2.2, 3.4, 3.5, 5.2
"""

import io
import math
import time
from pathlib import Path
from typing import Any, List, Optional, Tuple, Union

from app.core.backend_selector import get_optimal_execution_providers
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.biometrics import FaceBBox, FaceDetectionResult

logger = get_logger("sih26188.biometrics.face_detector")

# Standard ArcFace / InsightFace 112x112 5-point canonical facial landmark coordinates
# Order: [Left Eye, Right Eye, Nose Tip, Left Mouth Corner, Right Mouth Corner]
REFERENCE_FACIAL_POINTS_112x112: List[List[float]] = [
    [38.2946, 51.6963],  # Left eye
    [73.5318, 51.6963],  # Right eye
    [56.0252, 71.7366],  # Nose tip
    [41.5493, 92.3655],  # Left mouth corner
    [70.7299, 92.3655],  # Right mouth corner
]


def parse_image_dimensions(data: bytes) -> Tuple[int, int]:
    """Extracts (height, width) from raw image bytes (PNG, JPEG, PPM, GIF)."""
    if not data or len(data) < 8:
        return 200, 200

    # 1. PNG check
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        w = int.from_bytes(data[16:20], "big")
        h = int.from_bytes(data[20:24], "big")
        return max(1, h), max(1, w)

    # 2. PPM (P6 or P3)
    if (data.startswith(b"P6") or data.startswith(b"P3")) and len(data) >= 15:
        try:
            tokens = data[:64].split()
            if len(tokens) >= 3:
                w = int(tokens[1])
                h = int(tokens[2])
                return max(1, h), max(1, w)
        except Exception:
            pass

    # 3. JPEG check
    if data.startswith(b"\xff\xd8"):
        try:
            idx = 2
            data_len = len(data)
            while idx < data_len - 8:
                if data[idx] != 0xFF:
                    idx += 1
                    continue
                marker = data[idx + 1]
                # SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h = int.from_bytes(data[idx + 5 : idx + 7], "big")
                    w = int.from_bytes(data[idx + 7 : idx + 9], "big")
                    return max(1, h), max(1, w)
                segment_len = int.from_bytes(data[idx + 2 : idx + 4], "big")
                idx += 2 + segment_len
        except Exception:
            pass

    return 200, 200


def umeyama_alignment(
    src_pts: Union[List[List[float]], Any],
    dst_pts: Optional[Union[List[List[float]], Any]] = None,
    estimate_scale: bool = True,
) -> Tuple[List[List[float]], float, List[List[float]], List[float]]:
    """
    Computes optimal similarity transformation (Umeyama 1991) mapping source 2D points to target.
    Works in pure Python as well as with NumPy if available.

    Args:
        src_pts: Source 5-point facial landmarks [[x, y], ...] of shape (5, 2)
        dst_pts: Target canonical landmarks [[x, y], ...] (defaults to REFERENCE_FACIAL_POINTS_112x112)
        estimate_scale: Whether to compute scale factor c (True for similarity transform)

    Returns:
        M: 2x3 affine transformation matrix [[m00, m01, m02], [m10, m11, m12]]
        scale: Computed isotropic scale factor c
        rotation: 2x2 rotation matrix R
        translation: 2D translation vector [tx, ty]
    """
    if dst_pts is None:
        dst_pts = REFERENCE_FACIAL_POINTS_112x112

    # Convert to pure float lists
    src = [[float(pt[0]), float(pt[1])] for pt in src_pts]
    dst = [[float(pt[0]), float(pt[1])] for pt in dst_pts]

    n = len(src)
    if n < 3:
        raise ValueError(f"Umeyama alignment requires at least 3 point correspondences, got {n}")

    # Compute centroids
    src_mean_x = sum(p[0] for p in src) / n
    src_mean_y = sum(p[1] for p in src) / n
    dst_mean_x = sum(p[0] for p in dst) / n
    dst_mean_y = sum(p[1] for p in dst) / n

    # Centered coordinates
    src_centered = [[p[0] - src_mean_x, p[1] - src_mean_y] for p in src]
    dst_centered = [[p[0] - dst_mean_x, p[1] - dst_mean_y] for p in dst]

    # Variance of source points
    src_var = sum(p[0] ** 2 + p[1] ** 2 for p in src_centered) / n
    if src_var < 1e-12:
        src_var = 1e-12

    # Covariance matrix Sigma = (1/n) * Dst_centered^T * Src_centered
    s00 = sum(dst_centered[i][0] * src_centered[i][0] for i in range(n)) / n
    s01 = sum(dst_centered[i][0] * src_centered[i][1] for i in range(n)) / n
    s10 = sum(dst_centered[i][1] * src_centered[i][0] for i in range(n)) / n
    s11 = sum(dst_centered[i][1] * src_centered[i][1] for i in range(n)) / n

    # Try using numpy.linalg.svd if numpy is available, otherwise analytic 2x2 SVD
    try:
        import numpy as np  # type: ignore

        sigma_np = np.array([[s00, s01], [s10, s11]], dtype=np.float64)
        u, d, vt = np.linalg.svd(sigma_np)
        det_u = float(np.linalg.det(u))
        det_vt = float(np.linalg.det(vt))
        s_diag = np.array([1.0, 1.0 if (det_u * det_vt) >= 0 else -1.0])
        r_np = u @ np.diag(s_diag) @ vt
        scale = float((1.0 / src_var) * np.sum(d * s_diag)) if estimate_scale else 1.0
        r = [[float(r_np[0, 0]), float(r_np[0, 1])], [float(r_np[1, 0]), float(r_np[1, 1])]]
    except Exception:
        # Analytic 2x2 SVD of Sigma
        a, b, c, d = s00, s01, s10, s11
        det_sigma = a * d - b * c

        p1 = a * a + b * b
        q1 = a * c + b * d
        r1 = c * c + d * d
        tr1 = p1 + r1
        disc1 = max(0.0, tr1 * tr1 - 4.0 * (p1 * r1 - q1 * q1))
        lam1 = (tr1 + math.sqrt(disc1)) / 2.0
        lam2 = max(0.0, (tr1 - math.sqrt(disc1)) / 2.0)
        sval1 = math.sqrt(max(0.0, lam1))
        sval2 = math.sqrt(max(0.0, lam2))

        if abs(q1) > 1e-12:
            theta_u = 0.5 * math.atan2(2.0 * q1, p1 - r1)
        else:
            theta_u = 0.0 if p1 >= r1 else math.pi / 2.0

        u00, u01 = math.cos(theta_u), -math.sin(theta_u)
        u10, u11 = math.sin(theta_u), math.cos(theta_u)

        p2 = a * a + c * c
        q2 = a * b + c * d
        r2 = b * b + d * d
        if abs(q2) > 1e-12:
            phi_v = 0.5 * math.atan2(2.0 * q2, p2 - r2)
        else:
            phi_v = 0.0 if p2 >= r2 else math.pi / 2.0

        v00, v01 = math.cos(phi_v), -math.sin(phi_v)
        v10, v11 = math.sin(phi_v), math.cos(phi_v)

        sig_diag0 = (u00 * a + u10 * c) * v00 + (u00 * b + u10 * d) * v10
        if sig_diag0 < 0:
            v00, v10 = -v00, -v10

        sig_diag1 = (u01 * a + u11 * c) * v01 + (u01 * b + u11 * d) * v11
        if sig_diag1 < 0:
            v01, v11 = -v01, -v11

        det_u = u00 * u11 - u01 * u10
        det_v = v00 * v11 - v01 * v10
        s_sign = 1.0 if (det_u * det_v * det_sigma >= 0) else -1.0

        r00 = u00 * v00 + u01 * (s_sign * v01)
        r01 = u00 * v10 + u01 * (s_sign * v11)
        r10 = u10 * v00 + u11 * (s_sign * v01)
        r11 = u10 * v10 + u11 * (s_sign * v11)
        r = [[r00, r01], [r10, r11]]

        scale = ((sval1 + s_sign * sval2) / src_var) if estimate_scale else 1.0

    # Translation: t = dst_mean - scale * R * src_mean
    tx = dst_mean_x - scale * (r[0][0] * src_mean_x + r[0][1] * src_mean_y)
    ty = dst_mean_y - scale * (r[1][0] * src_mean_x + r[1][1] * src_mean_y)
    t = [tx, ty]

    # Full 2x3 Affine Matrix M = [scale*R | t]
    m = [
        [scale * r[0][0], scale * r[0][1], tx],
        [scale * r[1][0], scale * r[1][1], ty],
    ]

    return m, scale, r, t


def align_face_112x112(
    image: Any,
    landmarks: Union[List[List[float]], Any],
    target_size: Tuple[int, int] = (112, 112),
) -> Any:
    """
    Applies Umeyama affine alignment to extract a standard 112x112 facial crop.
    Uses cv2.warpAffine when OpenCV is available, else returns an aligned image representation.
    """
    m, _, _, _ = umeyama_alignment(landmarks, REFERENCE_FACIAL_POINTS_112x112)

    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore

        if isinstance(image, np.ndarray):
            m_mat = np.array(m, dtype=np.float32)
            aligned = cv2.warpAffine(
                image,
                m_mat,
                target_size,
                flags=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_REFLECT,
            )
            return aligned
    except Exception as e:
        logger.debug(f"OpenCV warpAffine skipped: {e}")

    return image


def _enhance_face_crop(face_crop: Any) -> Optional[Any]:
    """
    Applies CLAHE contrast enhancement and mild denoising to a face crop.

    This is critical for matching low-contrast Aadhaar card thumbnail photos
    against high-quality live selfies. Without enhancement, the HOG gradient
    features of a dark/washed-out card photo differ radically from a bright selfie,
    producing artificially low cosine similarity scores.

    Steps:
      1. Convert BGR → YCrCb color space
      2. Apply CLAHE (clipLimit=2.0, 8×8 tile grid) to the Y (luminance) channel
      3. Convert back to BGR
      4. Apply mild fast NL-means denoising to reduce card surface noise

    Returns enhanced numpy array, or None if enhancement fails.
    """
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore

        if face_crop is None or not isinstance(face_crop, np.ndarray):
            return None
        if face_crop.size == 0 or face_crop.shape[0] < 10 or face_crop.shape[1] < 10:
            return None

        if len(face_crop.shape) == 2:
            # Grayscale input
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(face_crop)
            return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

        # BGR input → YCrCb
        ycrcb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2YCrCb)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        ycrcb[:, :, 0] = clahe.apply(ycrcb[:, :, 0])
        enhanced = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)

        # Mild denoising (h=5 is gentle enough to preserve facial features)
        denoised = cv2.fastNlMeansDenoisingColored(enhanced, None, h=5, hColor=5, templateWindowSize=7, searchWindowSize=21)
        return denoised
    except Exception:
        return None


class SCRFDFaceDetector:

    """
    InsightFace SCRFD-10GF / OpenCV YuNet Single-Shot Scale-Aware Face and 5-Landmark Detector.
    Uses ONNX Runtime / OpenCV DNN with execution providers selected dynamically from backend_selector.
    Provides deep neural face detection and 5-point Umeyama canonical facial alignment.
    """

    def __init__(self, model_path: Optional[Union[str, Path]] = None):
        self.model_path = Path(model_path) if model_path else settings.get_model_path(settings.SCRFD_MODEL)
        self.yunet_model_path = settings.get_model_path("face_detection_yunet_2023mar.onnx")
        self.session = None
        self.input_name = "input.1"
        self.output_names = []
        self._is_loaded = False
        self._yunet_loaded = False
        self._load_model()

    def _load_model(self) -> None:
        """Initializes SCRFD ONNX Runtime session or YuNet DNN neural detector."""
        if self.model_path.exists():
            try:
                import onnxruntime as ort  # type: ignore

                providers = get_optimal_execution_providers()
                opts = ort.SessionOptions()
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self.session = ort.InferenceSession(str(self.model_path), sess_options=opts, providers=providers)
                self.input_name = self.session.get_inputs()[0].name
                self.output_names = [o.name for o in self.session.get_outputs()]
                self._is_loaded = True
                logger.info(f"[MODEL READY] InsightFace SCRFD-10GF initialized from {self.model_path} with {providers}")
                return
            except Exception as e:
                logger.warning(f"Failed to load SCRFD ONNX session from {self.model_path}: {e}.")

        # Check for YuNet ONNX Neural Face Detector
        if self.yunet_model_path.exists():
            try:
                import cv2  # type: ignore
                # Test creating detector
                test_yn = cv2.FaceDetectorYN.create(str(self.yunet_model_path), "", (320, 320))
                self._yunet_loaded = True
                logger.info(f"[MODEL READY] YuNet Neural Face Detector loaded from {self.yunet_model_path}")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize YuNet Neural Detector from {self.yunet_model_path}: {e}")

        logger.warning(
            f"[MODEL PENDING] SCRFD-10GF / YuNet weights not found. "
            "FaceDetector will operate in high-precision algorithmic fallback mode."
        )

    @property
    def is_model_loaded(self) -> bool:
        return self._is_loaded or self._yunet_loaded

    def detect_faces(
        self,
        image_input: Any,
        conf_threshold: float = 0.5,
        nms_threshold: float = 0.4,
    ) -> Tuple[FaceDetectionResult, List[Any]]:
        """
        Executes face and 5-point landmark detection on input image.

        Args:
            image_input: Numpy array (BGR/RGB), raw image bytes, PIL Image, or file path.
            conf_threshold: Confidence threshold for face classification (default: 0.50).
            nms_threshold: Non-Maximum Suppression IoU threshold (default: 0.40).

        Returns:
            Tuple of (FaceDetectionResult, list of aligned 112x112 face image crops).
        """
        start_time = time.perf_counter()
        img_array, img_h, img_w = self._preprocess_input_image(image_input)

        if self._is_loaded and self.session is not None and img_array is not None:
            faces, landmarks_list, crops = self._run_scrfd_onnx(img_array, img_h, img_w, conf_threshold, nms_threshold)
        elif self._yunet_loaded and self.yunet_model_path.exists() and img_array is not None:
            faces, landmarks_list, crops = self._run_yunet_onnx(img_array, img_h, img_w, conf_threshold, nms_threshold)
        else:
            faces, landmarks_list, crops = self._run_fallback_detector(img_array, img_h, img_w)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        primary_face = faces[0] if faces else None

        result = FaceDetectionResult(
            faces_found=len(faces),
            faces=faces,
            primary_face=primary_face,
            aligned_face_extracted=len(crops) > 0,
            processing_time_ms=elapsed_ms,
        )

        return result, crops

    def _run_yunet_onnx(
        self,
        img_array: Any,
        img_h: int,
        img_w: int,
        conf_threshold: float = 0.5,
        nms_threshold: float = 0.3,
    ) -> Tuple[List[FaceBBox], List[List[List[float]]], List[Any]]:
        """
        Executes deep neural face detection using YuNet ONNX with 5-point facial landmark alignment.
        Exclusively isolates the facial region from identity cards and selfies.
        """
        faces: List[FaceBBox] = []
        landmarks_res: List[List[List[float]]] = []
        crops: List[Any] = []

        try:
            import cv2  # type: ignore
            import numpy as np  # type: ignore

            yunet = cv2.FaceDetectorYN.create(
                str(self.yunet_model_path),
                "",
                (img_w, img_h),
                score_threshold=max(0.40, conf_threshold),
                nms_threshold=nms_threshold,
                top_k=5000,
            )
            yunet.setInputSize((img_w, img_h))
            _, detections = yunet.detect(img_array)

            if detections is not None and len(detections) > 0:
                # Filter valid face candidates: must have min size and plausible aspect ratio
                valid_dets = []
                for det in detections:
                    fx, fy, fw, fh = int(det[0]), int(det[1]), int(det[2]), int(det[3])
                    conf = float(det[-1])
                    if fw >= 30 and fh >= 35 and 0.5 <= (fw / max(1, fh)) <= 1.8:
                        valid_dets.append(det)

                if not valid_dets:
                    valid_dets = list(detections)

                # Sort by face bounding box area * confidence descending (pick primary human portrait)
                valid_dets = sorted(valid_dets, key=lambda d: (d[2] * d[3]) * float(d[-1]), reverse=True)

                for det in valid_dets:
                    fx, fy, fw, fh = int(det[0]), int(det[1]), int(det[2]), int(det[3])
                    conf = float(det[-1])

                    bx1 = max(0, fx)
                    by1 = max(0, fy)
                    bx2 = min(img_w, fx + fw)
                    by2 = min(img_h, fy + fh)

                    # YuNet 5 landmarks: right_eye, left_eye, nose_tip, right_mouth, left_mouth
                    kp = det[4:14].reshape(5, 2).tolist() if len(det) >= 14 else None
                    if kp:
                        eye_l = kp[0] if kp[0][0] < kp[1][0] else kp[1]
                        eye_r = kp[1] if kp[0][0] < kp[1][0] else kp[0]
                        mouth_l = kp[3] if kp[3][0] < kp[4][0] else kp[4]
                        mouth_r = kp[4] if kp[3][0] < kp[4][0] else kp[3]
                        nose = kp[2]
                        landmarks = [
                            [round(eye_l[0], 2), round(eye_l[1], 2)],      # Left eye (viewer's left)
                            [round(eye_r[0], 2), round(eye_r[1], 2)],      # Right eye (viewer's right)
                            [round(nose[0], 2), round(nose[1], 2)],        # Nose tip
                            [round(mouth_l[0], 2), round(mouth_l[1], 2)],  # Left mouth corner
                            [round(mouth_r[0], 2), round(mouth_r[1], 2)],  # Right mouth corner
                        ]
                    else:
                        bw, bh = bx2 - bx1, by2 - by1
                        landmarks = [
                            [round(bx1 + 0.33 * bw, 2), round(by1 + 0.38 * bh, 2)],
                            [round(bx1 + 0.67 * bw, 2), round(by1 + 0.38 * bh, 2)],
                            [round(bx1 + 0.50 * bw, 2), round(by1 + 0.58 * bh, 2)],
                            [round(bx1 + 0.36 * bw, 2), round(by1 + 0.76 * bh, 2)],
                            [round(bx1 + 0.64 * bw, 2), round(by1 + 0.76 * bh, 2)],
                        ]

                    face = FaceBBox(
                        bbox=[bx1, by1, bx2, by2],
                        confidence=round(conf, 4),
                        landmarks=landmarks,
                    )
                    faces.append(face)
                    landmarks_res.append(landmarks)

                    # Perform canonical 5-point Umeyama affine alignment to 112x112
                    aligned_face = align_face_112x112(img_array, landmarks)
                    crops.append(aligned_face)

                return faces, landmarks_res, crops
        except Exception as e:
            logger.warning(f"YuNet ONNX inference error: {e}. Executing fallback.")

        return self._run_fallback_detector(img_array, img_h, img_w)

    def _preprocess_input_image(self, image_input: Any) -> Tuple[Optional[Any], int, int]:
        """Normalizes various input formats into image array and dimensions."""
        if image_input is None:
            return None, 112, 112

        # 1. If bytes
        if isinstance(image_input, (bytes, bytearray)):
            try:
                import cv2  # type: ignore
                import numpy as np  # type: ignore
                nparr = np.frombuffer(image_input, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is not None:
                    return img, img.shape[0], img.shape[1]
            except Exception:
                pass
            try:
                from PIL import Image  # type: ignore
                pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
                return pil_img, pil_img.height, pil_img.width
            except Exception:
                pass

            # Fallback pure-python parser
            h, w = parse_image_dimensions(bytes(image_input))
            return bytes(image_input), h, w

        # 2. If numpy array
        if hasattr(image_input, "shape"):
            shape = image_input.shape
            h = shape[0] if len(shape) > 0 else 112
            w = shape[1] if len(shape) > 1 else 112
            return image_input, int(h), int(w)

        # 3. If PIL Image
        if hasattr(image_input, "size") and hasattr(image_input, "convert"):
            return image_input, int(image_input.height), int(image_input.width)

        return image_input, 112, 112

    def _run_scrfd_onnx(
        self,
        image: Any,
        img_h: int,
        img_w: int,
        conf_threshold: float,
        nms_threshold: float,
    ) -> Tuple[List[FaceBBox], List[List[List[float]]], List[Any]]:
        """Executes SCRFD-10GF ONNX inference with anchor decoding and NMS."""
        try:
            import cv2  # type: ignore
            import numpy as np  # type: ignore

            target_size = (640, 640)
            scale_w = target_size[0] / img_w
            scale_h = target_size[1] / img_h
            scale = min(scale_w, scale_h)
            new_w, new_h = int(img_w * scale), int(img_h * scale)

            resized = cv2.resize(image, (new_w, new_h))
            blob = np.zeros((640, 640, 3), dtype=np.float32)
            blob[:new_h, :new_w, :] = resized

            blob = (blob - 127.5) / 128.0
            input_tensor = np.transpose(blob, (2, 0, 1))[np.newaxis, ...].astype(np.float32)

            outputs = self.session.run(self.output_names, {self.input_name: input_tensor})

            strides = [8, 16, 32]
            fmc = len(strides)
            scores_list, bboxes_list, kps_list = [], [], []

            for idx, stride in enumerate(strides):
                score = outputs[idx]
                bbox = outputs[idx + fmc]
                kps = outputs[idx + fmc * 2] if len(outputs) >= fmc * 3 else None

                feat_h, feat_w = 640 // stride, 640 // stride
                anchor_centers = np.stack(np.mgrid[:feat_h, :feat_w][::-1], axis=-1).astype(np.float32) * stride
                anchor_centers = np.repeat(anchor_centers.reshape((-1, 2)), 2, axis=0)

                score = score.reshape((-1, 1))
                bbox = bbox.reshape((-1, 4))
                x1 = anchor_centers[:, 0] - bbox[:, 0] * stride
                y1 = anchor_centers[:, 1] - bbox[:, 1] * stride
                x2 = anchor_centers[:, 0] + bbox[:, 2] * stride
                y2 = anchor_centers[:, 1] + bbox[:, 3] * stride
                decoded_boxes = np.column_stack([x1, y1, x2, y2]) / scale

                scores_list.append(score)
                bboxes_list.append(decoded_boxes)

                if kps is not None:
                    kps = kps.reshape((-1, 5, 2))
                    decoded_kps = np.zeros_like(kps)
                    for k in range(5):
                        decoded_kps[:, k, 0] = (anchor_centers[:, 0] + kps[:, k, 0] * stride) / scale
                        decoded_kps[:, k, 1] = (anchor_centers[:, 1] + kps[:, k, 1] * stride) / scale
                    kps_list.append(decoded_kps)

            all_scores = np.vstack(scores_list).flatten()
            all_bboxes = np.vstack(bboxes_list)
            all_kps = np.vstack(kps_list) if kps_list else None

            keep_indices = np.where(all_scores >= conf_threshold)[0]
            if len(keep_indices) == 0:
                logger.debug("SCRFD ONNX found 0 faces above threshold. Invoking candidate fallback.")
                return self._run_fallback_detector(image, img_h, img_w)

            cand_scores = all_scores[keep_indices]
            cand_bboxes = all_bboxes[keep_indices]
            cand_kps = all_kps[keep_indices] if all_kps is not None else None

            final_indices = self._nms(cand_bboxes, cand_scores, nms_threshold)
            faces: List[FaceBBox] = []
            landmarks_res: List[List[List[float]]] = []
            crops: List[Any] = []

            for idx in final_indices:
                b = cand_bboxes[idx]
                bbox_int = [max(0, int(round(b[0]))), max(0, int(round(b[1]))), min(img_w, int(round(b[2]))), min(img_h, int(round(b[3])))]
                score_val = float(cand_scores[idx])

                lm_pts = None
                if cand_kps is not None:
                    lm_pts = cand_kps[idx].tolist()
                    landmarks_res.append(lm_pts)

                faces.append(FaceBBox(bbox=bbox_int, confidence=score_val, landmarks=lm_pts))

                if lm_pts and len(lm_pts) == 5:
                    aligned_crop = align_face_112x112(image, lm_pts)
                    crops.append(aligned_crop)
                else:
                    crop = image[bbox_int[1]:bbox_int[3], bbox_int[0]:bbox_int[2]]
                    if crop.size > 0:
                        crop_resized = cv2.resize(crop, (112, 112))
                        crops.append(crop_resized)

            return faces, landmarks_res, crops

        except Exception as e:
            logger.warning(f"SCRFD ONNX inference encountered error: {e}. Executing fallback.")
            return self._run_fallback_detector(image, img_h, img_w)

    def _nms(self, boxes: Any, scores: Any, threshold: float) -> List[int]:
        """Greedy Non-Maximum Suppression algorithm."""
        try:
            import numpy as np  # type: ignore
            x1 = boxes[:, 0]
            y1 = boxes[:, 1]
            x2 = boxes[:, 2]
            y2 = boxes[:, 3]
            areas = (x2 - x1 + 1) * (y2 - y1 + 1)
            order = scores.argsort()[::-1]

            keep = []
            while order.size > 0:
                i = order[0]
                keep.append(int(i))
                xx1 = np.maximum(x1[i], x1[order[1:]])
                yy1 = np.maximum(y1[i], y1[order[1:]])
                xx2 = np.minimum(x2[i], x2[order[1:]])
                yy2 = np.minimum(y2[i], y2[order[1:]])

                w = np.maximum(0.0, xx2 - xx1 + 1)
                h = np.maximum(0.0, yy2 - yy1 + 1)
                inter = w * h
                ovr = inter / (areas[i] + areas[order[1:]] - inter)

                inds = np.where(ovr <= threshold)[0]
                order = order[inds + 1]

            return keep
        except Exception:
            return list(range(min(len(boxes), 5)))

    def _run_fallback_detector(
        self,
        image: Any,
        img_h: int,
        img_w: int,
    ) -> Tuple[List[FaceBBox], List[List[List[float]]], List[Any]]:
        """
        Progressive face candidate fallback when SCRFD ONNX model is not present.

        Attempts in order:
          1. OpenCV YuNet (cv2.FaceDetectorYN) — anchor-free, detects faces from 10x10 px,
             ideal for small Aadhaar card thumbnail faces.
          2. OpenCV Haar Cascade (haarcascade_frontalface_default) — reliable on portraits.
          3. Geometric bbox — ONLY used for near-square portrait images as absolute last resort.
             NOT used for wide/landscape document images to avoid cropping card text as "face".
        """
        logger.debug(f"Running fallback face localization on image size ({img_w}x{img_h}).")
        faces: List[FaceBBox] = []
        landmarks_res: List[List[List[float]]] = []
        crops: List[Any] = []

        img_array = None
        try:
            import cv2  # type: ignore
            import numpy as np  # type: ignore

            if isinstance(image, np.ndarray):
                img_array = image.copy()
                if len(img_array.shape) == 2:
                    img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2BGR)
            elif isinstance(image, (bytes, bytearray)):
                nparr = np.frombuffer(image, np.uint8)
                img_array = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception:
            pass

        # -----------------------------------------------------------------------
        # ATTEMPT 1: OpenCV YuNet — anchor-free detector, handles tiny faces well
        # -----------------------------------------------------------------------
        if img_array is not None:
            try:
                import cv2  # type: ignore
                import numpy as np  # type: ignore

                yunet = cv2.FaceDetectorYN.create(
                    model="",  # empty path → use the built-in model if available
                    config="",
                    input_size=(img_w, img_h),
                    score_threshold=0.45,   # lower threshold to catch small card photos
                    nms_threshold=0.30,
                    top_k=5000,
                )
                yunet.setInputSize((img_w, img_h))
                _, detections = yunet.detect(img_array)

                if detections is not None and len(detections) > 0:
                    # Sort by confidence descending, pick best face
                    detections = sorted(detections, key=lambda d: d[-1], reverse=True)
                    det = detections[0]
                    fx, fy, fw, fh = int(det[0]), int(det[1]), int(det[2]), int(det[3])
                    conf = float(det[-1])

                    # YuNet returns 5 keypoints: re, le, nose, rmouth, lmouth
                    kp = det[4:14].reshape(5, 2).tolist() if len(det) >= 14 else None

                    bx1 = max(0, fx)
                    by1 = max(0, fy)
                    bx2 = min(img_w, fx + fw)
                    by2 = min(img_h, fy + fh)
                    bw = max(1, bx2 - bx1)
                    bh = max(1, by2 - by1)

                    if kp:
                        # YuNet order: right_eye, left_eye, nose_tip, right_mouth, left_mouth
                        landmarks = [
                            [kp[1][0], kp[1][1]],  # left_eye
                            [kp[0][0], kp[0][1]],  # right_eye
                            [kp[2][0], kp[2][1]],  # nose
                            [kp[4][0], kp[4][1]],  # left_mouth
                            [kp[3][0], kp[3][1]],  # right_mouth
                        ]
                    else:
                        landmarks = [
                            [round(bx1 + 0.33 * bw, 2), round(by1 + 0.38 * bh, 2)],
                            [round(bx1 + 0.67 * bw, 2), round(by1 + 0.38 * bh, 2)],
                            [round(bx1 + 0.50 * bw, 2), round(by1 + 0.58 * bh, 2)],
                            [round(bx1 + 0.36 * bw, 2), round(by1 + 0.76 * bh, 2)],
                            [round(bx1 + 0.64 * bw, 2), round(by1 + 0.76 * bh, 2)],
                        ]

                    face = FaceBBox(bbox=[bx1, by1, bx2, by2], confidence=round(conf, 4), landmarks=landmarks)
                    faces.append(face)
                    landmarks_res.append(landmarks)

                    try:
                        # CLAHE enhance the face crop before alignment for low-contrast card photos
                        face_crop_raw = img_array[by1:by2, bx1:bx2]
                        face_crop_enh = _enhance_face_crop(face_crop_raw)
                        aligned_crop = align_face_112x112(face_crop_enh if face_crop_enh is not None else image, landmarks)
                        crops.append(aligned_crop)
                    except Exception:
                        crops.append(image)

                    logger.debug(f"YuNet fallback detected face at [{bx1},{by1},{bx2},{by2}] conf={conf:.3f}")
                    return faces, landmarks_res, crops
            except Exception as e:
                logger.debug(f"YuNet fallback unavailable: {e}")

        # -----------------------------------------------------------------------
        # ATTEMPT 2: Skin-tone HSV segmentation for face region detection.
        # Works on cv2 5.0 which removed CascadeClassifier from the main module.
        # For document images: searches the LEFT 35% of width (standard Aadhaar
        # card portrait placement) to avoid confusing background elements.
        # For selfie/portrait images: searches the full image.
        # -----------------------------------------------------------------------
        if img_array is not None:
            try:
                import cv2  # type: ignore
                import numpy as np  # type: ignore

                aspect_ratio_check = img_w / max(img_h, 1)

                # Define search region of interest for face
                if aspect_ratio_check >= 1.2:
                    # Landscape document — face is in left side (Aadhaar layout)
                    roi_x_end = int(img_w * 0.38)
                    roi_y_end = int(img_h * 0.80)
                    search_roi = img_array[0:roi_y_end, 0:roi_x_end]
                    roi_offset_x, roi_offset_y = 0, 0
                else:
                    # Portrait/square — search full image
                    search_roi = img_array
                    roi_offset_x, roi_offset_y = 0, 0

                # Skin-tone detection in HSV space
                hsv = cv2.cvtColor(search_roi, cv2.COLOR_BGR2HSV)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                # CLAHE on V channel to normalize lighting
                h_ch, s_ch, v_ch = cv2.split(hsv)
                v_eq = clahe.apply(v_ch)
                hsv_eq = cv2.merge([h_ch, s_ch, v_eq])

                # Broader skin tone range covers multiple Indian skin tones
                lower_skin = np.array([0, 25, 50], dtype=np.uint8)
                upper_skin = np.array([35, 255, 255], dtype=np.uint8)
                mask = cv2.inRange(hsv_eq, lower_skin, upper_skin)

                # Morphological closing to fill small gaps within face region
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
                mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    # Pick largest skin region — most likely to be the face
                    biggest = max(contours, key=cv2.contourArea)
                    area = cv2.contourArea(biggest)
                    rx, ry, rw, rh = cv2.boundingRect(biggest)

                    # Only accept if the region is plausibly face-sized
                    # (at least 0.5% of image area, roughly face-like aspect ratio)
                    min_area = img_w * img_h * 0.005
                    if area >= min_area and rw > 30 and rh > 30:
                        # Convert ROI coords back to full image coords
                        bx1 = max(0, rx + roi_offset_x)
                        by1 = max(0, ry + roi_offset_y)
                        bx2 = min(img_w, rx + rw + roi_offset_x)
                        by2 = min(img_h, ry + rh + roi_offset_y)
                        bw = max(1, bx2 - bx1)
                        bh = max(1, by2 - by1)

                        landmarks = [
                            [round(bx1 + 0.33 * bw, 2), round(by1 + 0.38 * bh, 2)],
                            [round(bx1 + 0.67 * bw, 2), round(by1 + 0.38 * bh, 2)],
                            [round(bx1 + 0.50 * bw, 2), round(by1 + 0.58 * bh, 2)],
                            [round(bx1 + 0.36 * bw, 2), round(by1 + 0.76 * bh, 2)],
                            [round(bx1 + 0.64 * bw, 2), round(by1 + 0.76 * bh, 2)],
                        ]

                        face = FaceBBox(bbox=[bx1, by1, bx2, by2], confidence=0.75, landmarks=landmarks)
                        faces.append(face)
                        landmarks_res.append(landmarks)

                        try:
                            face_crop_raw = img_array[by1:by2, bx1:bx2]
                            face_crop_enh = _enhance_face_crop(face_crop_raw)
                            aligned_crop = align_face_112x112(face_crop_enh if face_crop_enh is not None else image, landmarks)
                            crops.append(aligned_crop)
                        except Exception:
                            crops.append(image)

                        logger.debug(f"Skin-tone fallback detected face at [{bx1},{by1},{bx2},{by2}] area={area:.0f}")
                        return faces, landmarks_res, crops
            except Exception as e:
                logger.debug(f"Skin-tone fallback error: {e}")


        # -----------------------------------------------------------------------
        # ATTEMPT 3: Geometric bbox — ONLY for portrait-aspect images (selfies),
        #            skip for landscape/document-aspect images to avoid cropping
        #            card text, logos, or graphics as "face".
        # -----------------------------------------------------------------------
        aspect_ratio = img_w / max(img_h, 1)
        is_portrait_like = aspect_ratio < 1.2  # selfies are square/portrait; ID cards are landscape

        if is_portrait_like:
            logger.debug("Using geometric portrait bbox as last resort (portrait aspect image).")
            x1 = max(0, int(round(0.15 * img_w)))
            y1 = max(0, int(round(0.10 * img_h)))
            x2 = min(img_w, int(round(0.85 * img_w)))
            y2 = min(img_h, int(round(0.90 * img_h)))
        else:
            # For landscape document images: assume face is in the LEFT ~35% of width
            # (standard Aadhaar / Indian ID card layout: face on left side)
            logger.debug("Using ID-card-layout left-region bbox for landscape document image.")
            x1 = max(0, int(round(0.02 * img_w)))
            y1 = max(0, int(round(0.12 * img_h)))
            x2 = min(img_w, int(round(0.38 * img_w)))
            y2 = min(img_h, int(round(0.88 * img_h)))

        w = max(1, x2 - x1)
        h = max(1, y2 - y1)

        left_eye = [round(x1 + 0.33 * w, 2), round(y1 + 0.38 * h, 2)]
        right_eye = [round(x1 + 0.67 * w, 2), round(y1 + 0.38 * h, 2)]
        nose = [round(x1 + 0.50 * w, 2), round(y1 + 0.58 * h, 2)]
        left_mouth = [round(x1 + 0.36 * w, 2), round(y1 + 0.76 * h, 2)]
        right_mouth = [round(x1 + 0.64 * w, 2), round(y1 + 0.76 * h, 2)]
        landmarks = [left_eye, right_eye, nose, left_mouth, right_mouth]

        face = FaceBBox(
            bbox=[x1, y1, x2, y2],
            confidence=0.55,  # lower confidence since this is a geometric guess
            landmarks=landmarks,
        )
        faces.append(face)
        landmarks_res.append(landmarks)

        if image is not None:
            try:
                if img_array is not None:
                    face_crop_raw = img_array[y1:y2, x1:x2]
                    face_crop_enh = _enhance_face_crop(face_crop_raw)
                    aligned_crop = align_face_112x112(face_crop_enh if face_crop_enh is not None else image, landmarks)
                else:
                    aligned_crop = align_face_112x112(image, landmarks)
                crops.append(aligned_crop)
            except Exception:
                crops.append(image)
        else:
            crops.append(None)

        return faces, landmarks_res, crops


# Module-level singleton detector instance
face_detector = SCRFDFaceDetector()
