import re

with open("/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md") as f:
    text3 = f.read()

print("=== DOC 3: WINNER & RUNNER UP SEARCH ===")
for m in re.finditer(r'(?:Winner|Runner-Up|Recommendation|Ensemble|Decision|Comparative Selection).*', text3, re.I):
    print(m.group(0)[:120])

with open("/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md") as f:
    text5 = f.read()

print("\n=== DOC 5: DEMO MOMENTS SEARCH ===")
for m in re.finditer(r'(?:Demo Moment|Moment|Critical Demo|Live Demo|Demonstration).*', text5, re.I):
    print(m.group(0)[:120])

