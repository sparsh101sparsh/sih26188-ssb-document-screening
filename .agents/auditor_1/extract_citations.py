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

arxiv_ids = set()
github_urls = set()
huggingface_urls = set()
paper_citations = []

for f in doc_files:
    fname = os.path.basename(f)
    with open(f, 'r', encoding='utf-8') as fh:
        text = fh.read()
        
    # Find arXiv IDs
    arx = re.findall(r'arXiv:(\d{4}\.\d{4,5}(?:v\d+)?)', text, re.IGNORECASE)
    for a in arx:
        arxiv_ids.add((a, fname))
        
    # Find GitHub URLs
    gh = re.findall(r'https?://github\.com/[a-zA-Z0-9_\-\.]+(?:/[a-zA-Z0-9_\-\.]+)?', text)
    for g in gh:
        # Strip trailing punctuation
        g_clean = re.sub(r'[\.\),;]+$', '', g)
        github_urls.add((g_clean, fname))

    # Find HuggingFace URLs
    hf = re.findall(r'https?://huggingface\.co/[a-zA-Z0-9_\-\./]+', text)
    for h in hf:
        h_clean = re.sub(r'[\.\),;]+$', '', h)
        huggingface_urls.add((h_clean, fname))

print("=== CITATION & REPOSITORY EXTRACTION ===")
print(f"\n--- Distinct arXiv IDs Found ({len(arxiv_ids)}) ---")
for aid, src in sorted(arxiv_ids):
    print(f"arXiv:{aid} (in {src})")

print(f"\n--- Distinct GitHub Repositories Found ({len(github_urls)}) ---")
for g, src in sorted(github_urls):
    print(f"{g} (in {src})")

print(f"\n--- Distinct HuggingFace Datasets/Models Found ({len(huggingface_urls)}) ---")
for h, src in sorted(huggingface_urls):
    print(f"{h} (in {src})")

