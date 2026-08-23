#!/usr/bin/env python3
"""
Empirical Stress-Test Suite 1: Bayesian Log-Odds Risk Scoring Engine Calibration
Adversarial Verification for SIH26188 Wave 3 Deliverables
"""

import math
import random
import sys


def compute_two_stage_risk(
    cv01_dob_mismatch: bool = False,
    cv02_docno_alter: bool = False,
    cv05_photo_splice: bool = False,
    cv08_pki_invalid: bool = False,
    mrz_checksum_fail: bool = False,
    name_sim: float = 1.0,
    face_sim: float = 0.85,
    liveness_score: float = 0.95,
    trufor_score: float = 0.05,
    doctamper_score: float = 0.04,
    stamp_score: float = 0.08,
    cv07_stamp_expiry: bool = False,
    watchlist_hit: bool = False
) -> dict:
    """
    Evaluates Full Two-Stage Hybrid Risk Scoring Engine:
    Stage 1: Deterministic Hard Tripwires (Section 6.1)
    Stage 2: Multi-Factor Log-Odds Bayesian Formula with Deadbands (Section 6.2)
    """
    # -------------------------------------------------------------------------
    # Stage 1: Deterministic Hard Tripwires (Instant RED R=100)
    # -------------------------------------------------------------------------
    if watchlist_hit:
        return {
            "risk_score": 100,
            "tier": "RED",
            "tripwire_triggered": True,
            "tripwire_code": "ERR_WATCHLIST_HIT",
            "log_odds": 10.0,
            "stage": 1
        }
    if cv08_pki_invalid:
        return {
            "risk_score": 100,
            "tier": "RED",
            "tripwire_triggered": True,
            "tripwire_code": "ERR_PKI_FORGED",
            "log_odds": 10.0,
            "stage": 1
        }
    if liveness_score < 0.50:
        return {
            "risk_score": 100,
            "tier": "RED",
            "tripwire_triggered": True,
            "tripwire_code": "ERR_BIOMETRIC_SPOOF",
            "log_odds": 10.0,
            "stage": 1
        }
    if cv05_photo_splice or trufor_score > 0.65:
        return {
            "risk_score": 100,
            "tier": "RED",
            "tripwire_triggered": True,
            "tripwire_code": "ERR_PHOTO_SPLICE",
            "log_odds": 10.0,
            "stage": 1
        }

    # -------------------------------------------------------------------------
    # Stage 2: Multi-Factor Log-Odds Bayesian Scoring (Continuous Evidence)
    # -------------------------------------------------------------------------
    lambda_0 = -3.8918  # Prior log-odds (P0 = 0.02)

    # Deadband activation functions
    psi_tamper_trufor = max(0.0, trufor_score - 0.18)
    psi_tamper_doctamper = max(0.0, doctamper_score - 0.18)
    psi_live = max(0.0, 0.85 - liveness_score)
    psi_stamp = max(0.0, stamp_score - 0.20)
    psi_face = max(0.0, 0.70 - face_sim)

    w_cv1 = 3.5
    w_cv2 = 4.0
    w_mrz = 4.5
    w_name = 2.5
    w_face = 3.5
    w_live = 3.8
    w_trufor = 3.2
    w_doctamper = 3.0
    w_stamp = 2.8
    w_cv7 = 2.2

    delta = 0.0
    if cv01_dob_mismatch:
        delta += w_cv1
    if cv02_docno_alter:
        delta += w_cv2
    if mrz_checksum_fail:
        delta += w_mrz
    
    delta += w_name * max(0.0, 1.0 - name_sim)
    delta += w_face * psi_face
    delta += w_live * psi_live
    delta += w_trufor * psi_tamper_trufor
    delta += w_doctamper * psi_tamper_doctamper
    delta += w_stamp * psi_stamp

    if cv07_stamp_expiry:
        delta += w_cv7

    lambda_post = lambda_0 + delta
    risk_score = round(100.0 / (1.0 + math.exp(-lambda_post)))

    if risk_score <= 30:
        tier = "GREEN"
    elif risk_score <= 69:
        tier = "AMBER"
    else:
        tier = "RED"

    return {
        "risk_score": risk_score,
        "tier": tier,
        "tripwire_triggered": False,
        "tripwire_code": None,
        "log_odds": round(lambda_post, 4),
        "delta": round(delta, 4),
        "stage": 2
    }


