## 2026-08-23T16:23:48Z

You are Worker 2 (Android App Specialist).
Your working directory is:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_android_1

MANDATORY: Read the original user request at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
and read the project plan at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/PROJECT.md
and read the survey findings at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_survey_android_1/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusive File Ownership:
You exclusively own and modify files in:
`/Users/iamsparsh00321/Downloads/ssb-field-screening/`

Tasks to execute:
1. Remove Technical Jargon across all user-facing views:
   - Remove occurrences of `PP-OCRv4`, `AdaFace-ResNet100`, `MiniFASNetV2`, `DocTamper DTD`, `TruFor`, `ELA` across Kotlin files (`MainScreen.kt`, `SsbScreeningViewModel.kt`, `InspectionPipelineTrace.kt`, `DiscrepancyDiffTable.kt`, `AssessmentSummaryCard.kt`, `PresetScenarios.kt`).
2. Implement Operational Language & Metric Renaming:
   - Primary results card: Display `Threat Risk Level: X/100` and semantic badge (GREEN/AMBER/RED bands).
   - Rename `Stage 1 Tripwire` -> `Critical Verification Trigger`.
   - Rename `Cosine Similarity` / `Liveness Confidence` -> `Face Match Confidence` / `Selfie Liveness Check`.
   - Rename `apparent_age` / `age_drift` -> `Age Validation`.
   - Simplify timings: Remove individual sub-second model processing times from the main view. On primary dashboard, show only `Screening Duration: X.X seconds`.
3. Progressive Disclosure & Collapsed Diagnostics:
   - Reorganize Compose views and bottom tabs to prioritize photo comparison, live selfie verification status, and Threat Risk Level badge.
   - Keep diagnostics tables, check digits, age drifts, and telemetry logs collapsed in a default-closed "Advanced Verification Logs & Technical Audits" accordion.
4. Clean Clutter & Refine Spacing:
   - Clean up navigation spacing and ensure clean operational UI.
5. Unit Tests Alignment:
   - Ensure all existing Robolectric / JUnit test classes in `app/src/test/java/com/ssb/fieldscreening/` pass.
6. Build & Test Verification:
   - Run `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew assembleDebug` in `/Users/iamsparsh00321/Downloads/ssb-field-screening` (must exit 0 with BUILD SUCCESSFUL).
   - Run `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew testDebugUnitTest` (must exit 0 with all tests passing).

Write your completion summary and verification outputs to:
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_android_1/handoff.md`

Send a message when complete.
