# Original User Request

## 2026-08-22T21:00:48Z

You are the Lead Implementation Architect for Smart India Hackathon 2026 project SIH26188 – AI-Based Fake Identity & Document Screening System.

## Source of Truth
The authoritative architecture document (Version 3.0) is at:
`/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md`

READ THE FULL ARCHITECTURE DOCUMENT BEFORE MAKING ANY DECISIONS. It is 1,237 lines and contains the exact model choices, pinned requirements, memory budgets, latency targets, folder structure, API schemas, and ONNX export scripts you must use.

## Environment Facts (Pre-verified)
- Python 3.11 is being installed via `brew install python@3.11` — check if available at `/opt/homebrew/bin/python3.11` before using. If still installing, use `python3.12` or whatever 3.x is available as a temporary stand-in for venv creation, but name the venv `.venv311`
- Rust is installed at `~/.cargo/bin/rustc` (source `~/.cargo/env` to activate)
- Node 24 / npm 11 are available
- Docker 29.6 is available
- External SSD at `/Volumes/issparsh` (378 GB free) — store large model weights here at `/Volumes/issparsh/sih26188_models/`
- Internal disk: 61 GB free
- Existing workspace: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/`

## Working Directory
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/`

Create this as the new clean monorepo for all implementation work.

## Primary Constraints
- Development machine: Apple Silicon M4 MacBook Air (16 GB Unified Memory)
- 100% offline / air-gapped capable — no external API calls ever
- Target production: NVIDIA RTX 4060 8GB / Jetson Orin
- Latency target: < 3.5s reliable on M4, < 1.5s on RTX 4060
- Pretrained models ONLY — no local training
- Android deferred — only MASTER_PROMPT.md handoff
- Focus: working, demo-ready MVP

## Priority Order (If time/resources limited)
1. Project skeleton + infrastructure
2. OCR + MRZ + cross-validation pipeline
3. Face matching + anti-spoofing
4. Document forensics + heatmap
5. Risk scoring engine
6. Desktop UI (simple local web first, Tauri later)
7. Stamp module & advanced features
8. Android handoff spec

---

## Subagent Team — Launch All of These in Parallel

### Subagent 1: Project Skeleton & Infrastructure Agent
Deliver:
- Clean monorepo at `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/` with:
  ```
  sih26188_project/
  ├── backend/
  │   ├── app/
  │   │   ├── api/          # FastAPI routers
  │   │   ├── core/         # backend_selector.py, config, logging
  │   │   ├── modules/      # ocr/, biometrics/, forensics/, mrz/, risk_engine/, stamp_verifier/
  │   │   ├── schemas/      # Pydantic v2 request/response models
  │   │   └── data/         # stamp_registry.json, uidai_root_cert.pem placeholder
  │   ├── models/           # .gitignore all *.onnx *.pth (too large), but create README.md listing all required weights
  │   ├── scripts/          # export_models_to_onnx.py, download_weights.sh
  │   └── requirements.txt  # Exact pinned versions from architecture doc Section 3.2
  ├── frontend/
  │   ├── src/
  │   └── package.json
  ├── docker/
  │   └── docker-compose.yml  # Production Linux RTX 4060 deployment
  ├── android-agent/
  │   └── MASTER_PROMPT.md  # from Wave 3 docs (copy from /Users/iamsparsh00321/teamwork_projects/sih26188_wave3/android-agent/MASTER_PROMPT.md and update with actual API contracts)
  └── README.md
  ```
- Create `.venv311` Python virtual environment using `python3.11` if available, else `python3.12`
- Create `backend/app/main.py` — FastAPI app with:
  - `GET /health` — returns `{status: ok, models_loaded: [], timestamp}`
  - `POST /api/v1/scan/inspect` — stub that accepts `multipart/form-data` with `document_image` file and optional `live_face_image` file
  - Proper CORS for localhost:3000 and tauri://localhost
  - Lifespan events for model loading
