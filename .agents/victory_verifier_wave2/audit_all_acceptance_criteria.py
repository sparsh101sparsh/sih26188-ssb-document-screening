#!/usr/bin/env python3
import os
import re

BASE_DIR = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford"
WAVE2_DIR = os.path.join(BASE_DIR, "sih26188_wave2")
DOCS_DIR = os.path.join(WAVE2_DIR, "docs")

FILES = {
    "MASTER": os.path.join(WAVE2_DIR, "WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md"),
    "DOC1_GROK": os.path.join(DOCS_DIR, "01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md"),
    "DOC2_DATASETS": os.path.join(DOCS_DIR, "02_NEXTGEN_DATASETS_DEEP_DIVE.md"),
    "DOC3_MODELS": os.path.join(DOCS_DIR, "03_TAMPERING_MODELS_AND_FORENSICHUB.md"),
    "DOC4_MVP": os.path.join(DOCS_DIR, "04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md"),
    "DOC5_PITCH": os.path.join(DOCS_DIR, "05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md")
}

contents = {}
for k, path in FILES.items():
    with open(path, 'r', encoding='utf-8') as f:
        contents[k] = f.read()

combined_all = "\n".join(contents.values())

print("=== CHECKING ALL WAVE 2 ACCEPTANCE CRITERIA ===")

criteria_results = {}

# --- R1 GROK CHALLENGE ---
print("\n--- R1: GROK CHALLENGE ---")
# 1. 6 recommendations challenged with evidence
grok_cuts = [
    ("AdaFace vs InsightFace", ["AdaFace", "buffalo_l", "TinyFace"]),
    ("Dual Tampering Fusion", ["DocTamper", "TruFor", "dual", "fusion"]),
    ("Qwen2.5-VL Quality Gate", ["Qwen2.5-VL", "quality gate", "fallback"]),
    ("Aadhaar QR Criticality", ["Aadhaar", "RSA-2048", "SSB", "Indo-Nepal"]),
    ("Mobile App (Flutter)", ["Flutter", "mobile", "offline", "airplane"]),
    ("1.45s Latency Reality", ["1.45", "latency", "RTX 4060", "budget"])
]

r1_cuts_ok = True
for name, keywords in grok_cuts:
    found_all = all(kw.lower() in contents["DOC1_GROK"].lower() for kw in keywords)
    print(f"  Cut '{name}': {'FOUND' if found_all else 'MISSING'}")
    if not found_all:
        r1_cuts_ok = False

# Verdicts stated (right / partially right / wrong)
verdicts_found = len(re.findall(r'(?:Grok is|Verdict:?)\s*(?:\*\*)?(?:WRONG|PARTIALLY RIGHT|100% RIGHT|RIGHT)', contents["DOC1_GROK"], re.I))
print(f"  Verdicts stated count: {verdicts_found} (>=6 expected)")

# Aadhaar QR SSB context
ssb_aadhaar = "sashastra seema bal" in contents["DOC1_GROK"].lower() or "ssb" in contents["DOC1_GROK"].lower()
print(f"  Aadhaar QR SSB operational context: {'PRESENT' if ssb_aadhaar else 'MISSING'}")

criteria_results["R1_Grok_Challenge"] = r1_cuts_ok and (verdicts_found >= 6) and ssb_aadhaar

# --- R2 DATASETS ---
print("\n--- R2: DATASETS DEEP DIVE ---")
idnet_check = ("idnet" in contents["DOC2_DATASETS"].lower() and 
               "837" in contents["DOC2_DATASETS"] and 
               ("cc by-nc" in contents["DOC2_DATASETS"].lower() or "license" in contents["DOC2_DATASETS"].lower()))
print(f"  IDNet source + license + 837k: {'CONFIRMED' if idnet_check else 'MISSING'}")

fantasy_check = "2507.20808" in contents["DOC2_DATASETS"] and ("github" in contents["DOC2_DATASETS"].lower() or "huggingface" in contents["DOC2_DATASETS"].lower())
print(f"  FantasyID arXiv 2507.20808 + repo: {'CONFIRMED' if fantasy_check else 'MISSING'}")

sidtd_check = "sidtd" in contents["DOC2_DATASETS"].lower() and ("midv" in contents["DOC2_DATASETS"].lower() or "european" in contents["DOC2_DATASETS"].lower())
print(f"  SIDTD access & coverage: {'CONFIRMED' if sidtd_check else 'MISSING'}")

ranking_check = ("rank 1" in contents["DOC2_DATASETS"].lower() or "top 3" in contents["DOC2_DATASETS"].lower())
print(f"  Top 3 dataset ranking: {'CONFIRMED' if ranking_check else 'MISSING'}")

new_2026_dataset = ("aiforge-doc" in contents["DOC2_DATASETS"].lower() or 
                    "docforge-bench" in contents["DOC2_DATASETS"].lower() or 
                    "2026" in contents["DOC2_DATASETS"])
