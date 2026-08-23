import os, re, ast, textwrap

files = [
    'sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md',
    'sih26188_wave2/docs/01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md',
    'sih26188_wave2/docs/02_NEXTGEN_DATASETS_DEEP_DIVE.md',
    'sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md',
    'sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md',
    'sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md'
]

total = 0
for f in files:
    with open(f) as fp:
        content = fp.read()
    pattern = r'```python\s+(.*?)\s*```'
    matches = list(re.finditer(pattern, content, re.DOTALL))
    for i, m in enumerate(matches):
        total += 1
        code = m.group(1)
        start_line = content[:m.start()].count('\n') + 1
        # Test 1: Direct parse
        err1 = None
        try:
            ast.parse(code)
        except Exception as e:
            err1 = str(e)
        # Test 2: Dedent parse
        err2 = None
        try:
            ast.parse(textwrap.dedent(code))
        except Exception as e:
            err2 = str(e)
        print(f'{total:02d}. [{f}] L{start_line} ({len(code.splitlines())} lines) -> Direct: {err1 if err1 else "OK"} | Dedent: {err2 if err2 else "OK"}')
