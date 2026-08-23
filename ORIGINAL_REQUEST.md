# Original User Request

## Initial Request — 2026-08-22T22:17:31+05:30

Build a comprehensive, battle-tested **technical research and architecture report** for the Smart India Hackathon 2026 problem statement **SIH26188 – AI-Based Fake Identity & Document Screening System** (Ministry of Home Affairs, Sashastra Seema Bal).

Working directory: ~/teamwork_projects/sih26188_doc_screening
Integrity mode: development

## Context

The document at `/Users/iamsparsh00321/Downloads/diddyparty.txt` contains a full Grok conversation where a multi-agent debate system was simulated, arriving at a refined architecture. The key decisions already made:
- **OCR**: PaddleOCR-VL + dedicated MRZ module
- **Face Verification**: InsightFace (buffalo_l) + anti-spoofing
- **Tampering Detection**: Hybrid (ELA + CNN) but focused on photo region + MRZ + stamp areas
- **Deployment**: Fully offline, open-source, Docker on AWS/local server
- **Frontend**: Next.js 15 web dashboard + Flutter mobile app
- **Backend**: FastAPI (Python) + PostgreSQL + Redis

The team's job is to **challenge these decisions with live web research**, find the best available alternatives in 2026, synthesize the optimal final architecture, and produce a complete phase-by-phase implementation guide.

## Requirements

### R1. Adversarial Web Research — Challenge Every Module Decision
A team of specialized research agents must surf the web extensively (no fewer than 20 distinct web searches across agents) and challenge each component choice:
- Is PaddleOCR-VL truly the best open-source OCR for passport/Aadhaar/visa in 2026? Compare against MinerU 2.5-Pro, GLM-OCR, TrOCR, and any new models released since Jan 2026.
- Is InsightFace buffalo_l still SOTA for face verification, or has a better open-source model emerged? Check for ArcFace variants, AdaFace, or newer models.
- What is the current best approach for document tampering/forgery detection? Check for new forgery detection models, datasets (beyond CASIA v2), and techniques (beyond ELA).
- Is Flutter still the best choice for the mobile app, or is React Native/Expo better in 2026?
- Are there better MRZ reading libraries than standard PaddleOCR for passports?

### R2. Synthesize Final Architecture
After research and debate, produce a final definitive architecture document that includes:
- Final model/library choices for each of the 4 modules (OCR, Validation, Tampering Detection, Face Verification)
- Justification for each choice with 2026 benchmark references where available
- Exact Python library versions and model names to use
- Complete system architecture diagram (text/ASCII)
- Realistic performance targets (processing time, accuracy thresholds)

### R3. Phase-by-Phase Implementation Roadmap
Produce a complete, student-team-executable roadmap covering all 16+ phases from the document, including:
- Exact tools, libraries, commands, and APIs for each phase
- Dataset download sources and synthetic data generation strategy
- Estimated time per phase for a 5-member team over 3 months
- Clear MVP milestone (what must be working for the SIH demo)
- Pitch presentation structure with key talking points

### R4. Risk Analysis & Mitigation
Identify the top 5 technical risks for a student team implementing this system and propose specific mitigations for each.

## Acceptance Criteria

### Research Quality
- [ ] At least 20 distinct web searches conducted across agents
- [ ] Each of the 5 module decisions (OCR, Face, Tampering, Mobile, MRZ) challenged with at least 2 alternative options found via live search
- [ ] At least 3 papers or benchmark results from 2025–2026 cited

### Architecture Output
- [ ] Final architecture document contains exact model names, Python packages, and version numbers
- [ ] Processing pipeline end-to-end latency target stated (in seconds)
- [ ] All 4 modules addressed with clear winner and runner-up

### Implementation Roadmap
- [ ] All 16 phases from the source document addressed
- [ ] MVP scope clearly defined (minimum working demo for SIH)
- [ ] Dataset strategy includes at least 2 public datasets + synthetic data approach

### Synthesis
- [ ] Final recommendations differ from OR confirm the original debate's conclusions with evidence
- [ ] Risk analysis identifies at least 5 specific risks with mitigations

---
*Source document: `/Users/iamsparsh00321/Downloads/diddyparty.txt` — full Grok conversation with original debate context*

