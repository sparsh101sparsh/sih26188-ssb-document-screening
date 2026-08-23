# BRIEFING — 2026-08-22T16:53:00Z

## Mission
Investigate and benchmark SOTA architectures for Module 2 (Face Verification & Anti-Spoofing) and Module 3 (Document Tampering & Forgery Detection) for the SIH26188 SSB Fake Identity & Document Screening System.

## 🔒 My Identity
- Archetype: explorer
- Roles: [Biometrics Specialist, Document Forensics Specialist, Benchmarking & System Architect]
- Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_face_tampering
- Original parent: 4f25646f-7cc6-486f-b510-e51f57fdcb49
- Milestone: SOTA Architecture & Forensic Benchmark for Module 2 & 3

## 🔒 Key Constraints
- Read-only investigation — do NOT implement production code in codebase
- Deliver exact model names, weights, ONNX conversion feasibility, package versions, and academic citations (2024-2026)
- Evaluate real-world edge/border constraints (low-res ID vs live camera, 5-10 year age gap, recompression artifacts, CPU/GPU latency/memory)

## Current Parent
- Conversation ID: 4f25646f-7cc6-486f-b510-e51f57fdcb49
- Updated: 2026-08-22T16:53:00Z

## Investigation State
- **Explored paths**:
  - `/Users/iamsparsh00321/Downloads/diddyparty.txt` (Grok multi-agent debate and preliminary architecture)
  - 8 distinct adversarial web searches (AdaFace, ArcFace, SCRFD, MiniFASNet, TruFor, DocTamper, CAT-Net v2, PSCC-Net, DocForge-Bench 2026, AIForge-Doc 2026)
- **Key findings**:
  - Module 2: AdaFace-ResNet100 significantly outperforms standard ArcFace on degraded low-resolution ID photos (TinyFace 75.4% vs 68.4%) and cross-age verification (AgeDB-30 98.8%), while MiniFASNetV2-SE provides dual-crop passive liveness protection (<15ms).
  - Module 3: Pure ELA is deeply flawed for border screening. SOTA is a dual-stream engine: DocTamper DTD (FPH) for text manipulation + TruFor (RGB Transformer + Noiseprint++) for photo/stamp tampering, calibrated using DocForge-Bench adaptive threshold ($\tau_{adapt} = 0.18$) to eliminate the small-area AUC-F1 gap.
- **Unexplored areas**: None. Complete investigation and benchmarking finalized.

## Key Decisions Made
- Selected Module 2 Winner: SCRFD-10GF + AdaFace-R100 (Glint360K) + MiniFASNetV2-SE (2.7x/4.0x ensemble).
- Selected Module 3 Winner: DocTamper DTD + TruFor + DocForge-Bench Adaptive Calibration ($\tau_{adapt} = 0.18$).
- Benchmarked total latency: 86.7 ms on GPU, 552.2 ms on CPU; ~1.15 GB VRAM footprint.

## Artifact Index
- `.agents/explorer_face_tampering/report.md` — Final comprehensive technical report
- `.agents/explorer_face_tampering/handoff.md` — 5-component handoff report
- `.agents/explorer_face_tampering/progress.md` — Liveness and progress tracker
- `.agents/explorer_face_tampering/DISPATCH.md` — Dispatch record
