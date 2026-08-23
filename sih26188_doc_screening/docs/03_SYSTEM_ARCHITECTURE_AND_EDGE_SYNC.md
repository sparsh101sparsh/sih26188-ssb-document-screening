# Module 03: System Architecture, Edge Appliance Deployment & Offline Mobile Sync
## SIH26188: Sashastra Seema Bal (SSB) AI-Based Fake Identity & Document Screening System

---

**Document Reference**: SIH26188-DOC-MOD03  
**Classification**: Technical Infrastructure Specification  
**Target Hardware**: Air-Gapped Mini-Servers (Docker Compose) & Android Tablets (Flutter)  
**Author**: SIH26188 Systems Architecture & Edge Engineering Team  
**Date**: August 2026 | Version: 2.0  

---

## 1. Edge-First Architectural Principles

Under Ministry of Home Affairs (MHA) cybersecurity directives and the **Digital Personal Data Protection (DPDP) Act, 2023**, SSB border stations operate under four inviolable principles:
1. **100% Air-Gapped Execution**: The screening system operates without reliance on external public clouds.
2. **Ephemeral Document Processing**: Raw identity document images are processed entirely in volatile memory (RAM scratchpads) and wiped after risk score computation, preserving only cryptographically hashed audit metadata.
3. **Sub-3.5s End-to-End Latency**: The complete screening pipeline (OCR, Checksums, Cryptography, 1:1 Biometrics, and Forensics) must return a verdict in $< 3.5$ seconds.
4. **Resilient Offline Mobile Sync**: Field patrol units operating in zero-connectivity terrain must store encrypted scan records locally and synchronize automatically upon returning to base.

---

## 2. Full System Topology & Multi-Tier Deployment

```
+===============================================================================================================+
|                                  SIH26188 MULTI-TIER SYSTEM TOPOLOGY                                          |
+===============================================================================================================+

  +-----------------------------------------------------------------------------------------------------------+
  | TIER 1: FIELD MOBILE CLIENT (Flutter v3.24+ / Dart FFI)                                                   |
  | - Samsung Galaxy Tab Active4 Pro / Rugged Defense Android Tablets                                         |
  | - Google ML Kit Document Scanner API (Automatic Edge Snapping & 300 DPI Rectification)                   |
  | - Drift ORM + SQLCipher 4 (256-bit AES-CBC Database Encryption with HMAC-SHA512)                          |
  | - Android Keystore / Hardware StrongBox Master Key Custody                                                |
  | - WorkManager Outbox Background Sync Service (Idempotent UUIDv4 push)                                     |
  +-----------------------------------------------------┬-----------------------------------------------------+
                                                        │ (Local Encrypted Wi-Fi 6 / WPA3 LAN)
                                                        v
  +-----------------------------------------------------------------------------------------------------------+
  | TIER 2: SSB BORDER POST EDGE APPLIANCE (Docker Compose Stack)                                             |
  | Target Hardware: Intel Core i7-13700H / 32 GB DDR5 RAM / NVIDIA GeForce RTX 4060 (8 GB GDDR6)              |
  |                                                                                                           |
  |  +-----------------------------------------------------------------------------------------------------+  |
  |  | Container 1: Nginx Gateway (SSL Termination, Rate Limiting, Static Asset Serving)                   |  |
  |  +---------------------------------------------------┬-------------------------------------------------+  |
  |                                                      │                                                    |
  |                                                      v                                                    |
  |  +-----------------------------------------------------------------------------------------------------+  |
  |  | Container 2: FastAPI Core Orchestrator (Python 3.11 / Uvicorn Async Server)                          |  |
  |  | - Parallel 3-Stream Inference Dispatcher (ONNX Runtime CUDA Provider)                               |  |
  |  | - Stream A: PP-OCRv4 + OmniMRZ ICAO 9303 + zxing-cpp RSA-2048 PKI Verifier                          |  |
  |  | - Stream B: SCRFD-10GF Face Det + AdaFace-ResNet100 + MiniFASNet Dual FAS                             |  |
  |  | - Stream C: DocTamper DTD (DCT Text) + TruFor (RGB/Noiseprint++) + DocForge tau_adapt=0.18          |  |
  |  | - Multi-Factor Bayesian Risk Score Engine (0-100 Score with Explainable Telemetry)                 |  |
  |  +---------------------------------------------------┬-------------------------------------------------+  |
  |                                                      │                                                    |
  |                        ┌─────────────────────────────┴─────────────────────────────┐                      |
  |                        v                                                           v                      |
  |  +-----------------------------------------------+       +---------------------------------------------+  |
  |  | Container 3: PostgreSQL 16 + pgvector         |       | Container 4: Redis 7 In-Memory Cache        |  |
  |  | - Immutable Cryptographic Audit Log Table     |       | - Real-time WebSocket Broadcast Channel     |  |
  |  | - Local Watchlist Index (HNSW 512-D Vectors)  |       | - Celery Batch Inference Task Queue         |  |
  |  +-----------------------------------------------+       +---------------------------------------------+  |
  |                                                                                                           |
  |  +-----------------------------------------------------------------------------------------------------+  |
  |  | Container 5: Officer Web Dashboard (Next.js 15 App Router / Tailwind / Shadcn UI)                    |  |
  |  +-----------------------------------------------------------------------------------------------------+  |
  +-----------------------------------------------------------------------------------------------------------+
                                                        │
                                                        v (Periodic Satellite / Fibre WAN Sync)
  +-----------------------------------------------------------------------------------------------------------+
  | TIER 3: CENTRAL MHA NATIONAL REPOSITORY (CCTNS / IVFRT INTEL RELAY)                                       |
  +-----------------------------------------------------------------------------------------------------------+
```

