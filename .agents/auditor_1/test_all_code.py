import os
import re
import ast
import json
import textwrap

doc_files = [
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/02_NEXTGEN_DATASETS_DEEP_DIVE.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md'
]

py_errors = []
json_errors = []
total_py = 0
total_json = 0

for f in doc_files:
    fname = os.path.basename(f)
    with open(f, 'r', encoding='utf-8') as fh:
        text = fh.read()
    
    # Python
    py_matches = list(re.finditer(r'```python\s*\n(.*?)\n\s*```', text, re.DOTALL))
    for i, m in enumerate(py_matches, 1):
        total_py += 1
        raw_code = m.group(1)
        dedented = textwrap.dedent(raw_code)
        try:
            tree = ast.parse(dedented)
            funcs = [n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
            classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
        except SyntaxError as e:
            py_errors.append((fname, i, str(e), dedented[:200]))

    # JSON
    json_matches = list(re.finditer(r'```json\s*\n(.*?)\n\s*```', text, re.DOTALL))
    for i, m in enumerate(json_matches, 1):
        total_json += 1
        raw_json = m.group(1)
        try:
            json.loads(raw_json)
        except Exception as e:
            json_errors.append((fname, i, str(e), raw_json[:200]))

print(f"=== AUDIT RESULTS FOR CODE BLOCKS ===")
print(f"Total Python blocks checked: {total_py}")
print(f"Total JSON blocks checked: {total_json}")
print(f"Python syntax errors: {len(py_errors)}")
print(f"JSON parsing errors: {len(json_errors)}")

if py_errors:
    print("\n--- PYTHON ERRORS ---")
    for err in py_errors:
        print(f"File: {err[0]}, Block #{err[1]}: {err[2]}\nSnippet:\n{err[3]}\n")

if json_errors:
    print("\n--- JSON ERRORS ---")
    for err in json_errors:
        print(f"File: {err[0]}, Block #{err[1]}: {err[2]}\nSnippet:\n{err[3]}\n")

if not py_errors and not json_errors:
    print("\n>>> 100% OF ALL PYTHON AND JSON BLOCKS ARE VALID AND PASS PARSING! <<<")
