## 2026-08-23T17:22:03Z

Verify and fix the live Wi-Fi/Hotspot connectivity state tracking between the Android APK and the computer Edge backend, ensuring both the web frontend and Android app dynamically display live "Connected" indicators based on active polling and health status check endpoints.

Key Requirements:
1. R1. Android Live Health Polling Loop (2-second interval in SsbScreeningViewModel.kt)
2. R2. Backend Device Tracker Timeout (8-second timeout for offline status in sih26188_project/backend/app/core/device_tracker.py, exclude offline devices from GET /api/v1/devices)
3. R3. Web/Computer UI Live Device Count (frontend/src/components/Header.tsx: poll /api/v1/devices every 3s, remove hardcoded Math.max(1,...), live latency)
4. Acceptance criteria & builds: Android ./gradlew assembleDebug, Backend pytest tests/, Frontend npm run build.
