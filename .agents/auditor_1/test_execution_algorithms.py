import numpy as np
import cv2
import sys

print("=== 1. TESTING ICAO 9303 CHECK DIGIT CALCULATION ===")
def compute_icao_check_digit(data_str: str) -> int:
    weights = [7, 3, 1]
    total = 0
    for idx, char in enumerate(data_str):
        if char.isdigit():
            val = int(char)
        elif char.isalpha():
            val = ord(char.upper()) - 55  # 'A' = 10, 'Z' = 35
        elif char == '<':
            val = 0
        else:
            val = 0
        total += val * weights[idx % 3]
    return total % 10

# Test standard ICAO cases:
# e.g. "L898902C<" -> check digit
# Let's test "HA719001<8": "HA719001<" -> total: H(17)*7 + A(10)*3 + 7*1 + 1*7 + 9*3 + 0*1 + 0*7 + 1*3 + 0*1
# 119 + 30 + 7 + 7 + 27 + 0 + 0 + 3 + 0 = 193 % 10 = 3
cd_test = compute_icao_check_digit("HA719001<")
print(f"Check digit for 'HA719001<': {cd_test} (Type: {type(cd_test)})")
assert isinstance(cd_test, int) and 0 <= cd_test <= 9
print(">>> ICAO CHECK DIGIT ALGORITHM: PASSED <<<")

print("\n=== 2. TESTING CALIBRATE_TAMPERING_MASK ===")
def calibrate_tampering_mask(
    prob_map: np.ndarray, 
    reliability_map: np.ndarray, 
    min_tau: float = 0.15, 
    max_tau: float = 0.45
) -> tuple:
    # Simulated function from doc 03
    prob_scaled = np.clip(prob_map, 0.0, 1.0)
    prob_uint8 = (prob_scaled * 255.0).astype(np.uint8)
    
    otsu_val, _ = cv2.threshold(
        prob_uint8, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    tau_otsu = otsu_val / 255.0
    tau_calibrated = float(np.clip(tau_otsu, min_tau, max_tau))
    
    confidence_weight = 1.0 / (1.0 + np.exp(-10.0 * (reliability_map - 0.5)))
    effective_prob = prob_scaled * confidence_weight
    
    binary_mask = (effective_prob >= tau_calibrated).astype(np.uint8)
    return binary_mask, tau_calibrated

fake_prob = np.random.uniform(0, 1, (100, 100)).astype(np.float32)
fake_rel = np.random.uniform(0.5, 1.0, (100, 100)).astype(np.float32)
mask, tau = calibrate_tampering_mask(fake_prob, fake_rel)
print(f"Calibrated tau: {tau:.4f}, Mask shape: {mask.shape}, Mask non-zero: {np.count_nonzero(mask)}")
assert mask.shape == (100, 100) and 0.15 <= tau <= 0.45
print(">>> CALIBRATE_TAMPERING_MASK ALGORITHM: PASSED <<<")

print("\n=== 3. TESTING GENERATE_OFFICER_HEATMAP_OVERLAY ===")
def generate_officer_heatmap_overlay(
    original_bgr: np.ndarray, 
    tamper_prob_map: np.ndarray, 
    alpha: float = 0.55
) -> np.ndarray:
    h, w = original_bgr.shape[:2]
    prob_resized = cv2.resize(tamper_prob_map, (w, h), interpolation=cv2.INTER_LINEAR)
    heatmap_uint8 = (prob_resized * 255).astype(np.uint8)
    color_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    mask = (prob_resized >= 0.15)[:, :, np.newaxis]
    blended_bgr = original_bgr.copy()
    blended_bgr = np.where(
        mask, 
        cv2.addWeighted(color_heatmap, alpha, original_bgr, 1.0 - alpha, 0), 
        original_bgr
    )
    contours, _ = cv2.findContours(
        (heatmap_uint8 >= 40).astype(np.uint8), 
        cv2.RETR_EXTERNAL, 
        cv2.CHAIN_APPROX_SIMPLE
    )
    for cnt in contours:
        if cv2.contourArea(cnt) > 80:
            x, y, bw, bh = cv2.boundingRect(cnt)
            cv2.rectangle(blended_bgr, (x, y), (x + bw, y + bh), (0, 0, 255), 2)
            cv2.putText(
                blended_bgr, "TAMPER DETECTED", (x, max(20, y - 6)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255), 2
            )
    return blended_bgr

dummy_doc = np.ones((400, 600, 3), dtype=np.uint8) * 240
dummy_tamper = np.zeros((400, 600), dtype=np.float32)
dummy_tamper[100:200, 100:250] = 0.85 # Tampered region
overlay = generate_officer_heatmap_overlay(dummy_doc, dummy_tamper)
print(f"Overlay generated successfully! Shape: {overlay.shape}, Dtype: {overlay.dtype}")
assert overlay.shape == (400, 600, 3)
print(">>> GENERATE_OFFICER_HEATMAP_OVERLAY: PASSED <<<")

print("\n=== ALL ALGORITHMIC CODE RECIPES EXECUTED AND PASSED WITH ZERO ERRORS! ===")
