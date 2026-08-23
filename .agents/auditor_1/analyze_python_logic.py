import os
import re
import ast
import textwrap

doc_files = [
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/02_NEXTGEN_DATASETS_DEEP_DIVE.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md',
    '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md'
]

block_idx = 0
for f in doc_files:
    fname = os.path.basename(f)
    with open(f, 'r', encoding='utf-8') as fh:
        text = fh.read()
    
    py_matches = list(re.finditer(r'```python\s*\n(.*?)\n\s*```', text, re.DOTALL))
    for i, m in enumerate(py_matches, 1):
        block_idx += 1
        raw_code = textwrap.dedent(m.group(1))
        tree = ast.parse(raw_code)
        
        # Check for facade anti-patterns
        has_pass_only = False
        has_return_constant_only = False
        funcs = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                funcs.append(node.name)
                # check if body is only pass or docstring + pass
                body_non_doc = [b for b in node.body if not (isinstance(b, ast.Expr) and isinstance(b.value, ast.Constant))]
                if len(body_non_doc) == 1 and isinstance(body_non_doc[0], ast.Pass):
                    has_pass_only = True
                if len(body_non_doc) == 1 and isinstance(body_non_doc[0], ast.Return) and isinstance(body_non_doc[0].value, ast.Constant):
                    has_return_constant_only = True

        first_line = raw_code.strip().splitlines()[0] if raw_code.strip() else ""
        print(f"[{block_idx:2d}] {fname} Block #{i} | Lines: {len(raw_code.splitlines())} | Funcs: {funcs} | Facade: {has_pass_only or has_return_constant_only}")
        print(f"     Preview: {first_line[:80]}")

