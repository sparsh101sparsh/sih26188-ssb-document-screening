# Project: SIH26188 Wave 2 — AI-Based Fake Identity & Document Screening System (MHA / SSB)

## Architecture
Multi-tiered, hybrid offline-first identity screening pipeline designed for Sashastra Seema Bal (SSB) border outposts and transit checkpoints (India-Nepal, India-Bhutan).
Pipeline combines:
1. Document Capture & Quality Gate (Fast camera capture, blur/glare check, Aadhaar Secure QR offline decompression & RSA-2048 public key cryptographic verification)
2. Text Extraction & Cross-Field Consistency (PaddleOCR-VL / PP-OCRv4 + MRZ parser + visual-to-digital cross check)
3. Face Verification & Anti-Spoofing (Buffalo_l / AdaFace-R100 ONNX + MiniFASNet anti-spoofing)
4. SOTA Document Tampering Localization (TruFor / DocTamper DTD heatmap generation + classical forensic sanity checks ELA/JPEG Ghost)
5. Edge Inference Orchestration (FastAPI + ONNX Runtime Execution Providers / TensorRT on NVIDIA RTX 4060 laptop, sub-5-second total pipeline latency)
6. Dual-Interface UI (Next.js 15 Operator Dashboard + Flutter Mobile Field App)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Grok 6 MVP Cuts Empirical Challenge | Deep empirical analysis & live web search on AdaFace vs InsightFace, Dual Fusion, Qwen2.5-VL gate, Aadhaar QR necessity, Flutter role, and 1.45s latency target with explicit verdicts | M1 | Request R1 |
| F2 | Next-Gen Datasets Deep-Dive | Rigorous analysis of IDNet, FantasyID (arXiv:2507.20808), SIDTD, DocTamper suite, discovery of >=1 novel 2026 dataset, and Top-3 SIH acquisition ranking | M2 | Request R2 |
| F3 | SOTA Tampering Localization Models & ForensicHub | Detailed evaluation of TruFor, PSCC-Net, MVSS-Net, CAT-Net, IML-ViT, DTD/FFDN, ForensicHub framework feasibility, winner/runner-up selection, and Wave 1 comparison | M3 | Request R3 |
| F4 | SIH Grand Finale MVP Blueprint | 5-person 12-week sprint plan, ONNX export recipes, component-wise latency budget (<5s on RTX 4060), scripted SSB officer demo scenario, Phase 2 future roadmap | M4 | Request R4 |
| F5 | 8-Minute Winning Pitch Script & Scoring Strategy | Minute-by-minute pitch script, SIH 6-criteria rubric alignment, top 3 winning demo moments | M5 | Request R5 |
| F6 | Master Report & Modular Documentation Compilation | Publication-grade `WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md` and modular docs in `sih26188_wave2/docs/` | M6 | Master Synthesis |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Grok MVP Challenge (R1) | 20+ live web searches, empirical benchmarks, AdaFace/InsightFace profiling, Qwen2.5-VL AWQ latency, Aadhaar QR cryptography, Flutter role, latency verdict matrix | none | IN_PROGRESS |
| M2 | Datasets Deep-Dive (R2) | IDNet, FantasyID, SIDTD, novel 2026 dataset discovery, license/access/size/format, Top 3 ranking | none | IN_PROGRESS |
| M3 | Tampering Models Deep-Dive (R3) | TruFor, PSCC-Net, MVSS-Net, CAT-Net, IML-ViT, DTD, ForensicHub evaluation, benchmark comparison table, clear winner/runner-up | none | IN_PROGRESS |
| M4 | Grand Finale MVP Blueprint (R4) | Sprint plan, ONNX export guide, RTX 4060 latency budget (<5s), live demo script, Phase 2 | M1, M2, M3 | PLANNED |
| M5 | 8-Minute Pitch & Scoring Strategy (R5) | 8-minute pitch script, 6 SIH criteria mapping, top 3 demo moments | M1, M4 | PLANNED |
| M6 | Master Synthesis & Documentation | Compile `WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md` and `sih26188_wave2/docs/` files | M1, M2, M3, M4, M5 | PLANNED |

## Code Layout & Artifact Locations
- Source transcript: `/Users/iamsparsh00321/Downloads/epsteindiddyparty.txt`
- Wave 1 Master Report: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/FINAL_ARCHITECTURE_AND_RESEARCH_REPORT.md`
- Wave 2 Master Report: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md`
- Wave 2 Modular Docs:
  - `sih26188_wave2/docs/01_GROK_MVP_CUTS_EMPIRICAL_CHALLENGE.md`
  - `sih26188_wave2/docs/02_NEXTGEN_DATASETS_DEEP_DIVE.md`
  - `sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md`
  - `sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md`
  - `sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md`
