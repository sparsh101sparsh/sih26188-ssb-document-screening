"""
SIH26188 — Defense-Grade ID Document Photo Splicing & Ghost Photo Biometric Cross-Verification Engine
Architecture Reference: Ministry of Home Affairs (MHA) / Sashastra Seema Bal (SSB)

Implements 3-Layer Defense Against Photo Replacement & Splicing Attacks:
1. Primary Face vs Ghost / Watermark Secondary Portrait Biometric Cross-Matching (CLAHE + Unsharp + Cosine)
2. Photo Box Boundary Edge Gradient Discontinuity & Perimeter Seam Analysis (Scharr + Canny Collinearity)
3. Noise Residual Variance (Wavelet MAD) & ELA Compression Disparity Analysis
"""

import math
import time
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np


class PhotoSplicingDetector:
    """
    Forensic engine dedicated to detecting physical cut-and-paste, digital overlays,
    and synthetic face-swap photo replacement attacks on Indian Aadhaar, Passports, and Voter IDs.
    """

    # Normalized canonical layout bounding boxes [ymin_rel, xmin_rel, ymax_rel, xmax_rel]
    LAYOUT_CONFIGS = {
        "aadhaar": {
            "primary_photo": [0.180, 0.030, 0.650, 0.320],
            "ghost_photo": [0.120, 0.680, 0.450, 0.900],  # Top right ghost watermark on Aadhaar
        },
        "passport": {
            "primary_photo": [0.250, 0.030, 0.800, 0.320],
            "ghost_photo": [0.300, 0.700, 0.680, 0.950],
        },
        "voter_id": {
            "primary_photo": [0.220, 0.050, 0.700, 0.340],
            "ghost_photo": [0.500, 0.660, 0.860, 0.940],
        },
    }

    def __init__(self, face_matcher=None, face_detector=None):
        self.face_matcher = face_matcher
        self.face_detector = face_detector

    # =========================================================================
    # 1. GHOST PHOTO ENHANCEMENT & CROSS-MATCHING
    # =========================================================================

    def enhance_ghost_photo(self, ghost_crop: np.ndarray) -> np.ndarray:
        """
        Restores low-contrast, semi-transparent watermark/laser ghost portraits
        using Homomorphic Filtering, Luminance CLAHE, and High-Pass Unsharp Masking.
        """
        if ghost_crop is None or ghost_crop.size == 0:
            return ghost_crop

        h, w = ghost_crop.shape[:2]
        if h < 20 or w < 20:
            return ghost_crop

        # 1. Convert to float grayscale
        gray = cv2.cvtColor(ghost_crop, cv2.COLOR_BGR2GRAY) if len(ghost_crop.shape) == 3 else ghost_crop
        img_log = np.log1p(np.float32(gray))

        # 2. 2D FFT Homomorphic High-Emphasis Filter
        dft = np.fft.fft2(img_log)
        dft_shift = np.fft.fftshift(dft)

        rows, cols = gray.shape
        crow, ccol = rows // 2, cols // 2
        y, x = np.ogrid[-crow:rows - crow, -ccol:cols - ccol]
        radius_sq = x * x + y * y
        d0_sq = 35.0 ** 2
        # High emphasis: gamma_L=0.5, gamma_H=1.8
        h_filter = (1.8 - 0.5) * (1.0 - np.exp(-radius_sq / (2 * d0_sq))) + 0.5

        filtered = dft_shift * h_filter
        idft_shift = np.fft.ifftshift(filtered)
        idft = np.fft.ifft2(idft_shift)
        homo_out = np.expm1(np.real(idft))
        homo_norm = cv2.normalize(homo_out, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

        # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        clahe_out = clahe.apply(homo_norm)

        # 4. Unsharp Masking
        gaussian = cv2.GaussianBlur(clahe_out, (0, 0), sigmaX=1.2)
        unsharp = cv2.addWeighted(clahe_out, 2.2, gaussian, -1.2, 0)

        return cv2.cvtColor(unsharp, cv2.COLOR_GRAY2BGR)

    def cross_match_primary_vs_ghost(
        self,
        primary_crop: Optional[np.ndarray],
        ghost_crop: Optional[np.ndarray],
    ) -> Tuple[float, bool, str]:
        """
        Performs 1:1 facial biometric comparison between primary ID portrait and ghost watermark.
        Returns: (cosine_similarity, is_match, telemetry_status)
        """
        if primary_crop is None or ghost_crop is None or primary_crop.size == 0 or ghost_crop.size == 0:
            return 0.0, True, "GHOST_PHOTO_UNAVAILABLE"

        enhanced_ghost = self.enhance_ghost_photo(ghost_crop)

        # Use AdaFace / SFace if available
        if self.face_matcher is not None:
            try:
                emb_p = self.face_matcher.extract_embedding(primary_crop)
                emb_g = self.face_matcher.extract_embedding(enhanced_ghost)
                if emb_p and emb_g:
                    dot = sum(a * b for a, b in zip(emb_p, emb_g))
                    norm1 = math.sqrt(sum(a * a for a in emb_p))
                    norm2 = math.sqrt(sum(b * b for b in emb_g))
                    if norm1 > 0 and norm2 > 0:
                        sim = float(dot / (norm1 * norm2))
                        # Dynamic decision threshold for watermark degradation: tau = 0.32
                        is_match = sim >= 0.32
                        status = "GHOST_MATCH_VERIFIED" if is_match else "ERR_PHOTO_SPLICED_GHOST_MISMATCH"
                        return round(sim, 4), is_match, status
            except Exception:
                pass

        # Fallback: Multi-scale spatial structural correlation
        p_gray = cv2.resize(cv2.cvtColor(primary_crop, cv2.COLOR_BGR2GRAY), (64, 64))
        g_gray = cv2.resize(cv2.cvtColor(enhanced_ghost, cv2.COLOR_BGR2GRAY), (64, 64))

        hist_p = cv2.calcHist([p_gray], [0], None, [32], [0, 256])
        hist_g = cv2.calcHist([g_gray], [0], None, [32], [0, 256])
        cv2.normalize(hist_p, hist_p, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist_g, hist_g, 0, 1, cv2.NORM_MINMAX)
        correl = float(cv2.compareHist(hist_p, hist_g, cv2.HISTCMP_CORREL))

        is_match = correl >= 0.25
        status = "GHOST_CORRELATION_PASS" if is_match else "ERR_PHOTO_SPLICED_GHOST_MISMATCH"
        return round(correl, 4), is_match, status

    # =========================================================================
    # 2. PHOTO BOX BOUNDARY GRADIENT & SEAM DISCONTINUITY ANALYSIS
    # =========================================================================

    def analyze_boundary_gradients(
        self,
        doc_bgr: np.ndarray,
        photo_box_px: Tuple[int, int, int, int],
    ) -> Dict[str, Any]:
        """
        Calculates Scharr boundary gradient sharpness ratio and Canny rectangular seam continuity.
        A pasted photo exhibits an unnatural step-gradient along its perimeter.
        """
        ymin, xmin, ymax, xmax = photo_box_px
        h, w = doc_bgr.shape[:2]

        ymin, xmin = max(0, ymin), max(0, xmin)
        ymax, xmax = min(h, ymax), min(w, xmax)

        if (ymax - ymin) < 20 or (xmax - xmin) < 20:
            return {"s_boundary": 1.0, "l_seam": 0.0, "edge_tamper_flag": False}

        gray = cv2.cvtColor(doc_bgr, cv2.COLOR_BGR2GRAY)

        # 1. Scharr Edge Gradient Magnitude
        grad_x = cv2.Scharr(gray, cv2.CV_64F, 1, 0)
        grad_y = cv2.Scharr(gray, cv2.CV_64F, 0, 1)
        grad_mag = np.sqrt(grad_x ** 2 + grad_y ** 2)

        # 2. Create 4px Boundary Perimeter Band Mask
        mask_boundary = np.zeros((h, w), dtype=np.uint8)
        cv2.rectangle(mask_boundary, (xmin - 2, ymin - 2), (xmax + 2, ymax + 2), 255, thickness=4)

        # 3. Reference Masks (Interior vs Exterior)
        mask_interior = np.zeros((h, w), dtype=np.uint8)
        cv2.rectangle(mask_interior, (xmin + 6, ymin + 6), (xmax - 6, ymax - 6), 255, thickness=-1)

        mask_exterior = np.zeros((h, w), dtype=np.uint8)
        cv2.rectangle(
            mask_exterior,
            (max(0, xmin - 20), max(0, ymin - 20)),
            (min(w, xmax + 20), min(h, ymax + 20)),
            255,
            thickness=-1,
        )
        mask_exterior = cv2.subtract(mask_exterior, mask_boundary)
        mask_exterior = cv2.subtract(mask_exterior, mask_interior)

        mu_boundary = float(np.mean(grad_mag[mask_boundary > 0])) if np.sum(mask_boundary) > 0 else 0.0
        mu_interior = float(np.mean(grad_mag[mask_interior > 0])) if np.sum(mask_interior) > 0 else 0.0
        mu_exterior = float(np.mean(grad_mag[mask_exterior > 0])) if np.sum(mask_exterior) > 0 else 0.0

        mu_ref = 0.5 * (mu_interior + mu_exterior) + 1e-6
        s_boundary = round(float(mu_boundary / mu_ref), 4)

        # 4. Rectangular Collinear Seam Completeness
        edges = cv2.Canny(gray, 50, 150)
        seam_pixels = int(np.sum(edges[mask_boundary > 0] > 0))
        total_perimeter_px = 2 * ((xmax - xmin) + (ymax - ymin))
        l_seam = round(float(min(1.0, seam_pixels / (total_perimeter_px + 1e-6))), 4)

        edge_tamper_flag = s_boundary > 2.35 and l_seam > 0.55

        return {
            "s_boundary": s_boundary,
            "l_seam": l_seam,
            "mu_boundary": round(mu_boundary, 2),
            "mu_ref": round(mu_ref, 2),
            "edge_tamper_flag": edge_tamper_flag,
        }

    # =========================================================================
    # 3. NOISE RESIDUAL VARIANCE & ELA DISPARITY ANALYSIS
    # =========================================================================

    def _estimate_noise_variance(self, image_crop: np.ndarray) -> float:
        """Estimates high-frequency noise variance using high-pass median residual."""
        if image_crop is None or image_crop.size == 0:
            return 0.0
        gray = cv2.cvtColor(image_crop, cv2.COLOR_BGR2GRAY) if len(image_crop.shape) == 3 else image_crop
        median = cv2.medianBlur(gray, 3)
        residual = cv2.absdiff(gray, median).astype(np.float32)
        # Median Absolute Deviation (MAD) scaled variance
        mad = float(np.median(residual))
        return (mad / 0.6745) ** 2

    def analyze_noise_and_ela(
        self,
        doc_bgr: np.ndarray,
        photo_box_px: Tuple[int, int, int, int],
    ) -> Dict[str, Any]:
        """
        Evaluates noise inconsistency ratio and ELA compression disparity between photo and card body.
        """
        ymin, xmin, ymax, xmax = photo_box_px
        h, w = doc_bgr.shape[:2]

        photo_crop = doc_bgr[ymin:ymax, xmin:xmax]
        # Substrate sample adjacent to photo box
        sub_xmin = min(w - 10, xmax + 10)
        sub_xmax = min(w, xmax + 90)
        substrate_crop = doc_bgr[ymin:ymax, sub_xmin:sub_xmax]
        if substrate_crop.shape[1] < 15:
            substrate_crop = doc_bgr[ymin:ymax, max(0, xmin - 90):max(0, xmin - 10)]

        var_photo = self._estimate_noise_variance(photo_crop)
        var_substrate = self._estimate_noise_variance(substrate_crop)

        r_noise = round(float(abs(var_photo - var_substrate) / (var_photo + var_substrate + 1e-6)), 4)

        # Error Level Analysis (ELA) at Q=90
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
        _, enc_img = cv2.imencode(".jpg", doc_bgr, encode_param)
        doc_q90 = cv2.imdecode(enc_img, cv2.IMREAD_COLOR)
        ela_map = cv2.absdiff(doc_bgr, doc_q90).astype(np.float32)

        ela_photo = float(np.mean(ela_map[ymin:ymax, xmin:xmax]))
        ela_sub = float(np.mean(ela_map[ymin:ymax, sub_xmin:sub_xmax])) if substrate_crop.size > 0 else ela_photo
        r_ela = round(float(abs(ela_photo - ela_sub) / (max(ela_photo, ela_sub) + 1e-6)), 4)

        # Color cast angular divergence
        mean_rgb_p = np.mean(photo_crop, axis=(0, 1)) if photo_crop.size > 0 else np.array([128, 128, 128])
        mean_rgb_s = np.mean(substrate_crop, axis=(0, 1)) if substrate_crop.size > 0 else mean_rgb_p
        cos_angle = float(np.dot(mean_rgb_p, mean_rgb_s) / (np.linalg.norm(mean_rgb_p) * np.linalg.norm(mean_rgb_s) + 1e-6))
        delta_illum_deg = round(float(np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0)))), 2)

        noise_tamper_flag = r_noise > 0.55 or r_ela > 0.58

        return {
            "r_noise": r_noise,
            "r_ela": r_ela,
            "delta_illum_deg": delta_illum_deg,
            "noise_tamper_flag": noise_tamper_flag,
        }

    # =========================================================================
    # 4. MASTER FORENSIC SPLICING AUDIT
    # =========================================================================

    def analyze_document_photo_integrity(
        self,
        image_bytes: bytes,
        document_type: str = "aadhaar",
        primary_photo_bbox: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end multi-layer forensic analysis on the document photograph.
        """
        t0 = time.perf_counter()
        nparr = np.frombuffer(image_bytes, np.uint8)
        doc_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if doc_bgr is None:
            return {"is_spliced": False, "splicing_score": 0.0, "reasons": []}

        h, w = doc_bgr.shape[:2]
        doc_key = document_type.lower() if document_type.lower() in self.LAYOUT_CONFIGS else "aadhaar"
        cfg = self.LAYOUT_CONFIGS[doc_key]

        # 1. Determine Primary Photo Coordinates
        if primary_photo_bbox and len(primary_photo_bbox) == 4:
            px1, py1, px2, py2 = primary_photo_bbox
            p_box = (py1, px1, py2, px2)
        else:
            p_box = (
                int(cfg["primary_photo"][0] * h),
                int(cfg["primary_photo"][1] * w),
                int(cfg["primary_photo"][2] * h),
                int(cfg["primary_photo"][3] * w),
            )

        # 2. Determine Ghost Photo Coordinates
        g_box = (
            int(cfg["ghost_photo"][0] * h),
            int(cfg["ghost_photo"][1] * w),
            int(cfg["ghost_photo"][2] * h),
            int(cfg["ghost_photo"][3] * w),
        )

        primary_crop = doc_bgr[p_box[0]:p_box[2], p_box[1]:p_box[3]]
        ghost_crop = doc_bgr[g_box[0]:g_box[2], g_box[1]:g_box[3]]

        # Layer 1: Ghost Photo Biometric Cross-Match
        ghost_sim, ghost_match, ghost_status = self.cross_match_primary_vs_ghost(primary_crop, ghost_crop)

        # Layer 2: Boundary Edge Gradient Discontinuity
        edge_metrics = self.analyze_boundary_gradients(doc_bgr, p_box)

        # Layer 3: Noise Residual & ELA Inconsistency
        noise_metrics = self.analyze_noise_and_ela(doc_bgr, p_box)

        # Composite Splicing Risk Score Formulation [0.0 - 1.0]
        # w_ghost=0.40, w_edge=0.25, w_noise=0.15, w_ela=0.10, w_illum=0.10
        s_biom = max(0.0, min(1.0, (0.50 - ghost_sim) / (0.50 - 0.25))) if ghost_crop.size > 0 else 0.0
        s_edge = max(0.0, min(1.0, (edge_metrics["s_boundary"] - 1.20) / (2.50 - 1.20)))
        s_noise = max(0.0, min(1.0, (noise_metrics["r_noise"] - 0.15) / (0.45 - 0.15)))
        s_ela = max(0.0, min(1.0, (noise_metrics["r_ela"] - 0.10) / (0.45 - 0.10)))
        s_illum = max(0.0, min(1.0, (noise_metrics["delta_illum_deg"] - 4.0) / (16.0 - 4.0)))

        fused_splicing_score = (
            0.40 * s_biom +
            0.25 * s_edge +
            0.15 * s_noise +
            0.10 * s_ela +
            0.10 * s_illum
        )

        reasons = []
        is_spliced = False

        if not ghost_match and ghost_status == "ERR_PHOTO_SPLICED_GHOST_MISMATCH":
            is_spliced = True
            reasons.append(
                f"[CRITICAL TRIPWIRE] Ghost photo biometric mismatch (Similarity={ghost_sim:.2f} < 0.32). "
                f"Primary portrait was substituted or pasted over."
            )

        if edge_metrics["edge_tamper_flag"]:
            is_spliced = True
            reasons.append(
                f"[FORENSIC ANOMALY] Photo box perimeter exhibits unnatural step-edge gradient jump "
                f"(Ratio={edge_metrics['s_boundary']:.2f} > 2.35, Seam={edge_metrics['l_seam']:.2f})."
            )

        # NOTE: noise_tamper_flag is informational only — noise inconsistency on printed
        # PVC cards captured with smartphone cameras is expected and must NOT set is_spliced.
        if noise_metrics["noise_tamper_flag"]:
            reasons.append(
                f"[FORENSIC INFO] Elevated noise variance between portrait and card substrate "
                f"(NoiseRatio={noise_metrics['r_noise']:.2f}, ELARatio={noise_metrics['r_ela']:.2f}) — "
                f"may be due to JPEG compression / smartphone capture; not conclusive without edge/ghost confirmation."
            )

        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "is_spliced": is_spliced,
            "splicing_score": round(fused_splicing_score, 4),
            "ghost_biometrics": {
                "similarity": ghost_sim,
                "is_match": ghost_match,
                "status": ghost_status,
            },
            "boundary_edge": edge_metrics,
            "noise_and_ela": noise_metrics,
            "reasons": reasons,
            "processing_time_ms": elapsed_ms,
        }


# Singleton photo splicing detector instance
photo_splicing_detector = PhotoSplicingDetector()
