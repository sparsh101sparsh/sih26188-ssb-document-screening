# SIH26188 Wave 3 Architecture Synthesis — Authoritative Specification Mining Report

**Document Classification**: Authoritative Engineering Specification Mining Report  
**Project**: Smart India Hackathon 2026 (SIH26188) — AI-Based Fake Identity & Document Screening System  
**End-User / Deployment**: Ministry of Home Affairs (MHA) / Sashastra Seema Bal (SSB), Police II Division  
**Author**: Document & Conversation Spec Miner (Wave 3 Architecture Synthesis)  
**Date**: August 2026 (Synthesized: 2026-08-23)  
**Status**: COMPLETE / VERIFIED  

---

## 1. Executive Summary & Source Artifact Inventory

This report provides a systematic, exhaustive extraction, comparative analysis, and technical evaluation of the three authoritative foundation artifacts for SIH26188:
1. **Baseline Architecture Report (`baseline_arch.txt`)**: 1,071 lines (3,144 parsed text lines). The authoritative production-grade master architecture detailing a 5-module offline edge screening platform for Indo-Nepal (1,751 km) and Indo-Bhutan (699 km) borders.
2. **Mainchat Conversation (`conv_mainchat.txt`)**: 6,415 lines (9,403 parsed lines). In-depth line-by-line architectural review, questioning design choices, identifying gaps (hardware realities, desktop application packaging, pretrained model focus, Android scoping).
3. **Sidebyside Conversation (`conv_sidebyside.txt`)**: 2,205 lines (2,900 parsed lines). Independent adversarial inquiry challenging OCR languages, Qwen2.5-VL-3B primary vs fallback positioning, stamp authentication gaps, phone-to-edge network topologies, and cross-validation mechanics.

### Source Document Overview & Relationship

| Source File | Line Count | Primary Role | Key Focus Areas |
|---|---|---|---|
| `baseline_arch.txt` | 1,071 lines | Authoritative Baseline Foundation | SOTA benchmarks, 3-stream parallel execution, pinned runtime dependencies, 16-phase roadmap, VRAM sizing for RTX 4060 / Jetson Orin. |
| `conv_mainchat.txt` | 6,415 lines | Critical Architecture Review & Gap Analysis | M4 MacBook Air 16GB dev environment constraints, Tauri desktop app vs Next.js dashboard, inference-only pretrained weights, Android agent handoff. |
| `conv_sidebyside.txt` | 2,205 lines | Adversarial Inquiry & Sub-System Deep Dives | Stamp authentication module gap, Qwen2.5-VL vs PP-OCRv4 role definition, Devanagari/Latin vs Dzongkha script scope, router-less local networking. |

---

## 2. Comprehensive Topic-by-Topic Extraction & Evaluation (Topics A through K)

---

### Topic A: Development Hardware Reality (M4 Mac 16GB RAM Dev vs RTX 4060 Target Deployment)

#### 1. Baseline Architecture Specification
- **Hardware Target**: Intel Core i7-13700H / 32 GB DDR5 RAM / NVIDIA GeForce RTX 4060 (8 GB VRAM) & NVIDIA Jetson AGX Orin / Orin NX (16/32 GB unified LPDDR5).
- **Runtime Stack**: CUDA 12.1, TensorRT FP16/INT8 engines, CUDA Graphs with pinned memory arenas (`ArenaCfg`).
- **Memory Envelope**: Fixed 4,956 MB allocated VRAM budget on 8 GB GPUs (1,888 MB models + 1,200 MB CUDA context + 1,868 MB TensorRT arenas), providing 39.5% (3,236 MB) safety headroom. Tier-2 VLM (Qwen2.5-VL-3B) runs on Host CPU using 32 GB DDR5 RAM.
- **Latency Benchmarks**: End-to-end latency stated as **1.45s on RTX 4060**, **2.18s on Jetson Orin NX**, and **3.22s on Intel i7-13700H CPU**.

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Student Team Hardware Reality**: The actual development machine is a **MacBook Air M4 with 16 GB unified RAM, 256 GB internal SSD, and an external USB-C SSD**.
- **Incompatibilities Identified**:
  - Apple Silicon M4 has NO NVIDIA CUDA cores and CANNOT execute TensorRT engines.
  - CUDA Graph memory management and TensorRT execution providers fail on macOS.
  - Conflating RTX 4060 latency numbers (1.45s) with M4 Mac performance will mislead judges and developers.
  - Large-scale dataset storage (100k+ images) will exhaust 256 GB internal SSD.
- **Proposals**:
  - Explicitly bifurcate the architecture into two distinct environments:
    1. **Development & Prototyping Environment**: macOS M4 (16 GB unified RAM, ONNX Runtime with MPS / CPU Execution Providers, Python 3.11 virtual environment).
    2. **Production Edge Target Deployment**: Linux x86_64 / Ubuntu 22.04 LTS with NVIDIA RTX 4060 (8 GB VRAM) / Jetson Orin (CUDA 12.1 + TensorRT).
  - External SSD utilized for large model checkpoints, datasets, and synthetic samples.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **MODIFY & ADD**
  - **KEEP** RTX 4060 / Jetson Orin as the official production target deployment.
  - **ADD** a dedicated, first-class Development Environment Specification for M4 Apple Silicon using ONNX Runtime MPS/CPU.
  - **MODIFY** latency documentation to explicitly state that 1.45s is an RTX 4060 TensorRT benchmark, while M4 Mac targets 2.5s–3.8s via ONNX Runtime MPS/CPU.
- **Evidence / Logic**: Apple Silicon unified memory (16 GB shared) provides ~120 GB/s memory bandwidth, sufficient to host all Tier-1 ONNX models (~2.1 GB total RAM footprint) without swapping.

---

### Topic B: Qwen2.5-VL-3B Role (Quality-Gate Runner-Up Fallback vs Primary OCR)

#### 1. Baseline Architecture Specification
- **Positioning**: Dynamic Quality-Gate Runner-Up / Fallback (`models/vlm/qwen2.5_vl_3b_awq/`).
- **Trigger Condition**: Dispatched asynchronously only when PP-OCRv4 average character recognition confidence drops below $\tau_{ocr} = 0.82$ (caused by severe card abrasion, faint dot-matrix printing, fold creases).
- **Hardware Allocation**: Executed on Host CPU (utilizing 32 GB DDR5 RAM) to avoid GPU VRAM contention on 8 GB edge appliances.
- **Performance**: 280 ms GPU (INT4 AWQ) / 4,800 ms CPU; 3.8 GB VRAM footprint.

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Question Raised**: Why not replace PP-OCRv4 entirely and use Qwen2.5-VL-3B as the primary OCR and document understanding engine?
- **Analysis & Findings**:
  - *Speed & Throughput*: PP-OCRv4 executes in <45 ms (GPU) / ~320 ms (CPU) with <1 GB VRAM. Qwen2.5-VL-3B takes 280–680 ms GPU / 4.8s CPU and requires 3.8 GB VRAM. Running Qwen on every document would breach the sub-3.5s SLA and exhaust edge memory during traffic spikes.
  - *Determinism vs Hallucination*: PP-OCRv4 is a decoupled DBNet++ and SVTR-LCNet architecture providing deterministic, non-hallucinating character transcription. Generative VLMs can hallucinate missing alphanumeric digits in passport numbers or Aadhaar IDs.
  - *Separation of Concerns*: Qwen2.5-VL cannot perform mathematical ICAO 9303 modulo-10 checksum validation, RSA-2048 cryptographic signature verification, or frequency-domain tampering detection.
