## 2026-08-25T05:08:10Z
You are teamwork_preview_worker for Milestone 1: Backend Interface Selection, Pairing QR & Upload Idempotency.
Your working directory is: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_worker_m1_backend
Project root: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project
User original request: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
Survey backend report: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_survey_backend/survey_backend.md
Scope document: /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_orchestrator_2/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Implement `backend/app/core/network.py`:
   - Implement `select_lan_ip(interfaces_dict=None) -> str` and helper functions:
     - Detect default route interface (using `netstat -rn` on macOS/BSD, `ip route show default` on Linux, with fallback to `route -n get default` or socket probe).
     - Inspect available network interfaces (using `psutil.net_if_addrs()` or `netifaces` or custom inspection).
     - Prioritize physical interfaces (`en0`, `eth0`, `wlan0`, `wl0`, etc.) over VPNs (`utun*`, `tun*`, `tap*`, `ppp*`, `wg*`) and virtual bridges (`docker*`, `br*`, `vboxnet*`, `virbr*`, `vmnet*`, `lo*`).
     - Distinguish 10.x.x.x LANs from VPNs by interface name and routing table (do NOT blacklist 10.x.x.x globally).
     - Priority scoring: (is_physical * 100) + (is_default_route * 50) + (is_rfc1918 * 20) - (is_vpn * 200) - (is_virtual * 150) - (is_loopback * 500).
     - Fallback gracefully if no physical interface found.
     - Structured logging of interface evaluation decisions using standard Python logging with tag `[Network]`.
2. Update `backend/app/main.py`:
   - In mDNS Zeroconf registration, import `select_lan_ip` from `app.core.network` and use the selected LAN IP instead of `socket.gethostbyname(socket.gethostname())`.
   - Use dynamic port from `settings.PORT` (or server port) instead of hardcoded 8000.
   - Structured logging with tag `[Zeroconf]`.
3. Update `backend/app/api/routers/companion.py`:
   - Generate an 8-character ephemeral `pairing_token` (e.g. `uuid.uuid4().hex[:8]`) per backend startup.
   - Implement `GET /api/v1/companion/pairing-qr`:
     - Return `{ "status": "active", "qr_payload": f"SSBPAIR://{current_lan_ip}:{port}/{pairing_token}", "gateway_id": gateway_id, "pairing_token": pairing_token, "current_lan_ip": current_lan_ip, "port": port, "fallback_url": f"http://{current_lan_ip}:{port}" }`.
   - Update SQLite database initialization:
     - Check if column `capture_id` exists in `companion_captures`; if not, execute `ALTER TABLE companion_captures ADD COLUMN capture_id TEXT`.
     - Create index `CREATE INDEX IF NOT EXISTS idx_companion_captures_capture_id ON companion_captures (capture_id)`.
   - Update upload endpoint (`POST /api/v1/companion/capture` and underlying `set_capture`):
     - Accept form parameter `capture_id: Optional[str] = Form(None)`.
     - If `capture_id` is provided, query SQLite: if a capture with that `capture_id` already exists, return `{"status": "duplicate", "capture_uuid": existing_uuid, "capture_id": capture_id, "message": "Already received"}` with HTTP 200 and DO NOT write duplicate files or insert duplicate rows.
   - Replace any UDP probe / `socket.gethostbyname` with `select_lan_ip()`.
   - Eliminate hardcoded static IPs (like `192.168.1.61` or `10.198.211`).
   - Structured logging with `[Companion]` tag.
4. Verify your changes:
   - Run backend tests using `.venv311/bin/pytest tests/test_risk_engine.py tests/test_companion_sync.py`.
   - Document commands run and exact outputs in your handoff report.
5. Write `handoff.md` and send message to parent upon completion.
