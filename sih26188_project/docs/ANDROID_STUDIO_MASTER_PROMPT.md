# MASTER PROMPT: Android Field Screening Client (SIH26188)

**Target Role**: Senior Android Systems Engineer / Kotlin & Jetpack Compose Specialist  
**Project**: Smart India Hackathon 2026 (SIH26188) — AI-Based Fake Identity & Document Screening System  
**Organization**: Ministry of Home Affairs (MHA) / Sashastra Seema Bal (SSB)  
**Target Platform**: Android 12+ (API 31+), Rugged Handheld Tablets (arm64-v8a)  
**Date**: August 2026 · Version 3.5 (Updated with Beautiful-UI Design System)  
**Status**: AUTHORITATIVE HANDOFF PROMPT  

---

## 1. Project Context & Operational Reality

You are building the native **Rugged Android Field Inspection Client** for Sashastra Seema Bal (SSB) border officers deployed along the Indo-Nepal (1,751 km) and Indo-Bhutan (699 km) porous frontiers (e.g. Sonauli, Raxaul, Jaigaon, Panitanki).

### Operational Challenges & Requirements:
1. **Remote Mountainous Terrain**: High-altitude and dense Terai checkposts with zero cellular internet or cloud connectivity.
2. **Sub-Second Screening Target**: Pedestrian and cargo transit queues require end-to-end evaluation in under **1.0 second**.
3. **Multi-Modal Document Intake**: High-resolution optical scan (Passport, Aadhaar, Voter ID, Bhutan Citizenship Card, Border Transit Permits) paired with a live traveler selfie for 1:1 facial biometric matching and Fourier liveness anti-spoofing.
4. **Beautiful-UI Defense Aesthetics**: Strict alignment with the desktop application design system — dark neutral surfaces (`#0f172a`, `#1e293b`), high-contrast semantic risk badges (`GREEN / AUTO-CLEAR`, `AMBER / SECONDARY`, `RED / DETAIN`), and expandable multi-stream telemetry traces.

---

## 2. Field Connectivity & Networking Protocols

```
+---------------------------------------------------------------------------------------------------+
| RUGGED FIELD CONNECTIVITY MODES                                                                   |
+---------------------------------------------------------------------------------------------------+
| Mode 1: USB Reverse Tethering (Hackathon Demo & Primary Checkpoint Mode)                          |
| • Android device connected via ruggedized USB-C cable to the edge inspection appliance.          |
| • Host executes: `adb reverse tcp:8000 tcp:8000`                                                  |
| • Android OkHttp Client targets: `http://127.0.0.1:8000`                                          |
| • Latency: < 2 ms | 100% immune to RF congestion, radar interference, and electronic jamming.    |
+---------------------------------------------------------------------------------------------------+
| Mode 2: Air-Gapped Local Wi-Fi AP (Field Vehicle / Patrol Mode)                                   |
| • Edge laptop broadcasts a local, isolated Wi-Fi AP (`SSB_GATEWAY_SECURE`).                       |
| • Android tablet connects and communicates via: `http://192.168.2.1:8000`                         |
+---------------------------------------------------------------------------------------------------+
| Mode 3: Disconnected Transactional Outbox (Patrol Zero-Connectivity Mode)                          |
| • Store all screening transactions locally in SQLCipher-encrypted SQLite (Room / SQLDelight).    |
| • Status: `sync_status = 'PENDING'` with cryptographically hashed local audit records.           |
| • Auto-sync via Android `WorkManager` when USB or Wi-Fi link to edge gateway is restored.         |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. UI/UX Architecture: Beautiful-UI Jetpack Compose Specification

Your Android interface must mirror the desktop design tokens and component hierarchy:

### Design Tokens (Compose Theme)
```kotlin
object SsbColors {
    val Background = Color(0xFF020617) // slate-950
    val Surface = Color(0xFF0F172A)    // slate-900
    val SurfaceRaised = Color(0xFF1E293B) // slate-800
    val Border = Color(0xFF334155)     // slate-700
    val Accent = Color(0xFF3B82F6)     // blue-500
    
    // Semantic Status Tokens
    val GreenPass = Color(0xFF10B981)
    val GreenTint = Color(0x2610B981)
    val AmberWarn = Color(0xFFF59E0B)
    val AmberTint = Color(0x26F59E0B)
    val RedAlert = Color(0xFFEF4444)
    val RedTint = Color(0x26EF4444)
}
```