- **Conversation Verdict**: Reaffirmed baseline positioning. Qwen2.5-VL-3B must remain a Tier-2 semantic recovery fallback, not the primary extraction engine.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **KEEP baseline two-tier architecture, MODIFY explanatory documentation**.
  - Rationale: High-throughput screening requires fast deterministic extraction for 95%+ of normal documents, with Qwen reserved strictly for severely degraded cards.
  - Clarification: Frame PP-OCRv4 as the **Deterministic High-Speed Primary Extractor** and Qwen2.5-VL-3B as the **Semantic Quality-Gate & Anomaly Recovery Engine**.

---

### Topic C: Multilingual OCR Scope (Hindi, Nepali, English, Dzongkha/Tibetan for Bhutan)

#### 1. Baseline Architecture Specification
- **Supported Models**: `ch_PP-OCRv4_det` (text detection), `devanagari_PP-OCRv4_rec` (Hindi/Devanagari recognition), `en_PP-OCRv4_rec` (English recognition), `SLANet_mobile_v2.0` (table/layout parsing).
- **Target Border Scope**: Indo-Nepal (1,751 km) and Indo-Bhutan (699 km) porous borders under bilateral peace treaties.
- **Supported Documents**: Indian Passports, Aadhaar, Voter ID, PAN; Nepalese Passports (MRP/e-Passport), Nepali Citizenship Certificates (*Nagrikta Praman Patra*), Bhutanese Travel Documents and Border Permits.

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Script vs Language Analysis**:
  - OCR models recognize *scripts*, not natural languages.
  - *Devanagari Script*: Directly covers Hindi, Sanskrit, and Nepali (*Nagrikta*, Nepali Voter ID).
  - *Latin Script*: Directly covers English, ICAO Doc 9303 MRZ fields, and international passport entries.
  - *Dzongkha (Tibetan Script)*: Official script of Bhutan, present on domestic Bhutanese Citizenship cards and local border passes.
- **Dzongkha Evaluation**:
  - Bhutanese international travel documents and standard border permits feature bilingual English / Latin text fields.
  - PaddleOCR does not offer an official, optimized lightweight PP-OCRv4 model for Tibetan/Dzongkha script; running heavy transformer OCR or training a custom Dzongkha model exceeds student hackathon timelines.
- **Proposal**:
  - Scope MVP to **Devanagari + Latin** scripts (covering 100% of Indian IDs, 100% of Nepali IDs, and English fields of Bhutanese travel permits).
  - Explicitly defer native Dzongkha (Tibetan script) OCR to Phase 2 with operational justification.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **MODIFY scope definition & DEFER native Dzongkha model to Phase 2**.
  - MVP Coverage: Devanagari + Latin scripts (Hindi, Nepali, English).
  - Phase 2 Deferred: Native Dzongkha script OCR module.
  - Justification: Over 98% of border transit credentials present Latin or Devanagari fields. Bhutanese travel passes feature English translations for cross-border transit.

---

### Topic D: MRZ Pipeline (OmniMRZ + ICAO Doc 9303 Checksum + Explicit Cross-Validation)

#### 1. Baseline Architecture Specification
- **Engine**: `OmniMRZ` (`omnimrz-ppocr-v4`, ONNX FP16) + `ICAO Doc 9303 Modulo-10 7-3-1 Checksum Engine`.
- **Formats Handled**: TD1 (3x30 characters, ID cards / Border passes), TD2 (2x36 characters, Visas), TD3 (2x44 characters, standard Passports), MRVA / MRVB.
- **Mathematical Specification**:
  $$\text{CheckDigit}(S) = \left( \sum_{i=1}^k \text{Val}(s_i) \times W_{(i-1) \pmod 3} \right) \pmod{10} \quad \text{where } W = [7, 3, 1]$$
  Validates Passport No Check Digit (CD1), DOB Check Digit (CD2), Expiry Date Check Digit (CD3), Optional Data Check Digit (CD4), and Overall Composite Check Digit.

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Key Realization**: MRZ validation is not merely parsing strings or checking mathematical check digits in isolation.
- **The Core Fraud Vector**: Forgers often alter visual text fields on the passport (e.g. changing Date of Birth from 1984 to 1994 using razor scraping or high-resolution reprinting) while leaving the machine-readable zone unchanged (or vice-versa).
- **Proposal**:
  - Make **Explicit Multi-Modal Cross-Validation** an architectural requirement: The system must automatically map and assert string equality between:
    1. Visual OCR Name $\leftrightarrow$ MRZ Line 1 Name
    2. Visual OCR DOB $\leftrightarrow$ MRZ Line 2 DOB ($YYMMDD$)
    3. Visual OCR Passport Number $\leftrightarrow$ MRZ Line 2 Document Number
    4. Visual OCR Expiry Date $\leftrightarrow$ MRZ Line 2 Expiry Date
    5. Visual OCR Nationality $\leftrightarrow$ MRZ Line 2 Issuing Country
  - Any mismatch triggers an immediate deterministic **RED / AMBER Alert**.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **KEEP OmniMRZ + ICAO 9303 engine, ADD explicit Cross-Field Validation Specification**.
  - Rationale: OmniMRZ prevents OCR-B character misclassifications ($0/O, 1/I, 8/B$). Explicit cross-checking with visual OCR catches physical tampering without relying solely on deep learning.

---

### Topic E: Stamp Authentication Gap (Stamp Region Detection, Template Matching, Forensics, Context Consistency vs Explicit Justified Deferral)

