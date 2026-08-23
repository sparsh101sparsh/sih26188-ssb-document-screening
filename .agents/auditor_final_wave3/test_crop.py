import cv2
import numpy as np
import os
import re

base_dir = '/Users/iamsparsh00321/teamwork_projects/sih26188_wave3'
with open(os.path.join(base_dir, 'docs/04_STAMP_AUTHENTICATION_MODULE.md'), 'r') as f:
    stamp_content = f.read()

stamp_py_code = re.search(r'```python\n(.*?)```', stamp_content, re.DOTALL).group(1)
stamp_env = {}
exec(stamp_py_code, stamp_env)
engine = stamp_env['StampVerificationEngine'](registry_path="nonexistent.json")

# Create image with a red/purple stamp
synth_img = np.ones((800, 800, 3), dtype=np.uint8) * 255 # White background
# Draw a red circle
cv2.circle(synth_img, (400, 400), 80, (0, 0, 200), -1) # Red in BGR

crops = engine.extract_stamp_regions(synth_img)
print(f"Extracted {len(crops)} crops from red circle on white doc.")
if crops:
    crop, bbox = crops[0]
    print(f"Crop shape: {crop.shape}, bbox: {bbox}")

# Test with purple circle on white doc
synth_img2 = np.ones((800, 800, 3), dtype=np.uint8) * 255
cv2.circle(synth_img2, (400, 400), 80, (180, 50, 140), -1) # Purple in BGR
crops2 = engine.extract_stamp_regions(synth_img2)
print(f"Extracted {len(crops2)} crops from purple circle on white doc.")

