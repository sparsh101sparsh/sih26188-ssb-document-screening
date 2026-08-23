#!/usr/bin/env python3
import os
import re
import math
import zlib
import json

print("=== RUNNING PURE PYTHON ALGORITHMIC & LOGICAL VERIFICATIONS ===")

# --- 1. Aadhaar QR Code Decompression & Parsing ---
print("\n[Algorithm 1] Aadhaar Secure QR Byte Parsing & Signature Slicing:")

def parse_aadhaar_qr_bytes(decompressed_bytes: bytes):
    assert len(decompressed_bytes) >= 256, "Buffer too small for 2048-bit (256-byte) RSA signature"
    signature = decompressed_bytes[:256]
    data = decompressed_bytes[256:]
    
    # Split by byte 255 (0xFF)
    parts = data.split(b'\xff', 16)
    return {
        "signature_len": len(signature),
        "field_count": len(parts) - 1,
        "photo_bytes_len": len(parts[-1]) if len(parts) == 17 else 0,
        "fields": [p.decode('utf-8', errors='ignore') for p in parts[:-1]]
    }

# Synthetic QR byte buffer
fake_sig = b'\x12' * 256
fields = [
    b'V2', b'123456789012', b'Rajesh Kumar', b'01-01-1985', b'M',
    b'S/O Ramesh Kumar', b'House 123', b'Sector 4', b'VPO Central',
    b'Gurugram', b'Gurgaon', b'Haryana', b'122001', b'9876543210',
    b'rajesh@example.com', b'2026-08-22'
]
fake_photo = b'\xff\xd8\xff\xe0' + b'\x00'*500 + b'\xff\xd9'
raw_qr_payload = fake_sig + b'\xff'.join(fields) + b'\xff' + fake_photo

parsed_res = parse_aadhaar_qr_bytes(raw_qr_payload)
print(f"  Signature bytes: {parsed_res['signature_len']}")
print(f"  Field count: {parsed_res['field_count']}")
print(f"  Photo bytes: {parsed_res['photo_bytes_len']}")
print(f"  Sample Extracted Name: {parsed_res['fields'][2]}")
assert parsed_res["signature_len"] == 256
assert parsed_res["field_count"] == 16
assert parsed_res["fields"][2] == "Rajesh Kumar"
assert parsed_res["photo_bytes_len"] == len(fake_photo)
print("  -> [PASS] Aadhaar QR Parser logic strictly verified!")

# --- 2. Dynamic Exponential Otsu Calibration Math ---
print("\n[Algorithm 2] Dynamic Exponential Otsu Mathematical Verification:")

def compute_otsu_threshold(probabilities: list[float], bins: int = 256) -> float:
    hist = [0] * bins
    for p in probabilities:
        b = min(bins - 1, max(0, int(p * (bins - 1))))
        hist[b] += 1
    total = len(probabilities)
    if total == 0:
        return 0.5
    
    current_max = 0.0
    threshold = 0
    sum_total = sum(i * hist[i] for i in range(bins))
    sum_b = 0
    w_b = 0
    
    for t in range(bins):
        w_b += hist[t]
        if w_b == 0:
            continue
        w_f = total - w_b
        if w_f == 0:
            break
        sum_b += t * hist[t]
        m_b = sum_b / w_b
        m_f = (sum_total - sum_b) / w_f
        between_var = w_b * w_f * (m_b - m_f) ** 2
        if between_var > current_max:
            current_max = between_var
            threshold = t
            
    return threshold / (bins - 1)

def calibrate_tau(base_tau: float, high_prob_ratio: float, min_tau=0.15, max_tau=0.45, k_exp=3.5) -> float:
    calibrated = min_tau + (base_tau - min_tau) * math.exp(-k_exp * high_prob_ratio)
    return max(min_tau, min(max_tau, calibrated))

# Test with high-confidence small forged area (0.5% of pixels forged at p=0.9, rest at p=0.05)
probs = [0.05] * 995 + [0.90] * 5
otsu_t = compute_otsu_threshold(probs)
ratio = sum(1 for p in probs if p > 0.35) / len(probs)
tau_calibrated = calibrate_tau(otsu_t, ratio)

print(f"  Base Otsu Tau: {otsu_t:.4f}")
print(f"  Forged Pixel Ratio: {ratio:.4f}")
print(f"  Calibrated Tau: {tau_calibrated:.4f}")
assert tau_calibrated <= otsu_t, "Calibrated threshold must adaptively lower for small text forgeries"
print("  -> [PASS] Dynamic Exponential Otsu formulation strictly verified!")

# --- 3. Cosine Similarity Math ---
print("\n[Algorithm 3] Cosine Similarity Vector Math:")

def dot_product(v1, v2):
    return sum(a * b for a, b in zip(v1, v2))

def norm(v):
    return math.sqrt(sum(a * a for a in v))

def cosine_sim(v1, v2):
    n1, n2 = norm(v1), norm(v2)
    if n1 == 0 or n2 == 0:
        return 0.0
    return dot_product(v1, v2) / (n1 * n2)

v_live = [1.0, 2.0, 3.0, 4.0]
v_doc_match = [1.05, 1.98, 3.02, 3.95]
v_impostor = [-1.0, 0.5, -2.0, 1.0]

sim_m = cosine_sim(v_live, v_doc_match)
sim_i = cosine_sim(v_live, v_impostor)
print(f"  Match similarity: {sim_m:.4f} (Expected > 0.99)")
print(f"  Impostor similarity: {sim_i:.4f} (Expected < 0.20)")
assert sim_m > 0.99
assert sim_i < 0.20
print("  -> [PASS] Vector similarity mathematics verified!")

print("\n=== ALL CORE ALGORITHMIC LOGIC PASSES RIGOROUSLY ===")