#### 1. Baseline Architecture Specification
- **Threat Identified**: Baseline lists "Forged Immigration & Consular Transit Stamps (applying counterfeit rubber stamps or laser-transferred ink impressions)" as a critical operational threat.
- **Architecture Gap**: Baseline relies solely on generic DocTamper DTD and TruFor for all image tampering. It contains **NO dedicated Stamp Authentication Module, NO stamp template registry, and NO stamp-specific inspection logic**.

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Detailed Gap Analysis**:
  - Rubber and laser stamps applied at Land Customs Stations (Jaigaon, Raxaul, Sonauli) are primary targets for illegal border crossing.
  - A counterfeit stamp can be visually sharp, correctly positioned, and perfectly read by OCR (e.g. `"SSB CHECKPOST JAIGAON 22-08-2026"`), yet be completely counterfeit.
  - DocTamper and TruFor detect digital image manipulation and splicing residuals, but cannot verify whether a physical rubber stamp matches the authorized SSB government seal design.
- **Proposed Solution — 4-Stage Stamp Authentication Pipeline**:
  1. **Stamp Region Detection**: OpenCV morphological filtering + color segmentation (isolating violet/red/blue stamp ink contours) or lightweight YOLO detector.
  2. **Stamp Text & Date OCR**: Extracting checkpoint name, officer code, and entry/exit date.
  3. **Template Matching against Offline Stamp Registry**: Multi-scale normalized cross-correlation / ORB feature matching comparing geometry, border ring radius, emblem positioning, and font kerning against official SSB seal templates.
  4. **Contextual Consistency Validation**: Cross-checking stamp date and location against traveler's declared itinerary, e-Permit records, and MRZ transit timeline.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **ADD dedicated Stamp Authentication Module Specification to Architecture; STAGE implementation into MVP vs Phase 2**.
  - **MVP Stage (Rule & Classical CV)**:
    - Stamp bounding box detection via color-range contour extraction (OpenCV).
    - OCR extraction of stamp text and date.
    - Contextual validation (date/location consistency check against MRZ/Aadhaar/e-Permit data).
  - **Phase 2 Enterprise Stage**:
    - Deep Siamese neural template matcher + microscopic ink-bleed analysis for counterfeit rubber stamps.

---

### Topic F: 3-Stream Parallel Architecture with Cross-Validation (OCR/MRZ, Biometrics, Forensics Stream Cross-Checks)

#### 1. Baseline Architecture Specification
- **Stage 1 (Sequential)**: Ingestion, SHA-256 hash verify, OpenCV/ML Kit 4-point homography dewarp to 300 DPI (120 ms GPU / 220 ms CPU).
- **Stage 2 (Parallel Concurrent 3-Stream Pipeline — 72.5 ms GPU / 552 ms CPU)**:
  - **Stream A (Text & OCR/MRZ/QR)**: PP-OCRv4 (DBNet++ + SVTR-LCNet), OmniMRZ ICAO 9303, zxing-cpp + UIDAI RSA-2048 PKI. (Max: 45 ms GPU).
  - **Stream B (Biometrics & FAS)**: SCRFD-10GF face detection, Umeyama 5-point alignment ($112\times 112$), MiniFASNetV2-SE dual-scale anti-spoofing, AdaFace-ResNet100 512-D embedding (ID crop & Live webcam), Cosine 1:1 match. (Max: 14.2 ms GPU).
  - **Stream C (Document Forensics)**: EXIF/DQT quantization table rules, TruFor RGB Transformer + Noiseprint++, DocTamper DTD Frequency Head (FPH), DocForge adaptive calibration ($\tau_{adapt}=0.18$). (Max: 72.5 ms GPU).
- **Stage 3 (Sequential)**: Cross-validation, Bayesian risk scoring, explainable heatmap compositing, audit logging (85 ms GPU / 120 ms CPU).

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Key Insight**: Parallel execution saves ~70% latency, but the streams must not operate as isolated silos.
- **Multi-Modal Cross-Validation Graph**:
  - *Stream A $\leftrightarrow$ Stream B*: Document demographic DOB vs Live traveler facial age estimation (identifying severe age-drift anomalies, e.g. claimed DOB 2005 for a 60-year-old traveler).
  - *Stream A $\leftrightarrow$ Stream C*: High forensic tamper score specifically located over the DOB bounding box or Name text region correlates directly with OCR confidence drops.
  - *Stream B $\leftrightarrow$ Stream C*: TruFor photo boundary splicing detection correlates with facial recognition cosine distance drops.
  - *Stream A (Visual) $\leftrightarrow$ Stream A (Cryptographic)*: Aadhaar visual printed text vs decrypted RSA-2048 QR demographics; Passport visual text vs ICAO 9303 MRZ fields.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **KEEP 3-stream parallel execution architecture, ADD explicit Cross-Validation State Graph & Inter-Stream Rules**.
  - Rationale: Retains the ultra-low latency (<1.5s GPU / <3.5s CPU) while dramatically reducing False Acceptance Rates (FAR) through multi-modal cross-corroboration.

---

### Topic G: Risk Scoring Engine (Bayesian Multi-Factor Scoring, Cross-Validation Inputs, Color/Score/Flag Reasons/Heatmap)

#### 1. Baseline Architecture Specification
- **Scoring Model**: Weighted Bayesian Aggregation:
  $$\text{Risk} = w_1 S_{\text{tamper}} + w_2 (1 - S_{\text{face}}) + w_3 S_{\text{rule}} + w_4 S_{\text{crypto}}$$
- **Banding**:
  - **GREEN (0–30)**: Auto-Clear.
  - **AMBER (31–69)**: Secondary Manual Inspection.
  - **RED (70–100)**: Critical Detain Alert.
- **Outputs**: Overall numeric risk score (0–100), color band, explainable text telemetry, and composite forensic heatmap.

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Critical Flaw in Pure Weighted Averaging**: Naive linear averaging allows a genuine biometric face match (e.g. $S_{face} = 0.99$) to mask a cryptographically forged Aadhaar QR or an invalidated MRZ checksum, dragging a dangerous threat down into the AMBER band.
- **Proposed Refinement — Two-Stage Hybrid Decision Model**:
  1. **Stage 1: Hard Deterministic Override Engine (Immediate RED Alert, Risk = 100)**:
     - Rule 1: UIDAI RSA-2048 PKI signature invalid or corrupted.
     - Rule 2: ICAO Doc 9303 composite checksum invalid AND visual text mismatch.
     - Rule 3: MiniFASNet anti-spoofing detects Presentation Attack (Photo print / Screen replay).
     - Rule 4: DocTamper/TruFor tampered area $> 0.27\%$ located directly on critical demographic fields (DOB, Photo boundary, Name).
     - Rule 5: 1:N Watchlist vector match ($Cosine \ge 0.82$) against wanted fugitive list.
  2. **Stage 2: Bayesian Multi-Factor Scoring (For Non-Override Cases)**:
     - Computes calibrated probabilistic score for subtle anomalies (minor card glare, mild face age-drift, unreadable optional MRZ characters).
  3. **Explainability Layer**: Officer UI displays structured reasons:
     - `Status`: RED (Risk Score: 94/100)
     - `Detected Flags`:
       - `[CRITICAL]` DOB Tampered: Visual '1994' vs MRZ '1984' (DocTamper FPH confidence: 96.1%)
       - `[HIGH]` MRZ Checksum 2 Failed (DOB Check Digit)
       - `[PASS]` Biometric Live Match: 97.4% Cosine Similarity
       - `[PASS]` Passive Liveness: Live Human Verified

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **MODIFY Risk Scoring Engine to a Two-Stage Hybrid Decision Engine (Stage 1 Hard Overrides + Stage 2 Bayesian Scoring)**.
  - Rationale: Eliminates dangerous false negatives on hard cryptographic and forensic violations while preserving nuanced scoring for degraded legitimate IDs.

