# Module 04: 16-Phase Implementation Roadmap, Student Role Matrix & Dataset Generation Engine
## SIH26188: Sashastra Seema Bal (SSB) AI-Based Fake Identity & Document Screening System

---

**Document Reference**: SIH26188-DOC-MOD04  
**Classification**: Engineering Management & Data Strategy  
**Execution Window**: 12 Weeks (3 Months) / 5 Student Engineering Team  
**Author**: SIH26188 Program Management & AI Engineering Team  
**Date**: August 2026 | Version: 2.0  

---

## 1. Team Role Allocation Matrix

| Role Identifier | Assigned Specialization | Primary Responsibilities | Core Tech Stack |
| :--- | :--- | :--- | :--- |
| **Student 1 (S1)** | **Team Lead & Backend/Edge Systems Architect** | System design, FastAPI async backend, Docker Compose, PostgreSQL pgvector, Redis, API integration, hardware optimization. | Python 3.11, FastAPI, SQLAlchemy, Docker, TensorRT |
| **Student 2 (S2)** | **Computer Vision & OCR Lead** | PP-OCRv4 pipeline, OmniMRZ ICAO 9303 parser, OpenCV 4-point perspective warp, ONNX quantization. | PaddleOCR, OpenCV, zxing-cpp, ONNX Runtime |
| **Student 3 (S3)** | **Forensics & Biometrics AI Specialist** | DocTamper DTD fine-tuning, TruFor deployment, DocForge calibration, AdaFace-ResNet100, MiniFASNet anti-spoofing. | PyTorch, timm, albumentations, InsightFace |
| **Student 4 (S4)** | **Frontend & UI/UX Lead** | Next.js 15 App Router, Tailwind CSS, Shadcn UI, interactive forensic dual-canvas heatmaps, WebSocket telemetry, PDF exporter. | TypeScript, Next.js 15, Tailwind, Lucide, Framer |
| **Student 5 (S5)** | **Mobile & Edge Synchronization Lead** | Flutter mobile app, Drift + SQLCipher encrypted SQLite, Google ML Kit Document Scanner, WorkManager background outbox sync. | Dart, Flutter 3.24+, Drift, SQLCipher, Android TEE |

---

## 2. Complete 16-Phase Week-by-Week Execution Blueprint

