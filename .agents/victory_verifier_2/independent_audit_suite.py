import os
import re
import ast
import sys
import glob

REPO_ROOT = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford"
DOCS_DIR = os.path.join(REPO_ROOT, "sih26188_wave2")
FILES_TO_AUDIT = [
    os.path.join(DOCS_DIR, "WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md"),
    os.path.join(DOCS_DIR, "docs", "01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md"),
    os.path.join(DOCS_DIR, "docs", "02_NEXTGEN_DATASETS_DEEP_DIVE.md"),
    os.path.join(DOCS_DIR, "docs", "03_TAMPERING_MODELS_AND_FORENSICHUB.md"),
    os.path.join(DOCS_DIR, "docs", "04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md"),
    os.path.join(DOCS_DIR, "docs", "05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md")
]

def audit_phase2_placeholders():
    print("\n" + "="*50)
    print("PHASE 2: ANTI-CHEATING & PLACEHOLDER FORENSICS")
    print("="*50)
    
    # Patterns to detect lazy placeholders or unfinished content
    # Note: We must distinguish between explanatory text like "no TODOs" vs actual placeholder tags
    placeholder_patterns = [
        r'\bTODO\b',
        r'\bFIXME\b',
        r'\bTBD\b',
        r'\bXXX\b',
        r'\bNotImplementedError\b',
        r'#\s*Insert\s+code\s+here',
        r'\.\.\.\s*#\s*rest\s+of\s+code',
        r'pass\s*#\s*placeholder'
    ]
    
    findings = []
    
    for fpath in FILES_TO_AUDIT:
        if not os.path.exists(fpath):
            findings.append(f"ERROR: File missing: {fpath}")
            continue
        
        with open(fpath, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        for line_num, line in enumerate(lines, 1):
            for pat in placeholder_patterns:
                matches = re.findall(pat, line, re.IGNORECASE)
                if matches:
                    # Check context: is it in a table talking about status, or literal TODO item?
                    # Let's inspect each match closely
                    findings.append({
                        "file": os.path.relpath(fpath, REPO_ROOT),
                        "line": line_num,
                        "pattern": pat,
                        "content": line.strip()
                    })
                    
    print(f"Placeholder and Suspicious Pattern Matches Found: {len(findings)}")
    for item in findings:
        print(f"  [{item['file']}:{item['line']}] Match '{item['pattern']}': {item['content']}")
        
    return findings

def extract_and_parse_python_blocks():
    print("\n" + "="*50)
    print("PHASE 3: PYTHON CODE BLOCKS AST PARSE AUDIT")
    print("="*50)
    
    code_blocks = []
    errors = []
    
    for fpath in FILES_TO_AUDIT:
        if not os.path.exists(fpath):
            continue
            
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Extract ```python ... ``` blocks
        pattern = r'```python\s+(.*?)\s*```'
        matches = list(re.finditer(pattern, content, re.DOTALL))
        
        rel_path = os.path.relpath(fpath, REPO_ROOT)
        print(f"\nScanning {rel_path} - Found {len(matches)} Python code blocks")
        
        for idx, match in enumerate(matches, 1):
            code_text = match.group(1)
            # Find line number of the start of the block
            start_pos = match.start()
            line_no = content[:start_pos].count('\n') + 1
            
            try:
                parsed = ast.parse(code_text)
                code_blocks.append({
                    "file": rel_path,
                    "block_idx": idx,
                    "line": line_no,
                    "ast": parsed,
                    "code": code_text,
                    "valid": True
                })
                print(f"  Block {idx} (line {line_no}): AST PARSE OK ({len(code_text.splitlines())} lines)")
            except SyntaxError as e:
                err_msg = f"  Block {idx} (line {line_no}): SYNTAX ERROR -> {e.msg} at line {e.lineno}"
                print(err_msg)
                errors.append({
                    "file": rel_path,
                    "block_idx": idx,
                    "line": line_no,
                    "error": str(e),
                    "code": code_text
                })
                code_blocks.append({
                    "file": rel_path,
                    "block_idx": idx,
                    "line": line_no,
                    "valid": False,
                    "error": str(e),
                    "code": code_text
                })
                
    print(f"\nTotal Python Blocks: {len(code_blocks)}")
    print(f"Total Syntax Errors: {len(errors)}")
    return code_blocks, errors

if __name__ == "__main__":
    findings = audit_phase2_placeholders()
    blocks, errors = extract_and_parse_python_blocks()