---

### Topic H: Desktop Application Architecture (Tauri 2.0 + React/Vite + FastAPI for macOS .app in Internal Round vs Docker in Production)

#### 1. Baseline Architecture Specification
- **Frontend Architecture**: Fixed Checkpoint Web Dashboard built with **Next.js 15 App Router**, Tailwind CSS, and Lucide icons, connecting via WebSocket / REST to the edge appliance.
- **Edge Deployment**: Docker Compose air-gapped stack running on Linux (NGINX, FastAPI, PostgreSQL pgvector, Redis, Celery, Next.js).

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Shortcomings Identified for Evaluation & Prototyping**:
  - Asking SIH evaluators to "open `localhost:3000` in Google Chrome" looks like a student web project rather than a standalone tactical defense appliance.
  - Running Docker Compose (with 5+ containers) inside macOS M4 with 16 GB RAM wastes 4–6 GB memory on Docker VM virtualization overhead, risking memory pressure and kernel swapping.
- **Proposed Desktop Architecture**:
  - **Tauri 2.0 Desktop Application**: Wraps a **React + Vite** frontend into a native macOS `.app` bundle (`SSB-Screening.app`).
  - **Local FastAPI AI Engine**: Runs natively on the host M4 Apple Silicon (Python 3.11 venv) using ONNX Runtime MPS/CPU.
  - **Internal SIH Round Execution**: Pure native execution (Tauri + React + FastAPI + SQLite/Postgres) — **Zero Docker dependency**.
  - **Production Edge Target**: Docker Compose deployment remains the authoritative deployment model for Linux x86_64 / RTX 4060 edge appliances.
  - **UI / UX Guidelines**: Clean, restrained design system inspired by Beautiful UI (slate neutrals, hairline borders, dual-canvas original vs heatmap view, Inter + JetBrains Mono typography, anti-slop copy).

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **MODIFY Desktop Architecture: Adopt Tauri 2.0 + React/Vite + FastAPI macOS .app for Internal Round / Dev, KEEP Docker Compose for Production Edge Checkpoints**.
  - Rationale: Provides a native, ultra-responsive desktop application for evaluation with zero Docker VM overhead on 16GB Macs, while preserving containerized deployment for multi-node border checkpoints.

---

### Topic I: Phone-to-Edge Connectivity (USB/Hotspot for Internal Round vs LAN Router for Production)

#### 1. Baseline Architecture Specification
- **Network Profile**: Completely air-gapped, zero-cloud architecture. Assumes a private local area network (LAN) backed by a dedicated Wi-Fi access point / router connecting roving patrol units to the checkpoint edge server over HTTPS/WSS.

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Prototyping & Internal Round Reality**:
  - Student teams do not have or need dedicated commercial routers for early prototyping and internal hackathon rounds.
  - macOS "Internet Sharing" cannot easily act as a standalone DHCP Wi-Fi access point without an upstream network.
- **Proposed Staged Network Topologies**:
  1. **Internal Round / Dev Topology**:
     - *Mode 1 (USB Direct / ADB Reverse)*: Android phone connected via USB cable; `adb reverse tcp:8000 tcp:8000` forwards localhost requests directly to the Mac FastAPI backend.
     - *Mode 2 (Local Hotspot)*: Android phone or testing laptop hosts a local Wi-Fi hotspot; edge server binds to local IP (`http://192.168.x.x:8000`).
  2. **Production / Grand Finale Demo Topology**:
     - Dedicated air-gapped physical Wi-Fi router (private SSID: `SSB_SECURE_GATEWAY`, no WAN uplink) establishing an isolated local subnet.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **MODIFY Network Specification to document two explicit connectivity profiles (Internal Dev/Demo vs Production Field LAN)**.
  - Rationale: Eliminates hardware blocking issues for student development while ensuring strict air-gapped compliance across all phases.

---

### Topic J: Pretrained Models vs Training (Inference-Only Pretrained Weights for MVP, No Training on M4, Training to Phase 2)

#### 1. Baseline Architecture Specification
- **Roadmap Scope**: 16-phase roadmap spanning 12 weeks. Includes Phase 2 (100k synthetic ID generation), Phase 5 (DocTamper DTD training/fine-tuning), and Phase 11 (INT8 TensorRT quantization).

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Reality Check for MVP**:
  - Training deep neural networks (DocTamper ResNet-50, TruFor RGB Transformer, AdaFace-ResNet100) on an M4 MacBook Air (16 GB unified RAM) is technically unfeasible and unnecessary.
  - SOTA published checkpoints for DocTamper, TruFor, PP-OCRv4, OmniMRZ, and AdaFace are available with official weights that provide benchmark-grade accuracy out of the box.
  - DocForge-Bench (CVPR 2026 / arXiv:2603.01433) proved that applying domain adaptive calibration ($\tau_{adapt} = 0.18$) to pretrained DocTamper/TruFor models achieves **78.9% Pixel-F1 on document micro-tampering without retraining**.
- **Proposal**:
  - Restructure MVP to **100% Pretrained Inference-Only**.
  - All model training, large-scale synthetic generation (100k samples), and domain fine-tuning pipelines are formally relegated to **Phase 2 / Enterprise Roadmap**.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **MODIFY Roadmap: Lock MVP to Pretrained Weights Inference-Only; DEFER Model Training & Synthetic Datasets to Phase 2**.
  - Pretrained Model Manifest for MVP:
    1. `ppocrv4_det.onnx` & `ppocrv4_rec_devanagari.onnx` / `en.onnx` (PaddleOCR official)
    2. `omnimrz_v4.onnx` (Pretrained OCR-B ONNX)
    3. `scrfd_10g_bnkps.onnx` (InsightFace SCRFD 10G)
    4. `adaface_ir100_fp16.onnx` (Glint360K pretrained weights)
    5. `fas_minifasnetv2_2.7.onnx` & `fas_minifasnetv1_4.0.onnx` (Silent-Face-Anti-Spoofing)
    6. `dtd_doctamper_r50.pth` (DocTamper DTD official PyTorch weights)
    7. `trufor_general_v1.pth` (TruFor CVPR 2023 official checkpoint)
    8. `Qwen2.5-VL-3B-Instruct-AWQ` (HuggingFace official INT4 GGUF/AWQ)