```
===================================================================================================
MONTH 1 (WEEKS 1–4): FOUNDATION, DATASETS & INDIVIDUAL AI MODULES
===================================================================================================

PHASE 0: Problem Formulation, Threat Modeling & SOP Definition
- Duration: Week 1 (Days 1–3) | Lead: All (S1-S5) | Effort: 25 hrs
- Key Tasks:
  1. Map border entry points (Raxaul, Sonauli, Panitanki, Jaigaon) and credential types (Aadhaar, Passport, Voter ID, Nagrikta).
  2. Formalize threat vectors: photo replacement, DOB manipulation, stamp forgeries, synthetic replicas.
  3. Define OpenAPI 3.1 JSON schemas (`openapi.yaml`) and data validation contracts.
- Deliverables: Threat Matrix, OpenAPI Specification, Repository Skeleton with Git CI/CD.

PHASE 1: Base Infrastructure, Docker Environment & PostgreSQL pgvector
- Duration: Week 1 (Days 4–7) | Lead: S1, S4 | Effort: 35 hrs
- Commands & Tools:
  * Initialize Monorepo: `pnpm init && npx lerna init`
  * Docker Stack: `docker compose -f docker-compose.dev.yml up -d` (Postgres 16 pgvector + Redis 7)
  * Database Migrations: `alembic upgrade head`
- Deliverables: Running Docker base stack, verified vector similarity query execution.

PHASE 2: Dataset Acquisition & Synthetic Document Generation Engine
- Duration: Week 2 | Lead: S2, S3 | Effort: 45 hrs
- Public Datasets: DocTamper, MIDV-2020, CASIA v2, CelebA-Spoof.
- Synthetic Command:
  `python scripts/generate_synthetic_ids.py --count 100000 --types aadhaar,passport,voter,pan,permit --tamper-ratio 0.4`
- Deliverables: 100k paired synthetic document images with ground-truth binary masks.

PHASE 3: Module 1 — Multilingual OCR & ICAO Doc 9303 MRZ Engine
- Duration: Week 3 | Lead: S2 | Effort: 40 hrs
- Tasks:
  * Deploy PP-OCRv4 detection and recognition engines with Devanagari multi-script support.
  * Implement `ICAO9303Validator` with full Modulo-10 7-3-1 check digit algorithms for TD1, TD2, TD3.
  * Export models to ONNX FP16: `paddle2onnx --model_dir ./ppocr --save_file ./ocr.onnx`
- Deliverables: Verified OCR & MRZ microservice returning structured key-value JSON in < 350 ms.

PHASE 4: Module 4 — Aadhaar Secure QR Offline PKI & Barcode Verifier
- Duration: Week 4 | Lead: S1, S2 | Effort: 30 hrs
- Tasks:
  * Integrate `zxing-cpp` for raw binary QR extraction.
  * Implement UIDAI RSA-2048 PKCS#1 v1.5 SHA-256 signature verification using `cryptography`.
  * Decode embedded ISO/IEC 15444-1 JP2000 facial photo.
- Deliverables: Standalone Aadhaar verifier decoding demographic data and face crops in < 25 ms.

===================================================================================================
MONTH 2 (WEEKS 5–8): FORENSICS, BIOMETRICS, APIS & USER INTERFACES
===================================================================================================

PHASE 5: Module 3 — Deep Forensic Tampering & Splicing Detection Engine
- Duration: Weeks 4–5 | Lead: S3 | Effort: 50 hrs
- Tasks:
  * Deploy DocTamper DTD with Frequency Perception Head (FPH) for text tampering.
  * Deploy TruFor RGB Transformer + Noiseprint++ for photo splicing and sensor noise residual analysis.
  * Apply DocForge-Bench adaptive threshold calibration (tau_adapt = 0.18).
- Deliverables: `TamperDetector` returning pixel-level explainable heatmaps in < 75 ms GPU.

PHASE 6: Module 2 — Biometric Face Verification & Anti-Spoofing
- Duration: Week 6 | Lead: S3, S2 | Effort: 40 hrs
- Tasks:
  * Implement SCRFD-10GF face detection with 5-point Umeyama landmark alignment to 112x112.
  * Deploy AdaFace-ResNet100 (Glint360K weights) for age-invariant 512-D embeddings.
  * Deploy MiniFASNetV2-SE dual-scale ensemble (2.7x and 4.0x) for passive liveness.
- Deliverables: Biometric pipeline executing 1:1 verification in < 15 ms GPU (99.8% accuracy).

PHASE 7: Multi-Factor Bayesian Risk Scoring Engine & Explainability Layer
- Duration: Week 7 | Lead: S1, S3 | Effort: 35 hrs
- Formula: Risk = w1 * S_tamper + w2 * (1 - S_face) + w3 * S_rule + w4 * S_watch
- Categorization: GREEN (0-30), AMBER (31-69), RED (70-100).
- Deliverables: Risk scoring engine outputting explainable bullet-point justifications.

PHASE 8: FastAPI Backend & Asynchronous Edge Server APIs
- Duration: Week 7 | Lead: S1 | Effort: 40 hrs
- Endpoints:
  * `POST /api/v1/scan/inspect`: Multipart upload (document + live webcam).
  * `WS /ws/v1/live-stream`: Real-time streaming WebSocket.
  * `POST /api/v1/sync/push`: Idempotent edge-to-hub synchronization.
- Deliverables: Fully operational FastAPI service with Swagger documentation.

PHASE 9: High-Trust Border Officer Web Dashboard (Next.js 15)
- Duration: Week 8 | Lead: S4 | Effort: 45 hrs
- Features: Dark military theme, side-by-side original vs heatmap overlay, acoustic alert triggers, one-click PDF incident report generation.
- Deliverables: Responsive Next.js 15 web application.

PHASE 10: Companion Mobile Application (Flutter + Offline Mode)
- Duration: Weeks 8–9 | Lead: S5 | Effort: 50 hrs
- Features: Flutter 3.24+, Drift + SQLCipher encrypted SQLite, Google ML Kit Document Scanner, WorkManager background outbox sync.
- Deliverables: Production Android APK (< 35MB) with 100% offline scanning.

===================================================================================================
MONTH 3 (WEEKS 9–12): INTEGRATION, BENCHMARKING, PACKAGING & SIH GRAND FINALE
===================================================================================================

PHASE 11: End-to-End System Integration & Hardware Optimization
- Duration: Week 9 | Lead: All (S1-S5) | Effort: 40 hrs
- Tasks: Quantize ONNX models to INT8/FP16 TensorRT engines; configure CUDA Graph memory arenas; benchmark latency under multi-stream concurrency.
- Deliverables: Unified system achieving 1.45s GPU / 3.22s CPU total latency.

PHASE 12: Comprehensive Testing, Adversarial Hardening & Benchmarking
- Duration: Week 10 | Lead: S2, S3, S1 | Effort: 40 hrs
- Test Suites: 200 expert Photoshop forged IDs, 100 screen replay attacks, 100 printed photo spoofs, Locust load tests (50 concurrent checkpoint requests).
- Deliverables: PyTest suite (>85% coverage) and Benchmark Attestation Report.

PHASE 13: Edge Deployment Packaging, Air-Gapped Setup & Fail-Safe Modes
- Duration: Week 11 (Days 1–3) | Lead: S1, S5 | Effort: 25 hrs
- Packaging: Self-contained Docker Compose bundle with pre-cached weights; one-click start script (`start_airgapped_ssb.sh`).
- Deliverables: USB-deployable offline installation package.

PHASE 14: Security, DPDP Act 2023 Compliance & Audit Trail Hardening
- Duration: Week 11 (Days 4–7) | Lead: S1, S4 | Effort: 30 hrs
- Features: Automated 8-digit Aadhaar masking, RAM-only ephemeral image processing, SHA-256 chained audit logs.
- Deliverables: Compliance Attestation Document.

PHASE 15: SIH Pitch Deck, Live Demonstration Script & Jury Strategy
- Duration: Week 12 (Days 1–4) | Lead: All | Effort: 30 hrs
- Deliverables: 12-Slide High-Impact Presentation Deck, 3-Minute Live Demo Runbook.

PHASE 16: Final Code Hardening, Documentation & SIH Deliverable Submission
- Duration: Week 12 (Days 5–7) | Lead: All | Effort: 25 hrs
- Deliverables: Comprehensive README, API Swagger Docs, System User Manual PDF.
```

