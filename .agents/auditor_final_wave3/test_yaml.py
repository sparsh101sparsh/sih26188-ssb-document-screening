import re
import yaml

with open('/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/02_DEPLOYMENT_ENVIRONMENTS.md') as f:
    c = f.read()

yaml_code = re.search(r'```yaml\n(.*?)```', c, re.DOTALL).group(1)
parsed = yaml.safe_load(yaml_code)
print("YAML parsed successfully! Services:", list(parsed.get('services', {}).keys()))