### Core View Hierarchy
1. **Header Bar**: Displays official Sashastra Seema Bal emblem, checkpost selector dropdown, UTC clock, and live hardware link status (USB Tethered / Hotspot / Offline Outbox).
2. **Preset Simulator Bar**: 4 quick-load scenario cards (`Clean Passport`, `Forged Aadhaar`, `Tampered Stamp`, `Presentation Spoof`) for instantaneous demo evaluation.
3. **CameraX Capture Dual-View**:
   - Primary: Real-time document edge detection (OpenCV / ML Kit) with automatic perspective crop.
   - Secondary: Live face capture with guidance overlay for 1:1 facial biometric matching.
4. **Expandable Multi-Stream Pipeline Trace** (`InspectionPipelineTrace`):
   - Stream 1: PP-OCRv4 Multilingual Extraction & ICAO 9303 Modulo-10 Checksum.
   - Stream 2: AdaFace 512D Cosine Matching & MiniFASNet Fourier Liveness.
   - Stream 3: DocTamper ResNet-50 & TruFor Forensic Splicing Localization.
   - Stream 4: 4-Stage SSB Rubber/Laser Stamp Template Correlation.
5. **Interactive Cross-Validation Matrix (`FilterTable`)**: Tabular list of all 8 cross-validation rules with interactive filter chips (`All`, `Passed`, `Violations`).
6. **Discrepancy Inspector (`DiffTable`)**: Character-by-character discrepancy viewer for tampered fields (e.g. Visual DOB `1994` vs MRZ DOB `1984`).
7. **Human-In-The-Loop Officer Decision Card (`ApprovalCard`)**: Touch-optimized action buttons (`Clear Traveler`, `Secondary Hold`, `Issue Interdiction Mandate`) requiring digital officer signature/badge ID.

---

## 4. Complete FastAPI OpenAPI v1 Endpoint Contracts

### 1. Health & Model Status
`GET /api/v1/health`
```json
{
  "status": "healthy",
  "engine_mode": "m4_mps",
  "models_loaded": {
    "pp_ocrv4": true,
    "adaface": true,
    "minifasnet": true,
    "trufor": true,
    "doctamper": true,
    "stamp_verifier": true
  },
  "uptime_seconds": 3420.5
}
```

### 2. Multi-Modal Document & Biometric Inspection
`POST /api/v1/inspect`  
*(Accepts `multipart/form-data` with `document_image`, optional `live_photo`, `checkpoint_id`, and `transit_date`)*

