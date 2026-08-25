"""
SIH26188 — Two-Stage Hybrid Risk Engine & Explainability Pipeline
Architecture Reference: Section 5.3, Section 6 (6.1, 6.2, 6.3, 6.4)

Stage 1: Deterministic Hard Tripwire Override Engine (Instant RED = Score 95/100, skip Stage 2)
- TRIPWIRE_1: MRZ checksum failure on any critical digits (CD1, CD2, CD3, CD4, composite)
- TRIPWIRE_2: Aadhaar RSA-2048 PKI QR digital signature verification failed
- TRIPWIRE_3: TruFor/DocTamper photo splice score > 0.75 or IoU tamper density > 0.25 on portrait region
- TRIPWIRE_4: MiniFASNet presentation attack detected (is_live == False / spoof confidence > 0.50)
- TRIPWIRE_5: Biometric face cosine similarity < 0.20 (severe mismatch / completely different person)
- TRIPWIRE_6: Watchlist vector match (distance < 0.28 / watchlist_hit == True)

Stage 2: Multi-Factor Log-Odds Bayesian Scoring Pipeline (with Noise Deadbands)
- Base prior log-odds: Lambda_0 = ln(0.02 / 0.98) = -3.8918
- Noise deadband functions:
  * psi_tamper(s) = max(0.0, s - 0.18)
  * psi_live(s) = max(0.0, 0.85 - s)
  * psi_stamp(s) = max(0.0, s - 0.20)
  * psi_face(s) = max(0.0, 0.70 - s)
- Feature weights:
  * w_cv1 = 3.5 (CV-01 DOB mismatch)
  * w_cv2 = 4.0 (CV-02 Doc No alteration)
  * 4.5 * I(MRZ checksum fail)
  * 2.5 * (1.0 - LevenshteinSim(OCR_Name, MRZ_Name))
  * 3.5 * psi_face(CosineSim)
  * 3.8 * psi_live(Liveness_Score)
  * 3.2 * psi_tamper(TruFor_Score)
  * 3.0 * psi_tamper(DocTamper_Score)
  * 2.8 * psi_stamp(Stamp_Score)
  * 2.2 * I(CV-07 Stamp Expiry Mismatch)
  * 0.5 * I(EXIF Suspicious)
- Final Risk Score: R = 100.0 / (1.0 + exp(-Lambda_post))
- Zero False-Positive Property: Clean authentic document evaluates to Risk Score = 2.0 (GREEN Auto-Clear)
- Decision Tiers: GREEN (0-30), AMBER (31-69), RED (70-100)
"""

import math
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.mrz.cross_validator import levenshtein_distance, token_sort_similarity
from app.schemas.biometrics import FaceMatchResult, LivenessResult
from app.schemas.forensics import ForensicsResult
from app.schemas.mrz import CrossValidationResult, MRZResult
from app.schemas.ocr import OCRResult, QRPayload
from app.schemas.risk import RiskAssessment, RiskLevel, RiskScoreBreakdown, TripwireCode
from app.schemas.stamp import StampResult

logger = get_logger("sih26188.risk_engine")

# Base empirical prior fraud log-odds: Lambda_0 = ln(0.02 / 0.98) = -3.8918
BASE_PRIOR_LOG_ODDS: float = settings.RISK_PRIOR_LOG_ODDS


# --------------------------------------------------------------------------------------------------
# Continuous Noise Deadband Mathematical Functions
# --------------------------------------------------------------------------------------------------

def psi_tamper(score: float, tau_adapt: float = 0.18) -> float:
    """
    Continuous noise deadband function for document tamper scores:
    psi_tamper(s) = max(0.0, s - 0.18)
    Filters scanner noise and paper texture below tau_adapt.
    """
    return max(0.0, float(score) - float(tau_adapt))


def psi_live(liveness_score: float, tau_live: float = 0.85) -> float:
    """
    Continuous noise deadband function for passive facial liveness:
    psi_live(s) = max(0.0, 0.85 - s)
    Only penalizes if liveness confidence drops below 0.85.
    """
    return max(0.0, float(tau_live) - float(liveness_score))


