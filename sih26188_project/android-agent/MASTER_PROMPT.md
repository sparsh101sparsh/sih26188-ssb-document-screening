# MASTER PROMPT: Field Mobile Screening Client Agent (SIH26188)

**Target Role**: Mobile Systems Engineer / Android & Flutter Developer  
**Project**: Smart India Hackathon 2026 (SIH26188) — AI-Based Fake Identity & Document Screening System  
**Organization**: Ministry of Home Affairs (MHA) / Sashastra Seema Bal (SSB)  
**Date**: August 2026 · Version 3.0  
**Status**: AUTHORITATIVE HANDOFF PROMPT  

---

## 1. Project Context & Mission

You are building the **Rugged Android Field Inspection Client** for Sashastra Seema Bal (SSB) border guards operating along the Indo-Nepal (1,751 km) and Indo-Bhutan (699 km) porous frontiers.

### Operational Reality:
- Border guards operate in remote, mountainous Terai checkposts where cellular internet is non-existent.
- Guards hold rugged Android tablets (Android 12+, API 31+) to scan pedestrian identity cards (Aadhaar, Passports, Voter IDs, Bhutan CIDs) and capture live traveler selfies.
- The Android app captures the images, rectifies document perspective, sends payload to the local Air-Gapped FastAPI Edge Appliance, and renders the screening verdict within 1 second.

---

## 2. Field Connectivity Protocols

```
+---------------------------------------------------------------------------------------------------+
| FIELD CONNECTIVITY PROTOCOLS                                                                      |
+---------------------------------------------------------------------------------------------------+
| Mode 1: USB Reverse Tethering (Hackathon Demo & Primary Field Mode)                               |
| • Android device connected via USB-C cable to host laptop.                                        |
| • Run command on host: `adb reverse tcp:8000 tcp:8000`                                            |
| • Android client targets: `http://127.0.0.1:8000`                                                 |
| • Latency: < 2 ms | Zero RF Wi-Fi packet collisions.                                              |
+---------------------------------------------------------------------------------------------------+
| Mode 2: Air-Gapped Local Wi-Fi Hotspot (Secondary Failover)                                       |
| • Edge laptop broadcasts local Wi-Fi Hotspot (`SSB_GATEWAY`).                                     |
| • Android client connects and targets: `http://192.168.2.1:8000`                                  |
+---------------------------------------------------------------------------------------------------+
| Mode 3: Disconnected Offline Transactional Outbox (Zero Network)                                  |
| • Store all scans in local encrypted SQLite (Drift) table with `sync_status = 'PENDING'`.         |
| • Auto-sync via Android WorkManager when link to edge appliance is restored.                      |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Strict FastAPI OpenAPI v1 Contracts & Pydantic v2 Models (Do NOT Alter)

### 1. `GET /api/v1/health`
- **Request**: None
- **Response**:
```json
{
  "status": "healthy",
  "engine_mode": "darwin_arm64_coreml",
  "models_loaded": {
    "pp_ocrv4_det": true,
    "pp_ocrv4_rec": true,
    "omnimrz": true,
    "scrfd_10gf": true,
    "adaface_r100": true,
    "minifasnet_v2": true,
    "doctamper_dtd": true,
    "trufor": true,
    "stamp_verifier": true
  },
  "uptime_seconds": 3420.5
}
```

### 2. `POST /api/v1/scan/document`
- **Request**:
```json
{
  "session_id": "c7a3d8f1-4b2e-4e6a-9f12-8d9e2a1b3c4d",
  "document_type_hint": "auto",
  "image_base64": "<base64_encoded_jpeg_string>",
  "capture_metadata": {
    "device_id": "SSB_TAB_04",
    "lux": 340
  }
}
```
- **Response**:
```json
{
  "session_id": "c7a3d8f1-4b2e-4e6a-9f12-8d9e2a1b3c4d",
  "ocr_results": [
    {
      "field_name": "full_name",
      "extracted_text": "ARJUN SHARMA",
      "confidence": 0.982,
      "bounding_box": [120, 340, 480, 385]
    },
    {
      "field_name": "dob",
      "extracted_text": "14/08/1994",
      "confidence": 0.965,
      "bounding_box": [120, 410, 320, 450]
    }
  ],
  "mrz_results": {
    "mrz_detected": true,
    "doc_type": "P",
    "country_code": "IND",
    "document_number": "M1234567",
    "doc_number_checksum_valid": true,
    "dob": "940814",
    "dob_checksum_valid": true,
    "expiry": "290814",
    "expiry_checksum_valid": true,
    "composite_checksum_valid": true
  },
  "forensic_results": {
    "tamper_probability": 0.12,
    "photo_region_tampered": false,
    "tamper_heatmap_base64": "<base64_encoded_png_overlay>",
    "detected_anomalies": []
  },
  "processing_time_ms": 480.2
}
```

