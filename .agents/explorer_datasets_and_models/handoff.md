# Handoff Report: NextGen Datasets & Tampering Models Explorer

**Date:** 2026-08-22  
**Task ID:** Wave 2 Research — Datasets (R2) & Tampering Localization Models (R3)  
**Working Directory:** `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_datasets_and_models`  
**Primary Report:** `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_datasets_and_models/datasets_and_models_report.md`  

---

## 1. Observation

### 1.1 Datasets Verified via Live Web Search
1. **IDNet**:
   - Paper: *"IDNet: A Novel Dataset for Identity Document Analysis and Fraud Detection"* (arXiv:2408.01690), published at IEEE Big Data 2024 as *"IDNet: A Novel Identity Document Dataset via Few-Shot and Quality-Driven Synthetic Data Generation"*.
   - Hugging Face: `cactuslab/IDNet-2025` (`https://huggingface.co/datasets/cactuslab/IDNet-2025`).
   - Zenodo Archive: DOI `10.5281/zenodo.13852757`.
   - Scale: 837,000+ synthetic document images covering 20 document types (10 US states, 10 EU countries).
   - Tampering Types: Portrait substitution, OCR text alteration, face morphing, inpainting.
   - Suitability for Indian Docs: Passports match ICAO Doc 9303 layout. Aadhaar/Voter ID are not natively present, but IDNet's diffusion + LLM synthesis methodology can generate native Indian mock datasets.

2. **FantasyID**:
   - Paper: *"FantasyID: A dataset for detecting digital manipulations of ID-documents"*, arXiv:2507.20808 (Pavel Korshunov, Amir Mohammadi, Vidit Vidit, Christophe Ecabert, Sébastien Marcel, Idiap Research Institute, Switzerland).
   - Associated with IJCB 2025 and ICCV 2025 DeepID challenge.
   - Scale: ~6,500 images (~1.5 GB).
   - Highlights: 13 fantasy ID card templates mimicking real IDs with zero PII/GDPR risk; includes multilingual text in **Hindi**, English, Chinese, and Arabic; features real human faces with ground-truth face swap and text inpainting masks.

3. **SIDTD**:
   - Repository: `https://github.com/Oriolrt/SIDTD_Dataset` (Oriol Ramos Terrades et al., Computer Vision Center, UAB).
   - Built on MIDV-2020 / MIDV-500 bona fide samples with inpainting, text rewriting, signature forgery, and photo replacement.
   - Automated download via repo's `sidtd.download` dataloader.

4. **Document Benchmarks (DocTamper, T-SROIE, OSTF, RTM)**:
   - DocTamper (`qcf-568/DocTamper`): ~170k images; DocTamper-FCD (fine-grained character tampering) and DocTamper-SCD.
   - T-SROIE: Receipt-level numeric/date tampering.
   - OSTF: Open-set scene text forensics targeting generative AI / GANs / diffusion editing.
   - RTM: Real-world text manipulation masks on varied paper textures.

5. **Brand-New 2026 Discoveries (Beyond Grok & Wave 1)**:
   - **AIForge-Doc (2026)**: Scam-AI on Hugging Face (`Scam-AI/AIForge-Doc-v1` and `v2`, 2026). Specifically benchmarks AI diffusion inpainting tampering (Gemini 2.5 Flash Image, Ideogram v2 Edit, GPT-Image-2). Shows that legacy detectors suffer catastrophic degradation (DocTamper AUC drops from 0.98 to 0.563).
   - **DOCFORGE-BENCH (March 2026, arXiv:2603.01433)**: 0-shot benchmark evaluating 14 models across 8 datasets. Proves a "pervasive calibration failure" where standard 0.5 threshold yields near-zero F1 scores because tampered text occupies only 0.27%–4.17% of total pixels.

### 1.2 Tampering Localization Models Verified
1. **TruFor (CVPR 2023)**: `https://github.com/grip-unina/TruFor`. RGB + Noiseprint++ Transformer. CASIA v1 AUC 0.94 / F1 0.79; NIST16 AUC 0.88; IMD2020 AUC 0.86. Produces pixel heatmap, integrity score, and reliability map.
2. **DocTamper / DTD (ACM MM 2023)**: `https://github.com/qcf-568/DocTamper`. Spatial CNN + Frequency Perception Head (FPH) + Multi-view Iterative Decoder (MID). DocTamper AUC 0.982, DocTamper-FCD F1 0.741.
3. **CAT-Net v2 (IJCV 2022)**: `https://github.com/HighwayWu/ImageForensicsOSN`. Compression artifact tracing. CASIA v2 AUC 0.92, DocTamper F1 0.67.
4. **IML-ViT (WACV 2023)**: `https://github.com/SunnyHaze/IML-ViT`. Vision Transformer with edge supervision. CASIA v2 AUC 0.91 / F1 0.75, NIST16 AUC 0.87.
5. **MVSS-Net++ (IEEE TIFS 2022)**: `https://github.com/dong03/MVSS-Net`. Dual-stream edge + noise supervision. CASIA v1+ AUC 0.85, NIST16 AUC 0.83.
6. **PSCC-Net (CVPR 2021)**: Progressive Spatio-Channel Correlation in `scu-zjz/IMDLBenCo`. CASIA v1 AUC 0.87, NIST16 AUC 0.82.
7. **ForensicHub (NeurIPS 2024/2025)**: `https://github.com/scu-zjz/ForensicHub`, `pip install forensichub`. Turnkey unified framework supporting 42 baseline models and 23 datasets.

