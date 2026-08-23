import os
import re
import ast
import json

doc_files = [
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/02_NEXTGEN_DATASETS_DEEP_DIVE.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md'
]

def audit_code_blocks():
    print("=== EXTRACTING AND VALIDATING CODE BLOCKS ===")
    total_py = 0
    total_json = 0
    total_bash = 0
    errors = []

    for f in doc_files:
        fname = os.path.basename(f)
        with open(f, 'r', encoding='utf-8') as fh:
            text = fh.read()

        # Find python blocks
        py_matches = list(re.finditer(r'```python\s*\n(.*?)\n```', text, re.DOTALL))
        print(f"[{fname}] Found {len(py_matches)} python blocks")
        for i, m in enumerate(py_matches, 1):
            total_py += 1
            code = m.group(1)
            try:
                ast.parse(code)
            except SyntaxError as e:
                errors.append(f"Python SyntaxError in {fname} block #{i}: {e}")

        # Find json blocks
        json_matches = list(re.finditer(r'```json\s*\n(.*?)\n```', text, re.DOTALL))
        print(f"[{fname}] Found {len(json_matches)} json blocks")
        for i, m in enumerate(json_matches, 1):
            total_json += 1
            code = m.group(1)
            # Remove comments or trailing ellipses if any
            clean_code = re.sub(r'//.*', '', code)
            try:
                json.loads(clean_code)
            except json.JSONDecodeError as e:
                # Check if it has intentional ... or comments
                errors.append(f"JSON DecodeError in {fname} block #{i}: {e} (snippet: {code[:60]}...)")

    print(f"\nSummary: {total_py} python blocks, {total_json} json blocks checked.")
    if not errors:
        print(">>> ALL CODE BLOCKS PASSED SYNTACTIC VALIDATION! <<<")
    else:
        print(f">>> FOUND {len(errors)} CODE ISSUES: <<<")
        for err in errors:
            print(" -", err)

if __name__ == '__main__':
    audit_code_blocks()