---

### Topic K: Android Handoff (Self-Contained Master Prompt, API Contracts, Boundary Rules)

#### 1. Baseline Architecture Specification
- **Module 5**: Mobile Client specified as Flutter v3.24+ using Dart FFI C++, Drift + SQLCipher (256-bit AES DB encryption), Google ML Kit Document Scanner, and WorkManager background outbox sync.

#### 2. Conversation Findings & Proposals (`conv_mainchat.txt` & `conv_sidebyside.txt`)
- **Scope Delegation Decision**:
  - The core architecture team will focus exclusively on the **FastAPI Backend, AI Inference Pipeline, Risk Engine, Cross-Validation Layer, and Tauri Desktop Application**.
  - Mobile/Android implementation is **strictly deferred and delegated to a downstream Android AI Specialist Agent**.
- **Android Handoff Requirements**:
  - Deliverable: `android-agent/MASTER_PROMPT.md` located in a dedicated project directory.
  - Contents Required:
    1. Full problem context (SIH26188, SSB border realities, air-gap mandate).
    2. Exact role of Android App (camera capture, perspective rectification, calling FastAPI, rendering verdicts).
    3. Complete OpenAPI / FastAPI schema contracts (`POST /api/v1/scan/inspect`, `GET /api/v1/health`, WebSocket schemas).
    4. Connectivity modes (USB tethering, local Wi-Fi LAN, offline caching).
    5. Strict Non-Interference Rules (MUST NOT modify backend routes, MUST NOT change risk scoring logic, MUST NOT retrain models, MUST NOT introduce commercial cloud dependencies).
    6. Mandatory rule to inspect the full workspace before writing code.

#### 3. Technical Assessment & Actionable Verdict
- **Verdict**: **ADD formal Android Agent Master Prompt (`android-agent/MASTER_PROMPT.md`)**.
  - Rationale: Enforces clean architectural decoupling, allowing mobile development to proceed in parallel without compromising core backend stability or introducing scope creep.

---

## 3. Systematic Specification Mining Tables

---

### Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Ingestion | 4-Point Homography Dewarp | Detects document corners and performs perspective transformation to canonical 300 DPI rectangular matrix. | Raw RGB image (document photo / mobile capture) | Normalized 300 DPI RGB Document Matrix ($1024\times 1024$) | Fallback to center-crop if corner detection confidence $< 0.40$. | `baseline_arch.txt:1824`, `conv_mainchat.txt:8864` |
| 2 | Ingestion | CLAHE Illumination Normalization | Contrast Limited Adaptive Histogram Equalization to eliminate ambient glare and shadow variations. | Normalized RGB matrix | Contrast-balanced RGB image matrix | Passes unmodified image if CLAHE fails. | `baseline_arch.txt:2367`, `conv_mainchat.txt:3021` |
| 3 | Ingestion | SHA-256 Payload Hash Validation | Computes SHA-256 checksum over incoming image binary to ensure immutable audit logging and prevent duplicate replays. | Raw image bytes | SHA-256 hexadecimal string (`hash_id`) | Raises `HTTP 400 Bad Payload` if payload corrupted. | `baseline_arch.txt:1888`, `conv_mainchat.txt:470` |
| 4 | OCR (Stream A) | PP-OCRv4 Text Detection (DBNet++) | Differentiable Binarization network detecting bounding polygons of text lines across identity cards. | Normalized document image | List of text bounding boxes with coordinates $[[x_1, y_1], \dots, [x_4, y_4]]$ | Returns empty list if no text detected; triggers unreadable flag. | `baseline_arch.txt:374`, `conv_mainchat.txt:1660` |
| 5 | OCR (Stream A) | SVTR-LCNet Multi-Script Recognition | Fast SVTR-LCNet recognizer extracting text strings from bounding boxes across Devanagari and Latin scripts. | Cropped text image patches | Text strings with per-character confidence scores ($0.0 - 1.0$) | Low confidence scores recorded; triggers Tier-2 VLM fallback. | `baseline_arch.txt:398`, `conv_mainchat.txt:1719` |
| 6 | OCR (Stream A) | PP-StructureV2 Layout Parsing | Key Information Extraction (KIE) mapping text bounding boxes to semantic identity keys (`Name`, `DOB`, `ID_Number`). | Detected text boxes + OCR strings | Structured demographic JSON dictionary | Unmapped fields placed in `unstructured_text` array. | `baseline_arch.txt:684`, `conv_mainchat.txt:1675` |
| 7 | OCR (Stream A) | Qwen2.5-VL-3B Semantic Quality Gate | Tier-2 INT4 Vision-Language Model dispatched asynchronously when PP-OCRv4 confidence drops below $\tau_{ocr} = 0.82$. | Scratched/degraded document image | Zero-shot structured JSON recovery of demographic fields | Logs timeout after 1.5s; falls back to raw PP-OCR strings. | `baseline_arch.txt:692`, `conv_sidebyside.txt:1626` |
| 8 | MRZ (Stream A) | OmniMRZ OCR-B Extraction | Specialized morphological crop and OCR-B tuned model extracting Machine Readable Zone lines from travel documents. | Document lower-third image patch | Raw MRZ text strings (2 or 3 lines) | Returns `mrz_detected: false` if no MRZ zone present. | `baseline_arch.txt:1293`, `conv_sidebyside.txt:2300` |
| 9 | MRZ (Stream A) | ICAO Doc 9303 Modulo-10 7-3-1 Checksum Validator | Strict mathematical checksum validator implementing ICAO Part 3 check digit algorithms over TD1, TD2, and TD3 formats. | Parsed MRZ text strings | Structured MRZ data (`doc_num`, `dob`, `expiry`, `checksum_valid: bool`) | Sets `checksum_valid: false` and flags specific failed digit. | `baseline_arch.txt:1401`, `conv_mainchat.txt:2407` |
| 10 | Barcode/QR (Stream A) | zxing-cpp Binary QR Extractor | High-performance C++ QR engine decoding raw compressed binary payload from Indian Aadhaar and Nepal e-Passports. | Document image matrix | Raw compressed binary bytes | Raises `QR_NOT_FOUND` if unreadable. | `baseline_arch.txt:1424`, `conv_mainchat.txt:2451` |
| 11 | Barcode/QR (Stream A) | UIDAI Offline RSA-2048 PKI Signature Verifier | OpenSSL PKCS#1 v1.5 SHA-256 digital signature validator verifying Aadhaar QR payload against local UIDAI Root Public Certificate. | Decompressed Aadhaar binary payload (split: demographic vs 256-byte sig) | `pki_signature_valid: bool`, parsed demographics | Triggers `CRITICAL RED ALERT` on invalid/tampered signature. | `baseline_arch.txt:1450`, `conv_mainchat.txt:2464` |
| 12 | Barcode/QR (Stream A) | Embedded JP2000 Face Photo Decoder | Decodes embedded ISO/IEC 15444-1 (`.jp2`) facial photograph extracted from Aadhaar Secure QR payload. | Embedded JP2000 binary byte slice | Decompressed RGB face image ($240\times 320$) | Logs corrupted photo bytes; skips QR face comparison. | `baseline_arch.txt:1478`, `conv_mainchat.txt:2479` |
| 13 | Biometrics (Stream B) | SCRFD-10GF Face Detector | High-speed Single-Shot Scale-Aware Face Detector locating live officer webcam and document ID portrait faces. | Live video frame & Document image | Bounding boxes + 5-point facial landmarks (eyes, nose, mouth) | Raises `NO_FACE_DETECTED` if face missing. | `baseline_arch.txt:964`, `conv_mainchat.txt:2044` |
| 14 | Biometrics (Stream B) | Umeyama 5-Point Landmark Aligner | Affine transformation standardizing detected faces to canonical $112\times 112$ RGB crop. | Face crop + 5 landmarks | Normalized $112\times 112$ aligned face tensor | Falls back to center-bounding box crop on landmark failure. | `baseline_arch.txt:964`, `conv_mainchat.txt:2066` |
| 15 | Biometrics (Stream B) | MiniFASNetV2-SE Dual-Scale Anti-Spoofing | Multi-scale passive liveness ensemble (Scale 2.7x pore crop + Scale 4.0x bezel context + 2D FFT Fourier loss) detecting presentation attacks. | Live webcam aligned face crops | `liveness_score: float (0.0-1.0)`, `is_live: bool` | Triggers immediate `SPOOF_DETECTED` alert if score $< 0.85$. | `baseline_arch.txt:974`, `conv_mainchat.txt:2208` |
| 16 | Biometrics (Stream B) | AdaFace-ResNet100 Face Verifier | Quality-Adaptive Margin face recognition network producing 512-D embeddings robust to 10-year age drift and low-res ID crops. | Aligned $112\times 112$ face crops (ID vs Live) | Two 512-D normalized feature vectors | Triggers low-quality warning if image feature norm $z_i < 12.0$. | `baseline_arch.txt:760`, `conv_mainchat.txt:2104` |
| 17 | Biometrics (Stream B) | 1:1 Cosine Similarity Matcher | Computes cosine similarity between document face embedding and live traveler face embedding. | Vector $\mathbf{E}_{doc}$ & Vector $\mathbf{E}_{live}$ | `similarity_score: float (-1.0 to +1.0)` | Sets `face_match_passed: false` if score $< 0.68$. | `baseline_arch.txt:1854`, `conv_mainchat.txt:2132` |
| 18 | Forensics (Stream C) | Metadata & Quantization Table (DQT) Parser | Parses EXIF, XMP, and JPEG DQT tables to detect desktop publishing software signatures (Photoshop, GIMP, Canva). | Raw image file metadata | List of suspicious software tags & double compression markers | Empty list returned for clean camera captures. | `baseline_arch.txt:1245`, `conv_mainchat.txt:2079` |
| 19 | Forensics (Stream C) | DocTamper DTD Text Manipulation Detector | ResNet-50 backbone with Frequency Perception Head (FPH) detecting character kerning disturbances and font aliasing mismatches. | Normalized $1024\times 1024$ document image | Pixel-level Text Tamper Heatmap ($0.0 - 1.0$) | Outputs zero-matrix if no anomalies found. | `baseline_arch.txt:1225`, `conv_mainchat.txt:2490` |
| 20 | Forensics (Stream C) | TruFor RGB Transformer & Noiseprint++ | Dual-branch transformer extracting sensor noise residuals (PRNU) to detect photo splicing, copy-move, and generative inpainting. | Normalized $1024\times 1024$ document image | Splicing Anomaly Map + Reliability Confidence Map | Low-confidence regions masked to prevent false alarms. | `baseline_arch.txt:1231`, `conv_mainchat.txt:2491` |
| 21 | Forensics (Stream C) | DocForge Adaptive Calibration ($\tau_{adapt}=0.18$) | Domain-adaptive calibration threshold resolving small-area tampering suppression bottlenecks on single-digit alterations. | Fused tamper confidence map | Calibrated Binary Tamper Mask (`tampered_pixels`) | Flags tampering if tampered pixel area exceeds $0.27\%$. | `baseline_arch.txt:1040`, `conv_mainchat.txt:2511` |
| 22 | Forensics (Stream C) | Stamp Region Detector & Context Validator | Isolates rubber/laser stamp regions via color contour segmentation and verifies date/checkpoint against travel metadata. | Document image + OCR/MRZ metadata | `stamp_status: VALID/SUSPICIOUS`, confidence, reasons | Flags `SUSPICIOUS` if stamp date contradicts MRZ timeline. | `conv_sidebyside.txt:1300`, `conv_mainchat.txt:1193` |
| 23 | Cross-Validation | Multi-Modal Cross-Field Consistency Matcher | Deterministic string equality engine matching visual OCR text vs MRZ lines vs Aadhaar QR decrypted payload. | Structured OCR JSON, MRZ JSON, QR JSON | `mismatches_detected: list`, `cross_val_passed: bool` | Generates detailed mismatch records (e.g. `DOB Visual 1994 != MRZ 1984`). | `baseline_arch.txt:2149`, `conv_sidebyside.txt:1895` |
| 24 | Cross-Validation | Demographic Age vs Biometric Sanity Check | Validates claimed birth year from document against visual age estimation bounds to catch extreme age impersonation. | Document DOB + Live Face crop | `age_sanity_passed: bool`, estimated age range | Generates `AMBER` warning if age delta $> 25$ years. | `conv_mainchat.txt:2307`, `conv_sidebyside.txt:1878` |
| 25 | Risk Engine | Stage 1 Hard Rule Override Engine | Instantaneous security rule evaluation triggering immediate RED alert on catastrophic cryptographic or forensic failures. | PKI status, MRZ validity, FAS liveness, Tamper Area | `override_triggered: bool`, `forced_verdict: RED` | Immediate execution bypasses normal weighted averaging. | `conv_sidebyside.txt:1944`, `baseline_arch.txt:1468` |
| 26 | Risk Engine | Stage 2 Bayesian Multi-Factor Scoring | Aggregates probabilistic risk scores across tamper, biometrics, rules, and cryptography into a normalized 0–100 score. | Normalized sub-scores + weights $[w_1, w_2, w_3, w_4]$ | `risk_score: int (0-100)`, `status: GREEN/AMBER/RED` | Bounded strictly to $[0, 100]$. | `baseline_arch.txt:2189`, `conv_sidebyside.txt:1904` |
| 27 | Risk Engine | Explainable Telemetry & Heatmap Compositor | Blends calibrated forensic binary masks over original document image and compiles human-readable reason bullet points. | Original image, binary masks, risk flags | Base64 composite heatmap image + list of text reasons | Logs reason generation timestamp for audit trail. | `baseline_arch.txt:2201`, `conv_mainchat.txt:8934` |
| 28 | Desktop App | Tauri 2.0 Native macOS Desktop Shell | Lightweight Rust-backed desktop wrapper packaging the screening dashboard into a standalone macOS `.app` bundle. | React + Vite static bundle | Native macOS window running `SSB-Screening.app` | Graceful offline alert if local FastAPI server unreachable. | `conv_mainchat.txt:8679`, `conv_mainchat.txt:9053` |
| 29 | API Backend | FastAPI Asynchronous Inference Orchestrator | High-throughput asynchronous Python 3.11 web service managing parallel inference graph, WebSocket streaming, and REST APIs. | Multipart document upload + live webcam snapshot | Standardized JSON screening response + WebSocket frames | Returns HTTP 422 for invalid payloads; HTTP 500 on inference crash. | `baseline_arch.txt:1578`, `conv_mainchat.txt:8751` |
| 30 | Storage & Audit | Immutable SHA-256 Chained Audit Logger | DPDP Act 2023 & Aadhaar Act compliant audit log with automatic 8-digit Aadhaar masking and SHA-256 cryptographic chaining. | Screening transaction payload | Appended audit log entry with parent hash pointer | Raises alarm if hash chain sequence is broken. | `baseline_arch.txt:2726`, `conv_mainchat.txt:2223` |