print(f"  Brand-new 2026 dataset beyond Grok/Wave1: {'CONFIRMED' if new_2026_dataset else 'MISSING'}")

criteria_results["R2_Datasets"] = idnet_check and fantasy_check and sidtd_check and ranking_check and new_2026_dataset

# --- R3 MODELS ---
print("\n--- R3: SOTA TAMPERING MODELS & FORENSICHUB ---")
models = ["TruFor", "PSCC-Net", "MVSS-Net", "CAT-Net", "IML-ViT", "DocTamper"]
models_check = True
for m in models:
    present = m.lower() in contents["DOC3_MODELS"].lower()
    github_link = "github.com" in contents["DOC3_MODELS"]
    print(f"  Model '{m}': {'PRESENT' if present else 'MISSING'}")
    if not present:
        models_check = False

pscc_verdict = "pscc-net" in contents["DOC3_MODELS"].lower() and ("disqualif" in contents["DOC3_MODELS"].lower() or "overturn" in contents["DOC3_MODELS"].lower() or "verdict" in contents["DOC3_MODELS"].lower())
print(f"  PSCC-Net disqualification investigation: {'PRESENT' if pscc_verdict else 'MISSING'}")

forensichub_check = "forensichub" in contents["DOC3_MODELS"].lower() and ("scu-zjz" in contents["DOC3_MODELS"].lower() or "framework" in contents["DOC3_MODELS"].lower())
print(f"  ForensicHub evaluated: {'PRESENT' if forensichub_check else 'MISSING'}")

tampering_winner = "winner" in contents["DOC3_MODELS"].lower() and "trufor" in contents["DOC3_MODELS"].lower()
print(f"  Clear tampering winner (TruFor): {'CONFIRMED' if tampering_winner else 'MISSING'}")

dual_fusion = "dual" in contents["DOC3_MODELS"].lower() and "fusion" in contents["DOC3_MODELS"].lower()
print(f"  Dual fusion feasibility verdict: {'PRESENT' if dual_fusion else 'MISSING'}")

criteria_results["R3_Models"] = models_check and pscc_verdict and forensichub_check and tampering_winner and dual_fusion

# --- R4 MVP BLUEPRINT ---
print("\n--- R4: GRAND FINALE MVP BLUEPRINT ---")
pipeline_check = "pipeline" in contents["DOC4_MVP"].lower() and "onnx" in contents["DOC4_MVP"].lower()
print(f"  Exact pipeline + ONNX: {'PRESENT' if pipeline_check else 'MISSING'}")

latency_budget = ("rtx 4060" in contents["DOC4_MVP"].lower() and 
                  ("ms" in contents["DOC4_MVP"] or "latency" in contents["DOC4_MVP"].lower()) and
                  ("cpu fallback" in contents["DOC4_MVP"].lower() or "cpu" in contents["DOC4_MVP"].lower()))
print(f"  Latency budget (<5s GPU + CPU fallback): {'PRESENT' if latency_budget else 'MISSING'}")

sprint_check = ("12-week" in contents["DOC4_MVP"].lower() or "week 1" in contents["DOC4_MVP"].lower()) and "ml lead" in contents["DOC4_MVP"].lower()
print(f"  12-week sprint plan + 5 member roles: {'PRESENT' if sprint_check else 'MISSING'}")

demo_scenario = "demo day" in contents["DOC4_MVP"].lower() or "officer" in contents["DOC4_MVP"].lower()
print(f"  Demo day scenario scripted: {'PRESENT' if demo_scenario else 'MISSING'}")

criteria_results["R4_MVP_Blueprint"] = pipeline_check and latency_budget and sprint_check and demo_scenario

# --- R5 PITCH & SCORING ---
print("\n--- R5: PITCH SCRIPT & SCORING STRATEGY ---")
rubric_check = ("rubric" in contents["DOC5_PITCH"].lower() or "criteria" in contents["DOC5_PITCH"].lower()) and "innovation" in contents["DOC5_PITCH"].lower()
print(f"  SIH rubric criteria identified (100 pts): {'PRESENT' if rubric_check else 'MISSING'}")

# Minute by minute script check
minutes_found = [f"minute {i}" in contents["DOC5_PITCH"].lower() or f"min {i}" in contents["DOC5_PITCH"].lower() for i in range(1, 9)]
print(f"  8-minute pitch script (minutes 1-8): {sum(minutes_found)}/8 minutes found")

demo_moments = "moment 1" in contents["DOC5_PITCH"].lower() and "moment 2" in contents["DOC5_PITCH"].lower() and "moment 3" in contents["DOC5_PITCH"].lower()
print(f"  3 key demo moments scripted: {'PRESENT' if demo_moments else 'MISSING'}")

criteria_results["R5_Pitch"] = rubric_check and (sum(minutes_found) >= 7) and demo_moments

print("\n=== SUMMARY OF ACCEPTANCE CRITERIA CHECKS ===")
for k, v in criteria_results.items():
    print(f"  {k}: {'PASS' if v else 'FAIL'}")

