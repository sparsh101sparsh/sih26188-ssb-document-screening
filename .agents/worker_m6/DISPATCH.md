## 2026-08-23T02:36:10+05:30
You are Worker M6: Frontend UI Engineer for SIH26188 AI-Based Fake Identity & Document Screening System.

Your working directory for metadata is:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_m6/

Authoritative References (Read these first):
- /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
- /Users/iamsparsh00321/teamwork_projects/sih26188_wave3/UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md (Sections 2.6, 6.4)
- /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/orchestrator_1/PROJECT.md

Output Monorepo Root:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE BOUNDARIES:
- frontend/

YOUR DELIVERABLES:
1. Initialize and build the complete React 19 + Vite 6 + TailwindCSS local officer dashboard inside `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/frontend/`:
   - `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`.
   - Install required dependencies (`lucide-react`, `clsx`, `tailwind-merge`, etc.) using `npm install`.
2. Implement Officer Dashboard components in `frontend/src/`:
   - **Header**: Sashastra Seema Bal (SSB) identity, Border Checkpoint selector (Jaigaon / Sonauli / Raxaul), Air-Gapped Status badge ("LOCAL ONLY · AIR-GAPPED"), Backend health indicator.
   - **Ingestion Panel**:
     - Document Dropzone: drag-and-drop or file upload for Passport, Aadhaar, Voter ID, Permit.
     - Live Face Capture: WebCam stream with capture snapshot button, or optional live photo upload.
     - Quick-Load Sample Presets: Buttons to load simulated sample documents (Clean Passport, Forged Aadhaar, Tampered Stamp, Presentation Spoof).
     - Action Bar: Large "SCAN & INSPECT" button with loading progress spinner and latency readout.
   - **Results Panel**:
     - Large Risk Status Banner:
       - GREEN (Score 0-30): "AUTO-CLEAR PASS" with green styling
       - AMBER (Score 31-69): "SECONDARY INSPECTION REQUIRED" with amber styling
       - RED (Score 70-100): "CRITICAL SECURITY ALERT / DETAIN" with pulsing red alert
     - Risk Score Card: Gauge showing 0-100 score, Stage 1 tripwire flag, Stage 2 log-odds Bayesian contribution breakdown, execution latency in ms.
     - Granular Reason Bullet List: Explanatory reasons with color-coded severity tags (`ERR_DOB_MISMATCH`, `TRIPWIRE_PKI_FAIL`, etc.).
     - Dual-Canvas Visual Forensics Viewer: Side-by-side or opacity-slider comparison of original document image vs alpha-blended Turbo colormap tamper heatmap.
     - 5-Pillar Module Breakdown Table:
       1. OCR Extraction (Status, Name, DOB, Doc No, Confidence)
       2. ICAO MRZ & Checksum (Valid status, Type, CD1-CD4 indicators)
       3. Biometrics & Liveness (Match similarity %, Cosine distance, Spoof detection)
       4. Forensics & ELA (Tamper score, Splicing score, EXIF metadata)
       5. Border Stamp (Stamp detected, SSIM score, Context match)
   - Configuration & Error Handling:
     - Connects to backend at `VITE_API_BASE_URL` (default `http://localhost:8000`), calls `POST /api/v1/scan/inspect` with multipart form data.
     - Gracefully handles backend offline state with clear retry instructions.
3. Test building the frontend with `npm run build` from `frontend/`.
4. Write handoff report at `.agents/worker_m6/handoff.md` and send completion message.
