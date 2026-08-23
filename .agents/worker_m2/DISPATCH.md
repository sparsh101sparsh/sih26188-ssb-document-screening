## 2026-08-23T02:36:10Z

You are Worker M2: OCR, MRZ & Cross-Validation Engineer for SIH26188 AI-Based Fake Identity & Document Screening System.

Your working directory for metadata is:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/worker_m2/

Authoritative References (Read these first):
- /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md
- /Users/iamsparsh00321/teamwork_projects/sih26188_wave3/UPDATED_ARCHITECTURE_AND_RESEARCH_REPORT.md (Sections 2.1, 2.5, 6.3)
- /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/orchestrator_1/PROJECT.md

Output Monorepo Root:
/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE BOUNDARIES:
- backend/app/modules/ocr/
- backend/app/modules/mrz/
- backend/app/api/routers/ocr.py
- backend/tests/test_mrz_checksum.py
- backend/tests/test_cross_validation.py

YOUR DELIVERABLES:
1. Implement `backend/app/modules/ocr/pp_ocr_engine.py`:
   - PaddleOCR PP-OCRv4 integration for Devanagari (`devanagari_PP-OCRv4_rec`) and Latin (`en_PP-OCRv4_rec_infer`).
   - Accepts PIL Image or numpy BGR array.
   - Extracts structured key-value fields (Name, DOB, Doc No, Gender, Address, Expiry) and confidence metrics.
   - Triggers quality-gate flag if mean confidence < 0.82 (`TAU_OCR`).
   - Async Qwen2.5-VL quality gate fallback stub with clear TODO marker.
   - Graceful fallback: If PaddleOCR weights are missing, return valid `OCRResult` with status="unavailable" or regex/heuristic fallback so the pipeline never crashes.
2. Implement `backend/app/modules/mrz/mrz_engine.py`:
   - Pure Python ICAO Doc 9303 Modulo-10 7-3-1 mathematical checksum calculation: weights [7, 3, 1], char mapping (0-9 -> 0-9, A-Z -> 10-35, '<' -> 0).
   - Validates CD1 (Doc Number), CD2 (DOB), CD3 (Expiry), CD4 (Optional), and Composite Check Digit across TD1 (3x30), TD2 (2x36), TD3 (2x44).
   - Full parser extracting issuing country, primary identifier, secondary identifier, doc number, nationality, DOB, sex, expiry date, and optional data.
   - Returns `MRZResult` schema.
   - OmniMRZ ONNX runner stub with weight loading instructions.
3. Implement `backend/app/modules/ocr/qr_decoder.py`:
   - QR code detector & extractor (`zxing-cpp` with fallback to `cv2.QRCodeDetector`).
   - Offline Aadhaar Secure QR parsing: decompress payload, split signed slice from 256-byte RSA signature, verify PKCS#1 v1.5 SHA-256 against `backend/app/data/uidai_root_cert.pem`.
   - Returns `QRPayload` schema.
4. Implement `backend/app/modules/mrz/cross_validator.py`:
   - Implement all 8 cross-validation rules from Section 6.3:
     - CV-01: MRZ DOB vs Visual OCR DOB (Exact Date Equality -> `ERR_DOB_MISMATCH`)
     - CV-02: MRZ Doc No vs Visual Doc No (Levenshtein Dist == 0 -> `ERR_DOCNO_ALTER`)
     - CV-03: MRZ Name vs Visual Full Name (Token sort similarity >= 90% -> `WRN_NAME_SPELL`)
     - CV-04: Biometric Apparent Age vs MRZ DOB Age (|Age_est - Age_dob| <= 15y -> `WRN_AGE_ANOMALY`)
     - CV-05: Photo Box Tamper Energy vs Face BBox (IoU Tamper Density <= 0.25 -> `ERR_PHOTO_SPLICE`)
     - CV-06: Text Box Tamper Energy vs OCR BBoxes (max P_tamper in BBox <= 0.18 -> `ERR_TEXT_FORGERY`)
     - CV-07: Stamp Date vs Permit Validity Window (Date in permit window -> `WRN_STAMP_EXPIRY`)
     - CV-08: Aadhaar QR RSA-2048 PKI Signature Valid (PKCS#1 v1.5 Sig == VALID -> `ERR_PKI_FORGED`)
   - Returns `CrossValidationResult` schema.
5. Implement `backend/app/api/routers/ocr.py`:
   - `POST /api/v1/ocr/extract` — multipart document image -> `OCRResult`
   - `POST /api/v1/mrz/validate` — form/json MRZ lines -> `MRZResult`
   - `POST /api/v1/qr/decode` — multipart image -> `QRPayload`
6. Create comprehensive pytest suites:
   - `backend/tests/test_mrz_checksum.py`: Tests TD1, TD2, TD3 known valid samples, corrupted check digits, edge cases.
   - `backend/tests/test_cross_validation.py`: Tests all 8 cross-validation rules under clean and tampered scenarios.
7. Run the test suites using `.venv311/bin/pytest` and document output.
8. Write handoff report at `.agents/worker_m2/handoff.md` and send completion message.