#### Canonical Response JSON:
```json
{
  "session_id": "SSB-INSP-849201",
  "status": "completed",
  "assessment": {
    "risk_score": 94.5,
    "risk_level": "RED",
    "auto_clear": false,
    "tripwire_triggered": true,
    "tripwire_codes": [
      "TRIPWIRE_CRYPT_SIG_INVALID: UIDAI RSA-2048 Digital Signature Tampered"
    ],
    "reasons": [
      "CRITICAL: Visual OCR Date of Birth (14/08/1994) contradicts MRZ encoded birth year (1984).",
      "DocTamper highlighted localized pixel splicing in the photograph substrate (Tamper Score: 0.94).",
      "MiniFASNet flagged 2D digital screen replay presentation attack (Liveness: 0.04)."
    ],
    "cross_validation_violations": [
      "CV-01: MRZ DOB vs Visual OCR DOB Mismatch"
    ],
    "model_versions": {
      "pp_ocr": "PP-OCRv4-Multilingual",
      "mrz_engine": "ICAO-9303-v2.1",
      "face_embedder": "AdaFace-ResNet100-ONNX",
      "tamper_detector": "DocTamper-ResNet50-DTD"
    },
    "processing_time_ms": 482.1,
    "audit_hash": "SHA256:a4f135b91b97b0a48b52f9b8c281313c054045f096238b16f39d89241512db47",
    "heatmap_base64": "<base64_encoded_png_overlay>"
  },
  "details": {
    "session_id": "SSB-INSP-849201",
    "document_type": "passport",
    "ocr": {
      "status": "success",
      "script_detected": "latin",
      "fields": {
        "full_name": "ARJUN SHARMA",
        "document_number": "Z9018241",
        "dob": "14/08/1994",
        "issuing_country": "IND"
      },
      "field_confidences": { "full_name": 0.98, "dob": 0.96 },
      "raw_boxes": [],
      "mean_confidence": 0.97,
      "requires_tier2_vlm": false,
      "raw_text": "PASSPORT REPUBLIC OF INDIA...",
      "processing_time_ms": 42.0
    },
    "mrz": {
      "mrz_detected": true,
      "mrz_type": "TD3",
      "valid": false,
      "raw_lines": [
        "P<INDSHARMA<<ARJUN<<<<<<<<<<<<<<<<<<<<<<<<<<",
        "Z9018241<1IND8408141M3001011<<<<<<<<<<<<<<4"
      ],
      "document_type": "P",
      "country_code": "IND",
      "surname": "SHARMA",
      "given_names": "ARJUN",
      "document_number": "Z9018241",
      "doc_number_checksum_valid": true,
      "dob_checksum_valid": true,
      "expiry_checksum_valid": true,
      "composite_checksum_valid": true,
      "checksum_failures": [],
      "parsed_fields": {
        "surname": "SHARMA",
        "given_names": "ARJUN",
        "dob": "840814"
      },
      "processing_time_ms": 12.5
    },
    "biometrics": {
      "similarity": 0.31,
      "match": false,
      "threshold": 0.35,
      "embedding_model_used": "AdaFace-ResNet100-ONNX",
      "apparent_age_id": 40,
      "apparent_age_live": 30,
      "age_drift_years": 10,
      "watchlist_hit": false,
      "watchlist_distance": null,
      "processing_time_ms": 110.2
    },
    "liveness": {
      "is_live": false,
      "confidence": 0.04,
      "attack_type": "2D_SCREEN_REPLAY",
      "processing_time_ms": 38.4
    },
    "forensics": {
      "tamper_score": 0.94,
      "is_tampered": true,
      "photo_region_tampered": true,
      "reasons": [
        "Significant high-frequency ELA discrepancy detected in portrait zone.",
        "DocTamper identified text field scraping."
      ],
      "detected_anomalies": ["PHOTO_SUBSTITUTION", "TEXT_SCRAPING"],
      "tampered_regions": [
        {
          "bbox": [180, 120, 360, 150],
          "peak_tamper_probability": 0.94,
          "tamper_type": "TEXT_SCRAPING",
          "affected_field": "dob"
        }
      ],
      "doctamper_score": 0.94,
      "trufor_score": 0.88,
      "exif_suspicious": false,
      "dqt_quantization_altered": true,
      "processing_time_ms": 140.0
    },
    "stamp": {
      "stamp_found": true,
      "stamp_score": 0.42,
      "verdict": "FORGED",
      "checkpost_id": "SSB_JAIGAON_01",
      "location_name": "Jaigaon / Phuentsholing",
      "ssim_score": 0.42,
      "orb_match_count": 8,
      "tamper_energy": 0.82,
      "context_consistent": false,
      "stamp_bbox": [320, 200, 460, 320],
      "reasons": [
        "Stamp contour failed SSB registry template correlation (SSIM 0.42 < 0.75)."
      ],
      "processing_time_ms": 24.0
    },
    "cross_validation": {
      "cross_validation_passed": false,
      "violation_count": 1,
      "critical_violations": [
        {
          "rule_id": "CV-01",
          "rule_name": "MRZ DOB vs Visual OCR DOB",
          "severity": "CRITICAL",
          "field_name": "dob",
          "expected_value": "1984-08-14",
          "actual_value": "1994-08-14",
          "telemetry_code": "TAMPER_DOB_MISMATCH",
          "details": "Visual DOB 1994 does not match MRZ encoded birth year 1984."
        }
      ],
      "warnings": [],
      "violations": [
        {
          "rule_id": "CV-01",
          "rule_name": "MRZ DOB vs Visual OCR DOB",
          "severity": "CRITICAL",
          "field_name": "dob",
          "expected_value": "1984-08-14",
          "actual_value": "1994-08-14",
          "telemetry_code": "TAMPER_DOB_MISMATCH",
          "details": "Visual DOB 1994 does not match MRZ encoded birth year 1984."
        }
      ],
      "flags": [
        { "rule_id": "CV-01", "rule_description": "MRZ DOB vs Visual OCR DOB", "passed": false, "telemetry_message": "DOB mismatch: Visual 1994 vs MRZ 1984" },
        { "rule_id": "CV-02", "rule_description": "MRZ Doc No vs Visual Doc No", "passed": true, "telemetry_message": "Doc number matched exactly" },
        { "rule_id": "CV-03", "rule_description": "MRZ Name vs Visual Full Name", "passed": true, "telemetry_message": "Name matched exactly" },
        { "rule_id": "CV-04", "rule_description": "Biometric Apparent Age vs DOB", "passed": true, "telemetry_message": "Age drift within bounds" },
        { "rule_id": "CV-05", "rule_description": "Photo Splicing Density", "passed": false, "telemetry_message": "Portrait replacement detected" },
        { "rule_id": "CV-06", "rule_description": "Text Tamper Probability", "passed": false, "telemetry_message": "Text scraping localized" },
        { "rule_id": "CV-07", "rule_description": "Stamp Context Consistency", "passed": false, "telemetry_message": "SSIM correlation failure" },
        { "rule_id": "CV-08", "rule_description": "Cryptographic Signature", "passed": true, "telemetry_message": "Valid RSA-2048 PKI" }
      ],
      "rules_checked": 8,
      "processing_time_ms": 14.0
    },
    "risk": {
      "risk_score": 94.5,
      "risk_level": "RED",
      "auto_clear": false,
      "tripwire_triggered": true,
      "tripwire_codes": ["TRIPWIRE_CRYPT_SIG_INVALID"],
      "reasons": ["Discrepancies found across OCR, MRZ, and Forensics."],
      "cross_validation_violations": ["CV-01"],
      "model_versions": {},
      "processing_time_ms": 482.1,
      "audit_hash": "SHA256:a4f135b91b97b0a48b52f9b8c281313c054045f096238b16f39d89241512db47"
    },
    "processing_time_ms": 482.1
  }
}
```

