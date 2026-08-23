# 🛡️ Sashastra Seema Bal (SSB) — AI-Based Fake Identity & Document Screening System (SIH26188)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tauri 2.0](https://img.shields.io/badge/Tauri-2.0-FFC131.svg)](https://tauri.app/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-1.20%2B-005CED.svg)](https://onnxruntime.ai/)

**Smart India Hackathon 2026 Problem Statement SIH26188**  
*Ministry of Home Affairs (MHA) · Sashastra Seema Bal (SSB)*  
**Air-Gapped Multi-Modal Defense-Grade Border Credential & Biometric Inspection System**

---

## 📌 Overview

The **SSB AI-Based Fake Identity & Document Screening System** is an air-gapped, multi-stream identity verification and document forensic engine designed for rugged border checkposts (Indo-Nepal & Indo-Bhutan frontiers, e.g., Sonauli, Jaigaon, Raxaul, Panitanki).

### 🚀 Key Capabilities
1. **Multi-Modal Document Intake**: High-accuracy extraction across Passports (ICAO Doc 9303), Aadhaar PVC/Cards, Voter IDs, Bhutan Citizenship Identity Cards (CID), and Transit Permits.
2. **3-Stream Neural Pipeline**:
   - **Stream 1 (OCR & Cryptographic Check)**: Multilingual PP-OCRv4 + ICAO Modulo-10 (7-3-1 weighting) Checksum + UIDAI RSA-2048 PKI signature verification.
   - **Stream 2 (Biometrics & Anti-Spoofing)**: AdaFace 512D Cosine Embedder + MiniFASNetV2 Fourier Liveness & 2D replay attack detection + Apparent Age Estimation.
   - **Stream 3 (Forensic Tampering Localization)**: DocTamper ResNet-50 pixel-level splice detection + Error Level Analysis (ELA) + JPEG Quantization Table (DQT) anomaly inspection.
   - **Stream 4 (Border Transit Stamp Verification)**: 4-Stage SSB Registry Stamp template matcher (ORB Keypoints + SSIM Correlation + Context/Date Consistency).
3. **8-Point Cross-Validation Matrix**: Real-time cross-stream contradiction detection (e.g. Visual DOB vs MRZ DOB, Photo Splicing vs Substrate ELA).
4. **Deterministic Hard Tripwires**: Instantaneous RED detention mandates on digital signature breaches or checksum failures.
5. **Defense-Grade UI (Beautiful-UI)**: Dark-theme surface system with interactive discrepancy matrices (`DiffTable`), cross-validation filters (`FilterTable`), and human-in-the-loop authorization (`ApprovalCard`).
6. **Air-Gapped & Zero-Cloud**: 100% offline edge processing with deterministic SHA-256 tamper-evident audit hashing.

---

## 💻 System Architecture

```
                                  ┌───────────────────────────────┐
                                  │   Document Scan + Live Selfie │
                                  └───────────────┬───────────────┘
                                                  │
                                  ┌───────────────▼───────────────┐
                                  │    FastAPI Edge AI Server     │
                                  │ (CoreML / CUDA / DirectML / CPU│
                                  └───────┬───────────────┬───────┘
                     ┌────────────────────┼───────────────┴───────────────────┐
                     │                    │                                   │
          ┌──────────▼──────────┐ ┌───────▼─────────┐             ┌───────────▼───────────┐
          │  Stream 1: OCR/MRZ  │ │ Stream 2: Face  │             │ Stream 3: Forensics   │
          │ • PP-OCRv4 Multi    │ │ • AdaFace 512D  │             │ • DocTamper ResNet-50 │
          │ • ICAO Modulo-10    │ │ • MiniFASNet FAS│             │ • ELA & DQT Analysis  │
          │ • UIDAI RSA-2048    │ │ • Apparent Age  │             │ • Stamp Matcher (ORB) │
          └──────────┬──────────┘ └───────┬─────────┘             └───────────┬───────────┘
                     │                    │                                   │
                     └────────────────────┼───────────────────────────────────┘
                                          │
                                  ┌───────▼─────────┐
                                  │ Cross-Validation│
                                  │  & Risk Engine  │
                                  └───────┬─────────┘
                                          │
                           ┌──────────────┴──────────────┐
                           │                             │
                 ┌─────────▼───────────┐       ┌─────────▼───────────┐
                 │  Tauri Desktop App  │       │ Android Field Client│
                 │ (macOS / Windows)   │       │ (USB / Hotspot)     │
                 └─────────────────────┘       └─────────────────────┘
```

