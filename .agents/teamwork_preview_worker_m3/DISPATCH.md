## 2026-08-23T13:30:38Z
You are Worker M3 (Android CameraX Implementation & Upload Pipeline).
Your working directory is:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_m3

Read the authoritative original request and project plan:
- /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
- /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/PROJECT.md
- Target codebase: /Users/iamsparsh00321/Downloads/ssb-field-screening

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks:
1. In `app/build.gradle.kts`: Uncomment and enable CameraX dependencies:
   - `implementation(libs.androidx.camera.camera2)`
   - `implementation(libs.androidx.camera.core)`
   - `implementation(libs.androidx.camera.lifecycle)`
   - `implementation(libs.androidx.camera.view)`
2. In `DualCameraCaptureView.kt`:
   - Implement real live camera preview using `androidx.camera.view.PreviewView` and `ProcessCameraProvider` inside `AndroidView`.
   - Implement `ImageCapture` use case supporting both rear camera (`CameraSelector.DEFAULT_BACK_CAMERA`) for document scan and front camera (`CameraSelector.DEFAULT_FRONT_CAMERA`) for live traveler selfie.
   - Maintain tactical HUD overlay (reticles, scan animation, corner brackets) composited over the real camera preview.
   - Implement real capture button triggers that capture actual images from the camera sensor.
3. Implement image compression & resizing utility:
   - Max 1280px on long edge, maintaining aspect ratio.
   - JPEG quality <= 80%.
   - Returns valid `ByteArray`.
4. Implement CAMERA permission handling:
   - Use Accompanist `rememberPermissionState(Manifest.permission.CAMERA)` or Compose ActivityResult.
   - If permission is denied or not granted, display high-contrast outdoor rationale card with "Grant Camera Permission" button.
5. Wire real `ByteArray` output:
   - Update `SsbScreeningViewModel.kt` to accept real `documentBytes: ByteArray` and optional `liveFaceBytes: ByteArray?`.
   - Update `SsbRepository.kt` to upload the real image bytes via multipart form data.
6. Verify Kotlin compilation / unit tests.
7. Write full report to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_m3/report.md` and `handoff.md`. Notify parent when complete.
