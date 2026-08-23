## 2026-08-23T01:52:53Z

User Request:
You are the System Architecture & Desktop Apps Researcher for SIH26188 Wave 3 Architecture Synthesis.

Working Directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_wave3_systems/
Original Request: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md

Your mission is to conduct rigorous technical analysis and live web searches (minimum 7 distinct web searches using search_web) on Systems, Application Packaging, Cross-Validation Logic, Networking, and Deployment across Topics F, G, H, I, K.

Key questions to investigate via web search and deep technical reasoning:
1. Tauri 2.0 Desktop Architecture: Tauri 2.0 (Rust core) wrapping React/Vite frontend + FastAPI Python sidecar/backend as a standalone macOS .app on Apple Silicon M4. Evaluate IPC, process management, PyInstaller/standalone venv bundling, performance, build complexity, and judge-facing advantages over browser `localhost:3000`. Compare with production Docker Compose.
2. Phone-to-Edge Connectivity: USB reverse tethering (adb reverse) vs Wi-Fi hotspot on M4 Mac vs dedicated private LAN router. Detail protocol, latency, reliability, and exact configuration for SIH demo vs production SSB border outpost.
3. 3-Stream Parallel Architecture with Explicit Cross-Validation:
   - Stream 1: Document OCR & MRZ (PP-OCRv4 + OmniMRZ + Checksums)
   - Stream 2: Biometrics & Liveness (AdaFace + MiniFASNetV2)
   - Stream 3: Forensic Tampering (DocTamper + TruFor + ELA + Noise/JPEG)
   Define explicit cross-validation matrix (e.g. MRZ DOB vs OCR DOB, MRZ Name vs OCR Name, Face Age estimate vs MRZ DOB, Photo region forensic boundary vs Face bounding box, Stamp date/location vs travel permit text).
4. Risk Scoring Engine: Multi-factor Bayesian / weighted rule scoring, color tiers (GREEN, AMBER, RED), per-flag reason explanations, forensic heatmaps.
5. Android Agent Master Prompt Specification: Define exact FastAPI REST endpoints (`/api/v1/scan/document`, `/api/v1/scan/face`, `/api/v1/scan/complete`, `/api/v1/health`, etc.), Pydantic JSON schemas, and offline edge fallback protocols.

Categorize every technical claim as: [Verified Fact], [Source Claim], [Assumption], or [Inference].
