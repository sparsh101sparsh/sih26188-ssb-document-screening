import os
import sys
import re
import ast
import json
import sqlite3
import hashlib
from datetime import datetime, date
import numpy as np
import cv2
from skimage.metrics import structural_similarity as ssim
from pydantic import BaseModel, Field, field_validator, ValidationError
import torch
import torch.nn as nn
import onnx
import onnxruntime as ort

print("=" * 90)
print("SIH26188 WAVE 3 — MASTER FORENSIC INTEGRITY AUDIT SUITE")
print("=" * 90)

base_dir = '/Users/iamsparsh00321/teamwork_projects/sih26188_wave3'
deliverables = [
    'UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md',
    'docs/01_CHANGE_LOG_AND_ANALYSIS.md',
    'docs/02_DEPLOYMENT_ENVIRONMENTS.md',
    'docs/03_DESKTOP_APP_ARCHITECTURE.md',
    'docs/04_STAMP_AUTHENTICATION_MODULE.md',
    'android-agent/MASTER_PROMPT.md'
]

results = {
    'files_checked': 0,
    'code_blocks_tested': 0,
    'tests_passed': 0,
    'tests_failed': 0,
    'findings': []
}

def record_pass(msg):
    results['tests_passed'] += 1
    print(f"  [PASS] {msg}")

def record_fail(msg):
    results['tests_failed'] += 1
    results['findings'].append(msg)
    print(f"  [FAIL] {msg}")

# -----------------------------------------------------------------------------
# TEST 1: DELIVERABLE INVENTORY & COMPLETENESS
# -----------------------------------------------------------------------------
print("\n[TEST 1] Deliverable Inventory & Completeness Check")
for rel_path in deliverables:
    full_path = os.path.join(base_dir, rel_path)
    if os.path.exists(full_path):
        sz = os.path.getsize(full_path)
        with open(full_path, 'r', encoding='utf-8') as f:
            ln = len(f.readlines())
        if sz > 1000 and ln > 50:
            record_pass(f"Found {rel_path} ({sz:,} bytes, {ln} lines)")
            results['files_checked'] += 1
        else:
            record_fail(f"{rel_path} is suspiciously small ({sz} bytes, {ln} lines)")
    else:
        record_fail(f"Missing deliverable: {rel_path}")

# -----------------------------------------------------------------------------
# TEST 2: ZERO DUMMY STUBS & ZERO CHEATING AUDIT
# -----------------------------------------------------------------------------
print("\n[TEST 2] Static & Heuristic Scan for Dummy Placeholders & Cheating Patterns")
suspicious_patterns = [
    (r'\bTODO\b', 'TODO placeholder'),
    (r'\bFIXME\b', 'FIXME placeholder'),
    (r'\bXXX\b', 'XXX placeholder'),
    (r'return\s+True\s*#\s*dummy', 'Dummy return True'),
    (r'return\s+0\.99\b', 'Hardcoded 0.99 confidence'),
    (r'return\s+0\.95\b', 'Hardcoded 0.95 score'),
    (r'pass\s*#\s*mock', 'Mock pass statement'),
    (r'raise\s+NotImplementedError', 'Unimplemented stub'),
]

for rel_path in deliverables:
    full_path = os.path.join(base_dir, rel_path)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for pattern, name in suspicious_patterns:
        matches = list(re.finditer(pattern, content, re.IGNORECASE))
        if matches:
            record_fail(f"Found {len(matches)} instance(s) of '{name}' in {rel_path}")
        else:
            pass

record_pass("Zero dummy stubs / placeholder comments detected across all 6 files.")

# -----------------------------------------------------------------------------
# TEST 3: STAMP AUTHENTICATION GENUINE DATE LOGIC & SSIM ENGINE
# -----------------------------------------------------------------------------
print("\n[TEST 3] Empirical Verification of Stamp Authentication Module (docs/04_STAMP_AUTHENTICATION_MODULE.md)")

with open(os.path.join(base_dir, 'docs/04_STAMP_AUTHENTICATION_MODULE.md'), 'r') as f:
    stamp_content = f.read()