- Create `backend/app/core/backend_selector.py` — exact code from architecture doc Section 3.5
- Create `backend/app/core/config.py` — settings with model paths, thresholds, environment flags
- Create `backend/app/data/stamp_registry.json` — with Jaigaon and Sonauli entries from architecture doc Section 2.4
- Create `docker/docker-compose.yml` — FastAPI + PostgreSQL 16 with pgvector + Redis 7 for production
- Create `backend/scripts/download_weights.sh` — a shell script that downloads all pretrained model weights listed in architecture doc Section 3.3 to `/Volumes/issparsh/sih26188_models/` using wget/curl
- Verify FastAPI starts: `uvicorn app.main:app --reload --port 8000` from `backend/`

### Subagent 2: OCR + MRZ Pipeline Agent
Deliver working implementation at `backend/app/modules/ocr/` and `backend/app/modules/mrz/`:

**OCR module (`backend/app/modules/ocr/pp_ocr_engine.py`):**
- Uses PaddleOCR (PP-OCRv4) as primary synchronous OCR
- Input: PIL Image or numpy array (BGR)
- Output: `OCRResult` Pydantic model with `fields: dict[str, str]`, `confidence: dict[str, float]`, `raw_boxes: list`, `mean_confidence: float`
- Detects if confidence < 0.82 and flags for Qwen quality gate
- Qwen2.5-VL dispatch stub (async, commented out, with clear TODO marker)
- Script-aware: tries Devanagari model first for Aadhaar/Voter ID, Latin for passports
- Graceful fallback: if PaddleOCR unavailable, return `OCRResult` with `status=unavailable`

**MRZ module (`backend/app/modules/mrz/mrz_engine.py`):**
- ICAO Doc 9303 Modulo-10 7-3-1 checksum validator (pure Python, no external deps)
- Parses TD1 (3×30), TD2 (2×36), TD3 (2×44) MRZ formats
- Returns: `MRZResult` with `valid: bool`, `parsed_fields: dict`, `checksum_failures: list[str]`, `mrz_type: str`
- OmniMRZ ONNX integration stub with clear download instructions in docstring

**Cross-validation (`backend/app/modules/mrz/cross_validator.py`):**
- Takes `OCRResult` + `MRZResult` + `QRPayload` (optional)
- Implements ALL 8 cross-validation rules from architecture Section 6.3:
  1. OCR name vs MRZ surname/given names
  2. OCR DOB vs MRZ DOB
  3. OCR document number vs MRZ document number
  4. MRZ expiry vs current date
  5. QR demographic vs OCR fields (if QR present)
  6. QR demographic vs MRZ fields (if QR present)
  7. Stamp date vs OCR issue date / permit validity
  8. Biometric apparent age vs MRZ DOB (age-drift check — this field comes in separately)
- Returns: `CrossValidationResult` with `violations: list[CrossViolation]`, `violation_count: int`, `cross_validation_passed: bool`

**FastAPI router (`backend/app/api/routers/ocr.py`):**
- `POST /api/v1/ocr/extract` — takes image, returns OCRResult
- `POST /api/v1/mrz/validate` — takes MRZ string, returns MRZResult

### Subagent 3: Biometrics Agent
Deliver working implementation at `backend/app/modules/biometrics/`:

**Face detection (`backend/app/modules/biometrics/face_detector.py`):**
- InsightFace SCRFD-10GF via ONNX Runtime
- Input: numpy BGR image
- Output: `FaceDetectionResult` with `faces: list[FaceBBox]`, `landmarks: list`, `count: int`
- Graceful: if SCRFD weights not found, return empty detection with warning log

**Face matching (`backend/app/modules/biometrics/face_matcher.py`):**
- AdaFace-ResNet100 ONNX for embedding extraction (primary)
- Fallback: InsightFace buffalo_l/antelopev2 if AdaFace ONNX not available
- Input: two face crops (document photo + live capture)
- Umeyama 5-point affine alignment to 112×112 canonical crop
- Output: `FaceMatchResult` with `similarity: float`, `match: bool`, `threshold: float (0.35 cosine)`, `embedding_model_used: str`

**Anti-spoofing (`backend/app/modules/biometrics/liveness_detector.py`):**
- MiniFASNetV2-SE dual-scale (2.7× and 4.0× crops) via ONNX
- Input: face crop
- Output: `LivenessResult` with `is_live: bool`, `confidence: float`, `attack_type: str | None`

