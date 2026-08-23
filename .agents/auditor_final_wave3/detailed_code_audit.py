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

print("="*80)
print("PHASE 1: CODE BLOCK INVENTORY & SYNTAX VALIDATION")
print("="*80)

code_blocks = []
for rel_path in files:
    full_path = os.path.join(base_dir, rel_path)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = re.finditer(r'```([a-zA-Z0-9_\-]+)?\n(.*?)```', content, re.DOTALL)
    count = 0
    for m in matches:
        count += 1
        lang = (m.group(1) or 'text').lower()
        code = m.group(2)
        code_blocks.append({
            'file': rel_path,
            'index': count,
            'lang': lang,
            'code': code,
            'lines': len(code.splitlines())
        })

print(f"Loaded {len(code_blocks)} code blocks across {len(files)} files.\n")

# Check Python blocks
py_blocks = [b for b in code_blocks if b['lang'] == 'python']
print(f"--- Testing {len(py_blocks)} Python Code Blocks ---")
for i, b in enumerate(py_blocks):
    print(f"\n[Python Block {i+1}] {b['file']} (Block #{b['index']}, {b['lines']} lines):")
    code = b['code']
    try:
        parsed = ast.parse(code)
        print("  AST Parse: PASS (Syntactically valid Python)")
    except Exception as e:
        print(f"  AST Parse: FAIL -> {e}")
        print("--- Code Snippet ---")
        print("\n".join(code.splitlines()[:20]))
        print("--------------------")

# Check JSON blocks
json_blocks = [b for b in code_blocks if b['lang'] == 'json']
print(f"\n--- Testing {len(json_blocks)} JSON Code Blocks ---")
for i, b in enumerate(json_blocks):
    print(f"\n[JSON Block {i+1}] {b['file']} (Block #{b['index']}, {b['lines']} lines):")
    code = b['code']
    try:
        parsed = json.loads(code)
        print("  JSON Parse: PASS (Valid JSON)")
        # If it has keys, print top-level keys
        if isinstance(parsed, dict):
            print(f"  Keys: {list(parsed.keys())[:8]}")
        elif isinstance(parsed, list):
            print(f"  List of {len(parsed)} elements")
    except Exception as e:
        print(f"  JSON Parse: FAIL -> {e}")
        print("--- JSON Snippet ---")
        print("\n".join(code.splitlines()[:15]))
        print("--------------------")

# Check SQL blocks
sql_blocks = [b for b in code_blocks if b['lang'] == 'sql']
print(f"\n--- Testing {len(sql_blocks)} SQL Code Blocks ---")
for i, b in enumerate(sql_blocks):
    print(f"\n[SQL Block {i+1}] {b['file']} (Block #{b['index']}, {b['lines']} lines):")
    code = b['code']
    # Let's test execution in an in-memory SQLite database
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    try:
        # SQLite executescript allows multiple statements
        cursor.executescript(code)
        conn.commit()
        # Query tables
        cursor.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'index', 'trigger');")
        objects = cursor.fetchall()
        print("  SQLite Execution: PASS (All DDL statements executed successfully)")
        print(f"  Created objects: {objects}")
    except Exception as e:
        print(f"  SQLite Execution: FAIL -> {e}")
        print("--- SQL Snippet ---")
        print("\n".join(code.splitlines()[:20]))
        print("-------------------")
    finally:
        conn.close()