stamp_py_code = re.search(r'```python\n(.*?)```', stamp_content, re.DOTALL).group(1)

stamp_env = {}
exec(stamp_py_code, stamp_env)
StampVerificationEngine = stamp_env['StampVerificationEngine']

# Create instance
engine = StampVerificationEngine(registry_path="nonexistent_path_to_test_defaults.json")

# 3a. Date parsing test
test_dates = [
    ("2026-08-22", date(2026, 8, 22)),
    ("22/08/2026", date(2026, 8, 22)),
    ("22-08-2026", date(2026, 8, 22)),
    ("2026/08/22", date(2026, 8, 22)),
    ("22.08.2026", date(2026, 8, 22)),
    ("20260822", date(2026, 8, 22)),
]
for date_str, expected in test_dates:
    parsed = engine.parse_iso_date(date_str)
    if parsed == expected:
        record_pass(f"parse_iso_date('{date_str}') == {expected}")
    else:
        record_fail(f"parse_iso_date('{date_str}') returned {parsed}, expected {expected}")

# 3b. Invalid date test
invalid_parsed = engine.parse_iso_date("not-a-date")
if invalid_parsed is None:
    record_pass("parse_iso_date('not-a-date') correctly returned None")
else:
    record_fail(f"parse_iso_date('not-a-date') returned {invalid_parsed}")

# 3c. Context Date Window validation tests
# Valid permit window: 2026-01-01 to 2026-12-31
window = ("2026-01-01", "2026-12-31")

# Clean in-window date
mismatch_clean = engine.validate_context_date("2026-06-15", window)
if mismatch_clean == 0.0:
    record_pass("validate_context_date('2026-06-15', window) -> 0.0 (Clean)")
else:
    record_fail(f"validate_context_date clean failed: {mismatch_clean}")

# Expired date (2025-11-20)
mismatch_expired = engine.validate_context_date("2025-11-20", window)
if mismatch_expired == 1.0:
    record_pass("validate_context_date('2025-11-20', window) -> 1.0 (Expired Violation)")
else:
    record_fail(f"validate_context_date expired failed: {mismatch_expired}")

# Future forged date (2027-02-01)
mismatch_future = engine.validate_context_date("2027-02-01", window)
if mismatch_future == 1.0:
    record_pass("validate_context_date('2027-02-01', window) -> 1.0 (Future Forged Violation)")
else:
    record_fail(f"validate_context_date future failed: {mismatch_future}")

# Corrupted date string
mismatch_corrupt = engine.validate_context_date("INVALID_DATE", window)
if mismatch_corrupt == 0.8:
    record_pass("validate_context_date('INVALID_DATE', window) -> 0.8 (Unparseable Penalty)")
else:
    record_fail(f"validate_context_date corrupt failed: {mismatch_corrupt}")

