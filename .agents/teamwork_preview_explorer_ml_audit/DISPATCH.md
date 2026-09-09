# Dispatch: ML & Algorithmic Modules Audit (Track 2)

## Mission
Perform comprehensive, read-only audit and analysis of the ML and Algorithmic Modules in the SIH26188 document screening system.

## Working Directory
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_ml_audit`

## Project Root
`/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project`

## Target Paths
- `backend/app/modules/` (e.g., OCR, MRZ parser, face matching, anti-spoofing, ELA/tamper detection, stamp verification, risk engine, fraud detection, document classification, barcode/QR decoder).

## Scope & Audit Focus
1. Fallback chain robustness when weights are missing (e.g. YOLO, InsightFace, EasyOCR, Tesseract, Torch models missing from weights/ directory - do they fail gracefully or crash with unhandled FileNotFoundError/RuntimeError?).
2. OCR & MRZ parsing check digit edge cases (TD1, TD2, TD3 format parsing, check digit calculation modulo 10 with weights 7-3-1, checksum mismatches, multi-line formatting, transliteration errors, filler character '<' stripping).
3. Facial matching baseline drift & alignment (ArcFace / InsightFace embedding distance calibration, cosine similarity thresholds, normalization drift, lighting/angle edge cases, bbox clipping).
4. ELA & Tamper scoring calibrations (Error Level Analysis quality factor differences, resaving JPEG artifacts, edge detection noise, threshold calibrations).
5. Stamp verification bounding logic & contour extraction (color segmentation in HSV space, circularity calculation, false positives on logo/seals, bounding box coordinates out of image bounds).
6. Input validation on images (zero-byte images, non-RGB formats, transparent PNG alpha channels, extreme aspect ratios, division by zero in aspect/ratio calculations).

## Rules
- STRICT READ-ONLY ENFORCEMENT: Under NO circumstances should any production source code or test files be modified or altered.
- Record every bug found with:
  - Unique ID (e.g. ML-01, ML-02...)
  - Title
  - Severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
  - Affected Component & Exact File Path
  - Exact Line numbers
  - Detailed Description
  - Root Cause Analysis
  - Reproduction Steps / Scenario
  - Potential Remediation Notes
- Write your findings to `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_ml_audit/report.md`.
- Conclude with `handoff.md` and send message to orchestrator.
