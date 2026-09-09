# Dispatch: Backend Core & Routers Audit (Track 1)

## Mission
Perform comprehensive, read-only static analysis and code audit of the Backend Core & Routers in the SIH26188 document screening system.

## Working Directory
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_backend_audit`

## Project Root
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project`

## Target Paths
- `backend/app/api/routers/` (and `backend/app/api/v1/endpoints/`)
- `backend/app/core/` (config, security, database, etc.)
- `backend/app/services/` (screening service, companion service, websocket manager, etc.)
- `backend/app/schemas/` (Pydantic models, request/response schemas)

## Scope & Audit Focus
1. API schema validation & Pydantic vs client naming discrepancies (camelCase vs snake_case, field aliases, missing Optional flags, None vs default values).
2. Error handling & status codes (unhandled exceptions, bare excepts, 500 errors on invalid inputs, missing HTTP status codes).
3. Session lifecycle & state machine transitions (document screening states, duplicate session handling, orphan sessions).
4. Concurrency & async integrity (race conditions in WebSocket connection manager, DB connection pools, asyncio blocking calls, file I/O in async routes).
5. LAN/network interface selector & companion endpoints.

## Rules
- STRICT READ-ONLY ENFORCEMENT: Under NO circumstances should any production source code or test files be modified or altered.
- Record every bug found with:
  - Unique ID (e.g. BE-01, BE-02...)
  - Title
  - Severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
  - Affected Component & Exact File Path
  - Exact Line numbers
  - Detailed Description
  - Root Cause Analysis
  - Reproduction Steps / Scenario
  - Potential Remediation Notes
- Write your findings to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_backend_audit/report.md`.
- Conclude with `handoff.md` and send message to orchestrator.

## 2026-09-09T04:26:19Z
<USER_REQUEST>
You are assigned Track 1: Backend Core & Routers Audit for the SIH26188 project.

Read the user's original request verbatim at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md

Your working directory is:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_backend_audit
Read your task dispatch file at:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_backend_audit/DISPATCH.md

Project root: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project

CRITICAL DIRECTIVES:
- STRICT READ-ONLY ENFORCEMENT: Under NO circumstances should any production source code or test files be modified or altered.
- Inspect:
  1. `backend/app/api/routers/` & `backend/app/api/v1/endpoints/`
  2. `backend/app/core/`
  3. `backend/app/services/`
  4. `backend/app/schemas/`
- Identify all bugs relating to API schema validation, Pydantic vs client naming discrepancies, error handling, session lifecycle, concurrency, async/sync blocking, LAN interface selection, and pairing endpoints.
- For each bug, record: Unique ID (BE-xx), Title, Severity (CRITICAL/HIGH/MEDIUM/LOW/INFO), Affected Component & Exact Path, Exact Line Numbers, Detailed Description, Root Cause Analysis, Reproduction Steps, and Potential Remediation Notes.
- Write your comprehensive findings to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_backend_audit/report.md`.
- Conclude with `handoff.md` and send a message to orchestrator (`send_message` with recipient 'parent').
</USER_REQUEST>
