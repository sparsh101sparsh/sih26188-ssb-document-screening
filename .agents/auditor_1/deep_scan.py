import os, glob, re

base_dir = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening'
files = sorted(glob.glob(f'{base_dir}/**/*.md', recursive=True) + glob.glob(f'{base_dir}/*.py'))

prohibited_patterns = [
    (r'\bTODO\b', 'TODO comments'),
    (r'\bFIXME\b', 'FIXME comments'),
    (r'\bTBD\b', 'TBD markers'),
    (r'\bNotImplementedError\b', 'NotImplementedError stubs'),
    (r'^\s*pass\s*$', 'Bare pass statements'),
    (r'return\s+["\']?(?:fake|mock|dummy|test_result)["\']?', 'Hardcoded dummy returns'),
    (r'lorem ipsum', 'Lorem ipsum filler text'),
]

print("=== DEEP FORENSIC SCAN FOR PROHIBITED PATTERNS ===")
findings = []

for f in files:
    rel = os.path.relpath(f, base_dir)
    with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
        lines = fp.readlines()
        for idx, line in enumerate(lines, 1):
            for pat, desc in prohibited_patterns:
                if re.search(pat, line, re.IGNORECASE):
                    findings.append((rel, idx, desc, line.strip()))

if findings:
    print(f"Found {len(findings)} potential pattern matches:")
    for rel, idx, desc, line in findings:
        print(f"  [{rel}:{idx}] ({desc}): {line[:100]}")
else:
    print("ZERO prohibited patterns, placeholders, or dummy markers detected across all files!")