**FastAPI router (`backend/app/api/routers/biometrics.py`):**
- `POST /api/v1/biometrics/match` — takes document_image + live_image, returns FaceMatchResult + LivenessResult

### Subagent 4: Document Forensics Agent
Deliver working implementation at `backend/app/modules/forensics/`:

**Tampering detector (`backend/app/modules/forensics/tamper_detector.py`):**
- DocTamper DTD ONNX (primary text/digit tampering)
- TruFor PyTorch/MPS (secondary splicing detection)
- Classical ELA on photo region: `modules/forensics/ela_engine.py`
  - Save as JPEG at quality 90, compute absolute difference, amplify ×20
  - Returns numpy heatmap of potential manipulation regions
- DocForge adaptive threshold: τ_adapt = 0.18
- EXIF/DQT metadata parser: detect Photoshop/GIMP editing tags
- Input: numpy BGR document image
- Output: `ForensicsResult` with:
  - `tamper_score: float (0-1)` — fused score
  - `heatmap_base64: str` — alpha-blended turbo colormap PNG as base64
  - `reasons: list[str]` — human-readable flag reasons
  - `doctamper_score: float`
  - `trufor_score: float`
  - `ela_max_intensity: float`
  - `exif_suspicious: bool`

**Stamp verifier (`backend/app/modules/stamp_verifier.py`):**
- 4-stage pipeline from architecture Section 2.4:
  - Stage 1: HSV color filtering + HoughCircles for stamp region localization
  - Stage 2: Load stamp_registry.json, SSIM + ORB keypoint matching against reference templates
  - Stage 3: Route stamp crop to DocTamper/TruFor for forensic integrity
  - Stage 4: Context consistency — compare stamp date/location vs OCR fields
- Input: document image + OCRResult
- Output: `StampResult` with `stamp_found: bool`, `stamp_score: float`, `verdict: str`, `reasons: list[str]`

**FastAPI router (`backend/app/api/routers/forensics.py`):**
- `POST /api/v1/forensics/analyze` — takes image, returns ForensicsResult + StampResult

### Subagent 5: Risk Engine + Cross-Validation Agent
Deliver working implementation at `backend/app/modules/risk_engine/`:

**Two-stage risk engine (`backend/app/modules/risk_engine/risk_scorer.py`):**

Implement EXACTLY as per architecture Section 6:

Stage 1 — Hard Tripwire Overrides (INSTANT RED = score 95):
- TRIPWIRE_1: MRZ checksum failure on any of CD1/CD2/CD3/CD4
- TRIPWIRE_2: Aadhaar RSA-2048 QR signature verification failure
- TRIPWIRE_3: TruFor/DocTamper photo splice score > 0.75
- TRIPWIRE_4: MiniFASNet liveness = False (spoofing detected)
- TRIPWIRE_5: Face similarity < 0.20 (completely different person)
- TRIPWIRE_6: Watchlist HNSW hit (when pgvector is available)
- Any tripwire → IMMEDIATE RED, skip Stage 2

Stage 2 — Multi-Factor Log-Odds Bayesian Scoring:
```
logit_total = (
    3.0 * tamper_logit(forensics.tamper_score) +
    2.5 * face_logit(1 - biometrics.similarity) +
    2.0 * mrz_logit(mrz.violation_severity) +
    1.5 * cross_val_logit(cross_val.violation_count / 8) +
    1.0 * stamp_logit(stamp.stamp_score) +
    0.5 * metadata_logit(forensics.exif_suspicious)
)
risk_score = sigmoid(logit_total) * 100
```
Thresholds: GREEN < 35, AMBER 35-65, RED > 65

**Output schema `RiskAssessment`:**
```python
class RiskAssessment(BaseModel):
    risk_score: float           # 0-100
    risk_level: str             # GREEN / AMBER / RED
    tripwire_triggered: bool
    tripwire_codes: list[str]   # e.g. ["TRIPWIRE_2: QR_RSA_FAIL"]
    reasons: list[str]          # human-readable bullet points
    heatmap_url: str | None     # path to rendered heatmap
    processing_time_ms: float
    cross_validation_violations: list[str]
    model_versions: dict[str, str]
```

