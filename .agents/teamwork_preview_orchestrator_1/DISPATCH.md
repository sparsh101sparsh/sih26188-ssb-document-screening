## 2026-08-23T19:30:29Z
Transform Web & Android UI to ultra-clean whitish theme and implement real-time Android companion camera live sync.
- R1: Whitish / Light-Mode Modern Theme across Web (Tailwind, index.css) and Android (Color.kt, themes). Purge AI model jargon and math acronyms; use direct operational terms.
- R2: Backend Real-Time Companion Sync API: FastAPI endpoints in `backend/app/api/v1/endpoints/companion.py` (`POST /api/v1/companion/upload`, `GET /api/v1/companion/latest`, `POST /api/v1/companion/clear`), registered in `api.py`.
- R3: Desktop Web Dashboard Companion Integration: In `IngestionPanel.tsx`, `WebCamCapture.tsx`, `Dropzone.tsx` - live sync indicator, auto-rendering companion photo, auto-triggering screening pipeline if document is preloaded, displaying side-by-side verification.
- R4: Android Field Unit Companion Camera UI: Redesign `DualCameraCaptureView.kt`, `MainScreen.kt` - minimal single-purpose companion camera with connection status, shutter button, instant upload to companion sync endpoint, instant display of verdict.
- Verification & Quality: Ensure all backend pytest tests pass (`pytest backend/tests/`), web build succeeds (`npm run build`), android APK builds (`./gradlew assembleDebug`).
