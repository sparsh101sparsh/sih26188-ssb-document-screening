import os, re

files = [
    'sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md',
    'sih26188_wave2/docs/01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md',
    'sih26188_wave2/docs/02_NEXTGEN_DATASETS_DEEP_DIVE.md',
    'sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md',
    'sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md',
    'sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md'
]

print("=== CHECKING FOR TRUNCATION OR PLACEHOLDERS ===")
for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        lines = fp.readlines()
    print(f"{f}: {len(lines)} lines")
    # Check last 10 lines of each file to ensure clean endings
    print(f"  Last 3 lines: {[l.strip() for l in lines[-3:] if l.strip()]}")

print("\n=== CHECKING LATENCY NUMBERS IN MASTER BLUEPRINT ===")
with open('sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md') as f:
    text = f.read()

lat_matches = re.findall(r'(\d+(?:\.\d+)?\s*(?:ms|seconds|s))\b', text, re.IGNORECASE)
print(f"Latency mentions sample: {lat_matches[:10]}")

