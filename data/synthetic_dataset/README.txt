SIH26188 Synthetic Document Dataset
=====================================
Total images : 500
Seed         : 42
Degradation  : Yes

CLASS DISTRIBUTION
  genuine: 167
  tampered_photo: 167
  tampered_text: 166

DOCUMENT TYPE DISTRIBUTION
  aadhaar: 100
  passport: 100
  voter_id: 100
  pan_card: 100
  driving_license: 100

FILES
  images/        PNG document images (RGB)
  masks/         Binary tamper masks (255=tampered, 0=clean)
  manifest.csv   Labels + metadata
  manifest.json  Same data as JSON

LABEL ENCODING
  0 = genuine
  1 = tampered_photo
  2 = tampered_text

DISCLAIMER: All documents are SYNTHETIC SPECIMENS. No real citizen data.
