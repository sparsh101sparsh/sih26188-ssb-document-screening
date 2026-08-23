import sys
import os
import re
import json
import sqlite3
import hashlib
from datetime import datetime, date

print("=== STARTING UNBUFFERED FORENSIC AUDIT ===", flush=True)

base_dir = '/Users/iamsparsh00321/teamwork_projects/sih26188_wave3'

# 1. Test Stamp Authentication
print("\n--- 1. Testing Stamp Authentication Module ---", flush=True)
import numpy as np
import cv2
from skimage.metrics import structural_similarity as ssim

with open(os.path.join(base_dir, 'docs/04_STAMP_AUTHENTICATION_MODULE.md'), 'r') as f:
    stamp_content = f.read()

m = re.search(r'```python\n(.*?)```', stamp_content, re.DOTALL)
if not m:
    print("FATAL: Stamp python block not found!", flush=True)
    sys.exit(1)

stamp_py_code = m.group(1)
stamp_env = {}
exec(stamp_py_code, stamp_env)
print("Stamp Python code executed successfully.", flush=True)

StampVerificationEngine = stamp_env['StampVerificationEngine']
engine = StampVerificationEngine(registry_path="nonexistent.json")

# Test date parsing
test_dates = [
    ("2026-08-22", date(2026, 8, 22)),
    ("22/08/2026", date(2026, 8, 22)),
    ("22-08-2026", date(2026, 8, 22)),
    ("2026/08/22", date(2026, 8, 22)),
    ("22.08.2026", date(2026, 8, 22)),
    ("20260822", date(2026, 8, 22)),
]
for date_str, expected in test_dates:
    p = engine.parse_iso_date(date_str)
    assert p == expected, f"Failed parse_iso_date for {date_str}: {p} != {expected}"
print("All valid date formats parsed successfully.", flush=True)

assert engine.parse_iso_date("invalid_string") is None, "Failed on invalid date string"
print("Invalid date string correctly returned None.", flush=True)

# Test context validation window
window = ("2026-01-01", "2026-12-31")
assert engine.validate_context_date("2026-06-15", window) == 0.0, "Failed clean in-window test"
assert engine.validate_context_date("2025-11-20", window) == 1.0, "Failed expired date test"
assert engine.validate_context_date("2027-02-01", window) == 1.0, "Failed future date test"
assert engine.validate_context_date("CORRUPT", window) == 0.8, "Failed unparseable test"
print("Context date window validation logic verified 100% genuine.", flush=True)