## 2026-08-22T17:21:16Z

This is the second research wave for SIH26188 (AI-Based Fake Identity & Document Screening System, Ministry of Home Affairs, Sashastra Seema Bal). The first team already produced a 1,071-line definitive architecture report at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/FINAL_ARCHITECTURE_AND_RESEARCH_REPORT.md

The new document at /Users/iamsparsh00321/Downloads/epsteindiddyparty.txt (lines 1296-2223) contains four brand-new conversations that were NOT covered by the first team.

Working directory: ~/teamwork_projects/sih26188_wave2
Integrity mode: development

Context: New Content in the Second Document

1. Detailed Hybrid Tampering Approach (Grok breakdown):
- Region detection first: Photo region, MRZ zone, Text fields, Stamp/visa areas
- Classical forensics: ELA on photo region, Noise inconsistency, JPEG Ghost/double compression, Copy-move detection, Edge/lighting inconsistency around photo boundary
- Deep learning: photo replacement classifier on portrait region, general forgery localization model
- Consistency checks: MRZ vs visual text mismatch, font/spacing analysis, photo geometry, stamp texture
- Metadata: EXIF editing traces, timestamps, software tags, color profile anomalies
- Output: JSON with tampering_score (0-100), risk_level, detected_issues list, heatmap base64, confidence

2. Grok Multi-Agent Dataset + Model Research:
New datasets not in Wave 1:
- IDNet (~837k images): portrait substitution, text field alteration, face morphing, crop-move, inpainting, 20 document types. Grok marked as Must Use.
- FantasyID (~6.5k images): face swap + text replacement, arxiv paper 2507.20808, publicly available
- SIDTD: synthetic ID and travel docs, built on MIDV, forged versions with crop-and-move + inpainting
- DocTamper, T-SROIE, OSTF, RTM: document text + image manipulation localization datasets

New models Grok found:
- TruFor: strong general localization, heatmap-capable
- PSCC-Net: pixel-level localization, photo region + splicing (Note: Wave 1 DISQUALIFIED PSCC-Net — needs investigation)
- MVSS-Net: multi-view + noise features
- CAT-Net: compression artifact aware (JPEG/double compression)
- IML-ViT: transformer-based, modern performance
- DTD/FFDN: document-specific models
- ForensicHub: unified benchmark codebase for all-domain fake image detection
- VendorBench-100: cross-paradigm deepfake detection benchmark

3. Grok Critical Review of Wave 1 Report (8.7/10):
Grok gave the Wave 1 report 8.7/10, calling it "most thorough architecture for SIH26188" but "dangerously ambitious for a 5-student team."

Grok's SIH MVP Cut recommendations (each needs to be challenged):
- OCR: Use PP-OCRv4 only. DROP Qwen2.5-VL-3B quality gate.
- Face: Use InsightFace buffalo_l for MVP. AdaFace-R100 = Phase 2 (too heavy).
- Tampering: Use ELA + MRZ consistency + ONE model only (TruFor OR DocTamper). NOT dual fusion.
- Mobile: Flutter can be secondary if time is short.
- Aadhaar QR: Nice-to-have, not mandatory.
- Latency: 1.45s target from Wave 1 is "extremely hard" on student hardware.

Requirements

R1. Challenge Grok's 6 MVP Scope Cuts with live 2026 web research (minimum 20 distinct web searches across the team):

- AdaFace vs buffalo_l latency: What is the actual inference time difference between AdaFace-ResNet100 and InsightFace buffalo_l on RTX 4060? Can ONNX export + INT8 quantization make AdaFace fast enough for MVP? Find benchmarks.
- Dual forensic fusion feasibility: DocTamper + TruFor dual fusion — is this genuinely hard to combine? Are pretrained checkpoints of both available and easy to load? How much extra latency does adding TruFor add to DocTamper alone?
- Qwen2.5-VL quality gate: With INT4 AWQ quantization, what is Qwen2.5-VL-3B's actual inference time on RTX 4060? Is the quality improvement over PP-OCRv4 alone worth the added latency for a fallback-only path?
- Aadhaar QR criticality: For SSB border checkpoints specifically (Indo-Nepal/Bhutan), what percentage of travelers are Indian nationals presenting Aadhaar as their primary document? Is offline RSA-2048 Aadhaar QR verification a must-have or genuinely optional for the SIH demo?
- SIH winning demos: What did SIH 2024/2025 grand finale winners actually demo? Do winning teams show mobile apps? Is Flutter mobile a significant scoring differentiator?
- 1.45s latency reality: Find real benchmarks for PP-OCRv4 + AdaFace-R100 + DocTamper on RTX 4060 or similar GPU. What is a realistic end-to-end latency target?

