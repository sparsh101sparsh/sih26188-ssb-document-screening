## 2026-08-25T05:18:58Z

You are teamwork_preview_worker for Milestone 3: Desktop Connect Modal UI & Pairing QR Integration.
Your working directory is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_m3_frontend
Project root: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project
User original request: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
Survey frontend report: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_frontend/survey_frontend_build.md
Scope document: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_orchestrator_2/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task in `sih26188_project/frontend`:
1. `src/types/api.ts`:
   - Add `PairingQrResponse` interface matching backend contract:
     ```typescript
     export interface PairingQrResponse {
       status: string;
       qr_payload: string;
       gateway_id: string;
       pairing_token: string;
       current_lan_ip: string;
       port: number;
       fallback_url: string;
       timestamp?: number;
     }
     ```
2. `src/services/api.ts`:
   - Add `getPairingQr(): Promise<PairingQrResponse>` calling `GET /api/v1/companion/pairing-qr`.
3. `src/components/ConnectModal.tsx`:
   - Fetch pairing QR data from `getPairingQr()` when modal opens or on refresh.
   - Render `QRCodeSVG` with `qr_payload` (e.g. `SSBPAIR://<lan_ip>:<port>/<token>`).
   - Implement clear connection state machine UI (R8):
     - `CONNECTED`: Prominent green dot, online badge, active connected device details (client IP, device model, last ping).
     - `CONNECTING` / `DISCOVERING`: Animated spinner and descriptive status text.
     - `DISCONNECTED`: QR code displayed prominently with simple scan instructions.
   - Expandable Advanced Manual IP Entry Section:
     - IPv4 format validation regex.
     - Port input (default 8000).
     - "Test Connection / Ping" button to verify IP against health check.
     - Action to override gateway URL and update QR code with the manual IP.
4. Clean defaults & remove any hardcoded static IPs (R6).
5. Build & Test:
   - Run `npm test` in `sih26188_project/frontend`.
   - Run `npm run build` in `sih26188_project/frontend`.
   - Document commands and results in `handoff.md`.
6. Send completion message back to parent when done.
