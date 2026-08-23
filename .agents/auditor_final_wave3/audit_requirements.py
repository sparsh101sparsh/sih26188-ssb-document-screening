import os
import re

base_dir = '/Users/iamsparsh00321/teamwork_projects/sih26188_wave3'

print("=== CHECKING SCOPE & REQUIREMENTS ACROSS DELIVERABLES ===", flush=True)

# 1. Check UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md
with open(os.path.join(base_dir, 'UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md'), 'r') as f:
    report = f.read()

print(f"Report length: {len(report.splitlines())} lines, {len(report)} characters.")

# Check Status Annotations
for tag in ['[UPDATED]', '[NEW]', '[UNCHANGED]', '[DEFERRED]']:
    cnt = report.count(tag)
    print(f"  Annotation '{tag}': {cnt} occurrences")

# Check Topics A through K in Report
topics_A_K = [
    ("Topic A (Dev Hardware)", "M4", "RTX 4060"),
    ("Topic B (Qwen2.5-VL)", "Qwen2.5-VL", "quality-gate"),
    ("Topic C (Multilingual OCR)", "Dzongkha", "Devanagari"),
    ("Topic D (MRZ Pipeline)", "OmniMRZ", "Modulo-10"),
    ("Topic E (Stamp Auth)", "Stamp", "SSIM"),
    ("Topic F (3-Stream Architecture)", "3-Stream", "Cross-Validation"),
    ("Topic G (Risk Scoring)", "Tripwire", "Bayesian"),
    ("Topic H (Desktop App)", "Tauri", "FastAPI"),
    ("Topic I (Field Connectivity)", "USB", "adb reverse"),
    ("Topic J (Pretrained vs Training)", "Pretrained", "Inference"),
    ("Topic K (Android Handoff)", "MASTER_PROMPT", "Android")
]

print("\nChecking Topics A-K in UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md:")
for name, k1, k2 in topics_A_K:
    present = (k1.lower() in report.lower()) and (k2.lower() in report.lower())
    print(f"  {name}: {'PRESENT' if present else 'MISSING'}")

# Check Requirements R1 through R5 in ORIGINAL_REQUEST.md
print("\nChecking Requirements R1 through R5 fulfillment:")
# R1: All 3 source files read / analysed
# R2: Adversarial evaluation with web research
# R3: Updated Architecture document at root
# R4: 4 Modular docs in docs/
# R5: Android handoff in android-agent/MASTER_PROMPT.md

modular_docs = [
    'docs/01_CHANGE_LOG_AND_ANALYSIS.md',
    'docs/02_DEPLOYMENT_ENVIRONMENTS.md',
    'docs/03_DESKTOP_APP_ARCHITECTURE.md',
    'docs/04_STAMP_AUTHENTICATION_MODULE.md'
]
for md in modular_docs:
    exists = os.path.exists(os.path.join(base_dir, md))
    sz = os.path.getsize(os.path.join(base_dir, md)) if exists else 0
    print(f"  Modular Doc {md}: {'EXISTS' if exists else 'MISSING'} ({sz} bytes)")

android_doc = 'android-agent/MASTER_PROMPT.md'
exists = os.path.exists(os.path.join(base_dir, android_doc))
sz = os.path.getsize(os.path.join(base_dir, android_doc)) if exists else 0
print(f"  Android Master Prompt {android_doc}: {'EXISTS' if exists else 'MISSING'} ({sz} bytes)")

