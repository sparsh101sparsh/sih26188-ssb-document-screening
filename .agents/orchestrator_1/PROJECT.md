# Project: SIH26188 — AI-Based Fake Identity & Document Screening System

## Architecture
- **Monorepo Root**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/`
- **Backend**: FastAPI (Python 3.11) with 3-Stream Parallel Processing (OCR/MRZ/QR, Biometrics, Forensics/Stamps) and 2-Stage Bayesian Risk Engine.
- **Frontend**: React 19 + Vite 6 + TailwindCSS Local Officer Dashboard.
- **Deployment**: Dual Target (macOS M4 Apple Silicon native CoreML/MPS/CPU development, Linux x86_64 RTX 4060 / Jetson Orin Docker Compose production).
- **Offline / Air-gap**: 100% offline, zero cloud calls, weights stored at `/Volumes/issparsh/sih26188_models/` (configurable).

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 1 | Project Skeleton & Configs | Monorepo layout, Pydantic settings, dynamic backend selector, stamp registry, docker-compose, ONNX export script | M1 | DONE |
| 2 | PP-OCRv4 Multi-Script OCR | Devanagari & Latin text detection and recognition, confidence gate, Qwen2.5-VL stub | M2 | DONE |
| 3 | ICAO Doc 9303 MRZ Engine | Modulo-10 7-3-1 checksum validator for TD1, TD2, TD3 | M2 | DONE |
| 4 | 8-Rule Multi-Modal Cross-Validator | Deterministic cross-validation matrix (CV-01 to CV-08) | M2 | DONE |
| 5 | Offline Aadhaar QR PKI & Decoder | zxing-cpp binary extraction, RSA-2048 PKCS#1 v1.5 verification | M2 | DONE |
| 6 | SCRFD-10GF Face Detection & Alignment | Face & 5-landmark localization, Umeyama affine alignment | M3 | DONE |
| 7 | AdaFace-ResNet100 Face Matching | 512-D quality-adaptive embeddings, 1:1 cosine similarity | M3 | DONE |
| 8 | MiniFASNetV2-SE Anti-Spoofing | Dual-scale 2.7x and 4.0x presentation attack detection | M3 | DONE |
| 9 | DocTamper DTD & TruFor Forensics | ResNet-50 FCN text tampering, TruFor splicing detection, DocForge adaptive threshold (0.18) | M4 | DONE |
| 10 | Classical ELA & EXIF Parser | Error Level Analysis at Q90 x20, JPEG DQT / EXIF tag parsing | M4 | DONE |
| 11 | 4-Stage Stamp Verification Module | HSV+Hough localization, SSIM/ORB template matching, DocTamper integrity, context checking | M4 | DONE |
| 12 | Two-Stage Hybrid Risk Engine | Stage 1 hard tripwires (instant RED 95-100) + Stage 2 log-odds Bayesian fusion with deadbands | M5 | DONE |
| 13 | Master Scan Endpoint | `POST /api/v1/scan/inspect` with 3-stream parallel `asyncio.gather` | M5 | DONE |
| 14 | React 19 + Vite 6 Dashboard | Officer UI with image/webcam upload, risk badge, score breakdown, dual heatmap overlay, offline badge | M6 | DONE |
| 15 | Pytest Integration & Testing Suite | Comprehensive test suite for MRZ, cross-validation, risk engine, and API health (121 tests passing) | M7 | DONE |
| 16 | Weight Download Script & Docs | `download_weights.sh`, README.md, `android-agent/MASTER_PROMPT.md` | M7 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Project Skeleton & Infra | Directory tree, backend_selector.py, config.py, stamp_registry.json, schemas/, export_models_to_onnx.py, docker-compose.yml, main.py skeleton, requirements.txt, venv | none | DONE |
| 2 | M2: OCR + MRZ Pipeline | pp_ocr_engine.py, mrz_engine.py, cross_validator.py, qr_decoder.py, api/routers/ocr.py, test_mrz_checksum.py, test_cross_validation.py | M1 | DONE |
| 3 | M3: Biometrics | face_detector.py, face_matcher.py, liveness_detector.py, api/routers/biometrics.py, test_biometrics.py | M1 | DONE |
| 4 | M4: Forensics & Stamp Verifier | tamper_detector.py, ela_engine.py, metadata_parser.py, stamp_verifier.py, api/routers/forensics.py, test_forensics.py | M1 | DONE |
| 5 | M5: Risk Engine & Scan Router | risk_scorer.py, api/routers/scan.py (orchestrates M2, M3, M4 via asyncio.gather), test_risk_engine.py | M2, M3, M4 | DONE |
| 6 | M6: Frontend UI | React 19 + Vite 6 + TailwindCSS dashboard in frontend/ | M1 | DONE |
| 7 | M7: Integration, Testing & Docs | test_e2e_pipeline.py (121 tests total), download_weights.sh verification, README.md, android-agent/MASTER_PROMPT.md | M5, M6 | DONE |

## Code Layout
```
sih26188_project/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routers/
│   │   │       ├── __init__.py
│   │   │       ├── ocr.py
│   │   │       ├── biometrics.py
│   │   │       ├── forensics.py
│   │   │       └── scan.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── backend_selector.py
│   │   │   └── logging.py
│   │   ├── modules/
│   │   │   ├── __init__.py
│   │   │   ├── ocr/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── pp_ocr_engine.py
│   │   │   │   └── qr_decoder.py
│   │   │   ├── mrz/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── mrz_engine.py
│   │   │   │   └── cross_validator.py
│   │   │   ├── biometrics/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── face_detector.py
│   │   │   │   ├── face_matcher.py
│   │   │   │   └── liveness_detector.py
│   │   │   ├── forensics/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── tamper_detector.py
│   │   │   │   ├── ela_engine.py
│   │   │   │   └── metadata_parser.py
│   │   │   ├── stamp_verifier.py
│   │   │   └── risk_engine/
│   │   │       ├── __init__.py
│   │   │       └── risk_scorer.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── ocr.py
│   │   │   ├── mrz.py
│   │   │   ├── biometrics.py
│   │   │   ├── forensics.py
│   │   │   ├── stamp.py
│   │   │   ├── risk.py
│   │   │   ├── scan.py
│   │   │   └── screening.py
│   │   └── data/
│   │       ├── stamp_registry.json
│   │       └── uidai_root_cert.pem
│   ├── models/
│   │   └── README.md
│   ├── scripts/
│   │   ├── download_weights.sh
│   │   └── export_models_to_onnx.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_api_health.py
│   │   ├── test_biometrics.py
│   │   ├── test_cross_validation.py
│   │   ├── test_e2e_pipeline.py
│   │   ├── test_forensics.py
│   │   ├── test_mrz_checksum.py
│   │   └── test_risk_engine.py
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── components/
│   │   ├── types/
│   │   ├── utils/
│   │   └── ...
│   └── ...
├── docker/
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── android-agent/
│   └── MASTER_PROMPT.md
└── README.md
```