---

## 3. Synthetic Indian Identity Generation Engine Implementation

```python
# Synthetic Indian Document Generator with Automated Tampering Injection
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from faker import Faker
import segno

class SyntheticDocumentEngine:
    def __init__(self, output_dir: str = "dataset/synthetic"):
        self.output_dir = output_dir
        os.makedirs(os.path.join(output_dir, "images"), exist_ok=True)
        os.makedirs(os.path.join(output_dir, "masks"), exist_ok=True)
        self.fake_in = Faker('hi_IN')
        self.fake_en = Faker('en_IN')

    def generate_aadhaar_sample(self, sample_idx: int, tamper: bool = True):
        # 1. Create Base Card Canvas (1024x640)
        img = Image.new('RGB', (1024, 640), color=(248, 249, 250))
        draw = ImageDraw.Draw(img)
        mask = np.zeros((640, 1024), dtype=np.uint8)

        # 2. Render Text Fields
        name = self.fake_en.name()
        dob_actual = "14/08/1988"
        aadhaar_num = f"{np.random.randint(2000, 9999)} {np.random.randint(1000, 9999)} {np.random.randint(1000, 9999)}"

        draw.text((320, 180), f"Name: {name}", fill=(20, 20, 20))
        draw.text((320, 230), f"DOB: {dob_actual}", fill=(20, 20, 20))
        draw.text((320, 280), "Gender: MALE / पुरुष", fill=(20, 20, 20))
        draw.text((320, 480), aadhaar_num, fill=(200, 30, 30))

        # 3. Controlled Tampering Injection
        if tamper:
            # Spliced Date of Birth
            dob_tampered = "14/08/2000"
            draw.rectangle([(380, 225), (550, 260)], fill=(248, 249, 250))
            draw.text((380, 230), dob_tampered, fill=(35, 35, 35))
            mask[225:260, 380:550] = 255 # Ground-truth pixel mask

        # 4. Save Image and Binary Ground-Truth Mask
        img_path = os.path.join(self.output_dir, f"images/aadhaar_{sample_idx:06d}.jpg")
        mask_path = os.path.join(self.output_dir, f"masks/aadhaar_{sample_idx:06d}.png")
        img.save(img_path, quality=90)
        cv2.imwrite(mask_path, mask)
```
