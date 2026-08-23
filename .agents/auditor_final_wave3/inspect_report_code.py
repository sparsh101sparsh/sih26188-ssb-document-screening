import re

with open('/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md') as f:
    report = f.read()

py_matches = re.finditer(r'```python\n(.*?)```', report, re.DOTALL)
count = 0
for m in py_matches:
    count += 1
    code = m.group(1)
    print(f"=== UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md - Python Block {count} ({len(code.splitlines())} lines) ===")
    print("\n".join(code.splitlines()[:25]))
    print("...\n")

with open('/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/02_DEPLOYMENT_ENVIRONMENTS.md') as f:
    env_doc = f.read()

py_matches2 = re.finditer(r'```python\n(.*?)```', env_doc, re.DOTALL)
count = 0
for m in py_matches2:
    count += 1
    code = m.group(1)
    print(f"=== docs/02_DEPLOYMENT_ENVIRONMENTS.md - Python Block {count} ({len(code.splitlines())} lines) ===")
    print("\n".join(code.splitlines()[:25]))
    print("...\n")

