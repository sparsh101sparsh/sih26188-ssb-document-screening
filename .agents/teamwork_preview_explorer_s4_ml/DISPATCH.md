# Dispatch to teamwork_preview_explorer_s4_ml

## Task
Survey and investigate all ML & Algorithmic defects: ML-01 through ML-20.

Authoritative specification:
- `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/ORIGINAL_REQUEST.md`
- `/Users/iamsparsh00321/.gemini/antigravity/brain/eb201ebd-ec89-492a-8bce-ec5e9a6763f7/bug_report.md`
Project root: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project`
Working directory: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_s4_ml`

## 2026-09-09T14:34:08Z
Survey across ML & Algorithmic Modules for all ML defects:
- ML-01: ICAO Doc 9303 TD3 check digit filler '<' support in CD4 checksum in backend/app/modules/mrz/mrz_engine.py.
- ML-02: Format-aware parsing in parse_date_to_yymmdd in backend/app/modules/mrz/cross_validator.py for birthdays on 19th/20th.
- ML-03: Year extraction in backend/app/modules/forensics/fraud_edge_cases.py for hyphenated DD-MM-YYYY dates.
- ML-04: Zero-byte image guards in backend/app/modules/biometrics/face_detector.py.
- ML-05: PIL Image to NumPy BGR conversion before YuNet in backend/app/modules/biometrics/face_detector.py.
- ML-06: weights_only=True in torch.load in backend/app/modules/forensics/tamper_detector.py.
- ML-07: Text tampering probability clamping deadband fix in backend/app/modules/forensics/tamper_detector.py.
- ML-08: Centenary year pivot in backend/app/modules/mrz/cross_validator.py with reference_year % 100.
- ML-09: Demographic apparent age heuristic in backend/app/modules/biometrics/face_matcher.py (remove arbitrary embedding averaging).
- ML-10: Spatial contour/clustering for stamp ink pixels in backend/app/modules/stamp_verifier.py.
- ML-11: is_model_loaded property in backend/app/modules/biometrics/liveness_detector.py.
- ML-12: Masking missing checkpoints with 'or True' in backend/app/api/routers/models.py.
- ML-13: Deprecated Image.getdata() in backend/app/modules/forensics/ela_engine.py.
- ML-14: ELA visual map brightness scaling consistency in backend/app/modules/forensics/ela_engine.py.
- ML-15: Photo border proximity division-by-zero in backend/app/modules/forensics/photo_splicing_detector.py.
- ML-16: Aadhaar QR integer decompression payload slicing in backend/app/modules/ocr/qr_decoder.py.
- ML-17: SCRFD BGR-to-RGB channel order in backend/app/modules/biometrics/face_detector.py.
- ML-18: Lazy caching of EasyOCR reader in backend/app/modules/ocr/pp_ocr_engine.py.
- ML-19: Confidence calibration curve selection in backend/app/modules/biometrics/face_matcher.py.
- ML-20: Dynamic date reading in backend/app/api/routers/scan.py.
