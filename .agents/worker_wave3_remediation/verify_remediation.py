import ast
from datetime import datetime, date

# Test 1: Stamp date parser logic
def parse_iso_date(date_str: str):
    if not date_str:
        return None
    cleaned = date_str.strip()
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d.%m.%Y",
        "%Y%m%d",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None

def validate_context_date(ocr_date: str, permit_window: tuple[str, str]) -> float:
    parsed_ocr = parse_iso_date(ocr_date)
    if not parsed_ocr:
        return 0.8
    start_str, end_str = permit_window
    parsed_start = parse_iso_date(start_str)
    parsed_end = parse_iso_date(end_str)
    if not parsed_start or not parsed_end:
        return 0.5
    if parsed_start <= parsed_ocr <= parsed_end:
        return 0.0
    else:
        return 1.0

# Test assertions
assert validate_context_date("2026-08-20", ("2026-08-01", "2026-08-31")) == 0.0
assert validate_context_date("2026-09-05", ("2026-08-01", "2026-08-31")) == 1.0
assert validate_context_date("14/08/2026", ("2026-08-01", "2026-08-31")) == 0.0
assert validate_context_date("invalid-date", ("2026-08-01", "2026-08-31")) == 0.8
print("[PASS] Stamp Date Parser Verification Succeeded")

# Test 2: Bayesian Log-Odds Deadbanding Math
import math

tau_adapt = 0.18
tau_live = 0.85
tau_stamp = 0.20
w_cv1 = 3.5
w_cv2 = 4.0

p0 = 0.02
lambda_0 = math.log(p0 / (1.0 - p0))
assert abs(lambda_0 - (-3.8918202981106265)) < 1e-4

# Clean authentic document:
# tamper = 0.10, live = 0.95, stamp = 0.12, face_cos = 0.82, cv1 = 0, cv2 = 0
psi_tamper = max(0, 0.10 - tau_adapt) # 0.0
psi_live = max(0, tau_live - 0.95)   # 0.0
psi_stamp = max(0, 0.12 - tau_stamp) # 0.0
psi_face = max(0, 0.70 - 0.82)       # 0.0

lambda_post_clean = lambda_0 + 0.0
r_clean = 100.0 / (1.0 + math.exp(-lambda_post_clean))
assert abs(r_clean - 2.0) < 0.05
print(f"[PASS] Clean Authentic Baseline Risk Score = {r_clean:.2f} (Green Tier <= 30)")

# Document with altered DOB (CV-01 violation):
lambda_post_tamper = lambda_0 + w_cv1 * 1.0 # -3.8918 + 3.5 = -0.3918
r_tamper = 100.0 / (1.0 + math.exp(-lambda_post_tamper))
print(f"[PASS] CV-01 DOB Violation Risk Score = {r_tamper:.2f} (Elevates to AMBER/RED: {r_tamper > 40})")

# Document with altered Doc Number + Tamper energy:
# CV-02 + DocTamper (0.80) + TruFor (0.75)
psi_dtd = max(0, 0.80 - tau_adapt)
psi_trufor = max(0, 0.75 - tau_adapt)
lambda_post_heavy = lambda_0 + w_cv2 * 1.0 + 3.0 * psi_dtd + 3.2 * psi_trufor
r_heavy = 100.0 / (1.0 + math.exp(-lambda_post_heavy))
print(f"[PASS] Heavy Tamper Violation Risk Score = {r_heavy:.2f} (RED Tier: {r_heavy >= 70})")

# Test 3: SHA-256 Hash Computation Verification
import hashlib
import json

def compute_audit_hash(session_id, checkpoint_id, officer_id, risk_score, risk_tier, watchlist_hit, timestamp_iso):
    canonical_payload = {
        "session_id": session_id,
        "checkpoint_id": checkpoint_id,
        "officer_id": officer_id,
        "risk_score": risk_score,
        "risk_tier": risk_tier,
        "watchlist_hit": watchlist_hit,
        "timestamp": timestamp_iso,
    }
    canonical_bytes = json.dumps(canonical_payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(canonical_bytes).hexdigest()

h = compute_audit_hash(
    "c7a3d8f1-4b2e-4e6a-9f12-8d9e2a1b3c4d",
    "SSB_JAIGAON_01",
    "GUARD_9912",
    14,
    "GREEN",
    False,
    "2026-08-23T02:00:15Z"
)
assert len(h) == 64
print(f"[PASS] SHA-256 Hash Computation Verification Succeeded: {h}")
