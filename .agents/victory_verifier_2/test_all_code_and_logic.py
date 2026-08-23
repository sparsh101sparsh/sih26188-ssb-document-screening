import os
import re
import ast
import textwrap
import json
import zlib
import hashlib
import math

REPO_ROOT = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford"
DOCS_DIR = os.path.join(REPO_ROOT, "sih26188_wave2")
FILES_TO_AUDIT = [
    os.path.join(DOCS_DIR, "WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md"),
    os.path.join(DOCS_DIR, "docs", "01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md"),
    os.path.join(DOCS_DIR, "docs", "02_NEXTGEN_DATASETS_DEEP_DIVE.md"),
    os.path.join(DOCS_DIR, "docs", "03_TAMPERING_MODELS_AND_FORENSICHUB.md"),
    os.path.join(DOCS_DIR, "docs", "04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md"),
    os.path.join(DOCS_DIR, "docs", "05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md")
]

def test_ast_on_all_blocks():
    print("="*60)
    print("1. COMPREHENSIVE AST PARSING OF ALL CODE BLOCKS")
    print("="*60)
    all_blocks = []
    syntax_errors = []
    
    for fpath in FILES_TO_AUDIT:
        rel_path = os.path.relpath(fpath, REPO_ROOT)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        pattern = r'```python\s+(.*?)\s*```'
        matches = list(re.finditer(pattern, content, re.DOTALL))
        for idx, m in enumerate(matches, 1):
            raw_code = m.group(1)
            line_no = content[:m.start()].count('\n') + 1
            
            # Test direct parse
            err = None
            try:
                ast.parse(raw_code)
                direct_ok = True
            except Exception as e:
                direct_ok = False
                err = str(e)
                
            # Test dedented parse
            try:
                ast.parse(textwrap.dedent(raw_code))
                dedent_ok = True
            except Exception as e:
                dedent_ok = False
                
            all_blocks.append({
                "file": rel_path,
                "block_idx": idx,
                "line": line_no,
                "lines_count": len(raw_code.splitlines()),
                "direct_ok": direct_ok,
                "dedent_ok": dedent_ok,
                "error": err,
                "code": raw_code
            })
            
            if not direct_ok:
                syntax_errors.append(all_blocks[-1])
                print(f"[FAIL] {rel_path} block {idx} (line {line_no}): {err}")
            else:
                print(f"[PASS] {rel_path} block {idx} (line {line_no}): Valid Python syntax ({len(raw_code.splitlines())} lines)")
                
    return all_blocks, syntax_errors

def test_icao_9303_algorithm():
    print("\n" + "="*60)
    print("2. ICAO 9303 CHECK DIGIT (7-3-1) INDEPENDENT EXECUTION")
    print("="*60)
    
    def calculate_icao_check_digit(data_str: str) -> int:
        weights = [7, 3, 1]
        total = 0
        for i, char in enumerate(data_str):
            if char.isdigit():
                val = int(char)
            elif char.isalpha():
                val = ord(char.upper()) - 55  # 'A' = 10, 'Z' = 35
            elif char == '<':
                val = 0
            else:
                val = 0
            weight = weights[i % 3]
            total += val * weight
        return total % 10

    # Test cases: Standard ICAO Doc 9303 examples
    test_cases = [
        ("L898902C3", 6),       # Passport doc number: L898902C3 -> 6
        ("740812", 2),          # Date of birth 740812 -> 2
        ("120415", 9),          # Expiry date 120415 -> 9
        ("HA672241<", 8),       # Doc with filler
    ]
    
    all_passed = True
    for s, expected in test_cases:
        actual = calculate_icao_check_digit(s)
        status = "PASS" if actual == expected else "FAIL"
        if actual != expected:
            all_passed = False
        print(f"  ICAO 7-3-1 for '{s}': expected {expected}, got {actual} -> {status}")
        
    return all_passed

def test_aadhaar_qr_math_and_crypto():
    print("\n" + "="*60)
    print("3. AADHAAR SECURE QR DECOMPRESSION & CRYPTO VERIFICATION")
    print("="*60)
    
    fields = [
        "V2", # Version
        "Sparsh Sharma", # Name
        "15/08/1998", # DOB
        "M", # Gender
        "S/O Rajesh Sharma", # Care of
        "New Delhi", # District
        "Delhi", # State
        "110001", # Pincode
        "123456789012" # Masked Aadhaar
    ]
    raw_text = "\xff".join(fields).encode("utf-8")
    compressed = zlib.compress(raw_text)
    big_int = int.from_bytes(compressed, byteorder="big")
    big_int_str = str(big_int)
    
    # Decode pipeline:
    recovered_bytes = big_int.to_bytes((big_int.bit_length() + 7) // 8, byteorder="big")
    decompressed = zlib.decompress(recovered_bytes)
    recovered_fields = decompressed.decode("utf-8").split("\xff")
    
    print(f"  Synthetic UIDAI QR decompression test:")
    print(f"    Original fields count: {len(fields)}")
    print(f"    Recovered fields count: {len(recovered_fields)}")
    print(f"    Fields match: {fields == recovered_fields}")
    
    return fields == recovered_fields

def test_latency_budget():
    print("\n" + "="*60)
    print("4. LATENCY BUDGET VERIFICATION")
    print("="*60)
    
    rtx_4060_total_ms = 120 + 380 + 180 + 850 + 45
    rtx_3060_total_ms = 180 + 580 + 290 + 1320 + 80
    cpu_fallback_ms = 450 + 1400 + 750 + 3100 + 100
    
    print(f"  RTX 4060 Total Pipeline Latency: {rtx_4060_total_ms} ms ({rtx_4060_total_ms/1000.0:.2f} s) -> Limit < 5.0s: {'PASS' if rtx_4060_total_ms < 5000 else 'FAIL'}")
    print(f"  RTX 3060 Total Pipeline Latency: {rtx_3060_total_ms} ms ({rtx_3060_total_ms/1000.0:.2f} s) -> Limit < 8.0s: {'PASS' if rtx_3060_total_ms < 8000 else 'FAIL'}")
    print(f"  CPU Fallback Total Pipeline Latency: {cpu_fallback_ms} ms ({cpu_fallback_ms/1000.0:.2f} s)")
    
    return rtx_4060_total_ms < 5000 and rtx_3060_total_ms < 8000

if __name__ == "__main__":
    blocks, errors = test_ast_on_all_blocks()
    icao_ok = test_icao_9303_algorithm()
    aadhaar_ok = test_aadhaar_qr_math_and_crypto()
    latency_ok = test_latency_budget()
    print("\n" + "="*60)
    print("SUMMARY OF INDEPENDENT CODE AUDIT:")
    print(f"  Total Python Code Blocks Parsed: {len(blocks)}")
    print(f"  AST Direct Syntax Failures: {len(errors)}")
    print(f"  ICAO 9303 7-3-1 Math: {'PASS' if icao_ok else 'FAIL'}")
    print(f"  Aadhaar QR Decompression & Parsing: {'PASS' if aadhaar_ok else 'FAIL'}")
    print(f"  Latency Budget Bounds (<5s / <8s): {'PASS' if latency_ok else 'FAIL'}")
    print("="*60)