---

### Edge Cases & Threat Modalities

| # | Feature | Input / Condition | Observed / Documented Behavior |
|---|---|---|---|
| 1 | OCR (PP-OCRv4) | Severely abraded PVC Aadhaar card with scratched name and faint dot-matrix DOB. | PP-OCRv4 confidence drops below $\tau_{ocr} = 0.82$. Quality-gate asynchronously dispatches image to Qwen2.5-VL-3B-Instruct (INT4 AWQ), recovering structured demographic fields without human intervention. |
| 2 | Biometrics (AdaFace) | Low-resolution, faded passport photograph taken 10 years prior (5–10 year age drift). | AdaFace adaptive margin $g_j(z_i) = -m \hat{z}_i + m$ scales penalty down based on low feature norm $z_i$, preventing gradient divergence and achieving 98.80% TAR on AgeDB-30 benchmark. |
| 3 | Biometrics (MiniFASNet) | Impostor holds a high-resolution 4K iPad screen replay or curved color laser printout of legitimate passport owner. | MiniFASNetV2-SE dual-scale ensemble detects screen pixel moiré patterns and 2D Fourier high-frequency specular reflections, triggering immediate `CRITICAL RED ALERT: Presentation Attack Detected (Liveness Score: 0.12)`. |
| 4 | Forensics (DocTamper) | Single digit mechanically scraped on birth year (e.g. '1984' altered to '1994', tampered area $< 0.35\%$). | Standard threshold ($\tau=0.5$) fails (F1 $< 0.05$). DocForge domain adaptive calibration ($\tau_{adapt} = 0.18$) successfully isolates the tampered digit bounding box, outputting a glowing red overlay on the '1994' string. |
| 5 | Forensics (TruFor) | Photo region spliced from a different document using Poisson seamless cloning and plastic re-lamination. | TruFor Noiseprint++ residual extractor detects camera PRNU sensor noise mismatch along the portrait boundary, generating a high-intensity anomaly map that triggers immediate RED status. |
| 6 | Forensics (EXIF/DQT) | Forger edited document in Adobe Photoshop or Canva and saved as JPEG. | EXIF/DQT rule engine flags presence of `Software: Adobe Photoshop 25.0` and non-standard quantization matrix tables within $< 0.5$ ms, adding $+40$ risk points. |
| 7 | Aadhaar QR Verifier | Adversary crafts a synthetic QR code with modified name and embeds it on a fake PVC card. | zxing-cpp extracts raw binary payload; OpenSSL PKCS#1 v1.5 verification against local UIDAI Root Certificate fails signature check ($N-256$ to $N$ bytes corrupted). Hard override triggers immediate `CRITICAL RED ALERT: Forged Aadhaar QR`. |
| 8 | MRZ Cross-Validation | Passport visual text displays DOB '14/08/1994' but MRZ Line 2 reads `'IND9408148'` (with checksum mismatch) or `'IND8408148'` (valid checksum but 1984 DOB). | ICAO 9303 checksum validator detects digit discrepancy or Cross-Field Matcher identifies visual vs MRZ string conflict. Hard Rule Override flags `RED ALERT: Visual DOB (1994) != MRZ DOB (1984)`. |
| 9 | Stamp Authentication | Counterfeit entry stamp applied at Jaigaon border checkpoint displaying date in future or conflicting with entry record. | Stamp context validator compares stamp date against current system clock and transit permit metadata; flags `AMBER/RED: Stamp Date Inconsistent with Entry Permit`. |
| 10 | Hardware Concurrency | Traffic surge with 5 simultaneous document scans arriving on 16 GB M4 Mac development machine. | FastAPI asynchronous event loop queues requests; Tier-1 ONNX models execute sequentially or in lightweight parallel threads within 2.1 GB RAM envelope, maintaining stability without memory thrashing or OOM errors. |

---

## 4. Cross-Module Dependency & Interface Matrix

