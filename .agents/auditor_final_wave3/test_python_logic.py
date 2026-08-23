import sys
import os
import ast
import json
import sqlite3
import hashlib
from datetime import datetime, date

print("="*80)
print("PHASE 2: EMPIRICAL CODE EXECUTION & LOGIC TESTING")
print("="*80)

# 1. Test Pydantic Models in android-agent/MASTER_PROMPT.md
print("\n--- 1. Testing Pydantic v2 Models from android-agent/MASTER_PROMPT.md ---")
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any

# Let's extract the code from Block #10 of MASTER_PROMPT.md
with open('/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/android-agent/MASTER_PROMPT.md') as f:
    master_prompt = f.read()

# Let's find python code blocks in MASTER_PROMPT.md
import re
py_blocks = re.findall(r'```python\n(.*?)```', master_prompt, re.DOTALL)
print(f"Found {len(py_blocks)} python blocks in MASTER_PROMPT.md")

for idx, code in enumerate(py_blocks):
    print(f"\nExecuting MASTER_PROMPT.md Python Block {idx+1} ({len(code.splitlines())} lines)...")
    env = {}
    try:
        exec(code, env)
        print(f"  Execution: SUCCESS! Defined symbols: {[k for k in env.keys() if not k.startswith('__')][:10]}")
    except Exception as e:
        print(f"  Execution: FAILED -> {e}")
        import traceback
        traceback.print_exc()

# 2. Test Stamp Authentication Module in docs/04_STAMP_AUTHENTICATION_MODULE.md
print("\n--- 2. Testing Stamp Authentication Module from docs/04_STAMP_AUTHENTICATION_MODULE.md ---")
with open('/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/04_STAMP_AUTHENTICATION_MODULE.md') as f:
    stamp_doc = f.read()

stamp_py_blocks = re.findall(r'```python\n(.*?)```', stamp_doc, re.DOTALL)
print(f"Found {len(stamp_py_blocks)} python blocks in docs/04_STAMP_AUTHENTICATION_MODULE.md")

for idx, code in enumerate(stamp_py_blocks):
    print(f"\nExecuting docs/04_STAMP_AUTHENTICATION_MODULE.md Python Block {idx+1} ({len(code.splitlines())} lines)...")
    # Let's check imports and mock cv2/numpy if needed or test genuine execution
    try:
        import numpy as np
        import cv2
        has_cv = True
    except ImportError:
        has_cv = False
        print("  cv2/numpy not installed in default env, checking mock/test environment")
    
    env = {}
    try:
        exec(code, env)
        print(f"  Execution: SUCCESS! Defined symbols: {[k for k in env.keys() if not k.startswith('__')]}")
        
        # If StampVerificationEngine is defined, test its logic!
        if 'StampVerificationEngine' in env or 'BorderStampVerifier' in env or 'StampRegistry' in env:
            print("  Instantiating and testing Stamp Verification logic...")
            # Let's inspect class methods and test date comparison / sha256
            for k, v in env.items():
                if isinstance(v, type):
                    print(f"    Class found: {k}")
    except Exception as e:
        print(f"  Execution: FAILED -> {e}")
        import traceback
        traceback.print_exc()

# 3. Test FastAPI sidecar routes / Pydantic models in docs/03_DESKTOP_APP_ARCHITECTURE.md
print("\n--- 3. Testing Desktop App FastAPI Backend from docs/03_DESKTOP_APP_ARCHITECTURE.md ---")
with open('/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/03_DESKTOP_APP_ARCHITECTURE.md') as f:
    desktop_doc = f.read()

desktop_py_blocks = re.findall(r'```python\n(.*?)```', desktop_doc, re.DOTALL)
print(f"Found {len(desktop_py_blocks)} python blocks in docs/03_DESKTOP_APP_ARCHITECTURE.md")

for idx, code in enumerate(desktop_py_blocks):
    print(f"\nExecuting docs/03_DESKTOP_APP_ARCHITECTURE.md Python Block {idx+1} ({len(code.splitlines())} lines)...")
    env = {}
    try:
        exec(code, env)
        print(f"  Execution: SUCCESS! Defined symbols: {[k for k in env.keys() if not k.startswith('__')][:10]}")
    except Exception as e:
        print(f"  Execution: FAILED -> {e}")
        import traceback
        traceback.print_exc()

