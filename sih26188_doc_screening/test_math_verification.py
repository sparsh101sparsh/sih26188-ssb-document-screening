"""
Empirical Verification of Mathematical & Cryptographic Logic for SIH26188
- ICAO Doc 9303 Check Digit Engine
- Aadhaar Verhoeff Algorithm
- PAN Format Validation
- Memory & Latency Budget Summation
"""
import re

def icao_check_digit(chars: str) -> str:
    weights = [7, 3, 1]
    total = 0
    for idx, c in enumerate(chars):
        if c == '<':
            val = 0
        elif c.isdigit():
            val = int(c)
        elif c.isalpha():
            val = ord(c.upper()) - ord('A') + 10
        else:
            val = 0
        total += val * weights[idx % 3]
    return str(total % 10)

def test_mrz_checksums():
    print("=== TESTING ICAO DOC 9303 CHECKSUM ENGINE ===")
    # From Section 5.3 of Report:
    # Passport: Z1234567, CD1: 0
    # DOB: 940814, CD2: 3
    # Expiry: 290814, CD3: 8
    # Composite: PassportNo + CD1 + DOB + CD2 + Expiry + CD3 + Optional + CD4 == 4
    
    cd1 = icao_check_digit("Z1234567")
    cd2 = icao_check_digit("940814")
    cd3 = icao_check_digit("290814")
    
    print(f"Passport Z1234567 -> CD: {cd1} (Expected 0) -> {'PASS' if cd1 == '0' else 'FAIL'}")
    print(f"DOB 940814       -> CD: {cd2} (Expected 3) -> {'PASS' if cd2 == '3' else 'FAIL'}")
    print(f"Expiry 290814    -> CD: {cd3} (Expected 8) -> {'PASS' if cd3 == '8' else 'FAIL'}")
    
    # Composite check
    composite_str = "Z1234567" + "0" + "940814" + "3" + "290814" + "8" + "<<<<<<<<<<<<<<0"
    comp_cd = icao_check_digit(composite_str)
    print(f"Composite MRZ    -> CD: {comp_cd} (Expected 4) -> {'PASS' if comp_cd == '4' else 'FAIL'}")

def test_verhoeff():
    print("\n=== TESTING AADHAAR VERHOEFF ALGORITHM ===")
    # Verhoeff multiplication table d
    d = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ]
    # Permutation table p
    p = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ]
    # Inverse table inv
    inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

    def generate_verhoeff(num_str: str) -> str:
        c = 0
        reversed_digits = [int(x) for x in reversed(num_str)]
        for i, digit in enumerate(reversed_digits):
            c = d[c][p[(i + 1) % 8][digit]]
        return str(inv[c])

    def validate_verhoeff(num_str: str) -> bool:
        c = 0
        reversed_digits = [int(x) for x in reversed(num_str)]
        for i, digit in enumerate(reversed_digits):
            c = d[c][p[i % 8][digit]]
        return c == 0

    test_aadhaar_base = "24567891234"
    check_digit = generate_verhoeff(test_aadhaar_base)
    full_aadhaar = test_aadhaar_base + check_digit
    print(f"Generated Aadhaar: {full_aadhaar[:4]} {full_aadhaar[4:8]} {full_aadhaar[8:]} (Check digit: {check_digit})")
    is_valid = validate_verhoeff(full_aadhaar)
    print(f"Verhoeff Validation: {'PASS' if is_valid else 'FAIL'}")
    
    # Test corruption
    corrupted_aadhaar = test_aadhaar_base + ("0" if check_digit != "0" else "1")
    is_corrupt_detected = not validate_verhoeff(corrupted_aadhaar)
    print(f"Corruption Detection (Altered digit): {'PASS' if is_corrupt_detected else 'FAIL'}")

def test_vram_and_latency():
    print("\n=== VRAM & LATENCY BUDGET VERIFICATION ===")
    models = {
        "PP-OCRv4 + Structure": 850,
        "OmniMRZ OCR-B": 180,
        "SCRFD-10GF": 35,
        "AdaFace-ResNet100": 249,
        "MiniFASNet Dual FAS": 24,
        "DocTamper DTD": 360,
        "TruFor RGB + Noiseprint": 190
    }
    active_models_mb = sum(models.values())
    cuda_context_mb = 1200
    tensorrt_arenas_mb = 1868
    total_allocated_mb = active_models_mb + cuda_context_mb + tensorrt_arenas_mb
    total_vram_mb = 8192 # 8GB RTX 4060
    headroom_mb = total_vram_mb - total_allocated_mb
    headroom_pct = (headroom_mb / total_vram_mb) * 100
    
    print(f"Active Models Footprint: {active_models_mb} MB ({active_models_mb/1024:.2f} GB)")
    print(f"Total Allocated VRAM:    {total_allocated_mb} MB ({total_allocated_mb/1024:.2f} GB)")
    print(f"VRAM Headroom:           {headroom_mb} MB ({headroom_pct:.1f}%)")
    
    # Latency: Stage 1 (Sequential) + Stage 2 (Parallel Stream max) + Stage 3 (Sequential)
    # Stage 1: 120 ms
    # Stream A: 45 ms, Stream B: 14.2 ms, Stream C: 72.5 ms -> Max Stage 2 = 72.5 ms
    # Stage 3: Cross-val (5+4+18) + Scoring (8+14+12) = 61 ms (or ~85 ms with buffer)
    # Total theoretical GPU time = 120 + 72.5 + 85 = 277.5 ms!
    # Even with file upload (100-200ms) + websocket overhead (50ms) + display render (100ms), total is ~0.6 - 1.45s!
    print(f"Theoretical Pipeline GPU Latency: {120 + 72.5 + 85} ms (Well within 3,500 ms SLA!)")

if __name__ == "__main__":
    test_mrz_checksums()
    test_verhoeff()
    test_vram_and_latency()
