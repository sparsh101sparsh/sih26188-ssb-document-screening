import torch
import torch.nn as nn
import os
import onnx

class MockAdaFaceBackbone(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(3, 512, kernel_size=112)
    def forward(self, x):
        feat = self.conv(x).flatten(1) # [B, 512]
        norms = torch.norm(feat, p=2, dim=1, keepdim=True)
        return feat, norms

class AdaFaceExportWrapper(nn.Module):
    def __init__(self, backbone):
        super().__init__()
        self.backbone = backbone

    def forward(self, x):
        embeddings, norms = self.backbone(x)
        normed_embeddings = embeddings / torch.norm(embeddings, p=2, dim=1, keepdim=True)
        return normed_embeddings, norms

os.makedirs('.agents/reviewer_2/tmp_models', exist_ok=True)
backbone = MockAdaFaceBackbone()
wrapper = AdaFaceExportWrapper(backbone)
dummy_input = torch.randn(1, 3, 112, 112, dtype=torch.float32)

export_path = ".agents/reviewer_2/tmp_models/test_adaface.onnx"
torch.onnx.export(
    wrapper,
    dummy_input,
    export_path,
    export_params=True,
    opset_version=17,
    do_constant_folding=True,
    input_names=['input_face'],
    output_names=['embedding', 'feature_norm'],
    dynamic_axes={
        'input_face': {0: 'batch_size'},
        'embedding': {0: 'batch_size'},
        'feature_norm': {0: 'batch_size'}
    }
)

m = onnx.load(export_path)
onnx.checker.check_model(m)
print("[PASS] AdaFace ONNX export and structure check passed successfully!")
