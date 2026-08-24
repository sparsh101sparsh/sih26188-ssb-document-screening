# 🛡️ Sashastra Seema Bal (SSB) — AI-Powered Border Document Screening & Biometric Verification System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-1.20%2B-005CED.svg)](https://onnxruntime.ai/)
[![Android API 34](https://img.shields.io/badge/Android-API_34-3DDC84.svg)](https://developer.android.com/)
[![DPDP Act 2023](https://img.shields.io/badge/Compliance-DPDP_Act_2023-emerald.svg)](https://www.meity.gov.in/)

**Smart India Hackathon 2026 Problem Statement SIH26188**  
*Ministry of Home Affairs (MHA) • Sashastra Seema Bal (SSB)*  
**Air-Gapped Sovereign Multi-Modal Defense-Grade Border Credential & Biometric Inspection Workstation**

---

## 📌 Executive Summary

The **SSB AI-Powered Border Document Screening System** is an air-gapped, multi-stream identity verification and document forensics platform engineered specifically for rugged Indo-Nepal and Indo-Bhutan border checkposts (e.g., *Jaigaon / Phuentsholing, Sonauli, Raxaul, Panitanki*).

The system integrates an **Edge AI Neural Inference Engine**, an **Official Government UIDAI-Themed Desktop Terminal**, and a **Mobile Field Companion Android App** to deliver sub-second tamper detection, 1:1 facial biometric matching, optical character recognition (OCR), and cryptographic validation with zero cloud dependency.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FIELD CAPTURE & INGESTION                               │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│         📱 Android Field Companion       │         💻 Desktop Screening Terminal       │
│  (CameraX, Offline Outbox, WiFi Sync)    │    (UIDAI Light-Theme, Screen Reader)       │
└────────────────────┬─────────────────────┴──────────────────────┬──────────────────────┘
                     │                                            │
                     └─────────────────────┬──────────────────────┘
                                           │ Multipart / REST / WebSocket
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI MULTI-STREAM EDGE AI ENGINE                             │
│                  (CoreML / CUDA / DirectML / CPU — Air-Gapped)                         │
├──────────────────────┬───────────────────────┬───────────────────┬─────────────────────┤
│ 1. Optical & Crypto  │ 2. Biometric Engine   │ 3. Forensic Layer │ 4. Border Registry  │
│  • PP-OCRv4 Multi    │  • SCRFD Face Detect  │  • ELA Heatmaps   │  • ORB Stamp Match  │
│  • ICAO 9303 Modulo10│  • Umeyama Alignment  │  • DQT Quant Error│  • SSIM Correlation │
│  • UIDAI RSA-2048 PKI│  • AdaFace 512-D Unit │  • Splice Detect  │  • Transit Validity │
└──────────────────────┴───────────┬───────────┴───────────────────┴─────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               CROSS-STREAM CONSISTENCY GUARDS & BAYESIAN RISK ENGINE                   │
│   • 8-Point Cross-Validation Matrix (Visual DOB vs MRZ vs QR Demographics)            │
│   • Deterministic Hard Tripwires (Immediate Detention on Cryptographic Breach)         │
│   • SHA-256 Tamper-Evident Defense Audit Certificate (DPDP Act 2023 Zero-Retention)    │
└──────────────────────────────────┬─────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     DECISION CONSOLE & OFFICIAL OUTPUTS                                │
│   [ AUTO-CLEAR: Approved ]    [ SECONDARY: Manual Hold ]    [ INTERDICTION: Detain ]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Neural Models & Forensics Matrix

| Forensic Pillar | Model / Algorithm | Resolution / Format | Latency | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Face Detection & Alignment** | `InsightFace SCRFD-10GF` | Dynamic / 112×112 crop | 14 ms | Auto-localizes face on full IDs, extracts 5 landmarks, and performs Umeyama affine alignment. |
| **1:1 Face Embedder** | `AdaFace-ResNet100` | 112×112×3 RGB | 28 ms | Quality-adaptive 512-D unit embedding extraction with cosine similarity against live selfie. |
| **Multilingual OCR** | `PP-OCRv4 Multilingual` | 24-bit RGB (300+ DPI) | 45 ms | High-accuracy textual extraction in English, Devanagari, and Bengali scripts. |
| **MRZ Checksum Parser** | `ICAO Doc 9303 (7-3-1)` | TD1 / TD2 / TD3 format | < 1 ms | Validates Modulo-10 check digits (CD1, CD2, CD3, composite checksum). |
| **PKI Signature Guard** | `RSA-2048 / ECDSA-P256`| ASN.1 / X.509 DER | 2 ms | Verifies digital cryptographic signatures on Aadhaar and e-Passport QR payloads. |
| **Error Level Analysis** | `Adaptive ELA + DQT` | Dual-canvas heatmap | 18 ms | Highlights image compression anomalies, localized pixel splices, and digital alterations. |
| **Border Transit Stamp** | `ORB Keypoints + SSIM` | Multi-angle template | 22 ms | Matches physical SSB checkpoint entry/exit stamps against the national registry. |

---

## ✨ Key Platform Features

### 1. 🇮🇳 Official UIDAI / Aadhaar Design System
- **Government Aesthetics**: Clean white/slate cards (`#F8FAFC`, `#FFFFFF`), deep navy typography (`#0F172A`), official Indian tricolor bar, and authentic SSB insignia.
- **Accessibility Engine**: Built-in **Web Speech API Screen Reader** with rate/volume controls, hover/focus narration, and high-contrast font scaling (`A-`, `A`, `A+`).
- **Security Protocols Modal**: Comprehensive documentation of air-gapped cryptographic hashing, SHA-256 ledgers, and DPDP Act 2023 zero-retention architecture.

### 2. 📱 Android Field Screening Companion
- **CameraX Dual-Mode Viewfinder**: Front camera for **Biometric Selfie** and rear camera with bounding box for **Passport / Document Capture**.
- **Cinematic Stamp Intro**: 6.0-second slow-motion official stamp slam with triple expanding golden shockwaves and haptic feedback.
- **Zero-Drop Outbox**: Offline queueing engine that automatically synchronizes field photos to the desktop terminal when in Wi-Fi / Hotspot range.

### 3. 🛡️ Human-In-The-Loop Decision Console
- Direct officer interdiction actions:
  - **`AUTO_CLEAR`**: Fast-path entry permit authorized.
  - **`SECONDARY_INSPECTION`**: Counter 2 physical inspection mandate.
  - **`DETAIN_AND_INTERDICT`**: Detention order issued under Section 14 Foreigners Act.
- Generates official, print-ready **Border Security Screening Audit Certificates**.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: `3.10` or `3.11`
- **Node.js**: `v18.0.0+` or `v20.0.0+`
- **Java**: OpenJDK 21 (for Android build)
- **Android SDK**: API 34+ (for Android emulator/device testing)

---

### 1. 🖥️ Backend Edge AI Server Setup
```bash
cd sih26188_project/backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI Edge Server on port 8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 2. 💻 Desktop Web Terminal Setup
```bash
cd sih26188_project/frontend

# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Or build production bundle
npm run build
```
Access the application in your browser: 👉 `http://localhost:3000`

---

### 3. 📱 Android Field Companion Setup
```bash
cd sih26188_project/android-agent

# Build Debug APK
./gradlew assembleDebug

# Install on connected device or emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Grant camera permissions & launch
adb shell pm grant com.ssb.fieldcamera android.permission.CAMERA
adb shell am start -n com.ssb.fieldcamera/.MainActivity
```

---

## 📡 API Endpoints Reference

| Endpoint | Method | Payload | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/inspect` | `POST` | `multipart/form-data` (doc, selfie, checkpoint_id) | Executes 4-stream neural inspection and returns full risk score & forensic telemetry. |
| `/api/v1/scan` | `POST` | `multipart/form-data` (doc, checkpoint_id) | Optical-only document scan (OCR, MRZ check digit validation, substrate ELA). |
| `/api/v1/companion/pair` | `POST` | `{ pairing_code, station_id }` | Pairs Android Field Companion with desktop workstation. |
| `/api/v1/companion/upload`| `POST` | `multipart/form-data` (photo, mode, timestamp) | Ingests live field captures from mobile companion into the desktop screening queue. |
| `/api/v1/companion/poll` | `GET` | `?station_id=...` | Desktop polling endpoint for incoming mobile streams. |

---

## 🔒 Defense Compliance & Security Protocols

1. **Air-Gapped Operation**: System operates 100% locally with zero external internet dependencies or third-party telemetry.
2. **DPDP Act 2023 Compliance**: Ingested biometric photos and identity documents are processed strictly in volatile memory and purged upon session termination.
3. **Tamper-Evident Ledger**: Every inspection verdict produces a deterministic **SHA-256 cryptographic audit digest** for national security evidentiary records.

---

## 👥 Contributors & Acknowledgements
- **Ministry of Home Affairs (MHA)** • Government of India
- **Sashastra Seema Bal (SSB)**
- **Smart India Hackathon 2026** — Problem Statement SIH26188
