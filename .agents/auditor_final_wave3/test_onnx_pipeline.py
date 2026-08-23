import sys
import os
import re
import numpy as np
import torch
import torch.nn as nn
import onnx
import onnxruntime as ort

print("=== STARTING ONNX EXPORT & INFERENCE VERIFICATION ===", flush=True)

base_dir = '/Users/iamsparsh00321/teamwork_projects/sih26188_wave3'
with open(os.path.join(base_dir, 'UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md'), 'r') as f:
    report_content = f.read()

onnx_py_code = re.search(r'```python\n# backend/scripts/export_models_to_onnx\.py\n(.*?)```', report_content, re.DOTALL).group(1)

onnx_env = {}
exec(onnx_py_code, onnx_env)

export_ppocrv4_rec = onnx_env['export_ppocrv4_rec']
export_adaface_r100 = onnx_env['export_adaface_r100']
export_doctamper_dtd = onnx_env['export_doctamper_dtd']

# 1. PP-OCRv4 Mock
class MockPPOCR(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(3, 64, kernel_size=3, padding=1)
        self.fc = nn.Linear(64, 6625)
    def forward(self, x):
        # x: [B, 3, 48, W]
        B, C, H, W = x.shape
        feat = self.conv(x) # [B, 64, 48, W]
        pooled = feat.mean(dim=2).permute(0, 2, 1) # [B, W, 64]
        return self.fc(pooled) # [B, W, 6625]

pp_path = "/tmp/onnx_test/ppocr.onnx"
os.makedirs("/tmp/onnx_test", exist_ok=True)
export_ppocrv4_rec(MockPPOCR(), pp_path)
onnx.checker.check_model(onnx.load(pp_path))
session_pp = ort.InferenceSession(pp_path, providers=["CPUExecutionProvider"])
out_pp = session_pp.run(None, {"input": np.random.randn(2, 3, 48, 256).astype(np.float32)})
print(f"PP-OCR ONNX inference successful! Output shape: {out_pp[0].shape}", flush=True)

# 2. AdaFace-R100 Mock
class MockAdaFace(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.fc = nn.Linear(16 * 112 * 112, 512)
    def forward(self, x):
        B = x.shape[0]
        f = self.conv(x).flatten(1)
        emb = self.fc(f)
        return torch.nn.functional.normalize(emb, p=2, dim=1)

ada_path = "/tmp/onnx_test/adaface.onnx"
export_adaface_r100(MockAdaFace(), ada_path)
onnx.checker.check_model(onnx.load(ada_path))
session_ada = ort.InferenceSession(ada_path, providers=["CPUExecutionProvider"])
out_ada = session_ada.run(None, {"face_image": np.random.randn(4, 3, 112, 112).astype(np.float32)})
print(f"AdaFace ONNX inference successful! Output shape: {out_ada[0].shape}", flush=True)

# 3. DocTamper Mock
class MockDocTamper(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(3, 1, kernel_size=3, padding=1)
    def forward(self, x):
        return torch.sigmoid(self.conv(x))

doc_path = "/tmp/onnx_test/doctamper.onnx"
export_doctamper_dtd(MockDocTamper(), doc_path)
onnx.checker.check_model(onnx.load(doc_path))
session_doc = ort.InferenceSession(doc_path, providers=["CPUExecutionProvider"])
out_doc = session_doc.run(None, {"document_image": np.random.randn(1, 3, 600, 800).astype(np.float32)})
print(f"DocTamper ONNX inference successful! Output shape: {out_doc[0].shape}", flush=True)

print("\n=== ALL 3 ONNX EXPORT SCRIPTS & RUNTIME SESSIONS VERIFIED 100% OPERATIONAL! ===", flush=True)