For each item produce: Grok is right / Grok is partially right / Grok is wrong, with evidence.

R2. Deep-Dive the New Datasets:
- IDNet: Find exact download URL or access method, license (can a student team use it?), confirm 837k figure, assess whether portrait-substitution samples are directly usable for passport photo-replacement training
- FantasyID: Verify arxiv 2507.20808 exists, find GitHub or HuggingFace repo, check license
- SIDTD: Find exact access method, check if Indian-style documents are included or only European IDs
- DocForge-Bench (mentioned in Wave 1 sources but not fully explored): What datasets does it include?
- Find at least one completely new 2026 document forgery dataset that neither Grok nor Wave 1 discovered
- Produce final priority ranking: Top 3 datasets for SIH team to actually download and use, with reasons

R3. Deep-Dive the New Tampering Models:
For each model: find GitHub URL, check last commit date and maintenance status, find published benchmark numbers (F1/AUC on CASIA v2, NIST16, IMD2020, or document-specific benchmarks), assess whether pretrained weights are available for direct inference without fine-tuning, rate feasibility for a student team (Easy/Medium/Hard):
- TruFor (already in Wave 1 as winner — confirm details)
- PSCC-Net (Wave 1 DISQUALIFIED it — why? Is Wave 1 wrong?)
- MVSS-Net
- CAT-Net v2
- IML-ViT
- DTD/FFDN (DocTamper related)
- ForensicHub: Is this a usable unified framework or just a paper? Does it provide one-command inference across multiple models?

Produce final verdict: best single model for SIH (considering accuracy + ease of use + pretrained weights availability), and best combo if dual fusion is feasible.

R4. Produce the SIH Grand Finale MVP Blueprint:
A complete, realistic, student-executable plan:
- EXACT pipeline for demo day: which models, in which order, with approximate latency per step (must sum to under 5s on RTX 4060 and under 8s on RTX 3060)
- ONNX export commands for each model chosen
- 12-week sprint plan (3 months) with weekly goals and team role assignments (5 members: 1 ML lead, 1 backend, 1 frontend/mobile, 1 data/pipeline, 1 full-stack)
- MVP scope: exactly what works on demo day vs what is shown as "Phase 2"
- Demo day script: step by step what the officer does, what the system processes, what appears on screen
- Hardware requirements for the SIH presentation setup

R5. SIH Pitch Script and Scoring Strategy:
- Find and document the SIH 2026 grand finale evaluation rubric categories and weightings (Innovation, Working Prototype, Presentation quality, Social Impact, Business Potential, Scalability)
- Research: what did SIH 2024 and 2025 winners do differently from average teams?
- Write a complete 8-minute pitch script, minute by minute:
  - Minute 1: Hook and problem impact
  - Minute 2: Current pain points (specific stats)
  - Minute 3: Solution overview and architecture
  - Minute 4-5: Live demo (scripted exactly)
  - Minute 6: Core innovation (why this is better)
  - Minute 7: Impact, scalability, deployment plan
  - Minute 8: Team, roadmap, ask
- Identify the 3 most critical demo moments (what visual on screen, what the judge sees)
- Write the exact demo commentary script for the presenter

Acceptance Criteria

R1 — Grok Challenge:
- [ ] All 6 Grok cuts challenged with live-searched evidence (benchmarks, papers, or repos found in 2026)
- [ ] Verdict stated for each: right / partially right / wrong with 1-2 sentence justification
- [ ] Aadhaar QR decision includes SSB operational statistics or border context evidence
- [ ] Latency budget updated based on real benchmarks found (not theoretical)