**Master scan endpoint (`backend/app/api/routers/scan.py`):**
- `POST /api/v1/scan/inspect` — the MAIN endpoint
  - Accepts: `document_image` (required) + `live_face_image` (optional)
  - Orchestrates all modules in parallel using asyncio.gather()
  - Returns full `RiskAssessment`
  - Target: < 3500ms on M4

### Subagent 6: Frontend UI Agent
Deliver a clean working local web UI at `frontend/`:

- React 19 + Vite 6 + TailwindCSS
- Single-page officer dashboard:
  - Document image upload/drop zone
  - Optional live face capture (webcam or upload)
  - "Scan Document" button → calls `POST /api/v1/scan/inspect`
  - Results panel:
    - Large GREEN/AMBER/RED risk badge
    - Risk score (0-100)
    - List of reason bullets
    - Document heatmap overlay (side-by-side original vs heatmap)
    - Module breakdown table: OCR ✓/✗, MRZ ✓/✗, Face ✓/✗, Forensics score, Stamp ✓/✗
  - Offline indicator (shows "LOCAL ONLY" badge)
- Must work with `npm run dev` → localhost:3000
- API base URL configurable via `.env.local` (default: `http://localhost:8000`)

Note: Tauri packaging is optional — build the React UI first so it works in browser. Tauri wrapping can be added later.

### Subagent 7: Integration & Testing Agent
- Create `backend/tests/` with pytest tests for:
  - `test_mrz_checksum.py` — tests all 4 ICAO check digit types with known-valid and known-invalid MRZ strings
  - `test_cross_validation.py` — tests all 8 cross-validation rules
  - `test_risk_engine.py` — tests tripwire triggers and Bayesian scoring
  - `test_api_health.py` — FastAPI TestClient health check and stub scan endpoint
- Create `backend/scripts/download_weights.sh` — curl/wget commands for all models in Section 3.3
- Create `README.md` at project root with:
  - Quick start: how to set up venv, install requirements, download models, start backend
  - How to run frontend
  - Model download instructions pointing to external SSD
  - Architecture overview linking to Wave 3 report

---

## Working Rules
1. Read architecture doc (`/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md`) FIRST, especially Sections 2, 3, 5, 6.
2. Use exact pinned library versions from Section 3.2.
3. Use exact ONNX export scripts from Section 3.5.
4. Every module must gracefully handle missing model weights — log a warning and return a safe stub response. NEVER crash the pipeline.
5. All model weight paths must be configurable via environment variable (default: `/Volumes/issparsh/sih26188_models/`).
6. Never hardcode localhost:8000 — use config.
7. Every function must have a docstring explaining its input, output, and which architecture section it implements.
8. Use `structlog` or standard Python `logging` for all decisions and confidence scores.
9. Type everything with Python typing + Pydantic v2 models.

## Acceptance Criteria
- [ ] `backend/` folder exists with complete module structure
- [ ] `backend/app/main.py` FastAPI starts without errors (`uvicorn app.main:app`)
- [ ] `GET /health` returns 200 OK
- [ ] `POST /api/v1/scan/inspect` returns valid JSON (even if models not loaded)
- [ ] `backend/requirements.txt` has all pinned versions from Section 3.2
- [ ] All 8 cross-validation rules implemented in `cross_validator.py`
- [ ] Both tripwire + Bayesian stages implemented in `risk_scorer.py`
- [ ] MRZ ICAO checksum validated with tests passing
- [ ] `frontend/` React app builds without errors (`npm run dev`)
- [ ] `backend/scripts/download_weights.sh` has correct download commands for all 8 models
- [ ] `stamp_registry.json` has Jaigaon and Sonauli entries
- [ ] `backend_selector.py` auto-detects CoreML/MPS on M4 Mac vs CUDA on Linux
- [ ] README.md has clear quick-start instructions
- [ ] All modules fail gracefully when model weights not present
- [ ] android-agent/MASTER_PROMPT.md exists with updated API contracts

Working directory for all output: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/`

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

