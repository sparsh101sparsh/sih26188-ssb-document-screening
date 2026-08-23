import os
import re

doc_files = [
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/02_NEXTGEN_DATASETS_DEEP_DIVE.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md'
]

for f in doc_files:
    fname = os.path.basename(f)
    with open(f, 'r', encoding='utf-8') as fh:
        lines = fh.readlines()
    
    print(f"\n=======================================================")
    print(f"REFERENCES IN {fname}")
    print(f"=======================================================")
    in_ref = False
    ref_lines = []
    for idx, l in enumerate(lines, 1):
        if re.search(r'##.*(?:References|Citations|Bibliography)', l, re.IGNORECASE):
            in_ref = True
        if in_ref:
            ref_lines.append(f"{idx:3d}: {l.strip()}")
            if len(ref_lines) > 40:
                break
    for rl in ref_lines:
        print(rl)

