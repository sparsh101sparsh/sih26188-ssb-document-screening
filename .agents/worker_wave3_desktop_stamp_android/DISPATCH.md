## 2026-08-23T01:56:32+05:30
You are Worker 2: Desktop App, Stamp Module & Android Master Prompt Synthesizer for SIH26188 Wave 3.

Working Directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_wave3_desktop_stamp_android/
Original Request: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Source Research & Specification Artifacts to Read:
1. `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/spec_miner_wave3_sources/spec_mining_report.md`
2. `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_wave3_ml_models/ml_models_research_report.md`
3. `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_wave3_systems/systems_research_report.md`

Target Deliverables to Write:
1. `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/03_DESKTOP_APP_ARCHITECTURE.md`
   - Complete technical specification for Tauri 2.0 (Rust Core) + React 19 / Vite 6 + FastAPI Python sidecar/backend.
   - IPC and sidecar lifecycle management via `tauri-plugin-shell`, child process supervision, graceful shutdown on SIGTERM/SIGINT.
   - macOS .app standalone packaging via PyInstaller `--onedir` bundled Python runtime without Docker dependency for internal SIH evaluation round.
   - Production containerization via Docker Compose for air-gapped outpost appliances.
   - Full UI/UX component tree, state management (Zustand/TanStack Query), WebSocket real-time progress streaming, forensic heatmap canvas viewer, and judge presentation workflow.

2. `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/docs/04_STAMP_AUTHENTICATION_MODULE.md`
   - Full, exhaustive technical specification for the 4-Stage Stamp Authentication Module (addressing the critical baseline gap):
     * Stage 1: Stamp Region Detection (HSV color segmentation + Hough transform / contour filtering for purple/blue/red ink seals).
     * Stage 2: OCR & Text Extraction (PP-OCRv4 fine-grained text extraction on cropped stamp region).
     * Stage 3: Checkpost Template Matching (Multi-scale ORB/SIFT + SSIM structural similarity against authorized SSB border post vector registry).
     * Stage 4: Tamper Forensics & Contextual Cross-Validation (DocTamper/TruFor localized splicing check + date/location cross-check against passport travel history/permit dates).
   - Implementation plan, latency budget (<180ms), and failure fallback modes.

3. `/Users/iamsparsh00321/teamwork_projects/sih26188_wave3/android-agent/MASTER_PROMPT.md`
   - Self-contained, production-grade master prompt for a downstream mobile engineering AI agent implementing the Android application (Kotlin/Jetpack Compose or Flutter).
   - Full context on SIH26188, SSB border screening role, and Android app boundaries.
   - STRICT BOUNDARY RULES: The Android agent must NOT modify backend code, alter API schemas, or retrain models.
   - Complete OpenAPI / Pydantic v2 JSON request/response schemas for `/api/v1/health`, `/api/v1/scan/document`, `/api/v1/scan/face`, `/api/v1/scan/complete`, and `/api/v1/audit/logs`.
   - Dual-mode connectivity: USB reverse tethering (`adb reverse tcp:8000 tcp:8000`) for demo vs Wi-Fi Hotspot / LAN.
   - Offline edge fallback: Local SQLite/Drift transactional outbox buffering with retry logic when edge server is unreachable.

When complete, write your handoff to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_wave3_desktop_stamp_android/handoff.md` and send a message back.