def psi_stamp(stamp_score: float, tau_stamp: float = 0.20) -> float:
    """
    Continuous noise deadband function for border stamp verification:
    psi_stamp(s) = max(0.0, s - 0.20)
    Filters minor ink bleed and partial impressions below 0.20.
    """
    return max(0.0, float(stamp_score) - float(tau_stamp))


def psi_face(cosine_sim: float, tau_face: float = 0.70) -> float:
    """
    Continuous noise deadband function for facial cosine similarity:
    psi_face(s) = max(0.0, 0.70 - s)
    Only penalizes if facial similarity drops below 0.70.
    """
    return max(0.0, float(tau_face) - float(cosine_sim))


def compute_log_odds_risk(posterior_log_odds: float) -> float:
    """
    Transforms posterior log-odds Lambda_post to standard 0-100 risk score:
    RiskScore = 100.0 / (1.0 + exp(-Lambda_post))
    """
    try:
        if posterior_log_odds > 50.0:
            return 100.0
        elif posterior_log_odds < -50.0:
            return 0.0
        prob = 1.0 / (1.0 + math.exp(-posterior_log_odds))
        return round(prob * 100.0, 2)
    except OverflowError:
        return 100.0 if posterior_log_odds > 0 else 0.0


def compute_name_levenshtein_similarity(name1: str, name2: str) -> float:
    """
    Calculates normalized character Levenshtein similarity in [0.0, 1.0].
    """
    clean1 = re.sub(r'[^A-Za-z0-9]', '', name1.upper())
    clean2 = re.sub(r'[^A-Za-z0-9]', '', name2.upper())
    if not clean1 and not clean2:
        return 1.0
    if not clean1 or not clean2:
        return 0.0
    if clean1 == clean2:
        return 1.0
    dist = levenshtein_distance(clean1, clean2)
    max_len = max(len(clean1), len(clean2))
    return max(0.0, min(1.0, 1.0 - (dist / max_len)))


# --------------------------------------------------------------------------------------------------
# Two-Stage Hybrid Risk Engine
# --------------------------------------------------------------------------------------------------

