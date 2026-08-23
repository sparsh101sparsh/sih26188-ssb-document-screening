# Original User Request

## 2026-08-24T00:59:57+05:30

# Transform Web & Android UI to Ultra-Clean Whitish Theme and Implement Real-Time Android Companion Camera Live Sync

Working directory: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project
Integrity mode: development

## Problem & Vision
The current UI across Desktop and Android suffered from dark cyan/blue sci-fi aesthetic and excessive technical jargon. Frontline border checkpoints require an ultra-clean, elegant whitish/light texture UI (Apple Pro / Minimalist Enterprise aesthetic) with simplified, intuitive language. Furthermore, the Android app should not function as an isolated, independent screening silo; instead, the Android app functions as a Real-Time Companion Camera where the field officer snaps a live traveler photo, which instantly streams to the Desktop Web terminal where the officer has pre-loaded the traveler's document, triggering instant 1:1 biometric comparison and multi-pillar screening.

## Requirements

### R1. Whitish / Light-Mode Modern Theme (Web & Android)
- Web App: Transform index.css and tailwind.config.js to an ultra-clean, high-contrast whitish theme:
  - App Canvas / Page Ground: Crisp soft white / off-white (#F8FAFC, #F1F5F9)
  - Surfaces & Cards: Pure white (#FFFFFF) with subtle soft hairline borders (#E2E8F0 / #CBD5E1) and ambient shadow (0 1px 3px rgba(0,0,0,0.05))
  - Typography: Dark slate (#0F172A for primary text, #475569 for secondary text, #94A3B8 for subtle hints)
  - Semantic Status: Emerald (#10B981 / #ECFDF5), Amber (#F59E0B / #FFFBEB), Crimson (#EF4444 / #FEF2F2)
- Android App: Update Color.kt and Compose themes to matching light theme with high outdoor sunlight legibility and clean card elevations.
- Language Simplification: Purge all model names and mathematical acronyms (AdaFace, MiniFASNet, DocTamper, 300 DPI, Prior Log-Odds). Use plain, direct operational terms: Traveler Photo, Identity Document, Face Match, Security Checks, Pass / Secondary / Detain.

### R2. Backend Real-Time Companion Sync API
- Add FastAPI endpoints in backend/app/api/v1/endpoints/companion.py (registered in api.py):
  - POST /api/v1/companion/upload: Android app uploads a captured frame (document or selfie) with metadata (device_id, type, checkpoint_id, timestamp). Stores the latest capture in memory/session cache.
  - GET /api/v1/companion/latest: Desktop web polls (or listens via SSE) for new incoming captures. Returns the latest image URL/base64, device info, and timestamp.
  - POST /api/v1/companion/clear: Clears current companion buffer once processed.

### R3. Desktop Web Dashboard Companion Integration
- In IngestionPanel.tsx and WebCamCapture.tsx / Dropzone.tsx:
  - Display a live sync indicator: 📱 Field Unit Connected (Live Companion Sync Active).
  - When an image is received from the companion phone, automatically render it in the ingestion well with a notification ✓ Received from Field Unit Camera.
  - If a document is already uploaded on the desktop, automatically trigger the screening pipeline (Run Document Screening) without requiring manual button clicks.
  - Display combined results clearly with side-by-side document photo vs. phone live capture.

### R4. Android Field Unit Companion Camera UI
- Redesign DualCameraCaptureView.kt and MainScreen.kt:
  - Minimal, high-speed single-purpose companion camera:
  - Top bar: Checkpoint status and connection pill 🟢 Connected to Desktop Terminal.
  - Full-screen / large viewfinder with clean framing guide.
  - Big 56dp shutter button: 📸 SNAP TRAVELER PHOTO.
  - Upon snapping, immediately uploads to /api/v1/companion/upload with an instant confirmation: ⚡ Sent to Desktop Terminal.
  - Displays instant verification verdict when desktop completes the screening.

## Acceptance Criteria
- [ ] Web and Android applications render with a clean, pleasing whitish theme (pure white cards on soft off-white ground, dark slate text, refined borders).
- [ ] Zero blue/neon sci-fi slop or confusing AI model jargon on either platform.
- [ ] Taking a photo in the Android app sends it to /api/v1/companion/upload.
- [ ] Desktop Web terminal automatically receives and displays the incoming phone photo within 1 second.
- [ ] With a document pre-loaded on desktop, receiving the phone photo automatically executes 1:1 biometric comparison and multi-pillar verification.
- [ ] Both Desktop and Android displays show the final screening verdict and risk assessment.
- [ ] Backend test suite passes (pytest backend/tests/).
- [ ] Web build succeeds without errors (npm run build).
- [ ] Android APK builds successfully (./gradlew assembleDebug).
