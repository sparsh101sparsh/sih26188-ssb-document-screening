# SIH26188 — Pretrained Model Checkpoint Repository & Storage Guide
**Architecture Reference**: Section 3.3 (Pretrained Weights & Checkpoints Repository)

## 1. Storage Location
To preserve internal flash memory on development machines, all large weights (> 10 MB) are stored on the high-speed external NVMe SSD:
```
Primary Path: /Volumes/issparsh/sih26188_models/
Fallback Path: sih26188_project/backend/models/
```
The application dynamically searches `/Volumes/issparsh/sih26188_models/` first via `settings.MODELS_DIR`. You can override this using the `SIH_MODELS_DIR` environment variable.

---

## 2. Pretrained Model Weights Manifest

| # | Subsystem | Model Checkpoint Name | Size | Architecture / Task | Source Repository |
|---|---|---|---|---|---|
| 1 | OCR Detection | `ch_PP-OCRv4_det_infer.onnx` | 4.6 MB | DBNet++ Text Polygon Detector | PaddleOCR Official |
| 2 | OCR Devanagari | `devanagari_PP-OCRv4_rec.onnx` | 10.8 MB | SVTR-LCNet Hindi/Nepali CTC | PaddleOCR Official |
| 3 | OCR Latin / MRZ | `en_PP-OCRv4_rec_infer.onnx` | 9.8 MB | SVTR-LCNet Latin/MRZ CTC | PaddleOCR Official |
| 4 | MRZ Parser | `omnimrz_ppocr_v4.onnx` | 4.2 MB | OmniMRZ OCR-B Recognizer | AzwadFawadHasan/OmniMRZ |
| 5 | Face Detector | `scrfd_10g_bnkps.onnx` | 16.2 MB | SCRFD-10GF 5-Landmark Detector | DeepInsight InsightFace |
| 6 | Face Embedding | `adaface_ir100_ms1mv2.onnx` | 178 MB | AdaFace-ResNet100 512-D Cosine | mk-minchul/AdaFace |
| 7 | Anti-Spoofing (2.7x) | `2.7_80x80_MiniFASNetV2.onnx` | 4.2 MB | Patch CNN + Fourier Loss | Minivision Silent-Face |
| 8 | Anti-Spoofing (4.0x) | `4_0_0_80x80_MiniFASNet.onnx` | 4.2 MB | Context CNN + Fourier Loss | Minivision Silent-Face |
| 9 | Text Tampering | `doctamper_fcn_r50.onnx` | 158 MB | ResNet-50 Frequency Perception Head | qcf-568/DocTamper |
| 10 | Splicing & Inpainting| `trufor_general.pth.tar` | 258 MB | SegFormer-B0 + Noiseprint++ | grip-unina/TruFor |
| 11 | Tier-2 Quality Gate | `qwen2.5-vl-3b-instruct-q4.gguf` | 1.95 GB | Qwen2.5-VL 3B Vision-Language | Qwen / HuggingFace |

---

## 3. Automated Ingestion
To download all required model weights into `/Volumes/issparsh/sih26188_models/`, run:
```bash
chmod +x backend/scripts/download_weights.sh
./backend/scripts/download_weights.sh /Volumes/issparsh/sih26188_models
```

---

## 4. Integrity Verification (SHA-256 Checksums)
Run SHA-256 verification to ensure checkpoint integrity:
```bash
shasum -a 256 /Volumes/issparsh/sih26188_models/*.onnx
```
