import re

with open('/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md') as f:
    text = f.read()

py_blocks = list(re.finditer(r'```python\s*\n(.*?)\n```', text, re.DOTALL))
for i, b in enumerate(py_blocks, 1):
    print(f"=== PY BLOCK {i} ===")
    lines = b.group(1).splitlines()
    for l_idx, l in enumerate(lines[:15], 1):
        print(f"{l_idx:2d}: {repr(l)}")

json_blocks = list(re.finditer(r'```json\s*\n(.*?)\n```', text, re.DOTALL))
for i, b in enumerate(json_blocks, 1):
    print(f"=== JSON BLOCK {i} ===")
    lines = b.group(1).splitlines()
    for l_idx, l in enumerate(lines[:15], 1):
        print(f"{l_idx:2d}: {repr(l)}")

