import os, glob, re, ast, json

base_dir = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening'
md_files = sorted(glob.glob(f'{base_dir}/**/*.md', recursive=True))

total_blocks = 0
python_blocks = 0
python_valid = 0
python_errors = []

for f in md_files:
    rel = os.path.relpath(f, base_dir)
    content = open(f, 'r', encoding='utf-8').read()
    blocks = re.findall(r'```(\w+)?\n([\s\S]*?)```', content)
    print(f"\n==========================================")
    print(f"File: {rel} ({len(blocks)} code blocks)")
    for i, (lang, code) in enumerate(blocks):
        total_blocks += 1
        lang_str = lang if lang else "unspecified"
        lines = len(code.strip().splitlines())
        first_line = code.strip().splitlines()[0] if code.strip().splitlines() else ""
        print(f"  Block #{i+1} [{lang_str}] ({lines} lines): {first_line[:60]}")
        
        # Check if Python
        is_py = (lang in ['python', 'py']) or (not lang and ('def ' in code or 'import ' in code or 'class ' in code))
        if is_py:
            python_blocks += 1
            try:
                ast.parse(code)
                python_valid += 1
                print(f"    -> [Python AST]: VALID syntax")
            except SyntaxError as e:
                python_errors.append((rel, i+1, str(e), first_line))
                print(f"    -> [Python AST ERROR]: {e}")

print(f"\n==========================================")
print(f"Total code blocks across docs: {total_blocks}")
print(f"Python code blocks detected: {python_blocks}")
print(f"Valid Python syntax blocks: {python_valid}")
if python_errors:
    print(f"Errors found ({len(python_errors)}):")
    for err in python_errors:
        print(f"  File: {err[0]}, Block #{err[1]}: {err[2]} | Code: {err[3]}")
else:
    print("ALL Python code blocks parsed with 100% valid AST syntax!")