---

## 3. Offline Mobile Outbox Pattern & Conflict Resolution

```
                                  OFFLINE SYNC WORKFLOW
                                  
  [Officer Scans Doc] 
          │
          ▼
  [Save to Drift DB] ────────> [Insert into Outbox Table] (Status: PENDING, Retry: 0)
          │                                  │
          ▼                                  ▼
  [Instant UI Render]             [WorkManager Background Task]
  (Risk Score Calculated)                    │
                                     {Network Available?}
                                     /                                                    [YES]                 [NO]
                                   /                                             [POST /api/v1/sync/push]        [Exponential Backoff]
                      (Idempotency-Key: UUIDv4)       (Wait 2^n * 5s, Max 1hr)
                                   │
                      +────────────┴────────────+
                      │                         │
               [HTTP 200 OK]             [HTTP 412 Conflict]
                      │                         │
             [Mark SYNCED &            [Server Version Wins /
              Purge from Outbox]        Field-Level Merge]
```

### 3.1 Outbox Table Schema (Drift SQLite):
```sql
CREATE TABLE outbox_mutations (
    id TEXT PRIMARY KEY NOT NULL,          -- UUIDv4
    entity_type TEXT NOT NULL,             -- 'SCAN_RECORD' | 'OFFICER_OVERRIDE'
    payload TEXT NOT NULL,                 -- Encrypted JSON blob
    created_at INTEGER NOT NULL,           -- Unix epoch ms
    retry_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' -- 'PENDING' | 'IN_FLIGHT' | 'SYNCED'
);
```

### 3.2 Conflict Resolution Strategy:
1. **Inspection Logs**: **Append-Only Immutable Event Sourcing** (No conflict possible; every scan event is unique).
2. **Watchlist Updates (Edge -> Mobile)**: **Server-Authoritative Monotonic Delta Sync** (`server_updated_at > last_sync_time`).
3. **Officer Manual Overrides**: **Last-Write-Wins (LWW)** based on edge NTP-synchronized timestamps.

---

## 4. Production Docker Compose Stack

```yaml
version: '3.8'

services:
  gateway:
    image: nginx:alpine
    container_name: ssb_gateway
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./deployment/certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - web_dashboard

  web_dashboard:
    image: ssb-web-dashboard:2.0
    container_name: ssb_web_dashboard
    restart: always
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=https://gateway/api/v1
      - NEXT_PUBLIC_WS_URL=wss://gateway/ws/v1
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G

  backend:
    image: ssb-core-backend:2.0
    container_name: ssb_backend
    restart: always
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql+asyncpg://ssb_admin:SSB_Border_Secure_2026@postgres:5432/ssb_screening_db
      - REDIS_URL=redis://redis:6379/0
      - ONNX_EXECUTION_PROVIDER=CUDAExecutionProvider
      - JWT_SECRET_KEY=SSB_MHA_AIR_GAPPED_SECRET_KEY_2026
    volumes:
      - ./models:/app/models:ro
      - ./certs:/app/certs:ro
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    depends_on:
      - postgres
      - redis

  postgres:
    image: pgvector/pgvector:pg16
    container_name: ssb_postgres
    restart: always
    environment:
      - POSTGRES_USER=ssb_admin
      - POSTGRES_PASSWORD=SSB_Border_Secure_2026
      - POSTGRES_DB=ssb_screening_db
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./deployment/init_schema.sql:/docker-entrypoint-initdb.d/init.sql:ro
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G

  redis:
    image: redis:7-alpine
    container_name: ssb_redis
    restart: always
    command: redis-server --appendonly yes --requirepass SSB_Redis_Auth_2026
    volumes:
      - redisdata:/data
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

volumes:
  pgdata:
  redisdata:
```

---

## 5. PostgreSQL Schema with pgvector Watchlist Indexing

```sql
-- SIH26188: Database Initialization & Vector Search Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Watchlist of Persons of Interest (POI)
CREATE TABLE watchlist_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    aliases TEXT[],
    date_of_birth DATE,
    nationality VARCHAR(3),
    threat_category TEXT NOT NULL, -- 'RED_CORNER' | 'LOOKOUT_CIRCULAR' | 'IMMIGRATION_VIOLATION'
    face_embedding vector(512) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fast HNSW Vector Index on Cosine Distance
CREATE INDEX watchlist_face_hnsw_idx ON watchlist_records 
USING hnsw (face_embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- 2. Scanned Inspection Records & Tamper-Evident Audit Trail
CREATE TABLE inspection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL,
    officer_id TEXT NOT NULL,
    checkpoint_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_number_masked TEXT NOT NULL,
    ocr_demographics JSONB NOT NULL,
    mrz_validations JSONB,
    qr_cryptography_status TEXT NOT NULL,
    tamper_forensic_score FLOAT NOT NULL,
    biometric_similarity_score FLOAT,
    liveness_score FLOAT,
    overall_risk_score INTEGER NOT NULL, -- 0 to 100
    risk_category TEXT NOT NULL,        -- 'GREEN' | 'AMBER' | 'RED'
    audit_sha256_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_created ON inspection_logs(created_at DESC);
CREATE INDEX idx_inspection_checkpoint ON inspection_logs(checkpoint_id);
```