### 3. `POST /api/v1/scan/face`
- **Request**:
```json
{
  "session_id": "c7a3d8f1-4b2e-4e6a-9f12-8d9e2a1b3c4d",
  "live_image_base64": "<base64_encoded_jpeg_selfie>"
}
```
- **Response**:
```json
{
  "session_id": "c7a3d8f1-4b2e-4e6a-9f12-8d9e2a1b3c4d",
  "face_detected": true,
  "liveness_score": 0.975,
  "is_live": true,
  "apparent_age_estimate": 31,
  "processing_time_ms": 78.4
}
```

### 4. `POST /api/v1/scan/complete`
- **Request**:
```json
{
  "session_id": "c7a3d8f1-4b2e-4e6a-9f12-8d9e2a1b3c4d",
  "checkpoint_id": "SSB_JAIGAON_01",
  "officer_id": "GUARD_9912"
}
```
- **Response**:
```json
{
  "session_id": "c7a3d8f1-4b2e-4e6a-9f12-8d9e2a1b3c4d",
  "risk_score": 14,
  "risk_tier": "GREEN",
  "auto_clear": true,
  "biometric_similarity": 0.884,
  "watchlist_hit": false,
  "cross_validation_flags": [
    {
      "rule_id": "CV-01",
      "rule_description": "MRZ DOB vs VIZ OCR DOB",
      "passed": true,
      "telemetry_message": "DOB matched exactly: 1994-08-14"
    }
  ],
  "flag_reasons": [],
  "audit_record_hash": "a4f135b91b97b0a48b52f9b8c281313c054045f096238b16f39d89241512db47",
  "total_pipeline_latency_ms": 558.6
}
```

### 5. `GET /api/v1/audit/logs`
- **Request Parameters**:
  - `checkpoint_id` (optional query string): Filter by checkpost ID (e.g. `SSB_JAIGAON_01`)
  - `officer_id` (optional query string): Filter by officer ID (e.g. `GUARD_9912`)
  - `risk_tier` (optional query string): `GREEN`, `AMBER`, or `RED`
  - `start_time` (optional ISO 8601 string): e.g. `2026-08-23T00:00:00Z`
  - `end_time` (optional ISO 8601 string): e.g. `2026-08-23T23:59:59Z`
  - `limit` (optional int, default 50, max 500)
  - `offset` (optional int, default 0)
- **Response**:
```json
{
  "total_count": 142,
  "entries": [
    {
      "log_id": "8f1a4e2b-7c9d-4e12-8a34-5b6c7d8e9f01",
      "session_id": "c7a3d8f1-4b2e-4e6a-9f12-8d9e2a1b3c4d",
      "timestamp": "2026-08-23T02:00:15Z",
      "checkpoint_id": "SSB_JAIGAON_01",
      "officer_id": "GUARD_9912",
      "document_type": "passport",
      "risk_score": 14,
      "risk_tier": "GREEN",
      "watchlist_hit": false,
      "sha256_hash": "a4f135b91b97b0a48b52f9b8c281313c054045f096238b16f39d89241512db47",
      "sync_status": "SYNCED"
    }
  ],
  "offset": 0,
  "limit": 50
}
```

---

## 4. Backend Pydantic v2 Canonical Schemas

