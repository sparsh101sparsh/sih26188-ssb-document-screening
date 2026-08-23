#!/usr/bin/env python3
import os
import re
import ast
import json
import time

BASE_DIR = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford"
WAVE2_DIR = os.path.join(BASE_DIR, "sih26188_wave2")
DOCS_DIR = os.path.join(WAVE2_DIR, "docs")

FILES = [
    os.path.join(WAVE2_DIR, "WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md"),
    os.path.join(DOCS_DIR, "01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md"),
    os.path.join(DOCS_DIR, "02_NEXTGEN_DATASETS_DEEP_DIVE.md"),
    os.path.join(DOCS_DIR, "03_TAMPERING_MODELS_AND_FORENSICHUB.md"),
    os.path.join(DOCS_DIR, "04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md"),
    os.path.join(DOCS_DIR, "05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md")
]

print("=== STARTING VICTORY AUDITOR VERIFICATION SUITE ===")
print(f"Timestamp: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")

# 1. File existence & basic metrics
print("\n--- PHASE 1: DELIVERABLE METRICS & FILE CHECK ---")
all_exist = True
total_lines = 0
total_bytes = 0

for fpath in FILES:
    if os.path.exists(fpath):
        size = os.path.getsize(fpath)
        with open(fpath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        line_count = len(lines)
        total_lines += line_count
        total_bytes += size
        rel_path = os.path.relpath(fpath, BASE_DIR)
        print(f"  [OK] {rel_path} | Lines: {line_count:4d} | Size: {size:6d} bytes")
    else:
        print(f"  [MISSING] {fpath}")
        all_exist = False

print(f"Total Deliverable Lines: {total_lines}")
print(f"Total Deliverable Size: {total_bytes} bytes ({total_bytes/1024:.2f} KB)")

# 2. Forensic Integrity & Placeholder Scan
print("\n--- PHASE 2: FORENSIC INTEGRITY & PLACEHOLDER SCAN ---")
forbidden_patterns = [
    (r'\bTODO\b', 'TODO placeholder'),
    (r'\bTBD\b', 'TBD placeholder'),
    (r'\bFIXME\b', 'FIXME marker'),
    (r'\bXXX\b', 'XXX marker'),
    (r'\[insert\b', 'Unfilled template [insert...]'),
    (r'\[add\b', 'Unfilled template [add...]'),
    (r'\[placeholder\b', 'Placeholder marker')
]

placeholder_findings = []
for fpath in FILES:
    fname = os.path.basename(fpath)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()
        for idx, line in enumerate(lines, 1):
            for pat, desc in forbidden_patterns:
                # ignore case-insensitive if in comments or text
                if re.search(pat, line, re.IGNORECASE):
                    # Check if it's legit mention (e.g. TODO in text explanation vs placeholder)
                    # Let's inspect
                    placeholder_findings.append((fname, idx, desc, line.strip()))

if not placeholder_findings:
    print("  [PASS] Zero prohibited placeholders or unexpanded templates found across all 6 deliverables!")
else:
    print(f"  [WARN/FAIL] Found {len(placeholder_findings)} potential placeholders:")
    for fn, ln, desc, text in placeholder_findings:
        print(f"    {fn}:{ln} [{desc}] -> {text[:80]}")

# 3. AST Python Code Extraction & Parsing
print("\n--- PHASE 3: PYTHON CODE BLOCKS AST SYNTAX AUDIT ---")
py_code_blocks = []

code_block_pattern = re.compile(r'```(?:python|py)\n(.*?)```', re.DOTALL)

total_snippets = 0
valid_snippets = 0
invalid_snippets = []

for fpath in FILES:
    fname = os.path.basename(fpath)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = code_block_pattern.findall(content)
    for i, code in enumerate(matches, 1):
        total_snippets += 1
        # Try AST parse
        try:
            ast.parse(code)
            valid_snippets += 1
            # print(f"    {fname} snippet #{i}: VALID")
        except SyntaxError as e:
            invalid_snippets.append((fname, i, str(e), code))

print(f"Total Python Snippets Extracted: {total_snippets}")
print(f"Valid Python AST Snippets: {valid_snippets}")
if invalid_snippets:
    print(f"  [FAIL] {len(invalid_snippets)} Syntax Errors found in Python snippets:")
    for fn, idx, err, code in invalid_snippets:
        print(f"    {fn} snippet #{idx} Error: {err}")
        print("    Code preview:\n" + "\n".join("      " + l for l in code.splitlines()[:10]))
else:
    print("  [PASS] 100% of Python code blocks are syntactically valid AST!")

# 4. Latency Budget and Arithmetic Verification
print("\n--- PHASE 4: LATENCY BUDGET ARITHMETIC AUDIT ---")
# Let's check latency tables in 01, 04, and master doc

with open(os.path.join(DOCS_DIR, "04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md"), 'r', encoding='utf-8') as f:
    bp_content = f.read()

# Check latency budget numbers
print("Auditing 04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md latency table...")
# Let's extract numbers from table
# Stage, Component, Device/Precision, RTX 4060 GPU Latency, CPU Fallback Latency, VRAM Footprint
# Let's verify sum of sequential and parallel latency

