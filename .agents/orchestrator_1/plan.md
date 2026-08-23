# Execution Plan: SSB Field Screening System Refactoring

## Objectives
Transform technical/research jargon into intuitive operational language, enforce progressive disclosure with collapsible audit accordions, refine tab names and layout clutter across Computer and Android apps, and verify builds across all stacks.

## Phases
1. **Phase 0: Parallel Codebase Survey**
   - Explorer 1 (Frontend): Map React/Vite/Web codebase (`PillarsTable.tsx`, Dashboard, UI components, jargon strings, latency displays, accordions).
   - Explorer 2 (Android): Map Kotlin/Jetpack Compose codebase (Screening results cards, tabs, badges, diagnostics tables/logs, strings).
   - Explorer 3 (Backend & Tests): Map FastAPI/Python backend, schema/models, test suite (`pytest tests/`), operational bullet generation, any backend responses.

2. **Phase 1: Project Scope & Architecture Synthesis**
   - Synthesize findings into `PROJECT.md` and feature inventories.
   - Define exact interface contracts, code boundaries, and test commands.

3. **Phase 2: Implementation & Refactoring**
   - Milestone 1: Web Frontend Refactoring (Operational language, progressive disclosure accordion, plain-text tab titles, simplified timings).
   - Milestone 2: Android App Refactoring (Threat Risk Level badge, Compose view reorganization, collapsed diagnostics).
   - Milestone 3: Backend & Integration (Operational bullet strings, verification tests).

4. **Phase 3: Verification & Auditing Loop**
   - Full build & test checks (`./gradlew assembleDebug`, `npm run build`, `pytest tests/`).
   - Reviewers, Challengers, and Forensic Auditor verification.

5. **Phase 4: Completion & Reporting**
   - Synthesize final evidence and report to parent/user.
