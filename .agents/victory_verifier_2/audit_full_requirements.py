import os
import re
import ast
import urllib.request

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

def check_r1_criteria(content_all):
    print("\n" + "="*60)
    print("AUDITING REQUIREMENT R1: GROK MVP CUTS EMPIRICAL CHALLENGE")
    print("="*60)
    
    # 6 Grok cuts:
    # 1. AdaFace vs buffalo_l latency
    # 2. Dual forensic fusion (DocTamper + TruFor) feasibility
    # 3. Qwen2.5-VL-3B quality gate (INT4 AWQ)
    # 4. Aadhaar QR criticality & SSB border stats
    # 5. SIH winning demos (Flutter mobile differentiator)
    # 6. 1.45s latency reality check
    
    cuts = [
        ("Cut 1: AdaFace vs buffalo_l", r"AdaFace.*buffalo_l|buffalo_l.*AdaFace"),
        ("Cut 2: Dual Forensic Fusion", r"Dual.*Fusion|DocTamper.*TruFor|TruFor.*DocTamper"),
        ("Cut 3: Qwen2.5-VL Quality Gate", r"Qwen2\.5-VL.*quality gate|AWQ|fallback"),
        ("Cut 4: Aadhaar QR Criticality", r"Aadhaar.*QR.*SSB|Indo-Nepal|border"),
        ("Cut 5: SIH Winning Demos & Flutter", r"SIH.*winner|winning demo|Flutter.*mobile"),
        ("Cut 6: 1.45s Latency Reality", r"1\.45s|latency.*RTX 4060|RTX 3060")
    ]
    
    verdicts = [
        ("Grok is right / partially right / wrong verdict", r"Grok is (?:Right|Partially Right|Wrong|RIGHT|PARTIALLY RIGHT|WRONG)")
    ]
    
    for name, pat in cuts:
        m = re.search(pat, content_all, re.IGNORECASE)
        print(f"  {name}: {'FOUND' if m else 'MISSING'}")
        
    v_matches = re.findall(verdicts[0][1], content_all)
    print(f"  Verdicts found: {len(v_matches)} matches ({v_matches})")
    
def check_r2_criteria(content_all):
    print("\n" + "="*60)
    print("AUDITING REQUIREMENT R2: NEXTGEN DATASETS DEEP DIVE")
    print("="*60)
    
    items = [
        ("IDNet download URL / license / 837k check", r"IDNet.*837|https://github.com/IDNet|CC BY"),
        ("FantasyID arXiv 2507.20808 + repo", r"FantasyID.*2507\.20808|arxiv.*2507\.20808"),
        ("SIDTD access method + Indian doc coverage", r"SIDTD.*MIDV|MIDV-500|Indian"),
        ("DocForge-Bench analysis", r"DocForge-Bench|DocForge"),
        ("New 2026 dataset not in Wave 1 or Grok", r"HiFi-Mask|DocTamper-V2|AnyForge|TamperDoc|DocManip|ForgeryDet|WildDoc|In-the-Wild"),
        ("Top 3 dataset ranking with download instructions", r"Top 3|Priority Ranking|Download Guide")
    ]
    for name, pat in items:
        m = re.search(pat, content_all, re.IGNORECASE)
        print(f"  {name}: {'FOUND' if m else 'MISSING'}")

def check_r3_criteria(content_all):
    print("\n" + "="*60)
    print("AUDITING REQUIREMENT R3: TAMPERING MODELS & FORENSICHUB")
    print("="*60)
    
    models = [
        "TruFor",
        "PSCC-Net",
        "MVSS-Net",
        "CAT-Net",
        "IML-ViT",
        "DocTamper", # or DTD/FFDN
        "ForensicHub"
    ]
    for model in models:
        # Check for GitHub link, benchmark numbers, feasibility rating
        gh = re.search(rf"{model}.*github\.com/[^\s\)\`]+", content_all, re.IGNORECASE)
        feas = re.search(rf"{model}.*(?:Easy|Medium|Hard)", content_all, re.IGNORECASE)
        print(f"  Model {model}: GitHub Link={'FOUND' if gh else 'MISSING'}, Feasibility={'FOUND' if feas else 'MISSING'}")
        
    pscc_disq = re.search(r"PSCC-Net.*(?:disqualif|verdict|confirm|overturn)", content_all, re.IGNORECASE)
    print(f"  PSCC-Net disqualification investigation: {'FOUND' if pscc_disq else 'MISSING'}")
    
    fhub_eval = re.search(r"ForensicHub.*(?:framework|usable|turnkey|benchmark)", content_all, re.IGNORECASE)
    print(f"  ForensicHub evaluation: {'FOUND' if fhub_eval else 'MISSING'}")

