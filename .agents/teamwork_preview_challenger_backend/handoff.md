# Milestone 4 Backend Empirical Challenge Report

**Date**: 2026-08-25T05:32:00Z  
**Agent**: `teamwork_preview_challenger_backend` (Empirical Challenger)  
**Verdict**: **`APPROVE`**

---

## 1. Observation

Empirical testing was executed directly against the Python FastAPI backend in `sih26188_project/backend` using Python 3.11 (`.venv311/bin/pytest` and `.venv311/bin/python`).

### A. Network Interface Heuristics & `select_lan_ip` (`app/core/network.py:332-416`)
- **Scoring Formula Verification** (`app/core/network.py:291-330`):
  - Physical adapter (`en0`, `eth0`, `wlan0`, `ens33`): `+100`
  - Default route match: `+50`
  - RFC 1918 Private Address (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`): `+20`
  - VPN Interface penalty (`utun*`, `tun*`, `wg*`, `tailscale*`, `cscotun*`, `nord*`, `proton*`, etc.): `-200`
  - Virtual Bridge penalty (`docker0`, `br-*`, `virbr*`, `vboxnet*`, `awdl*`, `calico*`, etc.): `-150`
  - Loopback penalty (`lo`, `lo0`): `-500`
- **Adversarial Scenarios Tested**:
  1. Multi-VPN + Multi-Bridge topology (`utun0`, `tun0`, `wg0`, `tailscale0`, `docker0`, `br-987654`, `virbr0`, `vboxnet0`, `awdl0`, `en0` on `192.168.1.120`): Selected `192.168.1.120` (Score `120`).
  2. 10.x.x.x Subnet Preservation: Physical `wlan0: 10.50.100.5` vs VPN `utun0: 10.8.0.1`: Selected `10.50.100.5` without false-positive VPN penalization.
  3. Multiple Physical NICs with Default Route: `en0: 192.168.1.50` (Score 120) vs `eth0: 10.0.0.10` with default route `eth0` (Score 170): Selected `eth0`.
  4. Link-Local & Corrupted IP filtering: `169.254.1.5` and invalid string `"invalid.ip.string"` filtered out cleanly; picked valid physical `en1: 192.168.2.88`.
  5. Degenerate / Empty Inputs: `{}` and `{"lo": ["127.0.0.1"]}` gracefully fallback to `127.0.0.1` without exceptions.
  6. Nested Data Structures: psutil `[{"address": "..."}]` and netifaces `[{"addr": "..."}]` formats parsed identically.

### B. Concurrent & Duplicate Capture Uploads (`app/api/routers/companion.py:538-676`)
- **10-Thread Concurrent Rapid-Fire Uploads with Identical `capture_id`**:
  - Command: `pytest tests/test_challenger_milestone4_backend.py::TestConcurrentUploadDeduplication::test_rapid_fire_duplicate_capture_id_exact_ack`
  - Result:
    - 1 request returned HTTP 200 with `status: "success"`, `sequence_id: 1`, `capture_uuid: "<uuid>"`.
    - 9 requests returned HTTP 200 with `status: "duplicate"`, `message: "Already received"`, `sequence_id: 1`, and identical `capture_uuid`.
    - SQLite database count: exactly 1 (`SELECT COUNT(*) FROM companion_captures` = 1).
    - Disk enclave: exactly 1 file created in `data/companion_store/YYYY-MM-DD/`.
    - Concurrency locks / WAL locks: 0 errors encountered.
- **10-Thread Concurrent Uploads with 10 Distinct `capture_id`s**:
  - Result: All 10 returned HTTP 200 with `status: "success"`; sequence IDs `1..10` allocated strictly monotonically with 0 collisions.
- **Malformed Payload Rejections**:
  - 0-byte file: returned HTTP 400 (`Uploaded file is empty.`).
  - Missing file + missing base64: returned HTTP 400 (`Uploaded file is empty.`).
  - Corrupt base64 string: returned HTTP 400 (`Invalid base64 image data`).
  - Invalid JSON list: returned HTTP 400 (`JSON body must be a valid JSON object.`).
  - Database side effects: 0 phantom rows written.

### C. Pairing QR Endpoint & Token Stability (`app/api/routers/companion.py:845-873`)
- **Token Invariance**: 50 successive requests across threads verified `pairing_token` is constant, equal to `PAIRING_TOKEN` (8 hex chars), and does not drift during backend runtime.
- **SSBPAIR Protocol Format**: `qr_payload` strictly matched `^SSBPAIR://([0-9.]+):(\d+)/([0-9a-fA-F]{8})$` (e.g. `SSBPAIR://192.168.1.50:8000/a1b2c3d4`).
- **Fallback URL**: Returned `http://<current_lan_ip>:<port>`.

### D. Pytest Suite Execution
- `tests/test_challenger_milestone4_backend.py`: **16/16 PASSED** in 12.14s.
- `tests/test_network_interface.py`: **13/13 PASSED** in 22.48s.
- `tests/test_risk_engine.py`: **23/23 PASSED** in 8.51s.
- Combined Network + Companion + Risk test suite (9 test files, 210 tests): **210/210 PASSED** in 23.13s.

---

## 2. Logic Chain

1. **R1 / Interface Selection**: Because `select_lan_ip` uses explicit prefix classification for VPNs (`-200`) and virtual bridges (`-150`) combined with physical adapter positive weighting (`+100`) and routing table default gateway detection (`+50`), it robustly resolves real physical Wi-Fi/Ethernet IPs even when virtual network adapters and VPN tunnels are active. RFC 1918 bonus (`+20`) ensures 10.x.x.x, 172.16-31.x.x, and 192.168.x.x subnets are selected on physical interfaces without false-positive blacklisting.
2. **R4 / Pairing QR**: Because `PAIRING_TOKEN` is generated once at module import and bound to `PersistentCompanionStore.pairing_token`, `GET /api/v1/companion/pairing-qr` consistently outputs deterministic `SSBPAIR://<host>:<port>/<token>` payloads and valid HTTP fallback URLs across all runtime calls.
3. **R5 / Upload Idempotency**: Because `PersistentCompanionStore.set_capture()` performs an atomic query on `companion_captures` under an RLock and SQLite WAL mode before insertion, rapid concurrent uploads with identical `capture_id`s guarantee exactly 1 write and duplicate ACKs for all remaining retries with zero state corruption.
4. **R9 / Test Suite Integrity**: The test suite confirms all interface selection heuristics, QR schemas, deduplication mechanics, and core risk engine rules (23/23) pass with 100% success.

---

## 3. Caveats

- In the comprehensive repo-wide test suite (`pytest tests/`), 7 pre-existing failures exist in legacy modules out of scope for Milestone 4 (biometrics landmark threshold in `test_biometrics.py`, stamp contour detection in synthetic image in `test_forensics.py`, and simulation user-agent assert in `test_challenger_m5_e2e_4tier.py`). All Milestone 4 network, pairing, idempotency, and risk engine tests pass 100% (210/210).
- Physical disconnection of physical NICs during live Zeroconf socket broadcast was simulated via interface dictionary mocking; physical OS hardware hotplugging was not executed.

---

## 4. Conclusion

The Milestone 4 backend implementation satisfies all architectural, functional, and resilience requirements specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`:
- Network interface selection is robust across complex VPN/bridge/VLAN topologies.
- QR pairing endpoint strictly adheres to the `SSBPAIR://` protocol contract and maintains stable runtime tokens.
- Upload deduplication is thread-safe, SQLite WAL compatible, and completely idempotent under concurrent load.
- Risk engine is 100% green (23/23 tests passing).

**Verdict**: **`APPROVE`**

---

## 5. Verification Method

To independently reproduce and verify all empirical test results, run the following commands from `sih26188_project/backend`:

```bash
# 1. Run the Milestone 4 empirical challenge suite
../.venv311/bin/pytest tests/test_challenger_milestone4_backend.py -v

# 2. Run the network interface and idempotency suite
../.venv311/bin/pytest tests/test_network_interface.py -v

# 3. Run the risk engine test suite
../.venv311/bin/pytest tests/test_risk_engine.py -v

# 4. Run all combined network, companion, and risk tests (210 tests)
../.venv311/bin/pytest tests/test_network_interface.py tests/test_challenger_milestone4_backend.py tests/test_companion_sync.py tests/test_challenger_companion_live_sync.py tests/test_challenger_m1.py tests/test_challenger_m1_stress.py tests/test_challenger_m4_empirical_pipeline.py tests/test_challenger_m4_m5_backend.py tests/test_risk_engine.py -v
```