class RiskScorer:
    """
    Two-Stage Hybrid Risk Engine for Air-Gapped Border Identity Verification.

    Stage 1: Deterministic Hard Tripwires (Instant RED = 95.0, bypass Bayesian fusion).
    Stage 2: Multi-Factor Log-Odds Bayesian Fusion with continuous noise deadband filtering.
    """

    def __init__(self, prior_log_odds: float = BASE_PRIOR_LOG_ODDS):
        self.prior_log_odds = prior_log_odds

    def check_stage1_tripwires(
        self,
        ocr_result: Optional[OCRResult] = None,
        mrz_result: Optional[MRZResult] = None,
        face_match_result: Optional[FaceMatchResult] = None,
        liveness_result: Optional[LivenessResult] = None,
        forensics_result: Optional[ForensicsResult] = None,
        stamp_result: Optional[StampResult] = None,
        cross_validation_result: Optional[CrossValidationResult] = None,
        photo_tamper_density: Optional[float] = None,
        watchlist_hit: Optional[bool] = None,
        watchlist_distance: Optional[float] = None,
    ) -> Tuple[bool, List[str], List[str]]:
        """
        Evaluates Stage 1 Deterministic Hard Tripwires (TRIPWIRE_1 through TRIPWIRE_6).
        Returns (tripwire_triggered, tripwire_codes, tripwire_reasons).
        """
        triggered_codes: List[str] = []
        reasons: List[str] = []

        # -------------------------------------------------------------------------
        # TRIPWIRE_1: MRZ Checksum Failure on Any Critical Digits
        # -------------------------------------------------------------------------
        if mrz_result is not None and mrz_result.mrz_detected:
            has_mrz_fail = False
            fail_details = []

            if mrz_result.valid is False:
                has_mrz_fail = True
            if mrz_result.doc_number_checksum_valid is False:
                has_mrz_fail = True
                fail_details.append("Document Number CD1 failed")
            if mrz_result.dob_checksum_valid is False:
                has_mrz_fail = True
                fail_details.append("Date of Birth CD2 failed")
            if mrz_result.expiry_checksum_valid is False:
                has_mrz_fail = True
                fail_details.append("Expiry Date CD3 failed")
            if mrz_result.optional_data_checksum_valid is False:
                has_mrz_fail = True
                fail_details.append("Optional Data CD4 failed")
            if mrz_result.composite_checksum_valid is False:
                has_mrz_fail = True
                fail_details.append("Composite Check Digit failed")
            if mrz_result.checksum_failures:
                has_mrz_fail = True
                fail_details.extend(mrz_result.checksum_failures)

            if has_mrz_fail:
                code = TripwireCode.TRIPWIRE_1_MRZ_CHECKSUM_FAIL.value
                triggered_codes.append(code)
                detail_str = "; ".join(fail_details) if fail_details else "ICAO Modulo-10 checksum mismatch"
                reasons.append(
                    f"[CRITICAL TRIPWIRE] TRIPWIRE_1: ICAO Doc 9303 MRZ Checksum Failure ({detail_str})"
                )

        # -------------------------------------------------------------------------
        # TRIPWIRE_2: Aadhaar RSA-2048 PKI QR Digital Signature Failed / Forged
        # -------------------------------------------------------------------------
        qr_payload: Optional[QRPayload] = None
        if ocr_result is not None and ocr_result.qr_payload is not None:
            qr_payload = ocr_result.qr_payload

        cv8_failed = False
        if cross_validation_result is not None:
            for cv in cross_validation_result.critical_violations:
                if cv.rule_id == "CV-08" or cv.telemetry_code == "ERR_PKI_FORGED":
                    cv8_failed = True
                    break

        if (qr_payload and qr_payload.raw_qr_found and qr_payload.qr_type == "AADHAAR_SECURE_V2" and not qr_payload.signature_valid) or cv8_failed:
            code = TripwireCode.TRIPWIRE_2_RSA_SIG_FAIL.value
            triggered_codes.append(code)
            reasons.append(
                "[CRITICAL TRIPWIRE] TRIPWIRE_2: Aadhaar RSA-2048 PKI digital signature verification failed (Cryptographic Forgery Detected)"
            )

        # -------------------------------------------------------------------------
        # TRIPWIRE_3: TruFor/DocTamper Photo Splice Score > 0.75 or IoU Tamper Density > 0.25
        # -------------------------------------------------------------------------
        photo_splice_detected = False
        photo_splice_details = []

        if photo_tamper_density is not None and photo_tamper_density > 0.25:
            photo_splice_detected = True
            photo_splice_details.append(f"Photo area tamper density {photo_tamper_density:.2f} > 0.25")

        if forensics_result is not None:
            if forensics_result.photo_region_tampered and forensics_result.trufor_score > 0.75:
                photo_splice_detected = True
                photo_splice_details.append(f"TruFor splicing score {forensics_result.trufor_score:.2f} > 0.75")
            elif forensics_result.photo_region_tampered:
                photo_splice_detected = True
                photo_splice_details.append("Portrait photo boundary seam anomaly")

            for reg in forensics_result.tampered_regions:
                if reg.tamper_type == "PHOTO_SPLICING" and reg.peak_tamper_probability > 0.75:
                    photo_splice_detected = True
                    photo_splice_details.append(f"Photo splicing peak probability {reg.peak_tamper_probability:.2f} > 0.75")

        if cross_validation_result is not None:
            for cv in cross_validation_result.critical_violations:
                if cv.rule_id == "CV-05" or cv.telemetry_code == "ERR_PHOTO_SPLICE":
                    photo_splice_detected = True
                    photo_splice_details.append("CV-05 photo box tamper energy violation")
                    break

        if photo_splice_detected:
            code = TripwireCode.TRIPWIRE_3_PHOTO_SPLICE.value
            triggered_codes.append(code)
            detail_str = "; ".join(photo_splice_details) if photo_splice_details else "Portrait window tampering"
            reasons.append(
                f"[CRITICAL TRIPWIRE] TRIPWIRE_3: Portrait Photo Splicing Detected in ID Window ({detail_str})"
            )

        # -------------------------------------------------------------------------
        # TRIPWIRE_4: MiniFASNet Presentation Attack Detected (is_live == False / spoof > 0.50)
        # -------------------------------------------------------------------------
        if liveness_result is not None:
            is_spoof = False
            spoof_details = []

            if not liveness_result.is_live:
                is_spoof = True
                spoof_details.append(f"is_live=False (confidence={liveness_result.confidence:.2f})")
            elif liveness_result.confidence < 0.50:
                is_spoof = True
                spoof_details.append(f"Liveness confidence {liveness_result.confidence:.2f} < 0.50")

            if liveness_result.attack_type and liveness_result.attack_type.upper() not in ("NONE", "LIVE", "GENUINE"):
                is_spoof = True
                spoof_details.append(f"Attack modality: {liveness_result.attack_type}")

            if is_spoof:
                code = TripwireCode.TRIPWIRE_4_BIOMETRIC_SPOOF.value
                triggered_codes.append(code)
                detail_str = "; ".join(spoof_details) if spoof_details else "Presentation attack detected"
                reasons.append(
                    f"[CRITICAL TRIPWIRE] TRIPWIRE_4: Biometric Presentation Attack / Screen Spoof Detected ({detail_str})"
                )

        # -------------------------------------------------------------------------
        # TRIPWIRE_5: Biometric Face Cosine Similarity < 0.20 (Severe Mismatch)
        # -------------------------------------------------------------------------
        if face_match_result is not None:
            if face_match_result.similarity < 0.20:
                code = TripwireCode.TRIPWIRE_5_FACE_MISMATCH.value
                triggered_codes.append(code)
                reasons.append(
                    f"[CRITICAL TRIPWIRE] TRIPWIRE_5: Biometric Cosine Similarity ({face_match_result.similarity:.4f}) < 0.20 (Severe Facial Mismatch)"
                )

        # -------------------------------------------------------------------------
        # TRIPWIRE_6: Watchlist Vector Match (Distance < 0.28 / watchlist_hit == True)
        # -------------------------------------------------------------------------
        is_watchlist_hit = False
        wl_dist = None

        if watchlist_hit is True:
            is_watchlist_hit = True
            wl_dist = watchlist_distance
        elif face_match_result is not None:
            if face_match_result.watchlist_hit:
                is_watchlist_hit = True
                wl_dist = face_match_result.watchlist_distance
            elif face_match_result.watchlist_distance is not None and face_match_result.watchlist_distance < 0.28:
                is_watchlist_hit = True
                wl_dist = face_match_result.watchlist_distance

        if is_watchlist_hit:
            code = TripwireCode.TRIPWIRE_6_WATCHLIST_HIT.value
            triggered_codes.append(code)
            dist_str = f"Distance={wl_dist:.4f} < 0.28" if wl_dist is not None else "Match Confirmed"
            reasons.append(
                f"[CRITICAL TRIPWIRE] TRIPWIRE_6: High-Risk Border Security Watchlist Vector Match ({dist_str})"
            )

        tripwire_active = len(triggered_codes) > 0
        return tripwire_active, triggered_codes, reasons

    def compute_stage2_bayesian(
        self,
        ocr_result: Optional[OCRResult] = None,
        mrz_result: Optional[MRZResult] = None,
        face_match_result: Optional[FaceMatchResult] = None,
        liveness_result: Optional[LivenessResult] = None,
        forensics_result: Optional[ForensicsResult] = None,
        stamp_result: Optional[StampResult] = None,
        cross_validation_result: Optional[CrossValidationResult] = None,
    ) -> Tuple[float, RiskScoreBreakdown, List[str], List[str]]:
        """
        Executes Stage 2 Multi-Factor Log-Odds Bayesian Scoring Pipeline.
        Accumulates continuous deadband penalties and discrete cross-validation indicators.
        Returns (risk_score, score_breakdown, explanation_reasons, cv_violations_list).
        """
        # Base prior log-odds: Lambda_0 = -3.8918
        lambda_0 = self.prior_log_odds

        # Decomposed delta accumulators
        delta_tamper = 0.0
        delta_face = 0.0
        delta_mrz = 0.0
        delta_cross_val = 0.0
        delta_stamp = 0.0
        delta_metadata = 0.0

        reasons: List[str] = []
        cv_violations_list: List[str] = []

        # -------------------------------------------------------------------------
        # 1. Cross-Validation Indicators (CV-01, CV-02, CV-07, etc.)
        # -------------------------------------------------------------------------
        cv1_failed = False
        cv2_failed = False
        cv3_warning = False
        cv4_warning = False
        cv6_failed = False
        cv7_warning = False

        if cross_validation_result is not None:
            for cv in cross_validation_result.violations:
                cv_violations_list.append(f"{cv.rule_id} ({cv.telemetry_code}): {cv.details}")
                if cv.rule_id == "CV-01" or cv.telemetry_code == "ERR_DOB_MISMATCH":
                    cv1_failed = True
                elif cv.rule_id == "CV-02" or cv.telemetry_code == "ERR_DOCNO_ALTER":
                    cv2_failed = True
                elif cv.rule_id == "CV-03" or cv.telemetry_code == "WRN_NAME_SPELL":
                    cv3_warning = True
                elif cv.rule_id == "CV-04" or cv.telemetry_code == "WRN_AGE_ANOMALY":
                    cv4_warning = True
                elif cv.rule_id == "CV-06" or cv.telemetry_code == "ERR_TEXT_FORGERY":
                    cv6_failed = True
                elif cv.rule_id == "CV-07" or cv.telemetry_code == "WRN_STAMP_EXPIRY":
                    cv7_warning = True

        # w_cv1 = 3.5 * I(CV-01 DOB mismatch)
        if cv1_failed:
            delta_cross_val += 3.5
            reasons.append("[CRITICAL VIOLATION] CV-01: Document Date of Birth mismatch (+3.50 log-odds)")

        # w_cv2 = 4.0 * I(CV-02 Doc No alteration)
        if cv2_failed:
            delta_cross_val += 4.0
            reasons.append("[CRITICAL VIOLATION] CV-02: Document Serial Number alteration (+4.00 log-odds)")

        # 2.2 * I(CV-07 Stamp Expiry Mismatch)
        if cv7_warning:
            delta_cross_val += 2.2
            reasons.append("[WARNING] CV-07: Stamp date falls outside authorized permit window (+2.20 log-odds)")

        # CV-03 minor warning (+0.8 log-odds)
        if cv3_warning:
            delta_cross_val += 0.8
            reasons.append("[WARNING] CV-03: Minor name transliteration / spelling variance (+0.80 log-odds)")

        # CV-04 Apparent Age vs Declared DOB Drift (+1.80 log-odds)
        if cv4_warning:
            delta_cross_val += 1.8
            reasons.append("[WARNING] CV-04: Biometric apparent age is inconsistent with document DOB (+1.80 log-odds)")

        # CV-06 Text alteration / inpainting (+3.50 log-odds)
        if cv6_failed:
            delta_cross_val += 3.5
            reasons.append("[CRITICAL VIOLATION] CV-06: Localized text alteration or inpainting detected (+3.50 log-odds)")

        # -------------------------------------------------------------------------
        # 2. MRZ Checksum & Name Discrepancy
        # -------------------------------------------------------------------------
        if mrz_result is not None and mrz_result.mrz_detected:
            # 4.5 * I(MRZ checksum fail)
            if not mrz_result.valid or mrz_result.checksum_failures:
                delta_mrz += 4.5
                reasons.append("[CRITICAL] ICAO MRZ checksum verification failed (+4.50 log-odds)")

            # 2.5 * (1.0 - LevenshteinSim(OCR_Name, MRZ_Name))
            mrz_full_name = f"{mrz_result.given_names or ''} {mrz_result.surname or ''}".strip()
            ocr_name = (ocr_result.fields.get("full_name") if ocr_result else "") or ""
            if mrz_full_name and ocr_name:
                lev_sim = compute_name_levenshtein_similarity(ocr_name, mrz_full_name)
                name_penalty = 2.5 * (1.0 - lev_sim)
                if name_penalty > 0.10:
                    delta_mrz += name_penalty
                    reasons.append(
                        f"[EVIDENCE] Name difference between OCR and MRZ (Sim={lev_sim:.2f}, +{name_penalty:.2f} log-odds)"
                    )

        # -------------------------------------------------------------------------
        # 3. Biometrics: Face Cosine Sim & Liveness Deadbands
        # -------------------------------------------------------------------------
        if face_match_result is not None:
            # Detect model type:
            # - AdaFace-ResNet100: deep embedding calibrated for tau_face = 0.70
            # - SFace-ResNet: lightweight neural embedding calibrated for tau_face = 0.50 (threshold = 0.363)
            # - Fallback HOG: spatial features calibrated for tau_face = 0.50
            is_fallback = "Fallback" in (face_match_result.embedding_model_used or "")
            is_sface = "SFace" in (face_match_result.embedding_model_used or "")
            effective_tau_face = 0.50 if (is_fallback or is_sface) else 0.70

            # 3.5 * psi_face(CosineSim) where psi_face = max(0.0, tau_face - CosineSim)
            face_deadband_penalty = 3.5 * psi_face(face_match_result.similarity, effective_tau_face)
            if face_deadband_penalty > 0.0:
                delta_face += face_deadband_penalty
                model_note = f" [{face_match_result.embedding_model_used}, deadband={effective_tau_face:.2f}]"
                reasons.append(
                    f"[WARNING] Facial biometric similarity ({face_match_result.similarity:.2f}) below {effective_tau_face:.2f} deadband (+{face_deadband_penalty:.2f} log-odds){model_note}"
                )
            else:
                reasons.append(
                    f"[INFO] Facial biometric verification confirmed (Similarity={face_match_result.similarity:.2f} >= {effective_tau_face:.2f})"
                )


        if liveness_result is not None:
            # 3.8 * psi_live(Liveness_Score) where psi_live = max(0.0, 0.85 - Liveness_Score)
            live_deadband_penalty = 3.8 * psi_live(liveness_result.confidence)
            if live_deadband_penalty > 0.0:
                delta_face += live_deadband_penalty
                reasons.append(
                    f"[WARNING] Anti-spoofing liveness score ({liveness_result.confidence:.2f}) below 0.85 deadband (+{live_deadband_penalty:.2f} log-odds)"
                )
            else:
                reasons.append(
                    f"[INFO] Passive anti-spoofing confirmed live human presence (Confidence={liveness_result.confidence:.2f})"
                )

        if cv4_warning:
            delta_face += 1.2
            reasons.append("[WARNING] CV-04: Biometric apparent age diverges from document DOB (+1.20 log-odds)")

        # -------------------------------------------------------------------------
        # 4. Forensics: TruFor & DocTamper Deadbands
        # -------------------------------------------------------------------------
        if forensics_result is not None:
            # 3.2 * psi_tamper(TruFor_Score) where psi_tamper = max(0.0, s - 0.18)
            trufor_penalty = 3.2 * psi_tamper(forensics_result.trufor_score)
            if trufor_penalty > 0.0:
                delta_tamper += trufor_penalty
                reasons.append(
                    f"[WARNING] TruFor splicing anomaly ({forensics_result.trufor_score:.2f}) exceeds 0.18 deadband (+{trufor_penalty:.2f} log-odds)"
                )

            # 3.0 * psi_tamper(DocTamper_Score) where psi_tamper = max(0.0, s - 0.18)
            doctamper_penalty = 3.0 * psi_tamper(forensics_result.doctamper_score)
            if doctamper_penalty > 0.0:
                delta_tamper += doctamper_penalty
                reasons.append(
                    f"[WARNING] DocTamper text alteration anomaly ({forensics_result.doctamper_score:.2f}) exceeds 0.18 deadband (+{doctamper_penalty:.2f} log-odds)"
                )

            if cv6_failed:
                delta_tamper += 1.5
                reasons.append("[CRITICAL VIOLATION] CV-06: Text box pixel tamper energy detected (+1.50 log-odds)")

            # 0.5 * I(EXIF Suspicious)
            if forensics_result.exif_suspicious or forensics_result.dqt_quantization_altered:
                delta_metadata += 0.5
                reasons.append("[WARNING] EXIF metadata or JPEG Quantization Tables show editing software traces (+0.50 log-odds)")

            if not forensics_result.is_tampered and delta_tamper == 0.0 and delta_metadata == 0.0:
                reasons.append("[INFO] Forensic pixel tamper analysis clear. No splicing or inpainting detected.")

        # -------------------------------------------------------------------------
        # 5. Stamp Anomaly Deadband
        # -------------------------------------------------------------------------
        if stamp_result is not None and stamp_result.stamp_found:
            # 2.8 * psi_stamp(Stamp_Score) where psi_stamp = max(0.0, s - 0.20)
            stamp_deadband_penalty = 2.8 * psi_stamp(stamp_result.stamp_score)
            if stamp_deadband_penalty > 0.0:
                delta_stamp += stamp_deadband_penalty
                reasons.append(
                    f"[WARNING] Border stamp anomaly score ({stamp_result.stamp_score:.2f}) exceeds 0.20 deadband (+{stamp_deadband_penalty:.2f} log-odds)"
                )
            else:
                reasons.append(
                    f"[INFO] Border stamp verified authentic against SSB official registry (Score={stamp_result.stamp_score:.2f})"
                )

        # -------------------------------------------------------------------------
        # Posterior Fusion Calculation
        # -------------------------------------------------------------------------
        total_delta = (
            delta_tamper
            + delta_face
            + delta_mrz
            + delta_cross_val
            + delta_stamp
            + delta_metadata
        )
        posterior_log_odds = round(lambda_0 + total_delta, 4)
        raw_posterior_prob = round(1.0 / (1.0 + math.exp(-posterior_log_odds)), 4)
        risk_score = compute_log_odds_risk(posterior_log_odds)

        breakdown = RiskScoreBreakdown(
            base_prior_log_odds=round(lambda_0, 4),
            tamper_log_odds_delta=round(delta_tamper, 4),
            face_log_odds_delta=round(delta_face, 4),
            mrz_log_odds_delta=round(delta_mrz, 4),
            cross_val_log_odds_delta=round(delta_cross_val, 4),
            stamp_log_odds_delta=round(delta_stamp, 4),
            metadata_log_odds_delta=round(delta_metadata, 4),
            posterior_log_odds=posterior_log_odds,
            raw_posterior_probability=raw_posterior_prob,
        )

        return risk_score, breakdown, reasons, cv_violations_list

    def evaluate(
        self,
        ocr_result: Optional[OCRResult] = None,
        mrz_result: Optional[MRZResult] = None,
        face_match_result: Optional[FaceMatchResult] = None,
        liveness_result: Optional[LivenessResult] = None,
        forensics_result: Optional[ForensicsResult] = None,
        stamp_result: Optional[StampResult] = None,
        cross_validation_result: Optional[CrossValidationResult] = None,
        photo_tamper_density: Optional[float] = None,
        watchlist_hit: Optional[bool] = None,
        watchlist_distance: Optional[float] = None,
        audit_hash: Optional[str] = None,
        model_versions: Optional[Dict[str, str]] = None,
        processing_time_ms: float = 0.0,
    ) -> RiskAssessment:
        """
        Master Risk Evaluation Entrypoint.
        Executes Stage 1 Hard Tripwire Overrides -> Stage 2 Multi-Factor Bayesian Fusion.
        """
        start_time = time.perf_counter()

        # =========================================================================
        # Stage 1: Deterministic Hard Tripwire Overrides (Instant RED)
        # =========================================================================
        tripwire_triggered, tripwire_codes, tripwire_reasons = self.check_stage1_tripwires(
            ocr_result=ocr_result,
            mrz_result=mrz_result,
            face_match_result=face_match_result,
            liveness_result=liveness_result,
            forensics_result=forensics_result,
            stamp_result=stamp_result,
            cross_validation_result=cross_validation_result,
            photo_tamper_density=photo_tamper_density,
            watchlist_hit=watchlist_hit,
            watchlist_distance=watchlist_distance,
        )

        cv_violations_list: List[str] = []
        if cross_validation_result is not None:
            for cv in cross_validation_result.violations:
                cv_violations_list.append(f"{cv.rule_id} ({cv.telemetry_code}): {cv.details}")

        if tripwire_triggered:
            # Hard Tripwire Override: Instant RED (Score = 95.0, skip Stage 2 Bayesian accumulation)
            risk_score = 95.0
            risk_level = RiskLevel.RED
            auto_clear = False

            # Compose human-readable reasons with tripwire alerts at top
            reasons = list(tripwire_reasons)
            if cv_violations_list:
                for cv_msg in cv_violations_list:
                    if not any(cv_msg in r for r in reasons):
                        reasons.append(f"[CROSS-VAL] {cv_msg}")

            reasons.append(
                "[DECISION RED] Critical hard tripwire triggered. Immediate secondary inspection & officer detainment protocol activated."
            )

            # Override score breakdown reflecting instant RED posterior
            breakdown = RiskScoreBreakdown(
                base_prior_log_odds=self.prior_log_odds,
                tamper_log_odds_delta=5.0 if any("TRIPWIRE_3" in c for c in tripwire_codes) else 0.0,
                face_log_odds_delta=5.0 if any(c in ("TRIPWIRE_4", "TRIPWIRE_5", "TRIPWIRE_6") for c in tripwire_codes) else 0.0,
                mrz_log_odds_delta=5.0 if any("TRIPWIRE_1" in c for c in tripwire_codes) else 0.0,
                cross_val_log_odds_delta=5.0 if any("TRIPWIRE_2" in c for c in tripwire_codes) else 0.0,
                stamp_log_odds_delta=0.0,
                metadata_log_odds_delta=0.0,
                posterior_log_odds=2.9444,  # log(0.95/0.05)
                raw_posterior_probability=0.95,
            )

            elapsed_ms = round((time.perf_counter() - start_time) * 1000 + processing_time_ms, 2)
            heatmap_b64 = forensics_result.heatmap_base64 if forensics_result else None

            return RiskAssessment(
                risk_score=risk_score,
                risk_level=risk_level,
                auto_clear=auto_clear,
                tripwire_triggered=True,
                tripwire_codes=tripwire_codes,
                reasons=reasons,
                cross_validation_violations=cv_violations_list,
                heatmap_url=None,
                heatmap_base64=heatmap_b64,
                score_breakdown=breakdown,
                model_versions=model_versions or {},
                processing_time_ms=elapsed_ms,
                audit_hash=audit_hash,
            )

        # =========================================================================
        # Stage 2: Multi-Factor Log-Odds Bayesian Fusion Pipeline
        # =========================================================================
        risk_score, breakdown, stage2_reasons, cv_violations_list = self.compute_stage2_bayesian(
            ocr_result=ocr_result,
            mrz_result=mrz_result,
            face_match_result=face_match_result,
            liveness_result=liveness_result,
            forensics_result=forensics_result,
            stamp_result=stamp_result,
            cross_validation_result=cross_validation_result,
        )

        # Decision Tiers: GREEN (0-30), AMBER (31-69), RED (70-100)
        if risk_score <= settings.RISK_GREEN_MAX:
            risk_level = RiskLevel.GREEN
            auto_clear = True
            decision_msg = f"[DECISION GREEN] Low Risk ({risk_score}/100). Fast-path clearance authorized."
        elif risk_score <= settings.RISK_AMBER_MAX:
            risk_level = RiskLevel.AMBER
            auto_clear = False
            decision_msg = f"[DECISION AMBER] Moderate Risk ({risk_score}/100). Secondary manual officer inspection required."
        else:
            risk_level = RiskLevel.RED
            auto_clear = False
            decision_msg = f"[DECISION RED] High Risk ({risk_score}/100). Security alert triggered."

        reasons = list(stage2_reasons)
        reasons.append(decision_msg)

        if not reasons:
            reasons.append("Document cleared automated screening with zero anomalies.")

        elapsed_ms = round((time.perf_counter() - start_time) * 1000 + processing_time_ms, 2)
        heatmap_b64 = forensics_result.heatmap_base64 if forensics_result else None

        return RiskAssessment(
            risk_score=risk_score,
            risk_level=risk_level,
            auto_clear=auto_clear,
            tripwire_triggered=False,
            tripwire_codes=[],
            reasons=reasons,
            cross_validation_violations=cv_violations_list,
            heatmap_url=None,
            heatmap_base64=heatmap_b64,
            score_breakdown=breakdown,
            model_versions=model_versions or {},
            processing_time_ms=elapsed_ms,
            audit_hash=audit_hash,
        )


# Global Singleton Instance
risk_scorer = RiskScorer()