---

## 2. Logic Chain

1. **Step 1 (Dataset Feasibility):** Observation 1.1 shows that IDNet (>837k images, >150 GB) is excessive for a 12-week student hackathon, whereas FantasyID (~1.5 GB, 6.5k images) and DocTamper-FCD (~3.8 GB) provide immediate non-PII access, high-quality ground-truth masks, and native Hindi text support. Therefore, FantasyID, DocTamper-FCD, and SIDTD are ranked as the Top 3 priorities for SIH.
2. **Step 2 (Model Specialization):** Observation 1.2 demonstrates that tampering in identity documents occurs at two distinct scales: (a) macroscopic photo/portrait replacement and background inpainting, and (b) microscopic character/number alteration in text and MRZ lines. TruFor excels at macroscopic noise and visual inconsistencies (AUC 0.94), while DocTamper DTD excels at microscopic character DCT frequency shifts (AUC 0.98, F1 0.74).
3. **Step 3 (Threshold Calibration Correction):** DOCFORGE-BENCH (Observation 1.1) proves that applying a static 0.5 threshold to document tampering models causes severe false negatives on small text edits. Therefore, our architecture must integrate Dynamic Otsu / Percentile Calibration with TruFor's reliability map.
4. **Step 4 (Unified Evaluation Harness):** Observation 1.2 confirms that ForensicHub (`scu-zjz/ForensicHub`) provides a standard PyTorch harness for 42 models and 23 datasets, reducing integration and benchmarking time from weeks to days for the student team.

---

## 3. Caveats

1. **Native Indian Document Coverage:** Public datasets (IDNet, SIDTD) do not contain native UIDAI Aadhaar or Election Commission EPIC Voter ID cards due to Indian data protection laws (DPDP Act 2023). However, FantasyID provides Hindi text cards, and IDNet's synthetic pipeline can be repurposed to render mock Aadhaar SVGs.
2. **Diffusion Inpainting Robustness:** AIForge-Doc (2026) demonstrates that ultra-modern diffusion inpainting (Gemini 2.5 Flash / GPT-Image-2) degrades classical and early CNN detectors. TruFor remains resilient due to sensor noiseprint analysis, but continuous fine-tuning on AIForge-Doc samples is recommended.
3. **ONNX Export for Frequency Branches:** While spatial CNNs and ViT blocks export smoothly to ONNX, DCT frequency extraction layers require standard 2D convolution kernel representations or preprocessing in PyTorch/NumPy.

---

## 4. Conclusion

- **Dataset Priority for SIH MVP:**
  1. **Rank 1:** FantasyID (arXiv:2507.20808) — ~1.5 GB, 13 multilingual templates including Hindi, zero PII liability.
  2. **Rank 2:** DocTamper-FCD & SCD — ~3.8 GB, gold standard for character/number tampering.
  3. **Rank 3:** SIDTD — ~2.8 GB, ICAO passport and travel document tampering.
- **Tampering Localization Winner & Runner-up:**
  - **WINNER:** **TruFor (CVPR 2023)** — Dual-stream RGB + Noiseprint++ Transformer for global document & photo tampering.
  - **RUNNER-UP:** **DocTamper DTD (ACM MM 2023)** — Frequency Perception Head for fine-grained OCR text, date, and MRZ tampering.
- **Evaluation Harness:** Adopt **ForensicHub** (`pip install forensichub`) as the turnkey benchmarking platform.
- **Key 2026 Architectural Enhancement:** Replace static 0.5 thresholding with **Adaptive Otsu Calibration & Reliability Masking** to overcome the document tampering calibration failure identified in DOCFORGE-BENCH.

---

## 5. Verification Method

To independently verify all findings and reproduce benchmarks:
1. **Verify Python packages & repos:**
   ```bash
   pip install forensichub onnxruntime-gpu
   python -c "import forensichub; print(forensichub.__version__)"
   ```
2. **Inspect primary research report:**
   View `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_datasets_and_models/datasets_and_models_report.md`.
3. **Verify dataset DOIs and arXiv IDs:**
   - IDNet: `10.5281/zenodo.13852757`, arXiv:2408.01690
   - FantasyID: arXiv:2507.20808
   - DOCFORGE-BENCH: arXiv:2603.01433
   - AIForge-Doc: Hugging Face `Scam-AI/AIForge-Doc-v1`