R2 — Datasets:
- [ ] IDNet download URL and license confirmed (not just mentioned)
- [ ] FantasyID GitHub/HuggingFace link confirmed
- [ ] SIDTD access method confirmed + Indian document coverage assessed
- [ ] Top 3 dataset ranking with download instructions
- [ ] At least 1 new 2026 dataset found not in Wave 1 or Grok's research

R3 — Models:
- [ ] All 7 models: GitHub URL + last commit + benchmark F1 or AUC + pretrained weights status + feasibility rating
- [ ] PSCC-Net disqualification from Wave 1 investigated — verdict confirmed or overturned
- [ ] ForensicHub evaluated: usable framework or paper only?
- [ ] Clear single best model for SIH chosen with justification
- [ ] Dual fusion feasibility verdict given

R4 — MVP Blueprint:
- [ ] Complete pipeline with per-step latency budget (GPU + CPU fallback numbers)
- [ ] ONNX export commands provided for chosen models
- [ ] 12-week sprint plan with weekly milestones and role assignments
- [ ] Demo day scenario scripted in detail

R5 — Pitch:
- [ ] SIH rubric categories and weightings documented
- [ ] 8-minute pitch script complete (minute by minute)
- [ ] 3 key demo moments scripted with exact on-screen description

Source files:
- New content: /Users/iamsparsh00321/Downloads/epsteindiddyparty.txt (lines 1296-2223)
- Wave 1 report: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/FINAL_ARCHITECTURE_AND_RESEARCH_REPORT.md
- Output directory: ~/teamwork_projects/sih26188_wave2/

## 2026-08-22T20:18:57Z

This is an architecture synthesis task for Smart India Hackathon 2026 problem SIH26188 (AI-Based Fake Identity & Document Screening System, Ministry of Home Affairs / Sashastra Seema Bal). NOT a research-from-scratch task.

Three source documents have been pre-extracted to text files and are ready to read:

1. BASELINE ARCHITECTURE (authoritative foundation):
   /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/baseline_arch.txt
   This is the current 1,071-line FINAL_ARCHITECTURE_AND_RESEARCH_REPORT. Treat it as the project bible. Do NOT redesign from scratch.

2. MAINCHAT CONVERSATION (6,415 lines):
   /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/conv_mainchat.txt
   The team's full conversation studying the baseline report section by section, raising questions, discovering gaps, proposing changes.

3. SIDEBYSIDE CONVERSATION (2,205 lines):
   /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/conv_sidebyside.txt
   A parallel independent questioning session with additional angles.

Working directory: ~/teamwork_projects/sih26188_wave3/
Integrity mode: development

Key constraint: Do not optimize for theoretical SOTA alone. Every recommendation must work for: a student team building a reliable offline SIH MVP under time, hardware (M4 Mac 16 GB unified RAM), and integration constraints. Reliability and demo-safety matter more than theoretical performance.

---

What Changed in the Conversations — 11 Key Topics to Evaluate

A. Development Hardware Reality
Team's actual dev machine: MacBook Air M4, 16 GB unified RAM, 256 GB internal + external SSD. Baseline was written for NVIDIA RTX 4060 target deployment. Conversations concluded:
- Dev = M4 Mac (ONNX + MPS backend, no CUDA/TensorRT)
- Target deployment = RTX 4060 / Jetson Orin (unchanged)
- Must be clearly separated in updated architecture
- No large-scale model training on Mac — pretrained model inference only
- Latency benchmarks in baseline (1.45s, 1.58s) are RTX 4060 numbers only

B. Qwen2.5-VL-3B Role
Baseline positions Qwen2.5-VL-3B-Instruct (AWQ INT4) as quality-gate runner-up dispatched when PP-OCRv4 confidence is below threshold. Conversations questioned this repeatedly:
- Why not use Qwen as primary?
- Answer: Qwen at INT4 takes 420-680ms per call; PP-OCRv4 is <30ms; for a <5s budget Qwen as primary is unworkable
- Conversations ultimately agreed with baseline positioning (Qwen as async quality-gate)
- But clarity on this needs to be explicit in the architecture document

C. Multilingual OCR Scope
Baseline covers Devanagari + Latin via PaddleOCR. Conversations raised:
- Languages needed at SSB borders: Hindi, Nepali, English, Dzongkha (Bhutan)
- Nepali is essentially Devanagari — already covered
- Dzongkha (Tibetan script) is a real gap for Bhutan-crossing documents
- Need decision: include Dzongkha or defer?

