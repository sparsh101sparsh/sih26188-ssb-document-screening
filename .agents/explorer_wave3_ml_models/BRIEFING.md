# BRIEFING — 2026-08-23T01:55:20Z

## Mission
Conduct rigorous adversarial technical investigation and live web research on ML, OCR, Face Biometrics, Forensics, and Hardware execution (Topics A, B, C, D, E, F, J) for SIH26188 Wave 3 Architecture Synthesis.

## 🔒 My Identity
- Archetype: explorer
- Roles: [ML & Forensic Models Adversarial Researcher, Investigation, Synthesis]
- Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_wave3_ml_models
- Original parent: 90652939-fdf4-44c1-b9c4-ebc48718590a
- Milestone: wave3_ml_forensics_adversarial_investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT modify project source code
- Minimum 8 distinct web searches using search_web (12 conducted)
- Categorize every technical claim as: [Verified Fact], [Source Claim], [Assumption], or [Inference]
- Hardware reality: M4 Mac 16GB Unified RAM (Dev) vs RTX 4060 / Jetson Orin (Target Deployment)
- Output report to ml_models_research_report.md and handoff to handoff.md, message parent

## Current Parent
- Conversation ID: 90652939-fdf4-44c1-b9c4-ebc48718590a
- Updated: 2026-08-23T01:55:20Z

## Investigation State
- **Explored paths**:
  - Qwen2.5-VL-3B vs PP-OCRv4 latency, memory, throughput on M4 Mac vs RTX 4060
  - Multilingual OCR in PaddleOCR (Tibetan, Devanagari, English) & Indo-Bhutan border document landscape (CID, EPIC, Passports)
  - Pretrained checkpoints, repos, licenses, and ONNX pipelines for OmniMRZ, DocTamper, TruFor, AdaFace-ResNet100, InsightFace buffalo_l, MiniFASNetV2
  - Apple Silicon M4 16GB Unified Memory budget breakdown (System OS, Core Models ~0.92GB, Qwen Fallback ~3.1GB, Total Peak ~10.3GB, Green memory pressure)
  - Stamp Authentication SOTA (2024-2026) and student feasibility: 4-stage hybrid architecture (HSV/Hough -> SSIM template match -> DocTamper/TruFor forensics -> Context cross-validation)
- **Key findings**:
  - Qwen2.5-VL-3B takes 3.5–6.0s for autoregressive token decoding; cannot be primary OCR in <5s budget; must remain Tier-2 asynchronous quality gate.
  - Dzongkha OCR should be deferred in MVP: 100% of critical security fields on Bhutanese border documents are in English / ICAO MRZ; generic Tibetan OCR has high CER (>15%).
  - Pretrained checkpoints exist for all 5 core models; MiniFASNetV2 is Apache-2.0; TruFor/DocTamper/InsightFace are Academic/Non-Commercial (permissible for SIH); ONNX export is viable.
  - 16GB M4 Unified Memory comfortably accommodates the entire pipeline (6.02GB baseline, 9.12GB with pinned Qwen2.5-VL).
  - Stamp authentication gap resolved via hybrid template + forensic cross-validation module.
- **Unexplored areas**: None. All 5 core questions and 7 topics thoroughly investigated.

## Key Decisions Made
- Confirmed PP-OCRv4 as Primary OCR (<35ms) and Qwen2.5-VL-3B as Tier-2 Async Quality Gate.
- Confirmed Dzongkha OCR deferral for MVP with robust technical rationale.
- Formulated concrete 16GB M4 RAM allocation matrix.
- Designed 4-stage Hybrid Stamp Verification Engine specification.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- BRIEFING.md — Persistent working memory and state
- progress.md — Liveness heartbeat and step tracking
- ml_models_research_report.md — Comprehensive technical findings report
- handoff.md — 5-component self-contained handoff report