---

## 🛠️ Installation & Setup Guide

### 1. Prerequisites (macOS & Windows)

- **Node.js**: `v18.0.0+` or `v20.0.0+` (LTS recommended)
- **Python**: `3.10` or `3.11` (Python 3.11 recommended)
- **Rust & Cargo**: Latest stable toolchain (required for Tauri desktop build)
- **Git**

---

### 🍏 Setup on macOS (Apple Silicon M1/M2/M3/M4 & Intel)

#### Step 1: Clone Repository
```bash
git clone https://github.com/sparsh101sparsh/sih26188-ssb-document-screening.git
cd sih26188-ssb-document-screening/sih26188_project
```

#### Step 2: Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run Unit & Integration Tests (121 tests)
pytest tests/
```

#### Step 3: Frontend Setup
```bash
cd ../frontend
npm install
npm run build
```

#### Step 4: Launching the System
- **Option A (Web Dashboard Live Dev)**:
  ```bash
  # Terminal 1: Backend
  cd backend && source .venv/bin/activate
  uvicorn app.main:app --port 8000 --reload

  # Terminal 2: Frontend
  cd frontend
  npm run dev
  # Open http://localhost:3000 in your browser
  ```

- **Option B (Native Desktop App via Tauri)**:
  ```bash
  # Ensure Rust is installed (curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh)
  cargo install tauri-cli
  cargo tauri dev
  ```

---

### 🪟 Setup on Windows (Windows 10 / 11)

#### Step 1: Install Build Tools
1. Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Check *Desktop development with C++*).
2. Install [Rust for Windows](https://rustup.rs/).
3. Install [Node.js](https://nodejs.org/) & [Python 3.11](https://www.python.org/).

#### Step 2: Clone Repository
```powershell
git clone https://github.com/sparsh101sparsh/sih26188-ssb-document-screening.git
cd sih26188-ssb-document-screening\sih26188_project
```

#### Step 3: Backend Setup
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

# Run Verification Tests
pytest tests/
```

#### Step 4: Frontend Setup
```powershell
cd ..\frontend
npm install
npm run build
```

#### Step 5: Launching the System
```powershell
# Terminal 1: Backend Server
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --port 8000 --host 127.0.0.1 --reload

# Terminal 2: Desktop App or Web Dev
cd ..\frontend
npm run dev
# Or launch desktop application:
cargo tauri dev
```

---

## 🧪 Testing & Verification

Run the full adversarial test suite covering all 4 inspection streams, cross-validation rules, and deterministic tripwires:

```bash
cd backend
pytest tests/ -v
```

**Test Coverage Summary:**
- `test_api_health.py`: Edge server health, provider configuration, memory stats.
- `test_biometrics.py`: AdaFace cosine similarity, MiniFASNet Fourier liveness anti-spoofing.
- `test_cross_validation.py`: 8-point rule engine, contradiction detection, severity weights.
- `test_e2e_pipeline.py`: Full multi-modal document & biometric inspection flow.
- `test_forensics.py`: DocTamper pixel-level localization, ELA substrate analysis, stamp matching.
- `test_mrz_checksum.py`: ICAO Doc 9303 Modulo-10 7-3-1 check digit algorithms.
- `test_risk_engine.py`: Bayesian prior updating, deterministic tripwires, audit hash integrity.

---

## 📱 Rugged Android Field Client

For border patrol guards operating in offline Terai checkpoints, reference the authoritative mobile integration prompt:
- **Master Mobile Guide**: [`docs/ANDROID_STUDIO_MASTER_PROMPT.md`](docs/ANDROID_STUDIO_MASTER_PROMPT.md)
- **Supported Connectivity Modes**:
  1. `USB Reverse Tethering` (`adb reverse tcp:8000 tcp:8000`)
  2. `Air-Gapped Wi-Fi AP` (`http://192.168.2.1:8000`)
  3. `Offline Transactional Outbox` (SQLCipher + WorkManager sync)

---

## 📄 License & Attribution

Developed for **Smart India Hackathon 2026 (SIH26188)** under the Ministry of Home Affairs (MHA) & Sashastra Seema Bal (SSB).  
Released under the **MIT License**.