D. MRZ Pipeline
Baseline: OmniMRZ + ICAO Doc 9303 Modulo-10 7-3-1 checksum. Conversations confirmed correct. Minor clarification needed:
- MRZ should NOT be treated as generic OCR problem (dedicated pipeline is correct)
- Consistency check between MRZ fields and visual text fields is critical — make this architecturally explicit

E. Stamp Authentication Gap — CRITICAL
Baseline's DocTamper + TruFor detects general manipulation but has NO dedicated stamp authentication module. Conversations identified this as a genuine gap:
- SSB border stamps (rubber/laser) are high-value forgery targets
- Proposed: stamp region detection → template matching vs authorized stamp registry → forensic analysis → context consistency check (stamp location/date vs MRZ/QR data)
- Need to evaluate and either add or explicitly defer with justification

F. 3-Stream Parallel Architecture with Cross-Validation
Baseline proposes parallel execution of OCR+MRZ, Biometrics, and Forensics streams. Conversations confirmed architecturally correct but emphasized:
- Cross-validation between streams, not just score fusion at the end
- Example: if MRZ says DOB 1990 but face age estimate says 40+, that inconsistency is itself a risk signal
- The risk engine needs explicit cross-validation logic, not just individual module scores

G. Risk Scoring Engine
Baseline uses Bayesian multi-factor risk scoring (GREEN/AMBER/RED). Conversations raised:
- Evidence cross-validation must feed INTO the risk score explicitly
- Output needs: risk score + color status + specific reasons per flag + forensic heatmap
- Officers need to understand WHY a document was flagged

H. Desktop Application Architecture — SIGNIFICANT CHANGE
Baseline proposes Next.js 15 web dashboard. Conversations concluded this should be a Tauri desktop application:
- Tauri wraps React/Vite frontend + FastAPI backend as a macOS .app
- Gives judges a proper application rather than 'please open localhost:3000'
- Internal round: no Docker dependency (Python venv + Tauri + React)
- Final deployment: Docker Compose wrapping the same components
- This is a significant architecture change from the baseline — needs proper evaluation

I. Phone-to-Edge Connectivity
Baseline assumes private local LAN with dedicated Wi-Fi router. Conversations concluded:
- Internal SIH round: no router purchase needed; USB connection or Mac as hotspot sufficient
- Final deployment: dedicated local router/AP is correct
- Architecture must distinguish these two contexts clearly

J. Pretrained Models vs Training
Conversations confirmed: for SIH MVP, use ONLY pretrained model weights for inference. No fine-tuning or training on M4 Mac. Updated architecture should:
- Mark which models are inference-only with pretrained weights vs require training
- Remove training pipeline steps from MVP scope
- Move fine-tuning to Phase 2

K. Android Handoff
Android is explicitly deferred. Architecture must produce a detailed Android agent handoff specification.

---

Requirements

R1. Read and Analyse All Three Source Documents
Read all three text files completely. Extract every meaningful proposed change, question, and discovery from both conversations. For each item, identify: what baseline says, what was proposed, whether it is a genuine improvement.

R2. Adversarial Evaluation with Web Research
For every topic (A through K), rigorous technical evaluation:
- Challenge each proposal with independent reasoning and web research
- Determine: keep as-is / modify / add / reject / defer with justification
- Do NOT change something just because the conversation is newer
- Do NOT preserve something just because it is in the original report
- Categorize every claim: verified fact / source claim / assumption / inference

Conduct at least 15 Tavily/web searches. Key searches needed:
- Qwen2.5-VL-3B INT4 inference speed on M4 Apple Silicon vs NVIDIA GPU
- PP-OCRv4 vs Qwen2.5-VL accuracy on structured document OCR 2025-2026
- PaddleOCR Tibetan/Dzongkha script support
- Tauri 2.0 macOS desktop app performance and packaging
- OmniMRZ pretrained weights inference-only usage
- AdaFace-ResNet100 ONNX inference on Apple Silicon MPS
- TruFor pretrained checkpoint inference on CPU/MPS without CUDA
- DocTamper pretrained weights direct inference
- Stamp authentication/forgery detection approaches 2025-2026
- MiniFASNetV2 ONNX Apple Silicon inference speed
- ONNX Runtime MPS backend performance for CV models on M4 Mac
- MacBook Air M4 unified memory ML inference capabilities
- SSB border document types (passports, visas, travel permits)
- Bhutan border crossing documents and Dzongkha script prevalence

