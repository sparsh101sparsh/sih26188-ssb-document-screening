#!/usr/bin/env python3
import os
import re

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

arxiv_pattern = re.compile(r'arXiv:(\d{4}\.\d{4,5})', re.IGNORECASE)
github_pattern = re.compile(r'https?://github\.com/([a-zA-Z0-9_\-]+/[a-zA-Z0-9_\.\-]+)', re.IGNORECASE)

all_arxiv = set()
all_github = set()

for fpath in FILES:
    with open(fpath) as f:
        text = f.read()
    arx = arxiv_pattern.findall(text)
    gh = github_pattern.findall(text)
    for a in arx:
        all_arxiv.add(a)
    for g in gh:
        # clean trailing punctuation
        g_clean = g.rstrip('.)],`')
        all_github.add(g_clean)

print("=== CITATION & REPOSITORY AUDIT ===")
print(f"Total Unique arXiv Papers Cited: {len(all_arxiv)}")
for a in sorted(all_arxiv):
    print(f"  • arXiv:{a}")

print(f"\nTotal Unique GitHub Repositories Cited: {len(all_github)}")
for g in sorted(all_github):
    print(f"  • https://github.com/{g}")