```python
# backend/app/schemas/screening.py
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class DocumentScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    session_id: str
    document_type_hint: str = "auto"
    image_base64: str
    capture_metadata: Optional[dict[str, Any]] = None

    @field_validator("image_base64")
    @classmethod
    def validate_image_base64(cls, v: str) -> str:
        if len(v) < 50:
            raise ValueError("image_base64 string too short")
        return v


class OCRFieldResultMobile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    field_name: str
    extracted_text: str
    confidence: float = Field(ge=0.0, le=1.0)
    bounding_box: list[int]


class MRZResultMobile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mrz_detected: bool
    doc_type: Optional[str] = None
    country_code: Optional[str] = None
    document_number: Optional[str] = None
    doc_number_checksum_valid: Optional[bool] = None
    dob: Optional[str] = None
    dob_checksum_valid: Optional[bool] = None
    expiry: Optional[str] = None
    expiry_checksum_valid: Optional[bool] = None
    composite_checksum_valid: Optional[bool] = None


class ForensicResultMobile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tamper_probability: float = Field(ge=0.0, le=1.0)
    photo_region_tampered: bool
    tamper_heatmap_base64: Optional[str] = None
    detected_anomalies: list[str] = Field(default_factory=list)


class DocumentScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    ocr_results: list[OCRFieldResultMobile]
    mrz_results: MRZResultMobile
    forensic_results: ForensicResultMobile
    processing_time_ms: float


class FaceScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    session_id: str
    live_image_base64: str


class FaceScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    face_detected: bool
    liveness_score: float = Field(ge=0.0, le=1.0)
    is_live: bool
    apparent_age_estimate: Optional[int] = None
    processing_time_ms: float


class CrossValidationFlagMobile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_id: str
    rule_description: str
    passed: bool
    telemetry_message: str


class ScreeningCompleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    checkpoint_id: str
    officer_id: str


class ScreeningCompleteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: str
    risk_score: int = Field(ge=0, le=100)
    risk_tier: str
    auto_clear: bool
    biometric_similarity: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    watchlist_hit: bool
    cross_validation_flags: list[CrossValidationFlagMobile]
    flag_reasons: list[str]
    audit_record_hash: str
    total_pipeline_latency_ms: float


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: str
    session_id: str
    timestamp: datetime
    checkpoint_id: str
    officer_id: str
    document_type: str
    risk_score: int = Field(ge=0, le=100)
    risk_tier: str
    watchlist_hit: bool
    sha256_hash: str
    sync_status: str


class AuditLogQueryFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    checkpoint_id: Optional[str] = None
    officer_id: Optional[str] = None
    risk_tier: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class AuditLogsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_count: int
    entries: list[AuditLogEntry]
    offset: int
    limit: int
```

---

## 5. Genuine SHA-256 Cryptographic Audit Hash Generation

Every screening transaction generates an immutable SHA-256 hash chaining session metadata, biometric verdict, risk score, and officer identity for non-repudiation in court evidence packages:

```python
# Python Backend SHA-256 Computation
import hashlib
import json


def compute_audit_hash(
    session_id: str,
    checkpoint_id: str,
    officer_id: str,
    risk_score: int,
    risk_tier: str,
    watchlist_hit: bool,
    timestamp_iso: str,
) -> str:
    """Compute deterministic SHA-256 hash over canonical transaction parameters."""
    canonical_payload = {
        "session_id": session_id,
        "checkpoint_id": checkpoint_id,
        "officer_id": officer_id,
        "risk_score": risk_score,
        "risk_tier": risk_tier,
        "watchlist_hit": watchlist_hit,
        "timestamp": timestamp_iso,
    }
    canonical_bytes = json.dumps(canonical_payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(canonical_bytes).hexdigest()
```

In the Android client (Kotlin / Dart), calculate the SHA-256 checksum over locally captured payloads prior to inserting into the transactional outbox:

```kotlin
// Android Kotlin SHA-256 Helper
import java.security.MessageDigest

fun calculateSHA256(input: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val hashBytes = digest.digest(input)
    return hashBytes.joinToString("") { "%02x".format(it) }
}
```

---

## 6. Offline Transactional Outbox Schema (SQLite / Room / Drift)

```sql
CREATE TABLE IF NOT EXISTS outbox_scan_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    checkpoint_id TEXT NOT NULL,
    officer_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    document_image_blob BLOB NOT NULL,
    live_face_blob BLOB,
    risk_score INTEGER,
    risk_tier TEXT,
    created_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    idempotency_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_outbox_sync_status ON outbox_scan_records(sync_status);
CREATE INDEX IF NOT EXISTS idx_outbox_session_id ON outbox_scan_records(session_id);
```

---

## 7. Strict Non-Interference Boundary Rules

1. **Do NOT modify backend API routes or JSON response formats**.
2. **Do NOT retrain or alter core ML models**.
3. **Do NOT introduce external commercial cloud dependencies (Firebase, AWS, Google Cloud Vision)**.
4. **Always inspect existing workspace files before writing new code**.

---
*End of Android Specialist Agent Master Prompt*
