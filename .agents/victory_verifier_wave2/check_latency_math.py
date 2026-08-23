#!/usr/bin/env python3
import re

# In doc 04, the latency breakdown table:
# Stage 1: Document Preprocessing & Orientation: 13.8 ms (GPU) / 42.0 ms (CPU) / 85 MB
# Stage 2: Ingestion & Crypto/MRZ:
#   - Path A (Aadhaar QR): 4.2 ms (CPU) / 0 MB
#   - Path B (MRZ Checksum): 2.1 ms (CPU) / 0 MB
# Stage 3: Visual Text OCR (PP-OCRv4): 48.5 ms (GPU) / 285.0 ms (CPU) / 380 MB
# Stage 4: Biometrics & Liveness:
#   - MiniFASNetV2 FAS: 6.2 ms (GPU) / 24.0 ms (CPU) / 120 MB
#   - AdaFace-R100 Embedding (Dual Crop): 6.4 ms (GPU) / 78.0 ms (CPU) / 278 MB
#   - Cosine Match: 0.2 ms (CPU) / 0 MB
# Stage 5: Forensic Tampering Detection:
#   - TruFor (Global + Noiseprint++): 82.0 ms (GPU) / 620.0 ms (CPU) / 650 MB
#   - DocTamper DTD (Text/MRZ ROI): 45.0 ms (GPU) / 340.0 ms (CPU) / 450 MB
# Stage 6: Decision Engine & Heatmap Blending: 14.0 ms (CPU) / 45 MB

# Let's compute Sequential Total (worst case, e.g. Passport with OCR + Bio + Dual Tampering):
# 13.8 + 2.1 + 48.5 + 6.2 + 6.4 + 0.2 + 82.0 + 45.0 + 14.0
gpu_sequential = 13.8 + 2.1 + 48.5 + 6.2 + 6.4 + 0.2 + 82.0 + 45.0 + 14.0
cpu_sequential = 42.0 + 2.1 + 285.0 + 24.0 + 78.0 + 0.2 + 620.0 + 340.0 + 14.0
vram_total = 85 + 380 + 120 + 278 + 650 + 450 + 45 # in MB

# Parallel Execution (CUDA multi-stream concurrency):
# Stage 1: 13.8 ms
# Stage 2: 2.1 ms
# Stage 3, 4, 5 in parallel:
# Branch A (OCR): 48.5 ms
# Branch B (Biometrics): 6.2 + 6.4 + 0.2 = 12.8 ms
# Branch C (Tampering TruFor + DocTamper): max(82.0, 45.0) = 82.0 ms (or TruFor 82.0 ms)
# Max of branches = 82.0 ms
# Stage 6 (Decision): 14.0 ms
gpu_parallel = 13.8 + 2.1 + max(48.5, 12.8, 82.0) + 14.0

print(f"Sequential GPU Latency on RTX 4060: {gpu_sequential:.1f} ms")
print(f"Parallel GPU Latency on RTX 4060:   {gpu_parallel:.1f} ms")
print(f"Sequential CPU Fallback Latency:   {cpu_sequential:.1f} ms ({cpu_sequential/1000:.2f} s)")
print(f"Peak VRAM Allocation:              {vram_total} MB ({vram_total/1024:.2f} GB)")

assert gpu_sequential < 300.0, "GPU sequential latency must be < 300 ms"
assert gpu_parallel < 200.0, "GPU parallel latency must be < 200 ms"
assert cpu_sequential < 2000.0, "CPU fallback latency must be < 2.0 s (well below 5.0 s SLA)"
assert vram_total < 2500, "VRAM must fit comfortably in 8GB RTX 4060 (< 2.5 GB)"
print("[PASS] All latency and VRAM arithmetic is mathematically sound and consistent!")