def run_tests():
    print("=" * 80)
    print("TEST SUITE 1: TWO-STAGE HYBRID RISK SCORING ENGINE EMPIRICAL STRESS TEST")
    print("=" * 80)

    # 1. Clean Pristine Baseline
    res_pristine = compute_two_stage_risk()
    print(f"[1] Clean Pristine Baseline: Risk={res_pristine['risk_score']} Tier={res_pristine['tier']} LogOdds={res_pristine['log_odds']}")
    assert res_pristine["risk_score"] == 2, f"Expected 2, got {res_pristine['risk_score']}"
    assert res_pristine["tier"] == "GREEN"

    # 2. Clean with Realistic Sensor Noise (Ambient Lighting, Slight OCR Font Noise)
    res_noise = compute_two_stage_risk(
        liveness_score=0.88,
        trufor_score=0.12,
        doctamper_score=0.10,
        stamp_score=0.15,
        face_sim=0.74,
        name_sim=0.96
    )
    print(f"[2] Clean with Realistic Sensor Noise: Risk={res_noise['risk_score']} Tier={res_noise['tier']} LogOdds={res_noise['log_odds']}")
    assert res_noise["risk_score"] <= 30, f"Expected <= 30, got {res_noise['risk_score']}"
    assert res_noise["tier"] == "GREEN"

    # 3. Clean at Deadband Boundary
    res_deadband = compute_two_stage_risk(
        liveness_score=0.85,
        trufor_score=0.18,
        doctamper_score=0.18,
        stamp_score=0.20,
        face_sim=0.70,
        name_sim=0.95
    )
    print(f"[3] Clean at Deadband Boundary: Risk={res_deadband['risk_score']} Tier={res_deadband['tier']} LogOdds={res_deadband['log_odds']}")
    assert res_deadband["risk_score"] <= 30, f"Expected <= 30, got {res_deadband['risk_score']}"
    assert res_deadband["tier"] == "GREEN"

    # 4. Forgery Scenario A: Photo Substitution / Splicing (Stage 1 Tripwire)
    res_face_forgery = compute_two_stage_risk(
        cv05_photo_splice=True,
        face_sim=0.15,
        trufor_score=0.80
    )
    print(f"[4] Photo Substitution (Stage 1 Tripwire): Risk={res_face_forgery['risk_score']} Tier={res_face_forgery['tier']} Code={res_face_forgery['tripwire_code']}")
    assert res_face_forgery["risk_score"] == 100
    assert res_face_forgery["tier"] == "RED"
    assert res_face_forgery["stage"] == 1

    # 5. Forgery Scenario B: Tampered Text / Doc No Alteration (Stage 2 Bayesian)
    res_text_tamper = compute_two_stage_risk(
        cv02_docno_alter=True,
        doctamper_score=0.85,
        trufor_score=0.55
    )
    print(f"[5] Tampered Text (DocNo Alter + Inpainting): Risk={res_text_tamper['risk_score']} Tier={res_text_tamper['tier']} LogOdds={res_text_tamper['log_odds']}")
    assert res_text_tamper["risk_score"] >= 70
    assert res_text_tamper["tier"] == "RED"
    assert res_text_tamper["stage"] == 2

    # 6. Forgery Scenario C: DOB Mismatch (Visual vs MRZ) + Text Inpainting (Stage 2 Bayesian)
    res_dob_mismatch = compute_two_stage_risk(
        cv01_dob_mismatch=True,
        doctamper_score=0.75
    )
    print(f"[6] DOB Mismatch (Visual vs MRZ + Inpainting): Risk={res_dob_mismatch['risk_score']} Tier={res_dob_mismatch['tier']} LogOdds={res_dob_mismatch['log_odds']}")
    assert res_dob_mismatch["risk_score"] >= 70
    assert res_dob_mismatch["tier"] == "RED"
    assert res_dob_mismatch["stage"] == 2

    # 7. Forgery Scenario D: Biometric Presentation Attack (Stage 1 Tripwire)
    res_spoof = compute_two_stage_risk(
        liveness_score=0.25,
        face_sim=0.90
    )
    print(f"[7] Biometric Presentation Attack (Spoof): Risk={res_spoof['risk_score']} Tier={res_spoof['tier']} Code={res_spoof['tripwire_code']}")
    assert res_spoof["risk_score"] == 100
    assert res_spoof["tier"] == "RED"
    assert res_spoof["stage"] == 1

    # 8. Forgery Scenario E: Aadhaar QR RSA-2048 PKI Signature Failure (Stage 1 Tripwire)
    res_pki = compute_two_stage_risk(
        cv08_pki_invalid=True
    )
    print(f"[8] Aadhaar QR PKI Invalid (Stage 1 Tripwire): Risk={res_pki['risk_score']} Tier={res_pki['tier']} Code={res_pki['tripwire_code']}")
    assert res_pki["risk_score"] == 100
    assert res_pki["tier"] == "RED"
    assert res_pki["stage"] == 1

    # 9. Forgery Scenario F: MRZ Checksum Fail + Name Alteration (Stage 2 Bayesian)
    res_mrz_fail = compute_two_stage_risk(
        mrz_checksum_fail=True,
        name_sim=0.40
    )
    print(f"[9] MRZ Checksum Fail + Name Alteration: Risk={res_mrz_fail['risk_score']} Tier={res_mrz_fail['tier']} LogOdds={res_mrz_fail['log_odds']}")
    assert res_mrz_fail["risk_score"] >= 70
    assert res_mrz_fail["tier"] == "RED"
    assert res_mrz_fail["stage"] == 2

    # 10. AMBER Scenario: Compounding Minor Warnings (Name Typo + Slight Age/Face drift)
    res_amber = compute_two_stage_risk(
        name_sim=0.10,
        face_sim=0.55,
        liveness_score=0.70,
        stamp_score=0.40
    )
    print(f"[10] AMBER Scenario (Compounding Warnings): Risk={res_amber['risk_score']} Tier={res_amber['tier']} LogOdds={res_amber['log_odds']}")
    assert res_amber["tier"] == "AMBER"
    assert 31 <= res_amber["risk_score"] <= 69

    # 11. Monte Carlo Simulation: 5,000 Clean Documents with Sensor Noise
    random.seed(42)
    clean_passes = 0
    clean_total = 5000
    for _ in range(clean_total):
        r_live = random.uniform(0.85, 0.99)
        r_trufor = random.uniform(0.00, 0.17)
        r_doctamper = random.uniform(0.00, 0.17)
        r_stamp = random.uniform(0.00, 0.19)
        r_face = random.uniform(0.70, 0.95)
        r_name = random.uniform(0.92, 1.0)
        res = compute_two_stage_risk(
            liveness_score=r_live,
            trufor_score=r_trufor,
            doctamper_score=r_doctamper,
            stamp_score=r_stamp,
            face_sim=r_face,
            name_sim=r_name
        )
        if res["tier"] == "GREEN" and res["risk_score"] <= 30:
            clean_passes += 1

    print(f"[11] Monte Carlo Clean Documents (N={clean_total}): {clean_passes}/{clean_total} Passed GREEN ({(clean_passes/clean_total)*100:.2f}%)")
    assert clean_passes == clean_total, f"Clean pass rate {clean_passes}/{clean_total} failed"

    # 12. Monte Carlo Simulation: 5,000 Forged Documents
    forged_passes = 0
    forged_total = 5000
    attack_types = ["photo_swap", "docno_alter", "dob_mismatch", "mrz_checksum", "spoof", "pki_forge", "full_counterfeit"]
    for _ in range(forged_total):
        attack = random.choice(attack_types)
        if attack == "photo_swap":
            res = compute_two_stage_risk(
                cv05_photo_splice=True,
                face_sim=random.uniform(0.05, 0.35),
                trufor_score=random.uniform(0.66, 0.95),
                doctamper_score=random.uniform(0.10, 0.30)
            )
        elif attack == "docno_alter":
            res = compute_two_stage_risk(
                cv02_docno_alter=True,
                doctamper_score=random.uniform(0.60, 0.95),
                trufor_score=random.uniform(0.40, 0.80)
            )
        elif attack == "dob_mismatch":
            res = compute_two_stage_risk(
                cv01_dob_mismatch=True,
                doctamper_score=random.uniform(0.65, 0.95)
            )
        elif attack == "mrz_checksum":
            res = compute_two_stage_risk(
                mrz_checksum_fail=True,
                name_sim=random.uniform(0.20, 0.60)
            )
        elif attack == "spoof":
            res = compute_two_stage_risk(
                liveness_score=random.uniform(0.10, 0.45),
                face_sim=random.uniform(0.70, 0.95)
            )
        elif attack == "pki_forge":
            res = compute_two_stage_risk(
                cv08_pki_invalid=True
            )
        else: # full counterfeit
            res = compute_two_stage_risk(
                cv01_dob_mismatch=True,
                cv02_docno_alter=True,
                mrz_checksum_fail=True,
                trufor_score=random.uniform(0.70, 0.99),
                doctamper_score=random.uniform(0.70, 0.99)
            )

        if res["tier"] == "RED" and res["risk_score"] >= 70:
            forged_passes += 1

    print(f"[12] Monte Carlo Forged Documents (N={forged_total}): {forged_passes}/{forged_total} Detected RED ({(forged_passes/forged_total)*100:.2f}%)")
    assert forged_passes == forged_total, f"Forged detection rate {forged_passes}/{forged_total} failed"

    print("=" * 80)
    print("ALL TWO-STAGE RISK ENGINE ADVERSARIAL TESTS PASSED (100% RELIABILITY)!")
    print("=" * 80)


if __name__ == "__main__":
    run_tests()