R3. Produce Updated Architecture Document
Produce a single updated markdown at: ~/teamwork_projects/sih26188_wave3/UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md

This document must:
- Take baseline as foundation — preserve depth, technical detail, structure
- Incorporate every change that survives technical scrutiny
- Add sections only where genuinely justified
- Annotate changes: [UPDATED], [NEW], [UNCHANGED], [DEFERRED]
- For every significant change: explain what changed, why, and what was rejected/deferred
- NOT redesign from scratch — recognizably the same report with targeted updates
- Clearly separate: M4 Mac development environment vs RTX 4060/Jetson target deployment
- Include a Change Log section at the start listing all modifications
- Maintain same technical depth as original (specific model names, versions, latency budgets, ONNX export commands)
- Describe a coherent ONE recommended architecture, with rejected/deferred alternatives explained

Key sections the document must cover:
- Module 1: OCR (with Qwen role clarification + multilingual scope update/decision)
- Module 2: Biometrics + Face Anti-Spoofing
- Module 3: Document Forensics (with Stamp Authentication Module evaluated)
- Module 4: MRZ + QR/Barcode (with cross-validation clarification)
- System Architecture: 3-stream parallel execution with explicit cross-validation logic
- Risk Scoring Engine (with cross-validation inputs explicit)
- Application Architecture: Tauri desktop app for internal round vs Docker for production
- Deployment Environments: M4 Mac dev vs RTX 4060 edge (separated clearly)
- Network/Connectivity: Internal round (USB/hotspot) vs Final deployment (LAN)
- MVP Scope: pretrained-only inference stack
- Phase 2 / Deferred items

R4. Supporting Modular Documents
Produce at ~/teamwork_projects/sih26188_wave3/docs/:
- 01_CHANGE_LOG_AND_ANALYSIS.md — decision log for every evaluated change
- 02_DEPLOYMENT_ENVIRONMENTS.md — M4 Mac dev vs RTX 4060 production, model load configs
- 03_DESKTOP_APP_ARCHITECTURE.md — Tauri + React/Vite + FastAPI architecture, API contracts
- 04_STAMP_AUTHENTICATION_MODULE.md — if added: full spec; if deferred: full justification

R5. Android Agent Handoff
Produce ~/teamwork_projects/sih26188_wave3/android-agent/MASTER_PROMPT.md

This is a complete handoff for a future AI agent implementing the Android app. It must:
- Describe project in full context (what SIH26188 is, what the system does, why Android matters)
- Specify Android app's role: document capture + result display (camera -> API -> display)
- Document ALL FastAPI API endpoint schemas the Android app must call (exact request/response)
- Specify connectivity behaviour: USB debugging for internal round, Wi-Fi hotspot for demo
- Describe offline behaviour: what happens if edge server unreachable
- List what Android agent must NOT do: rebuild backend, change API contracts, retrain models
- Explicitly instruct it to read the full project before making any changes
- Be completely self-contained — no additional briefing needed

---

Acceptance Criteria

R1 Analysis:
- [ ] All three source files read completely
- [ ] All 11 topic areas (A-K) addressed in change log
- [ ] Each conversation proposal identified as keep/modify/add/reject/defer

R2 Adversarial Evaluation:
- [ ] At least 15 web searches conducted and cited
- [ ] Qwen2.5-VL-3B vs PP-OCRv4 decision supported by independent benchmark evidence
- [ ] Tauri desktop app feasibility confirmed independently
- [ ] Stamp authentication decision (add or defer) technically justified
- [ ] Dzongkha OCR decision made with evidence
- [ ] Every claim categorized as verified fact / source claim / assumption / inference

