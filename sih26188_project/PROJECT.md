# Project: SIH26188 Border Document Screening & Live Companion Camera Sync

## Architecture
- **Backend**: FastAPI with async multi-stream screening pipeline (Stream 1: Document OCR & MRZ/QR, Stream 2: Biometrics & Liveness, Stream 3: Forensics & Stamps), 8-rule cross-validator, Two-Stage Risk Engine, and Live Companion Camera Sync Store (`/api/v1/companion/upload`, `/api/v1/companion/latest`, `/api/v1/companion/clear`).
- **Web Frontend**: React 19, TypeScript, Tailwind CSS, Vite, Tauri. Whitish modern theme (#F8FAFC canvas, #FFFFFF surfaces, slate typography), live companion sync indicator, auto-rendering companion photo, auto-triggering screening pipeline upon companion capture when document is preloaded, side-by-side biometric comparison, plain operational terminology.
- **Android Mobile App**: Jetpack Compose, CameraX, Retrofit/Moshi. Ultra-clean whitish sunlight-legible theme, single-purpose companion camera with connection status (`🟢 Connected to Desktop Terminal`), 56dp shutter button (`📸 SNAP TRAVELER PHOTO`), instant upload to companion sync endpoint (`⚡ Sent to Desktop Terminal`), instant screening verdict display.

## Code Layout
- `backend/`: FastAPI backend service (`app/main.py`, `app/api/routers/companion.py`, `app/api/v1/endpoints/companion.py`, `tests/`)
- `frontend/`: React + Vite web dashboard (`src/index.css`, `tailwind.config.js`, `src/App.tsx`, `src/components/`, `src/services/`)
- `android/` / `/Users/iamsparsh00321/Downloads/ssb-field-screening`: Android application (`app/src/main/java/com/ssb/fieldscreening/`)
- `tests/`: Project test suites (backend pytest, frontend vitest, gradle test)

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|:------:|
| 1 | Web Whitish Theme | Ultra-clean whitish theme (#F8FAFC canvas, #FFFFFF cards, slate text, crisp hairline borders) | M2 | ORIGINAL_REQUEST §R1 | DONE |
| 2 | Android Whitish Theme | Outdoor sunlight-legible whitish Compose theme (#F8FAFC base, #FFFFFF surfaces, #0F172A slate text) | M3 | ORIGINAL_REQUEST §R1 | DONE |
| 3 | AI Jargon & Math Purge | Purge AdaFace, MiniFASNet, DocTamper, TruFor, 300 DPI, Prior Log-Odds; use plain operational terms | M2, M3 | ORIGINAL_REQUEST §R1 | DONE |
| 4 | Companion Upload API | `POST /api/v1/companion/upload` accepts image multipart/base64 and metadata (device_id, type, timestamp) | M1 | ORIGINAL_REQUEST §R2 | DONE |
| 5 | Companion Latest API | `GET /api/v1/companion/latest` returns latest companion capture state for desktop polling | M1 | ORIGINAL_REQUEST §R2 | DONE |
| 6 | Companion Clear API | `POST /api/v1/companion/clear` resets companion capture buffer after processing | M1 | ORIGINAL_REQUEST §R2 | DONE |
| 7 | Web Live Sync Indicator | `📱 Field Unit Connected (Live Companion Sync Active)` in IngestionPanel & WebCamCapture | M2 | ORIGINAL_REQUEST §R3 | DONE |
| 8 | Web Auto-Render Companion Photo | Render incoming companion photo in ingestion well with `✓ Received from Field Unit Camera` | M2 | ORIGINAL_REQUEST §R3 | DONE |
| 9 | Web Auto-Trigger Screening | Automatically execute screening pipeline if document is preloaded upon receiving companion photo | M2 | ORIGINAL_REQUEST §R3 | DONE |
| 10 | Web Side-by-Side Verification | Display side-by-side comparison of document photo vs live companion capture in ResultsPanel | M2 | ORIGINAL_REQUEST §R3 | DONE |
| 11 | Android Single-Purpose Camera UI | Connection status pill `🟢 Connected to Desktop Terminal`, full-screen framing guide | M3 | ORIGINAL_REQUEST §R4 | DONE |
| 12 | Android 56dp Shutter & Instant Upload | `📸 SNAP TRAVELER PHOTO` shutter button and instant upload to `/api/v1/companion/upload` | M3 | ORIGINAL_REQUEST §R4 | DONE |
| 13 | Android Instant Verdict Display | Display screening verdict and risk summary banner upon completion | M3 | ORIGINAL_REQUEST §R4 | DONE |
| 14 | E2E Test Suite (Tiers 1-4) | Comprehensive opaque-box test suite verifying companion sync, themes, auto-triggering | M4 | ORIGINAL_REQUEST §Verification | DONE |
| 15 | Adversarial Coverage Hardening (Tier 5) | Adversarial test cases and stress testing across all modules | M4 | Project Pattern | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|:------:|
| 1 | Backend Companion Sync API & Tests | `companion.py` endpoints, router registration in `api.py`/`main.py`, device tracking, pytest coverage | none | DONE |
| 2 | Web Whitish Theme & Companion Dashboard | `index.css`, `tailwind.config.js`, jargon purge, `IngestionPanel.tsx`, `WebCamCapture.tsx`, auto-triggering, side-by-side view | M1 (Interface) | DONE |
| 3 | Android Whitish Theme & Companion Camera | `Color.kt`, `Theme.kt`, `SsbRepository.kt` fix, `DualCameraCaptureView.kt`, `MainScreen.kt`, upload & verdict UI | M1 (Interface) | DONE |
| 4 | Final Milestone: Full E2E Pass & Adversarial Hardening | Pass 100% E2E test suite (Tiers 1-4), Tier 5 adversarial tests, and all platform builds | M1, M2, M3 | DONE |

## Interface Contracts
### Companion Sync API Contract (Backend ↔ Web & Android)
- `POST /api/v1/companion/upload`:
  - Request: Multipart Form (`file: UploadFile`, `capture_type: str = "traveler_live"`, `device_id: str`, `checkpoint_id: str`) or JSON Base64.
  - Response: `{"status": "ok", "sequence_id": int, "device_id": str, "timestamp": str}`
- `GET /api/v1/companion/latest`:
  - Response: `{"has_capture": bool, "sequence_id": int, "image_data": str (Data URI), "device_id": str, "capture_type": str, "timestamp": str}`
- `POST /api/v1/companion/clear`:
  - Response: `{"status": "cleared", "sequence_id": int}`