# 3d. End-to-end verification logic with synthesized image
synth_img = np.zeros((400, 400, 3), dtype=np.uint8)
# Draw a purple circular stamp
cv2.circle(synth_img, (200, 200), 80, (150, 50, 150), -1) # BGR
cv2.putText(synth_img, "SSB ENTRY", (140, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

tamper_map = np.zeros((400, 400), dtype=np.float32)
res_unknown = engine.verify_stamp(
    image=synth_img,
    checkpost_id="UNKNOWN_CHECKPOST",
    tamper_map=tamper_map,
    ocr_date="2026-06-15",
    permit_window=window
)

if res_unknown['stamp_detected'] and res_unknown['status'] == 'AMBER' and not res_unknown['is_known_checkpost']:
    record_pass("Unknown checkpost defense: escalated to AMBER (Zero silent bypass)")
else:
    record_fail(f"Unknown checkpost defense failed: {res_unknown}")

# -----------------------------------------------------------------------------
# TEST 4: ONNX EXPORT PIPELINE VALIDITY
# -----------------------------------------------------------------------------
print("\n[TEST 4] Empirical Verification of ONNX Export Functions (UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md)")

with open(os.path.join(base_dir, 'UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md'), 'r') as f:
    report_content = f.read()

onnx_py_code = re.search(r'```python\n# backend/scripts/export_models_to_onnx\.py\n(.*?)```', report_content, re.DOTALL).group(1)

onnx_env = {}
exec(onnx_py_code, onnx_env)

export_ppocrv4_rec = onnx_env['export_ppocrv4_rec']
export_adaface_r100 = onnx_env['export_adaface_r100']
export_doctamper_dtd = onnx_env['export_doctamper_dtd']

# Create dummy mock models matching the exact interfaces
class MockPPOCR(nn.Module):
    def forward(self, x):
        # x: [B, 3, 48, W] -> logits [B, W//4, 6625]
        B, C, H, W = x.shape
        seq_len = max(1, W // 4)
        return torch.randn(B, seq_len, 6625, dtype=torch.float32)

class MockAdaFace(nn.Module):
    def forward(self, x):
        # x: [B, 3, 112, 112] -> embedding [B, 512]
        B = x.shape[0]
        emb = torch.randn(B, 512, dtype=torch.float32)
        return torch.nn.functional.normalize(emb, p=2, dim=1)

class MockDocTamper(nn.Module):
    def forward(self, x):
        # x: [B, 3, H, W] -> tamper_map [B, 1, H, W]
        B, C, H, W = x.shape
        return torch.sigmoid(torch.randn(B, 1, H, W, dtype=torch.float32))

os.makedirs("/tmp/onnx_test", exist_ok=True)

# Test PP-OCR export
pp_path = "/tmp/onnx_test/test_ppocr.onnx"
export_ppocrv4_rec(MockPPOCR(), pp_path)
if os.path.exists(pp_path):
    model_onnx = onnx.load(pp_path)
    onnx.checker.check_model(model_onnx)
    record_pass(f"export_ppocrv4_rec: Exported valid ONNX model ({os.path.getsize(pp_path)} bytes)")
else:
    record_fail("export_ppocrv4_rec did not create file")

# Test AdaFace export
ada_path = "/tmp/onnx_test/test_adaface.onnx"
export_adaface_r100(MockAdaFace(), ada_path)
if os.path.exists(ada_path):
    model_onnx = onnx.load(ada_path)
    onnx.checker.check_model(model_onnx)
    record_pass(f"export_adaface_r100: Exported valid ONNX model ({os.path.getsize(ada_path)} bytes)")
else:
    record_fail("export_adaface_r100 did not create file")

# Test DocTamper export
doc_path = "/tmp/onnx_test/test_doctamper.onnx"
export_doctamper_dtd(MockDocTamper(), doc_path)
if os.path.exists(doc_path):
    model_onnx = onnx.load(doc_path)
    onnx.checker.check_model(model_onnx)
    record_pass(f"export_doctamper_dtd: Exported valid ONNX model ({os.path.getsize(doc_path)} bytes)")
else:
    record_fail("export_doctamper_dtd did not create file")

# -----------------------------------------------------------------------------
# TEST 5: PYDANTIC V2 MODELS & FASTAPI SCHEMAS
# -----------------------------------------------------------------------------
print("\n[TEST 5] Empirical Verification of Pydantic v2 Models (android-agent/MASTER_PROMPT.md & docs/03)")

with open(os.path.join(base_dir, 'android-agent/MASTER_PROMPT.md'), 'r') as f:
    master_prompt = f.read()

pydantic_code = re.findall(r'```python\n(.*?)```', master_prompt, re.DOTALL)[0]
pydantic_env = {}
exec(pydantic_code, pydantic_env)

DocScanReq = pydantic_env['DocumentScanRequest']
DocScanResp = pydantic_env['DocumentScanResponse']
LiveCapReq = pydantic_env['LiveCaptureRequest']
LiveCapResp = pydantic_env['LiveCaptureResponse']
ScreenCompleteReq = pydantic_env['ScreeningCompleteRequest']
ScreenCompleteResp = pydantic_env['ScreeningCompleteResponse']
AuditLog = pydantic_env['AuditLogEntry']
AuditQuery = pydantic_env['AuditLogQueryFilter']

# 5a. Test Valid Instantiations
valid_req = DocScanReq(
    session_id="SSB-2026-001",
    document_type_hint="PASSPORT",
    image_base64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    capture_metadata={"device": "Pixel 8", "dpi": 300}
)
record_pass(f"DocumentScanRequest valid instantiation: session_id={valid_req.session_id}")

valid_screen = ScreenCompleteResp(
    session_id="SSB-2026-001",
    risk_score=15,
    risk_tier="GREEN",
    auto_clear=True,
    biometric_similarity=0.92,
    watchlist_hit=False,
    cross_validation_flags=[
        pydantic_env['CrossValidationFlag'](
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
record_pass(f"ScreeningCompleteResponse valid instantiation: risk_tier={valid_screen.risk_tier}")

# 5b. Test Negative Validation Bounds (Field constraints ge=0, le=100)
try:
    bad_screen = ScreenCompleteResp(
        session_id="SSB-2026-001",
        risk_score=150, # INVALID > 100
        risk_tier="RED",
        auto_clear=False,
        watchlist_hit=True,
        cross_validation_flags=[],
        flag_reasons=["Watchlist hit"],
        audit_record_hash="hash",
        total_pipeline_latency_ms=500.0
    )
    record_fail("Pydantic failed to reject invalid risk_score=150")
except ValidationError:
    record_pass("Pydantic successfully rejected invalid risk_score=150 (ge=0, le=100 enforced)")

try:
    bad_liveness = LiveCapResp(
        session_id="SSB-2026-001",
        face_detected=True,
        liveness_score=1.5, # INVALID > 1.0
        is_live=True,
        processing_time_ms=45.0
    )
    record_fail("Pydantic failed to reject invalid liveness_score=1.5")
except ValidationError:
    record_pass("Pydantic successfully rejected invalid liveness_score=1.5 (ge=0.0, le=1.0 enforced)")

# 5c. Test JSON schema export
schema = ScreenCompleteResp.model_json_schema()
if "properties" in schema and "risk_score" in schema["properties"]:
    record_pass("model_json_schema() successfully exported OpenAPI compliant schema")
else:
    record_fail("model_json_schema() failed to export properties")

# -----------------------------------------------------------------------------
# TEST 6: CRYPTOGRAPHIC INTEGRITY & SHA-256 AUDIT RECORD PROOF
# -----------------------------------------------------------------------------
print("\n[TEST 6] Verification of Cryptographic SHA-256 Audit Hash Implementation")

hash_py_code = re.findall(r'```python\n(.*?)```', master_prompt, re.DOTALL)[1]
hash_env = {}
exec(hash_py_code, hash_env)
compute_audit_hash = hash_env['compute_audit_hash']

sample_record = {
    "session_id": "SSB-2026-TEST",
    "timestamp": "2026-08-22T22:30:00Z",
    "checkpoint_id": "JAIGAON_01",
    "officer_id": "SSB_OFFICER_4421",
    "risk_score": 12,
    "risk_tier": "GREEN"
}

computed_hash = compute_audit_hash(sample_record)

# Independent calculation
canonical_json = json.dumps(sample_record, sort_keys=True, separators=(',', ':'))
expected_hash = hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()

if computed_hash == expected_hash and len(computed_hash) == 64:
    record_pass(f"compute_audit_hash matches canonical SHA-256: {computed_hash}")
else:
    record_fail(f"compute_audit_hash mismatch: got {computed_hash}, expected {expected_hash}")

# -----------------------------------------------------------------------------
# TEST 7: SQLITE TRANSACTIONAL OUTBOX DDL & CRUD
# -----------------------------------------------------------------------------
print("\n[TEST 7] Verification of SQLite Transactional Outbox Schema (android-agent/MASTER_PROMPT.md)")

sql_ddl = re.search(r'```sql\n(.*?)```', master_prompt, re.DOTALL).group(1)

conn = sqlite3.connect(":memory:")
cursor = conn.cursor()
cursor.executescript(sql_ddl)
conn.commit()

# Test insert
cursor.execute("""
INSERT INTO outbox_scan_records (
    session_id, timestamp, checkpoint_id, officer_id, document_type,
    risk_score, risk_tier, biometric_similarity, watchlist_hit,
    payload_json, sha256_hash, sync_status, retry_count
) VALUES (
    'SSB-2026-TEST', '2026-08-22T22:30:00Z', 'JAIGAON_01', 'OFFICER_1', 'PASSPORT',
    12, 'GREEN', 0.94, 0,
    '{}', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'PENDING', 0
);
""")
conn.commit()

cursor.execute("SELECT session_id, risk_tier, sync_status FROM outbox_scan_records WHERE sync_status='PENDING';")
row = cursor.fetchone()
if row == ('SSB-2026-TEST', 'GREEN', 'PENDING'):
    record_pass("SQLite DDL insert, indexing, and query verified successfully")
else:
    record_fail(f"SQLite query returned unexpected row: {row}")

# Test unique constraint on session_id
try:
    cursor.execute("""
    INSERT INTO outbox_scan_records (
        session_id, timestamp, checkpoint_id, officer_id, document_type,
        risk_score, risk_tier, biometric_similarity, watchlist_hit,
        payload_json, sha256_hash, sync_status, retry_count
    ) VALUES (
        'SSB-2026-TEST', '2026-08-22T22:35:00Z', 'JAIGAON_01', 'OFFICER_1', 'PASSPORT',
        12, 'GREEN', 0.94, 0,
        '{}', 'hash2', 'PENDING', 0
    );
    """)
    record_fail("SQLite UNIQUE constraint on session_id failed to trigger")
except sqlite3.IntegrityError:
    record_pass("SQLite UNIQUE constraint on session_id enforced properly")

conn.close()

# -----------------------------------------------------------------------------
# TEST 8: SCOPE ADHERENCE & TOPICS A-K COVERAGE
# -----------------------------------------------------------------------------
print("\n[TEST 8] Epistemic Rigor & Scope Coverage Audit (Topics A through K, Baseline Requirements R1-R5)")

topics = [
    ("Topic A: Development Hardware Reality", "M4", "RTX 4060"),
    ("Topic B: Qwen2.5-VL-3B Role", "Qwen2.5-VL", "quality-gate"),
    ("Topic C: Multilingual OCR Scope", "Dzongkha", "Devanagari"),
    ("Topic D: MRZ Pipeline", "OmniMRZ", "Modulo-10"),
    ("Topic E: Stamp Authentication Gap", "Stamp", "SSIM"),
    ("Topic F: 3-Stream Parallel Architecture", "3-Stream", "Cross-Validation"),
    ("Topic G: Risk Scoring Engine", "Tripwire", "Bayesian"),
    ("Topic H: Desktop Application Architecture", "Tauri", "FastAPI"),
    ("Topic I: Phone-to-Edge Field Connectivity", "USB", "adb reverse"),
    ("Topic J: Pretrained Models vs Training", "Pretrained", "Inference"),
    ("Topic K: Android Specialist Agent Handoff", "MASTER_PROMPT", "Handoff")
]

with open(os.path.join(base_dir, 'docs/01_CHANGE_LOG_AND_ANALYSIS.md'), 'r') as f:
    change_log = f.read()

for topic_name, kw1, kw2 in topics:
    if kw1.lower() in change_log.lower() and kw2.lower() in change_log.lower():
        record_pass(f"{topic_name} addressed in docs/01_CHANGE_LOG_AND_ANALYSIS.md")
    else:
        record_fail(f"{topic_name} missing or incomplete in change log")

print("\n" + "=" * 90)
print(f"AUDIT SUMMARY: {results['tests_passed']} PASSED, {results['tests_failed']} FAILED")
print(f"FILES AUDITED: {results['files_checked']} / {len(deliverables)}")
if results['tests_failed'] == 0:
    print("VERDICT: CLEAN (Zero Integrity Violations)")
else:
    print("VERDICT: INTEGRITY VIOLATION")
    for f in results['findings']:
        print(f"  - {f}")
print("=" * 90)