```
+-------------------------------------------------------------------------------------------------------------+
|                                    SIH26188 MULTI-MODAL DATAFLOW MATRIX                                     |
+-------------------------------------------------------------------------------------------------------------+
                                      [Captured Document + Live Webcam]
                                                      │
                                                      ▼
                                       [Stage 1: Preprocessing & Warp]
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       ▼                              ▼                              ▼
        ┌──────────────────────────────┐┌──────────────────────────────┐┌──────────────────────────────┐
        │ STREAM A: OCR, MRZ & QR      ││ STREAM B: BIOMETRICS & FAS   ││ STREAM C: DOCUMENT FORENSICS │
        ├──────────────────────────────┤├──────────────────────────────┤├──────────────────────────────┤
        │ • PP-OCRv4 (Devanagari/Latin)││ • SCRFD-10GF Face Detector   ││ • EXIF / DQT Table Rules     │
        │ • Qwen2.5-VL-3B (Quality-Gate)││ • MiniFASNet Dual Liveness   ││ • DocTamper DTD (Text/Digits)│
        │ • OmniMRZ + ICAO 9303 Check  ││ • AdaFace-R100 Embedding     ││ • TruFor (RGB/Noiseprint++)  │
        │ • zxing-cpp + UIDAI RSA-2048 ││ • 1:1 Cosine Similarity      ││ • DocForge tau_adapt=0.18    │
        │ • JP2000 Face Crop Decoded   ││                              ││ • Stamp Region & Consistency │
        └──────────────┬───────────────┘└──────────────┬───────────────┘└──────────────┬───────────────┘
                       │                               │                               │
                       │   ┌───────────────────────────┴───────────────────────────┐   │
                       │   │ Demographics / Visual Text / MRZ / QR / Embeddings    │   │
                       │   └───────────────────────────┬───────────────────────────┘   │
                       ▼                               ▼                               ▼
        +---------------------------------------------------------------------------------------------+
        |                               STAGE 2.5: CROSS-VALIDATION ENGINE                            |
        |  • Rule A1: Visual OCR DOB == MRZ DOB == Decrypted QR DOB                                   |
        |  • Rule A2: Visual Name == MRZ Name == Decrypted QR Name                                    |
        |  • Rule B1: Live Face Match (Cosine >= 0.68) against Document Photo AND QR Embedded JP2000  |
        |  • Rule B2: Passive Liveness == TRUE (No Screen Replay / No Photo Print Cutout)             |
        |  • Rule C1: Tamper Mask Overlap with Demographic Text Bounding Boxes == 0.0%                |
        |  • Rule C2: Stamp Date & Checkpoint Location Consistent with Transit Permit                 |
        +----------------------------------------------┬----------------------------------------------+
                                                       │
                                                       ▼
        +---------------------------------------------------------------------------------------------+
        |                            STAGE 3: TWO-TIER RISK SCORING ENGINE                            |
        |                                                                                             |
        |  [STAGE 3.1: HARD RULE DETERMINISTIC OVERRIDES]                                             |
        |  IF (RSA Signature Invalid || MRZ Mismatch || FAS Spoof || Tamper > 0.27%):                 |
        |      ===> TRIGGER IMMEDIATE RED ALERT (Risk = 100)                                          |
        |                                                                                             |
        |  [STAGE 3.2: PROBABILISTIC BAYESIAN AGGREGATION (If No Hard Override)]                     |
        |  Risk = w1*S_tamper + w2*(1 - S_face) + w3*S_rule + w4*S_crypto                             |
        |  ===> Output Band: GREEN (0-30) | AMBER (31-69) | RED (70-100)                              |
        +----------------------------------------------┬----------------------------------------------+
                                                       │
                                                       ▼
        +---------------------------------------------------------------------------------------------+
        |                       STAGE 4: TAURI DESKTOP APPLICATION & AUDIT EXPORT                     |
        |  • Dual-Canvas Viewer: Original Document Image vs Red Forensic Tamper Overlay Heatmap       |
        |  • Structured Explainability Telemetry Panel (Plain-English Bulleted Flag Reasons)          |
        |  • One-Click Court-Admissible PDF Evidence Certificate Export                               |
        |  • Immutable SHA-256 Chained Transaction Audit Log (RAM-only Ephemeral Image Cleanup)       |
        +---------------------------------------------------------------------------------------------+
```

---

## 5. Final Synthesis Recommendations & Wave 3 Architecture Action Plan

### Summary of Authoritative Decisions for Wave 3 Architecture Document

1. **Deployment Architecture Separation**:
   - **Development & Internal Round Prototype**: MacBook Air M4 (16 GB Unified Memory), Python 3.11 virtual environment, ONNX Runtime MPS/CPU, Tauri 2.0 + React/Vite native `.app` bundle, Zero Docker overhead.
   - **Production Edge Target Deployment**: Air-gapped Linux x86_64 workstation (Intel i7 / 32 GB RAM / NVIDIA RTX 4060 8 GB VRAM / Jetson Orin), Docker Compose containerized multi-service mesh (NGINX, FastAPI, PostgreSQL 16 pgvector, Redis 7).
2. **OCR & Document Parsing**:
   - **Primary Deterministic Engine**: PP-OCRv4 + PP-StructureV2 (`devanagari_PP-OCRv4_rec` + `en_PP-OCRv4_rec`).
   - **Semantic Quality Gate**: Qwen2.5-VL-3B-Instruct (INT4 AWQ) triggered asynchronously only when character confidence drops below $\tau_{ocr} = 0.82$.
   - **Multilingual Scope**: Devanagari (Hindi, Nepali) + Latin (English, MRZ). Native Dzongkha/Tibetan script deferred to Phase 2.
3. **Biometrics & Liveness**:
   - **Detector & Aligner**: SCRFD-10GF with 5-point Umeyama alignment ($112\times 112$).
   - **Verification Backbone**: AdaFace-ResNet100 (Glint360K weights, age-adaptive margin).
   - **Passive Liveness**: MiniFASNetV2-SE dual-scale ensemble (Scale 2.7x + Scale 4.0x + 2D FFT).
4. **Forensics & Tampering**:
   - **Text / Digits**: DocTamper DTD (DCT Frequency Perception Head).
   - **Splicing / Diffusion**: TruFor RGB Transformer + Noiseprint++ residuals.
   - **Calibration**: DocForge-Bench adaptive threshold ($\tau_{adapt} = 0.18$).
   - **Stamp Authentication**: Dedicated 4-stage pipeline (Color region detection $\rightarrow$ OCR $\rightarrow$ Registry template match $\rightarrow$ Contextual consistency).
5. **MRZ & QR Validation**:
   - **MRZ**: OmniMRZ + ICAO Doc 9303 Modulo-10 7-3-1 Checksum Engine (TD1, TD2, TD3).
   - **QR**: zxing-cpp + UIDAI Offline RSA-2048 PKI Signature Verifier + JP2000 Face Extractor.
6. **Cross-Validation & Risk Engine**:
   - Two-stage decision engine: Hard Deterministic Overrides (Instant RED) + Bayesian Multi-Factor Weighted Scoring.
7. **Client & Networking**:
   - **Internal Round**: Native Tauri 2.0 macOS application (`SSB-Screening.app`), USB / local hotspot connectivity.
   - **Production**: Next.js 15 Web Dashboard + Flutter Android Field Client over dedicated air-gapped Wi-Fi LAN router.
8. **MVP Scope & Delegation**:
   - 100% Pretrained Weights for direct inference (zero local training on M4 Mac).
   - Android Mobile App implementation cleanly deferred to downstream `android-agent/MASTER_PROMPT.md`.

---
*End of Authoritative Specification Mining Report (SIH26188 Wave 3 Synthesis)*
