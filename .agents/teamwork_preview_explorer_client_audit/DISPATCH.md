# Dispatch: Frontend & Mobile Clients Audit (Track 3)

## Mission
Perform comprehensive, read-only audit and static analysis of the Web Frontend and Android Mobile Client in the SIH26188 document screening system.

## Working Directory
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_client_audit`

## Project Root
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project`

## Target Paths
- `frontend/src/` (components, pages, api hooks, websockets, types, state stores)
- `android-screening/` (app/src/main/java/..., AndroidManifest.xml, network security config, build.gradle, viewmodels, services, utils)

## Scope & Audit Focus
1. Request payload consistency: Check TypeScript interfaces / API requests against FastAPI / Pydantic models in `backend/app/schemas/` and endpoints. Identify field mismatches, camelCase vs snake_case mismatches, missing required headers, missing multipart boundary handling.
2. WebSocket event subscription & teardown: In `frontend/src/`, inspect WS connection lifecycle, subscription handling, message deserialization, reconnection with exponential backoff vs infinite fast-loops, zombie socket leaks on component unmount.
3. Client state handling: React state / Zustand stores, unhandled promise rejections, race conditions in screening result rendering, stale closure bugs in `useEffect`.
4. Android client audit:
   - Camera lifecycle & CameraX binding/unbinding (leaked PreviewView, unreleased ImageAnalysis, rotation/aspect ratio bugs).
   - Network & security configuration (`usesCleartextTraffic`, domain cleartext overrides, timeouts in OkHttpClient/Retrofit).
   - Android permissions (CAMERA, INTERNET, ACCESS_NETWORK_STATE runtime checks vs manifest).
   - Coroutine scope & thread safety (Dispatchers.IO vs Dispatchers.Main, unhandled Job cancellation, ViewModel leaks).
   - QR code pairing and upload idempotency (`capture_id`, `SSBPAIR://` protocol handling).

## Rules
- STRICT READ-ONLY ENFORCEMENT: Under NO circumstances should any production source code or test files be modified or altered.
- Record every bug found with:
  - Unique ID (e.g. CLI-01, CLI-02... or FE-01, AND-01...)
  - Title
  - Severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
  - Affected Component & Exact File Path
  - Exact Line numbers
  - Detailed Description
  - Root Cause Analysis
  - Reproduction Steps / Scenario
  - Potential Remediation Notes
- Write your findings to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_client_audit/report.md`.
- Conclude with `handoff.md` and send message to orchestrator.
