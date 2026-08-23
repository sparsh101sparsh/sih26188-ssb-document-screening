import os
import re
import ast
import json
import sqlite3
import hashlib
from datetime import datetime

base_dir = '/Users/iamsparsh00321/teamwork_projects/sih26188_wave3'
files = [
    'UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md',
    'docs/01_CHANGE_LOG_AND_ANALYSIS.md',
    'docs/02_DEPLOYMENT_ENVIRONMENTS.md',
    'docs/03_DESKTOP_APP_ARCHITECTURE.md',
    'docs/04_STAMP_AUTHENTICATION_MODULE.md',
    'android-agent/MASTER_PROMPT.md'
]

code_blocks = []
for rel_path in files:
    full_path = os.path.join(base_dir, rel_path)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = re.finditer(r'```([a-zA-Z0-9_\-]+)?\n(.*?)```', content, re.DOTALL)
    count = 0
    for m in matches:
        count += 1
        lang = m.group(1) or 'text'
        code = m.group(2)
        code_blocks.append({
            'file': rel_path,
            'index': count,
            'lang': lang.lower(),
            'code': code,
            'lines': len(code.splitlines())
        })
    print(f'{rel_path}: {count} code blocks found')

print(f'Total code blocks across all files: {len(code_blocks)}')

# Let's inspect each code block by language
by_lang = {}
for b in code_blocks:
    by_lang.setdefault(b['lang'], []).append(b)

print("\nCode blocks by language:")
for lang, blocks in sorted(by_lang.items()):
    print(f"  {lang}: {len(blocks)} blocks")