# Test Unknown Checkpost AMBER Escalation on realistic white document
synth_img = np.ones((800, 800, 3), dtype=np.uint8) * 255
cv2.circle(synth_img, (400, 400), 80, (180, 50, 140), -1)
cv2.putText(synth_img, "SSB ENTRY", (350, 400), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

tamper_map = np.zeros((800, 800), dtype=np.float32)
res_unknown = engine.verify_stamp(
    image=synth_img,
    checkpost_id="UNKNOWN_CHECKPOST",
    tamper_map=tamper_map,
    ocr_date="2026-06-15",
    permit_window=window
)
print("verify_stamp unknown checkpost result:", res_unknown, flush=True)
assert res_unknown['stamp_detected'] == True
assert res_unknown['is_known_checkpost'] == False
assert res_unknown['status'] == "AMBER"
print("Stamp verification module verified successfully!", flush=True)

# 2. Test Pydantic Models & Hash in MASTER_PROMPT.md
print("\n--- 2. Testing Pydantic Models & SHA-256 in MASTER_PROMPT.md ---", flush=True)
from pydantic import BaseModel, Field, ValidationError

with open(os.path.join(base_dir, 'android-agent/MASTER_PROMPT.md'), 'r') as f:
    master_prompt = f.read()

py_blocks = re.findall(r'```python\n(.*?)```', master_prompt, re.DOTALL)
pydantic_env = {}
exec(py_blocks[0], pydantic_env)

DocScanReq = pydantic_env['DocumentScanRequest']
DocScanResp = pydantic_env['DocumentScanResponse']
FaceScanReq = pydantic_env['FaceScanRequest']
FaceScanResp = pydantic_env['FaceScanResponse']
ScreenCompleteResp = pydantic_env['ScreeningCompleteResponse']
CrossValidationFlag = pydantic_env['CrossValidationFlag']

valid_screen = ScreenCompleteResp(
    session_id="SSB-2026-001",
    risk_score=15,
    risk_tier="GREEN",
    auto_clear=True,
    biometric_similarity=0.92,
    watchlist_hit=False,
    cross_validation_flags=[
        CrossValidationFlag(
            rule_id="RULE_01",
            rule_description="OCR vs MRZ Name Match",
            passed=True,
            telemetry_message="Names match exactly"
        )
    ],
    flag_reasons=[],
    audit_record_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    total_pipeline_latency_ms=480.5
)
print("ScreenCompleteResp valid instance:", valid_screen.risk_tier, flush=True)

# Test rejection of out-of-range risk_score
try:
    ScreenCompleteResp(
        session_id="SSB-2026-001",
        risk_score=120, # Out of range
        risk_tier="RED",
        auto_clear=False,
        watchlist_hit=False,
        cross_validation_flags=[],
        flag_reasons=[],
        audit_record_hash="hash",
        total_pipeline_latency_ms=100.0
    )
    print("ERROR: Out of bounds risk_score was not rejected!", flush=True)
    sys.exit(1)
except ValidationError:
    print("Pydantic successfully rejected risk_score=120 (ge=0, le=100 enforced).", flush=True)

# Test rejection of invalid liveness score
try:
    FaceScanResp(
        session_id="SSB-2026-001",
        face_detected=True,
        liveness_score=1.5, # Out of range
        is_live=True,
        apparent_age_estimate=32,
        processing_time_ms=42.0
    )
    print("ERROR: Out of bounds liveness_score was not rejected!", flush=True)
    sys.exit(1)
except ValidationError:
    print("Pydantic successfully rejected liveness_score=1.5 (ge=0.0, le=1.0 enforced).", flush=True)

# Test hash calculation
hash_env = {}
exec(py_blocks[1], hash_env)
compute_audit_hash = hash_env['compute_audit_hash']

h = compute_audit_hash(
    session_id="SSB-2026-001",
    checkpoint_id="JAIGAON_01",
    officer_id="OFF_4421",
    risk_score=14,
    risk_tier="GREEN",
    watchlist_hit=False,
    timestamp_iso="2026-08-23T02:00:15Z"
)

# Independent manual calculation
canonical_dict = {
    "session_id": "SSB-2026-001",
    "checkpoint_id": "JAIGAON_01",
    "officer_id": "OFF_4421",
    "risk_score": 14,
    "risk_tier": "GREEN",
    "watchlist_hit": False,
    "timestamp": "2026-08-23T02:00:15Z"
}
expected_h = hashlib.sha256(json.dumps(canonical_dict, sort_keys=True).encode("utf-8")).hexdigest()
assert h == expected_h, f"Hash mismatch: {h} vs {expected_h}"
assert len(h) == 64
print(f"SHA-256 audit hash calculation verified: {h}", flush=True)

# 3. Test SQLite DDL
print("\n--- 3. Testing SQLite Transactional Outbox DDL ---", flush=True)
sql_ddl = re.search(r'```sql\n(.*?)```', master_prompt, re.DOTALL).group(1)
conn = sqlite3.connect(":memory:")
conn.executescript(sql_ddl)
conn.commit()

conn.execute("""
INSERT INTO outbox_scan_records (
    session_id, checkpoint_id, officer_id, payload_json,
    document_image_blob, live_face_blob, risk_score, risk_tier,
    created_at, sync_status, retry_count, idempotency_key
) VALUES (
    'SSB-001', 'JAIGAON_01', 'OFF_1', '{}',
    X'89504E47', NULL, 10, 'GREEN',
    1724371200, 'PENDING', 0, 'IDEMP-001'
);
""")
conn.commit()

row = conn.execute("SELECT session_id, risk_tier, sync_status, idempotency_key FROM outbox_scan_records WHERE session_id='SSB-001';").fetchone()
assert row == ('SSB-001', 'GREEN', 'PENDING', 'IDEMP-001'), f"Unexpected row: {row}"
print(f"SQLite outbox table created, inserted, and queried successfully: {row}", flush=True)

# Test idempotency unique constraint
try:
    conn.execute("""
    INSERT INTO outbox_scan_records (
        session_id, checkpoint_id, officer_id, payload_json,
        document_image_blob, live_face_blob, risk_score, risk_tier,
        created_at, sync_status, retry_count, idempotency_key
    ) VALUES (
        'SSB-002', 'JAIGAON_01', 'OFF_1', '{}',
        X'89504E47', NULL, 10, 'GREEN',
        1724371200, 'PENDING', 0, 'IDEMP-001'
    );
    """)
    print("ERROR: SQLite UNIQUE constraint on idempotency_key failed!", flush=True)
    sys.exit(1)
except sqlite3.IntegrityError:
    print("SQLite UNIQUE constraint on idempotency_key enforced successfully.", flush=True)

conn.close()

# 4. Test Backend Provider Selector
print("\n--- 4. Testing Execution Provider Selector ---", flush=True)
with open(os.path.join(base_dir, 'UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md'), 'r') as f:
    report_content = f.read()

sel_code = re.search(r'```python\n# backend/app/core/backend_selector\.py\n(.*?)```', report_content, re.DOTALL).group(1)
sel_env = {}
exec(sel_code, sel_env)
get_providers = sel_env['get_optimal_execution_providers']
providers = get_providers()
print(f"Execution providers detected on current system: {providers}", flush=True)
assert "CPUExecutionProvider" in providers, "CPUExecutionProvider must always be present as fallback"

# 5. Test Rust code block in docs/03_DESKTOP_APP_ARCHITECTURE.md
print("\n--- 5. Testing Rust Code Block in docs/03_DESKTOP_APP_ARCHITECTURE.md ---", flush=True)
with open(os.path.join(base_dir, 'docs/03_DESKTOP_APP_ARCHITECTURE.md'), 'r') as f:
    desktop_content = f.read()

rust_code = re.search(r'```rust\n(.*?)```', desktop_content, re.DOTALL).group(1)
print(f"Rust snippet length: {len(rust_code.splitlines())} lines.")
assert "tauri::Builder::default()" in rust_code
assert "tauri_plugin_shell" in rust_code
assert "SidecarChildState" in rust_code
print("Rust Tauri main.rs code block verified.", flush=True)

# 6. Test JSON Configurations & OpenAPI Schemas
print("\n--- 6. Testing JSON blocks across all files ---", flush=True)
for rel_path in [
    'UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md',
    'docs/03_DESKTOP_APP_ARCHITECTURE.md',
    'android-agent/MASTER_PROMPT.md'
]:
    with open(os.path.join(base_dir, rel_path), 'r') as f:
        c = f.read()
    j_matches = re.finditer(r'```json\n(.*?)```', c, re.DOTALL)
    for idx, jm in enumerate(j_matches):
        j_str = jm.group(1)
        try:
            parsed = json.loads(j_str)
            print(f"  [OK] {rel_path} JSON #{idx+1} valid JSON (Type: {type(parsed).__name__})", flush=True)
        except Exception as e:
            print(f"  [FAIL] {rel_path} JSON #{idx+1} invalid: {e}", flush=True)
            sys.exit(1)

print("\n=== ALL DIRECT AUDIT TESTS PASSED WITH ZERO INTEGRITY VIOLATIONS! ===", flush=True)
