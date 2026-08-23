import os
import glob
import re
import ast

base_dir = '/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening'
md_files = sorted(glob.glob(f'{base_dir}/**/*.md', recursive=True))

print(f"Found {len(md_files)} markdown files:")
for f in md_files:
    rel = os.path.relpath(f, base_dir)
    content = open(f, 'r', encoding='utf-8').read()
    headers = re.findall(r'^(#{1,4}\s+.*)', content, re.M)
    code_blocks = re.findall(r'```(\w+)?\n([\s\S]*?)```', content)
    print(f"\n=======================================================")
    print(f"FILE: {rel}")
    print(f"Size: {len(content)} chars | Lines: {len(content.splitlines())} | Headers: {len(headers)} | Code blocks: {len(code_blocks)}")
    print(f"Headers sample:")
    for h in headers[:12]:
        print(f"  {h}")
    if len(headers) > 12:
        print(f"  ... (+{len(headers)-12} more)")
    
    print(f"Code block languages: {[cb[0] for cb in code_blocks]}")