---

## 5. Offline Transactional Outbox & Data Security

### SQLCipher Local Outbox Database (Kotlin Room / SQLite)
```sql
CREATE TABLE IF NOT EXISTS outbox_screening_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    checkpoint_id TEXT NOT NULL,
    officer_id TEXT NOT NULL,
    transit_date TEXT NOT NULL,
    document_image_blob BLOB NOT NULL,
    live_face_blob BLOB,
    inspection_response_json TEXT,
    risk_score REAL,
    risk_level TEXT,
    audit_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SYNCED', 'FAILED'
    retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_outbox_sync ON outbox_screening_records(sync_status);
CREATE INDEX IF NOT EXISTS idx_outbox_session ON outbox_screening_records(session_id);
```

### Biometric Data Protection (DPDP Act 2023 & Aadhaar Act):
- **Zero Raw Biometric Storage**: After session completion and audit hash generation, raw biometric embeddings must be purged from memory.
- **AES-256 GCM Storage**: Cached document images must be encrypted using Android KeyStore master keys.

---

## 6. Strict Non-Interference Guardrails for Android Developer Agent

1. **Do NOT alter backend API routes, endpoints, or response schemas**.
2. **Do NOT add external cloud dependencies (Firebase, AWS, Google Cloud Vision)** — all AI processing must run on the local edge gateway.
3. **Always check network reachability** (`adb reverse` on `127.0.0.1:8000` or Hotspot on `192.168.2.1:8000`) before falling back to offline outbox mode.
4. **Preserve exact risk evaluation thresholds**:
   - `GREEN`: Risk Score $0.0 \le S < 25.0$ (Fast-Path Transit Pass)
   - `AMBER`: Risk Score $25.0 \le S < 70.0$ (Secondary Inspection Hold)
   - `RED`: Risk Score $70.0 \le S \le 100.0$ or Hard Tripwire (Detention Mandate)

---
*End of Android Studio Master Prompt*
