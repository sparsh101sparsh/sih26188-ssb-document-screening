# BRIEFING — 2026-08-22T17:15:00Z

## Mission
Deep-dive next-generation datasets and tampering localization models for SIH26188, challenge previous assumptions with live 2026 research, evaluate 6 key models + ForensicHub harness, rank top 3 datasets for student MVP, discover new 2025/2026 datasets, and establish the definitive tampering detection stack.

## 🔒 My Identity
- Archetype: explorer
- Roles: NextGen Datasets & Tampering Models Explorer
- Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_datasets_and_models
- Original parent: 8ed2e5d0-023d-4a28-a69c-2dd83366fda8
- Milestone: wave2_deepdive_datasets_models

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Must perform 10-15+ live web searches to verify facts, URLs, paper details, benchmark metrics, license, repo status
- Must cover IDNet, FantasyID, SIDTD, DocTamper suite, brand-new 2025/2026 dataset discovery
- Must evaluate 6 tampering models (TruFor, PSCC-Net, MVSS-Net/++, CAT-Net v1/v2, IML-ViT, DocTamper/DTD/FFDN) + ForensicHub
- Synthesize actionable findings into `datasets_and_models_report.md` and `handoff.md`

## Current Parent
- Conversation ID: 8ed2e5d0-023d-4a28-a69c-2dd83366fda8
- Updated: 2026-08-22T17:15:00Z

## Investigation State
- **Explored paths**: .agents/ORIGINAL_REQUEST.md, 19 live web search targets across ArXiv, GitHub, Hugging Face, Zenodo.
- **Key findings**:
  1. IDNet (>837k images, arXiv:2408.01690, IEEE Big Data 2024, Hugging Face `cactuslab/IDNet-2025`, Zenodo DOI: 10.5281/zenodo.13852757).
  2. FantasyID (arXiv:2507.20808, Idiap Research, ~6.5k images, 13 templates including Hindi, zero PII risk, Rank #1 for SIH MVP).
  3. SIDTD (Oriol Ramos et al., MIDV-2020 base, `Oriolrt/SIDTD_Dataset`).
  4. Brand-new 2026 Discoveries: AIForge-Doc (Scam-AI 2026 GenAI inpainting dataset) and DOCFORGE-BENCH (March 2026, arXiv:2603.01433, identifying calibration failure in fixed 0.5 threshold).
  5. SOTA Models: TruFor (CVPR 2023, Winner) + DocTamper DTD (ACM MM 2023, Runner-up) + ForensicHub (`pip install forensichub`, NeurIPS 2024/2025).
- **Unexplored areas**: None for this milestone. Complete findings documented in `datasets_and_models_report.md`.

## Key Decisions Made
- Confirmed TruFor (global/photo) + DocTamper DTD (text/MRZ) as the winning tampering detection engine.
- Added Adaptive Otsu Thresholding to resolve the DOCFORGE-BENCH calibration failure issue.
- Ranked FantasyID #1, DocTamper-FCD #2, and SIDTD #3 for the 5-person SIH team.

## Artifact Index
- datasets_and_models_report.md — Comprehensive research report on nextgen datasets & tampering localization models
- handoff.md — Structured 5-component handoff report
- progress.md — Real-time progress and heartbeat tracking
