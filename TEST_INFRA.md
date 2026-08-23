# E2E Test Infra: SSB Field Screening System

## Test Philosophy
- Multi-tier verification covering Android app build & unit tests, Web frontend build & component tests, and Backend pytest suite.
- Requirement-driven verification:
  - 100% elimination of ML jargon (`PP-OCRv4`, `AdaFace-ResNet100`, `MiniFASNetV2`, `DocTamper DTD`, `TruFor`, `ELA`) from user-facing screens.
  - Correct display of `Threat Risk Level: X / 100` and semantic badge (GREEN/AMBER/RED).
  - Single consolidated `Screening Duration: X.X seconds` on main dashboards.
  - Progressive disclosure with collapsed-by-default "Advanced Verification Logs & Technical Audits" accordion.
  - Tab names in `PillarsTable.tsx` matching the required operational titles.
  - Passing `./gradlew assembleDebug`, `npm run build`, `npm test`, and `pytest tests/`.

## Test Execution Commands
1. **Android Build & Unit Tests**:
   - Build: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew assembleDebug` (in `/Users/iamsparsh00321/Downloads/ssb-field-screening`)
   - Unit Tests: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" && ./gradlew testDebugUnitTest`
2. **Web Frontend Build & Tests**:
   - Build: `npm run build` (in `sih26188_project/frontend`)
   - Tests: `npm test` (in `sih26188_project/frontend`)
3. **Backend Test Suite**:
   - Pytest: `.venv311/bin/pytest tests/` (in `sih26188_project/backend`)

## Verification Checklist
| Feature Requirement | Android Verification | Web Frontend Verification | Backend Verification |
|---|---|---|---|
| R1: ML Jargon Elimination | `rg -i "AdaFace-ResNet100|MiniFASNetV2|DocTamper|TruFor|PP-OCRv4" app/src/main/` | `rg -i "AdaFace-ResNet100|MiniFASNetV2|DocTamper|TruFor|PP-OCRv4" src/components/` | Stable API keys preserved |
| R1: Metric Renaming | `AssessmentSummaryCard.kt` shows Threat Risk Level, Face Match, Age Validation | `RiskStatusBanner.tsx`, `ResultsPanel.tsx` show Threat Risk Level, Face Match Confidence | `risk_scorer.py` evaluates score |
| R1: Screening Duration | `Screening Duration: X.X seconds` displayed, individual latencies collapsed | `Screening Duration: X.X seconds` displayed, individual latencies collapsed | `processing_time_ms` emitted |
| R2: Progressive Disclosure | "Advanced Verification Logs & Technical Audits" accordion collapsed by default | "Advanced Verification Logs & Technical Audits" accordion collapsed by default | All data present in response |
| R3: Tab Refinement & Spacing | Reorganized tabs, photo comparison prioritized | `PillarsTable.tsx` has 5 operational tab titles | N/A |
| Acceptance: Build & Tests | `./gradlew assembleDebug` & `testDebugUnitTest` PASS | `npm run build` & `npm test` PASS | `pytest tests/` PASS (242/242) |
