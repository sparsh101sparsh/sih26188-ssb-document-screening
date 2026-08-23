## 2026-08-22T17:15:12Z

You are Worker 2 (Domain Specialist: Tampering Models, ForensicHub & MVP Blueprint).
Your working directory is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_2_r3_r4
Project Root: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford

MANDATORY FIRST STEP: Read /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

INPUT ARTIFACTS TO READ:
1. /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/PROJECT.md
2. /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_datasets_and_models/datasets_and_models_report.md
3. /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_grok_challenge/grok_challenge_report.md
4. /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/spec_miner_wave2_source/source_extraction_report.md
5. /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/FINAL_ARCHITECTURE_AND_RESEARCH_REPORT.md

YOUR EXCLUSIVE WRITE OWNERSHIP:
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/03_TAMPERING_MODELS_AND_FORENSICHUB.md`
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md`

YOUR DELIVERABLE REQUIREMENTS:
1. Author `03_TAMPERING_MODELS_AND_FORENSICHUB.md`:
   - Detailed comparative analysis of 6 tampering localization models: TruFor (Winner), DocTamper DTD (Runner-up), CAT-Net v2, IML-ViT, MVSS-Net++, PSCC-Net.
   - Comprehensive benchmark comparison table (CASIA v1/v2, NIST16, IMD2020, DocTamper FCD F1, latency, VRAM, ONNX readiness, GitHub URLs).
   - ForensicHub evaluation (`scu-zjz/ForensicHub`, `pip install forensichub`, NeurIPS 2024/2025): feasibility as a student benchmark harness.
   - Wave 1 comparison & upgrade: Tactical upgrade with Adaptive Otsu Calibration and Reliability Masking to solve small text edit misclassification (DOCFORGE-BENCH findings).
   - End-to-end JSON schema for forensic output with risk score, detected_issues, and RGB tampering heatmaps.

2. Author `04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md`:
   - Complete 12-week sprint plan for a 5-person student team (Roles: Lead ML/Pipeline, Computer Vision/Forensics, Backend/Crypto/DB, Frontend/Mobile/UI, QA/Demo/DevOps).
   - Week-by-week milestones, deliverables, and risk-burn-down charts.
   - Exact ONNX export recipes (PyTorch to ONNX FP16 with dynamic axes for PP-OCRv4, AdaFace-R100, TruFor, DocTamper DTD, MiniFASNet).
   - Detailed component-wise latency budget on NVIDIA RTX 4060 (8GB VRAM), total runtime <5.0s (demonstrated at ~260ms).
   - Scripted Live Demo Day Scenario for an SSB Border Officer (step-by-step UI actions, inputs, outputs, heatmaps, alert triggers).
   - Phase 2 / Future Work roadmap (multilingual VLM, synthetic hologram verification, federated edge updates, ABIS integration).

Write these two publication-grade markdown files, then write your handoff report in `.agents/worker_2_r3_r4/handoff.md` and message parent.
