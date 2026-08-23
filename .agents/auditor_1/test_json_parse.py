import re
import json

with open('/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md') as f:
    text = f.read()

json_blocks = list(re.finditer(r'```json\s*\n(.*?)\n```', text, re.DOTALL))
for i, m in enumerate(json_blocks, 1):
    raw = m.group(1)
    try:
        obj = json.loads(raw)
        print(f"JSON Block {i} parsed successfully! Keys: {list(obj.keys())}")
    except Exception as e:
        print(f"JSON Block {i} error: {e}")