def check_r4_criteria(content_all):
    print("\n" + "="*60)
    print("AUDITING REQUIREMENT R4: SIH GRAND FINALE MVP BLUEPRINT")
    print("="*60)
    
    items = [
        ("End-to-end pipeline latency budget (<5s RTX 4060, <8s RTX 3060)", r"RTX 4060.*RTX 3060|latency budget|pipeline latency"),
        ("ONNX export commands for chosen models", r"torch\.onnx\.export|mo --input_model|optimum-cli"),
        ("12-week sprint plan with 5 roles", r"12-Week|Sprint Plan|ML Lead.*Backend.*Frontend"),
        ("MVP scope vs Phase 2", r"MVP Scope|Phase 2 Scope|Demo Day Scope"),
        ("Demo day scenario & presenter script", r"Demo Day|Presenter Script|Officer Workflow"),
        ("Hardware requirements for SIH setup", r"Hardware Requirements|RTX 4060|presentation setup")
    ]
    for name, pat in items:
        m = re.search(pat, content_all, re.IGNORECASE)
        print(f"  {name}: {'FOUND' if m else 'MISSING'}")

def check_r5_criteria(content_all):
    print("\n" + "="*60)
    print("AUDITING REQUIREMENT R5: SIH PITCH SCRIPT & SCORING STRATEGY")
    print("="*60)
    
    items = [
        ("SIH 2026 rubric categories & weightings", r"Evaluation Rubric|Weighting|Working Prototype.*Innovation"),
        ("SIH 2024/2025 winner differentiator research", r"SIH 2024|SIH 2025|Winning Teams"),
        ("Minute 1: Hook and problem impact", r"Minute 1|Hook"),
        ("Minute 2: Current pain points", r"Minute 2|Pain Points"),
        ("Minute 3: Solution overview & architecture", r"Minute 3|Architecture"),
        ("Minute 4-5: Live demo script", r"Minute 4|Minute 5|Live Demo"),
        ("Minute 6: Core innovation", r"Minute 6|Core Innovation"),
        ("Minute 7: Impact, scalability, deployment", r"Minute 7|Impact|Deployment"),
        ("Minute 8: Team, roadmap, ask", r"Minute 8|Team|Roadmap"),
        ("3 critical demo moments scripted", r"Demo Moment 1|Demo Moment 2|Demo Moment 3"),
        ("Exact demo commentary script", r"Commentary Script|Presenter Script")
    ]
    for name, pat in items:
        m = re.search(pat, content_all, re.IGNORECASE)
        print(f"  {name}: {'FOUND' if m else 'MISSING'}")

def check_links_and_citations(content_all):
    print("\n" + "="*60)
    print("AUDITING ACADEMIC CITATIONS, ARXIV IDS & GITHUB LINKS")
    print("="*60)
    
    arxiv_ids = re.findall(r'arxiv(?:\.org/(?:abs|pdf)/|:)\s*(\d{4}\.\d{4,5}(?:v\d+)?)', content_all, re.IGNORECASE)
    github_links = re.findall(r'https?://github\.com/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-\.]+', content_all)
    
    print(f"  Unique arXiv IDs cited ({len(set(arxiv_ids))}): {sorted(list(set(arxiv_ids)))}")
    print(f"  Unique GitHub repositories cited ({len(set(github_links))}):")
    for link in sorted(list(set(github_links))):
        print(f"    - {link}")

if __name__ == "__main__":
    combined_content = ""
    for f in FILES_TO_AUDIT:
        with open(f, 'r', encoding='utf-8') as fp:
            combined_content += fp.read() + "\n"
            
    check_r1_criteria(combined_content)
    check_r2_criteria(combined_content)
    check_r3_criteria(combined_content)
    check_r4_criteria(combined_content)
    check_r5_criteria(combined_content)
    check_links_and_citations(combined_content)
