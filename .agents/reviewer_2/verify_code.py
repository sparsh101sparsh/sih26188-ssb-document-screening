import ast
import json

files = [
    'sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md',
    'sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md',
    'sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md'
]

for fpath in files:
    with open(fpath, 'r') as f:
        lines = f.readlines()
    
    in_py = False
    in_json = False
    in_bash = False
    py_blocks = []
    json_blocks = []
    bash_blocks = []
    
    current_block = []
    start_line = 0
    
    for idx, line in enumerate(lines):
        sline = line.strip()
        if sline.startswith('```python'):
            in_py = True
            current_block = []
            start_line = idx + 1
        elif sline.startswith('```json'):
            in_json = True
            current_block = []
            start_line = idx + 1
        elif sline.startswith('```bash'):
            in_bash = True
            current_block = []
            start_line = idx + 1
        elif sline == '```':
            if in_py:
                in_py = False
                py_blocks.append((start_line, ''.join(current_block)))
            elif in_json:
                in_json = False
                json_blocks.append((start_line, ''.join(current_block)))
            elif in_bash:
                in_bash = False
                bash_blocks.append((start_line, ''.join(current_block)))
        else:
            if in_py or in_json or in_bash:
                current_block.append(line)
                
    print(f"\n=======================================================")
    print(f"File: {fpath}")
    print(f"=======================================================")
    print(f"Python code blocks: {len(py_blocks)}")
    for start_l, code in py_blocks:
        try:
            ast.parse(code)
            print(f"  [PASS] Python Block @ line {start_l}: Valid AST ({len(code.splitlines())} lines)")
        except SyntaxError as e:
            print(f"  [FAIL] Python Block @ line {start_l}: SYNTAX ERROR: {e}")
            
    print(f"JSON code blocks: {len(json_blocks)}")
    for start_l, code in json_blocks:
        try:
            json.loads(code)
            print(f"  [PASS] JSON Block @ line {start_l}: Valid JSON ({len(code.splitlines())} lines)")
        except Exception as e:
            print(f"  [FAIL] JSON Block @ line {start_l}: JSON ERROR: {e}")
            
    print(f"Bash code blocks: {len(bash_blocks)}")
    for start_l, code in bash_blocks:
        print(f"  [INFO] Bash Block @ line {start_l}: ({len(code.splitlines())} lines)")
