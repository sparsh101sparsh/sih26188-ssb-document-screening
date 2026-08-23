import re

with open('/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md') as f:
    report = f.read()

py_matches = list(re.finditer(r'```python\n(.*?)```', report, re.DOTALL))
print(f"Total python blocks in report: {len(py_matches)}")
for idx, m in enumerate(py_matches):
    print(f"\n{'='*40} BLOCK {idx+1} ({len(m.group(1).splitlines())} lines) {'='*40}")
    print(m.group(1))