R3 Updated Architecture:
- [ ] Document recognizably derived from baseline (not a rewrite)
- [ ] Change log at start listing all modifications
- [ ] [UPDATED]/[NEW]/[UNCHANGED]/[DEFERRED] markers present throughout
- [ ] M4 Mac dev environment clearly separated from RTX 4060 production targets
- [ ] Qwen2.5-VL role clearly explained (why quality-gate, not primary)
- [ ] 3-stream parallel architecture includes explicit cross-validation logic
- [ ] Risk scoring engine shows how cross-validation feeds into the score
- [ ] Tauri desktop app architecture included
- [ ] Network/connectivity distinguishes internal round from final deployment
- [ ] MVP scope defines pretrained-only inference stack

R4 Modular Docs:
- [ ] All 4 modular docs present and substantive
- [ ] Stamp authentication: full spec OR fully justified deferral

R5 Android Handoff:
- [ ] android-agent/MASTER_PROMPT.md exists and is self-contained
- [ ] All FastAPI API endpoint schemas included
- [ ] Connectivity modes documented
- [ ] Android agent explicitly told what NOT to modify
- [ ] Android agent explicitly instructed to read full project first

Source files:
- Baseline: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/baseline_arch.txt
- Conversation 1: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/conv_mainchat.txt
- Conversation 2: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/conv_sidebyside.txt
- Output dir: ~/teamwork_projects/sih26188_wave3/
- Protected baseline PDF: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_doc_screening/FINAL_ARCHITECTURE_AND_RESEARCH_REPORT_v1_BASELINE.pdf

## 2026-08-22T22:51:29Z

Refactor the full user interface of the SSB AI Document & Identity Screening System (SIH26188) by implementing the design language, primitives, and micro-interactions from the cloned `beautiful-ui` repository across all views.

Working directory: ~/teamwork_projects/sih26188_beautiful_ui
Integrity mode: development

## Requirements

### R1. Design System & CSS Variables Tokenization
- Implement all CSS color tokens, tints (`--red-tint`, `--green-tint`, `--field`, `--hover`), radii (`--radius-chip`, `--radius-control`, `--radius-card`), and keyframe animations (`pop-in`, `fade-up`, `radarSweep`, `pop-out`) in `frontend/src/index.css`.

### R2. Beautiful-UI Primitives Porting & Adaptations
Adapt and implement the following components from `sih26188_project/beautiful-ui-reference` into `sih26188_project/frontend/src/components/ui/`:
- **`DiffTable`**: For forensic cross-field mismatch inspection (e.g., visual text vs MRZ discrepancies).
- **`FilterTable`**: For cross-validation rules and checkpoint history logs with status chips.
- **`ApprovalCard`**: For border officer human-in-the-loop decisions (Hold for Secondary, Clear, Issue Interdiction).
- **`ToolChips` / `TaskRows`**: For granular multi-model execution telemetry.
- **`SegmentedControl` & `StatusPill`**: For presets and risk level indicators.

### R3. Dashboard Layout & Ingestion Refactoring
- Restructure `IngestionPanel.tsx`, `Dropzone.tsx`, and `WebCamCapture.tsx` to eliminate empty negative space and ensure responsive alignment.
- Provide live preview cards for ingested documents and biometrics with tactile upload buttons.

### R4. Complete Integration & Tauri Verification
- Connect all new primitives to the reactive state in `App.tsx` and `ResultsPanel.tsx`.
- Verify clean frontend build (`npm run build`) and backend tests (`pytest tests/`).
- Compile the macOS desktop application (`cargo-tauri build`) bundled with the official `ssb.webp` icon.

## Acceptance Criteria

### Component Implementation
- [ ] All 5 adapted primitives (`DiffTable`, `FilterTable`, `ApprovalCard`, `ToolChips`, `SegmentedControl`) render cleanly in TypeScript.
- [ ] No missing dependencies (`posthog`, next.js server components) in the Vite/React app.

### Visual & Functional Quality
- [ ] Ingestion screen layout fills the viewport cleanly without blank space.
- [ ] Cross-validation results render via `FilterTable` with interactive filter pills.
- [ ] Secondary action buttons open `ApprovalCard` for officer interdiction.

### Verification
- [ ] `npm run build` completes in `frontend/` with 0 errors.
- [ ] `pytest tests/` in `backend/` passes all 121 tests.
- [ ] `cargo-tauri build` produces a working `SSB Screening.app` macOS bundle with the custom icon.


