# Dispatch: Milestone 2 - Backend Device Tracker Inactivity Timeout

## Objective
Implement Requirement R2: Device Tracker 8-Second Inactivity Timeout & Active Device Filtering for `sih26188_project/backend`.

## Reference Documents
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md`
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/PROJECT.md`
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/explorer_backend_survey/survey_report.md`

## Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Task Details & Requirements
1. In `sih26188_project/backend/app/core/device_tracker.py`:
   - Add default offline timeout constant (8.0s).
   - Implement `_evaluate_device_status(dev, timeout_seconds=8.0)` and `update_statuses(timeout_seconds=8.0)`.
   - Update `get_all_devices()`, add `get_active_devices()`, and update `get_last_active_device()`.
   - When elapsed time since `last_seen` > 8.0s, device status must transition to `"OFFLINE"`.
2. In `sih26188_project/backend/app/main.py`:
   - In `GET /api/v1/devices`, retrieve `get_active_devices()` and `get_last_active_device()` so that `total_devices` and `devices` list exclude OFFLINE devices.
3. In `sih26188_project/backend/app/core/config.py`:
   - Add `DEVICE_OFFLINE_TIMEOUT_SECONDS: float = Field(default=8.0, ...)` if appropriate.
4. In `sih26188_project/backend/tests/test_challenger_m4_m5_backend.py` (and/or `test_api_health.py`):
   - Add unit tests verifying timeout transition to OFFLINE, reactivation on new ping, and endpoint exclusion of stale/offline devices.
5. Run full pytest suite using:
   `cd sih26188_project/backend && /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/.venv311/bin/pytest tests/`
6. Write your report to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_backend_m2/handoff.md`.
