"""
SIH26188 — Authoritative ONNX Export Pipeline
Architecture Reference: Section 3.5

Exports PyTorch/Paddle models to ONNX (opset_version=18) with explicit dynamic axes
for variable batch sizes and dynamic spatial resolutions (PP-OCRv4 rec, AdaFace-R100, DocTamper DTD).
"""

import argparse
import os
from typing import Optional

try:
    import torch
    import torch.nn as nn
except ImportError:
    torch = None
    nn = None


# -----------------------------------------------------------------------------
# 1. PP-OCRv4 Text Recognition Model (SVTR-LCNet / CTC)
# -----------------------------------------------------------------------------
def export_ppocrv4_rec(
    model: "nn.Module", 
    output_path: str = "models/ppocrv4_rec.onnx"
) -> str:
    """
    Exports PP-OCRv4 text recognizer with dynamic sequence length (width) and batch size.
    Input:  [batch_size, 3, 48, width] (normalized text line strip)
    Output: [batch_size, seq_len, num_classes] (CTC logits)
    """
    if torch is None:
        raise RuntimeError("PyTorch is required for ONNX export.")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    model.eval()
    dummy_input = torch.randn(1, 3, 48, 320, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch_size", 3: "width"},
            "output": {0: "batch_size", 1: "seq_len"},
        },
    )
    print(f"[OK] Exported PP-OCRv4 Rec -> {output_path} (opset=18, dynamic width/batch)")
    return output_path


# -----------------------------------------------------------------------------
# 2. AdaFace-ResNet100 Face Embedding Model (512-D Quality-Adaptive)
# -----------------------------------------------------------------------------
def export_adaface_r100(
    model: "nn.Module", 
    output_path: str = "models/adaface_ir100_ms1mv2.onnx"
) -> str:
    """
    Exports AdaFace-ResNet100 with dynamic batch size.
    Input:  [batch_size, 3, 112, 112] (aligned 5-point facial crops)
    Output: [batch_size, 512] (L2-normalized identity embedding vectors)
    """
    if torch is None:
        raise RuntimeError("PyTorch is required for ONNX export.")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    model.eval()
    dummy_input = torch.randn(1, 3, 112, 112, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["face_image"],
        output_names=["embedding"],
        dynamic_axes={
            "face_image": {0: "batch_size"},
            "embedding": {0: "batch_size"},
        },
    )
    print(f"[OK] Exported AdaFace-R100 -> {output_path} (opset=18, dynamic batch)")
    return output_path


# -----------------------------------------------------------------------------
# 3. DocTamper Document Tampering Localization Model (DTD / ResNet-50 FCN)
# -----------------------------------------------------------------------------
def export_doctamper_dtd(
    model: "nn.Module", 
    output_path: str = "models/doctamper_fcn_r50.onnx"
) -> str:
    """
    Exports DocTamper DTD with dynamic spatial resolution (height, width) and batch size.
    Input:  [batch_size, 3, height, width] (arbitrary rectified document crop)
    Output: [batch_size, 1, height, width] (continuous pixel-level tamper probability map)
    """
    if torch is None:
        raise RuntimeError("PyTorch is required for ONNX export.")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    model.eval()
    dummy_input = torch.randn(1, 3, 512, 512, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["document_image"],
        output_names=["tamper_map"],
        dynamic_axes={
            "document_image": {0: "batch_size", 2: "height", 3: "width"},
            "tamper_map": {0: "batch_size", 2: "height", 3: "width"},
        },
    )
    print(f"[OK] Exported DocTamper DTD -> {output_path} (opset=18, dynamic H/W/batch)")
    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SIH26188 ONNX Exporter")
    parser.add_argument("--model", choices=["ppocr", "adaface", "doctamper", "all"], default="all")
    parser.add_argument("--outdir", default="models", help="Output directory for ONNX checkpoints")
    args = parser.parse_args()
    print(f"SIH26188 ONNX Exporter initialized for target: {args.model} -> {args.outdir}")
