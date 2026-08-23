#!/usr/bin/env python3
import zlib
import numpy as np
import cv2

print("=== TESTING RUNNABLE ALGORITHMIC CODE SNIPPETS ===")

# Test 1: Aadhaar Secure QR Code Decompression & Parsing Logic
print("\n[Test 1] Aadhaar Secure QR Code Parser Logic:")

def parse_aadhaar_qr_bytes(decompressed_bytes: bytes):
    """
    Simulates parsing 256-byte signature + 16 null-delimited fields + JPEG photo
    """
    assert len(decompressed_bytes) >= 256, "Bytes too short for RSA-2048 signature"
    signature = decompressed_bytes[:256]
    data = decompressed_bytes[256:]
    
    # Split fields by null delimiter (delimiter 255/0xFF or 0x00)
    # The blueprint notes standard UIDAI V2 byte 255 delimiter
    parts = data.split(b'\xff', 16)
    return {
        "signature_len": len(signature),
        "field_count": len(parts) - 1,
        "photo_bytes_len": len(parts[-1]) if len(parts) == 17 else 0
    }

# Construct synthetic QR byte buffer
fake_sig = b'\x00' * 256
fields = [
    b'V2', b'123456789012', b'Rajesh Kumar', b'01-01-1985', b'M',
    b'S/O Ramesh Kumar', b'House 123', b'Sector 4', b'VPO Central',
    b'Gurugram', b'Gurgaon', b'Haryana', b'122001', b'9876543210',
    b'rajesh@example.com', b'2026-08-22'
]
fake_photo = b'\xff\xd8\xff\xe0' + b'\x00'*500 + b'\xff\xd9' # Minimal JPEG marker
raw_data = fake_sig + b'\xff'.join(fields) + b'\xff' + fake_photo

res = parse_aadhaar_qr_bytes(raw_data)
print("  Aadhaar QR Parser Result:", res)
assert res["signature_len"] == 256
assert res["field_count"] == 16
assert res["photo_bytes_len"] == len(fake_photo)
print("  [PASS] Aadhaar QR Parser logic operates accurately!")

# Test 2: Dynamic Exponential Otsu Calibration
print("\n[Test 2] Dynamic Exponential Otsu Calibration:")

def calibrate_tampering_mask(
    prob_map: np.ndarray, 
    reliability_map: np.ndarray, 
    min_tau: float = 0.15, 
    max_tau: float = 0.45
) -> tuple[np.ndarray, float, float]:
    """
    Computes reliability-weighted adaptive threshold for small text forgeries
    """
    # Clip and weight
    weighted_prob = prob_map * reliability_map
    
    # Calculate Otsu threshold on non-zero reliability pixels
    valid_pixels = weighted_prob[reliability_map > 0.1]
    if len(valid_pixels) == 0:
        return np.zeros_like(prob_map, dtype=np.uint8), max_tau, 0.0
    
    # Scale to 0-255 uint8 for Otsu
    p_uint8 = (valid_pixels * 255).astype(np.uint8)
    otsu_thresh_val, _ = cv2.threshold(p_uint8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    base_tau = otsu_thresh_val / 255.0
    
    # Area-based exponential modulation
    # Small area forgeries have high local intensity but low spatial coverage
    high_prob_ratio = float(np.mean(prob_map > 0.35))
    k_exp = 3.5
    calibrated_tau = min_tau + (base_tau - min_tau) * np.exp(-k_exp * high_prob_ratio)
    calibrated_tau = float(np.clip(calibrated_tau, min_tau, max_tau))
    
    binary_mask = (prob_map >= calibrated_tau).astype(np.uint8) * 255
    return binary_mask, calibrated_tau, high_prob_ratio

# Create synthetic prob map (e.g. 512x512 with a small forged text patch of 20x100 pixels)
synthetic_prob = np.zeros((512, 512), dtype=np.float32)
synthetic_prob[100:120, 200:300] = 0.85 # Tampered field
synthetic_rel = np.ones((512, 512), dtype=np.float32) * 0.95

mask, tau, ratio = calibrate_tampering_mask(synthetic_prob, synthetic_rel)
print(f"  Calibrated Tau: {tau:.4f}, Tampered Area Ratio: {ratio:.6f}, Detected Tampered Pixels: {np.sum(mask > 0)}")
assert np.sum(mask[100:120, 200:300] > 0) == 20 * 100
assert np.sum(mask[0:50, 0:50] > 0) == 0
print("  [PASS] Dynamic Exponential Otsu correctly segments small text forgery!")

# Test 3: Officer Heatmap Overlay
print("\n[Test 3] Officer Heatmap Overlay Generation:")

def generate_officer_heatmap_overlay(
    original_bgr: np.ndarray, 
    tamper_prob_map: np.ndarray, 
    alpha: float = 0.55
) -> np.ndarray:
    prob_scaled = (np.clip(tamper_prob_map, 0.0, 1.0) * 255).astype(np.uint8)
    heatmap_color = cv2.applyColorMap(prob_scaled, cv2.COLORMAP_JET)
    overlay = cv2.addWeighted(heatmap_color, alpha, original_bgr, 1.0 - alpha, 0)
    return overlay

dummy_doc = np.ones((512, 512, 3), dtype=np.uint8) * 200
overlay_res = generate_officer_heatmap_overlay(dummy_doc, synthetic_prob)
print("  Overlay shape:", overlay_res.shape, "dtype:", overlay_res.dtype)
assert overlay_res.shape == (512, 512, 3)
assert overlay_res.dtype == np.uint8
print("  [PASS] Heatmap overlay generation runs perfectly!")

# Test 4: Cosine Similarity Metric for Biometrics
print("\n[Test 4] Biometric Cosine Similarity & Match Scoring:")

def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(emb1, emb2) / (norm1 * norm2))

emb_live = np.random.randn(512).astype(np.float32)
emb_doc_match = emb_live + np.random.randn(512).astype(np.float32) * 0.05
emb_doc_impostor = np.random.randn(512).astype(np.float32)

sim_match = cosine_similarity(emb_live, emb_doc_match)
sim_impostor = cosine_similarity(emb_live, emb_doc_impostor)

print(f"  Match Cosine Sim: {sim_match:.4f} (Threshold ~0.38 AdaFace)")
print(f"  Impostor Cosine Sim: {sim_impostor:.4f}")
assert sim_match > 0.70
assert sim_impostor < 0.30
print("  [PASS] Biometric embedding similarity metric validated!")

print("\n=== ALL ALGORITHMIC IMPLEMENTATIONS VERIFIED AND OPERATIONAL ===")
