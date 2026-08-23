/**
 * SIH26188 — High-Fidelity Mock & Preset Datasets for Air-Gapped Simulation
 */

import { DocumentInspectResponse } from '../types/api';

export const PRESET_CLEAN_PASSPORT: DocumentInspectResponse = {
  session_id: 'SSB-2026-INSP-001092',
  status: 'completed',
  assessment: {
    risk_score: 2.0,
    risk_level: 'GREEN',
    auto_clear: true,
    tripwire_triggered: false,
    tripwire_codes: [],
    reasons: [
      'ICAO Doc 9303 Modulo-10 checksum verified on all check digits (CD1, CD2, CD3, Composite).',
      'AdaFace-ResNet100 1:1 facial biometric match confirmed (Cosine Similarity: 0.88 >= 0.35).',
      'MiniFASNetV2-SE passive anti-spoofing passed (Genuine Live Human, Confidence: 97.8%).',
      'DocTamper & TruFor forensic analysis detected zero pixel splicing (Tamper Score: 0.03 < 0.18).',
      'All 8 Multi-Modal Cross-Validation checks successfully passed.'
    ],
    cross_validation_violations: [],
    heatmap_base64: null,
    score_breakdown: {
      base_prior_log_odds: -3.8918,
      tamper_log_odds_delta: 0.0,
      face_log_odds_delta: 0.0,
      mrz_log_odds_delta: 0.0,
      cross_val_log_odds_delta: 0.0,
      stamp_log_odds_delta: 0.0,
      metadata_log_odds_delta: 0.0,
      posterior_log_odds: -3.8918,
      raw_posterior_probability: 0.02
    },
    model_versions: {
      pp_ocr: 'PP-OCRv4-Multilingual',
      mrz_engine: 'ICAO-9303-v2.1',
      face_embedder: 'AdaFace-ResNet100-ONNX',
      liveness_detector: 'MiniFASNetV2-SE-DualScale',
      tamper_detector: 'DocTamper-ResNet50-DTD',
      splicing_detector: 'TruFor-SegFormer-B0'
    },
    processing_time_ms: 382.4,
    audit_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  },
  details: {
    session_id: 'SSB-2026-INSP-001092',
    document_type: 'passport',
    ocr: {
      status: 'success',
      script_detected: 'latin',
      fields: {
        document_type: 'P',
        issuing_country: 'IND',
        surname: 'SHARMA',
        given_names: 'RAHUL KUMAR',
        passport_number: 'Z8192041',
        nationality: 'IND',
        dob: '1992-05-14',
        sex: 'M',
        place_of_birth: 'NEW DELHI',
        expiry_date: '2032-05-13'
      },
      field_confidences: {
        surname: 0.98,
        given_names: 0.97,
        passport_number: 0.99,
        dob: 0.98,
        expiry_date: 0.98
      },
      raw_boxes: [],
      mean_confidence: 0.978,
      requires_tier2_vlm: false,
      raw_text: 'PASSPORT REPUBLIC OF INDIA P<INDSHARMA<<RAHUL<KUMAR<<<<<<<<<<<<<<<<<< Z8192041<4IND9205142M3205138<<<<<<<<<<<<<<<4',
      qr_payload: null,
      processing_time_ms: 84.2
    },
    mrz: {
      mrz_detected: true,
      mrz_type: 'TD3',
      valid: true,
      raw_lines: [
        'P<INDSHARMA<<RAHUL<KUMAR<<<<<<<<<<<<<<<<<<<<',
        'Z8192041<4IND9205142M3205138<<<<<<<<<<<<<<<4'
      ],
      document_type: 'P',
      country_code: 'IND',
      surname: 'SHARMA',
      given_names: 'RAHUL KUMAR',
      document_number: 'Z8192041',
      doc_number_checksum_valid: true,
      nationality: 'IND',
      dob: '920514',
      dob_checksum_valid: true,
      sex: 'M',
      expiry: '320513',
      expiry_checksum_valid: true,
      optional_data: null,
      optional_data_checksum_valid: true,
      composite_checksum_valid: true,
      checksum_failures: [],
      parsed_fields: {
        surname: 'SHARMA',
        given_names: 'RAHUL KUMAR',
        doc_no: 'Z8192041',
        dob_iso: '1992-05-14',
        expiry_iso: '2032-05-13'
      },
      processing_time_ms: 12.5
    },
    biometrics: {
      similarity: 0.882,
      match: true,
      threshold: 0.35,
      embedding_model_used: 'AdaFace-ResNet100',
      apparent_age_id: 34,
      apparent_age_live: 34,
      age_drift_years: 0,
      watchlist_hit: false,
      watchlist_distance: 0.84,
      processing_time_ms: 118.6
    },
    liveness: {
      is_live: true,
      confidence: 0.978,
      attack_type: null,
      score_2_7x: 0.982,
      score_4_0x: 0.974,
      fourier_anomaly_score: 0.04,
      processing_time_ms: 48.3
    },
    forensics: {
      tamper_score: 0.032,
      is_tampered: false,
      photo_region_tampered: false,
      heatmap_base64: null,
      reasons: ['Baseline paper texture noise within nominal threshold (0.032 < 0.180).'],
      detected_anomalies: [],
      tampered_regions: [],
      doctamper_score: 0.028,
      trufor_score: 0.035,
      ela_result: {
        max_intensity: 18.2,
        mean_intensity: 4.1,
        photo_area_anomaly: false
      },
      exif_suspicious: false,
      dqt_quantization_altered: false,
      processing_time_ms: 92.1
    },
    stamp: {
      stamp_found: true,
      stamp_score: 0.08,
      verdict: 'AUTHENTIC',
      checkpost_id: 'SSB-WB-JAI-01',
      location_name: 'Jaigaon / Phuentsholing Land Customs Station',
      ssim_score: 0.912,
      orb_match_count: 142,
      tamper_energy: 0.04,
      context_consistent: true,
      stamp_bbox: [420, 680, 560, 820],
      reasons: ['Official SSB Immigration seal contour identified with high SSIM correlation (0.912 >= 0.750).'],
      processing_time_ms: 26.7
    },
    cross_validation: {
      cross_validation_passed: true,
      violation_count: 0,
      critical_violations: [],
      warnings: [],
      violations: [],
      flags: [
        { rule_id: 'CV-01', rule_description: 'MRZ DOB vs Visual OCR DOB Equality', passed: true, telemetry_message: 'Exact match (1992-05-14)' },
        { rule_id: 'CV-02', rule_description: 'MRZ Doc No vs Visual Doc No', passed: true, telemetry_message: 'Levenshtein distance 0 (Z8192041)' },
        { rule_id: 'CV-03', rule_description: 'MRZ Name vs Visual Full Name', passed: true, telemetry_message: 'Token Sort Ratio 100% (SHARMA RAHUL KUMAR)' },
        { rule_id: 'CV-04', rule_description: 'Biometric Apparent Age vs MRZ DOB', passed: true, telemetry_message: 'Age drift 0 years (<= 15y)' },
        { rule_id: 'CV-05', rule_description: 'Photo Tamper Density in Face Region', passed: true, telemetry_message: 'Zero splicing energy in portrait box' },
        { rule_id: 'CV-06', rule_description: 'Text Tamper Probability across OCR Boxes', passed: true, telemetry_message: 'Max text anomaly 0.032 <= 0.180' },
        { rule_id: 'CV-07', rule_description: 'Stamp Transit Date vs Permit Validity', passed: true, telemetry_message: 'Transit stamp aligns with entry declaration' },
        { rule_id: 'CV-08', rule_description: 'Cryptographic Signature Verification', passed: true, telemetry_message: 'Standard biometric passport MRZ checksum validated' }
      ],
      rules_checked: 8,
      processing_time_ms: 14.2
    },
    risk: {
      risk_score: 2.0,
      risk_level: 'GREEN',
      auto_clear: true,
      tripwire_triggered: false,
      tripwire_codes: [],
      reasons: [
        'ICAO Doc 9303 Modulo-10 checksum verified on all check digits (CD1, CD2, CD3, Composite).',
        'AdaFace-ResNet100 1:1 facial biometric match confirmed (Cosine Similarity: 0.88 >= 0.35).',
        'MiniFASNetV2-SE passive anti-spoofing passed (Genuine Live Human, Confidence: 97.8%).',
        'DocTamper & TruFor forensic analysis detected zero pixel splicing (Tamper Score: 0.03 < 0.18).',
        'All 8 Multi-Modal Cross-Validation checks successfully passed.'
      ],
      cross_validation_violations: [],
      heatmap_base64: null,
      score_breakdown: {
        base_prior_log_odds: -3.8918,
        tamper_log_odds_delta: 0.0,
        face_log_odds_delta: 0.0,
        mrz_log_odds_delta: 0.0,
        cross_val_log_odds_delta: 0.0,
        stamp_log_odds_delta: 0.0,
        metadata_log_odds_delta: 0.0,
        posterior_log_odds: -3.8918,
        raw_posterior_probability: 0.02
      },
      model_versions: {
        pp_ocr: 'PP-OCRv4-Multilingual',
        mrz_engine: 'ICAO-9303-v2.1',
        face_embedder: 'AdaFace-ResNet100-ONNX',
        liveness_detector: 'MiniFASNetV2-SE-DualScale',
        tamper_detector: 'DocTamper-ResNet50-DTD',
        splicing_detector: 'TruFor-SegFormer-B0'
      },
      processing_time_ms: 382.4,
      audit_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    },
    processing_time_ms: 382.4
  }
};

export const PRESET_FORGED_AADHAAR: DocumentInspectResponse = {
  session_id: 'SSB-2026-INSP-001093',
  status: 'completed',
  assessment: {
    risk_score: 98.5,
    risk_level: 'RED',
    auto_clear: false,
    tripwire_triggered: true,
    tripwire_codes: [
      'TRIPWIRE_2: UIDAI RSA-2048 PKI Signature Invalid or Forged'
    ],
    reasons: [
      'STAGE 1 TRIPWIRE TRIGGERED: Aadhaar QR RSA-2048 PKCS#1 v1.5 cryptographic signature verification failed.',
      'DocTamper neural text scraper localized 0.94 anomaly probability on Date of Birth field (Visual DOB: 1994-08-12 vs Decoded: 1984-08-12).',
      'Rule CV-01 Violation: Demographic Date of Birth mismatch between visual OCR and cryptographic QR payload [ERR_DOB_MISMATCH].',
      'Rule CV-06 Violation: Localized pixel tampering detected across OCR text bounding box [ERR_TEXT_FORGERY].',
      'Rule CV-08 Violation: UIDAI Root CA signature mismatch on embedded QR payload [ERR_PKI_FORGED].'
    ],
    cross_validation_violations: [
      'CV-01: Visual OCR DOB (1994-08-12) does not match QR payload DOB (1984-08-12)',
      'CV-06: Text scraping peak tamper probability 0.94 exceeds adaptive threshold 0.18',
      'CV-08: Aadhaar QR RSA-2048 PKI signature is INVALID'
    ],
    heatmap_base64: null,
    score_breakdown: {
      base_prior_log_odds: -3.8918,
      tamper_log_odds_delta: 4.5,
      face_log_odds_delta: 0.0,
      mrz_log_odds_delta: 0.0,
      cross_val_log_odds_delta: 5.2,
      stamp_log_odds_delta: 0.0,
      metadata_log_odds_delta: 1.8,
      posterior_log_odds: 7.6082,
      raw_posterior_probability: 0.9995
    },
    model_versions: {
      pp_ocr: 'PP-OCRv4-Multilingual',
      qr_pki: 'UIDAI-RSA2048-PKCS1v15',
      face_embedder: 'AdaFace-ResNet100-ONNX',
      tamper_detector: 'DocTamper-ResNet50-DTD',
      splicing_detector: 'TruFor-SegFormer-B0'
    },
    processing_time_ms: 412.8,
    audit_hash: '3a49182d8c1192e420bfa51829e19c9284102910fae19028e102947192830192'
  },
  details: {
    session_id: 'SSB-2026-INSP-001093',
    document_type: 'aadhaar',
    ocr: {
      status: 'success',
      script_detected: 'devanagari_and_latin',
      fields: {
        full_name: 'Amit Vikram Singh',
        full_name_devanagari: 'अमित विक्रम सिंह',
        dob: '1994-08-12',
        gender: 'MALE / पुरुष',
        aadhaar_number: 'XXXX-XXXX-8921',
        address: 'H-42 Sector 18, Noida, Gautam Buddha Nagar, UP 201301'
      },
      field_confidences: {
        full_name: 0.96,
        dob: 0.91,
        aadhaar_number: 0.95
      },
      raw_boxes: [],
      mean_confidence: 0.94,
      requires_tier2_vlm: false,
      raw_text: 'भारत सरकार GOVERNMENT OF INDIA अमित विक्रम सिंह Amit Vikram Singh जन्म तिथि / DOB: 12/08/1994 पुरुष / MALE XXXX XXXX 8921',
      qr_payload: {
        raw_qr_found: true,
        qr_type: 'AADHAAR_SECURE_V2',
        signature_valid: false,
        signature_algorithm: 'SHA256withRSA',
        demographics: {
          name: 'Amit Vikram Singh',
          dob: '1984-08-12',
          gender: 'M',
          reference_id: '892120240918'
        },
        photo_jp2_extracted: true,
        error_message: 'RSA_PKCS1_VERIFY_FAILURE: Signature block does not match UIDAI 2048-bit Root Certificate.'
      },
      processing_time_ms: 95.4
    },
    mrz: {
      mrz_detected: false,
      valid: false,
      raw_lines: [],
      checksum_failures: [],
      parsed_fields: {},
      processing_time_ms: 5.1
    },
    biometrics: {
      similarity: 0.42,
      match: true,
      threshold: 0.35,
      embedding_model_used: 'AdaFace-ResNet100',
      apparent_age_id: 31,
      apparent_age_live: 31,
      age_drift_years: 0,
      watchlist_hit: false,
      watchlist_distance: 0.76,
      processing_time_ms: 110.2
    },
    liveness: {
      is_live: true,
      confidence: 0.94,
      attack_type: null,
      score_2_7x: 0.95,
      score_4_0x: 0.93,
      fourier_anomaly_score: 0.06,
      processing_time_ms: 45.1
    },
    forensics: {
      tamper_score: 0.94,
      is_tampered: true,
      photo_region_tampered: false,
      heatmap_base64: null,
      reasons: [
        'High-confidence text scraping detected on Date of Birth digits (Peak Anomaly: 0.94).',
        'Inpainting boundary anomalies localized around visual DOB field.'
      ],
      detected_anomalies: ['TEXT_SCRAPING', 'INPAINTING', 'CRYPTOGRAPHIC_FORGERY'],
      tampered_regions: [
        {
          bbox: [180, 240, 360, 280],
          peak_tamper_probability: 0.94,
          tamper_type: 'TEXT_SCRAPING',
          affected_field: 'dob'
        }
      ],
      doctamper_score: 0.94,
      trufor_score: 0.31,
      ela_result: {
        max_intensity: 94.6,
        mean_intensity: 14.8,
        photo_area_anomaly: false
      },
      exif_suspicious: true,
      dqt_quantization_altered: true,
      processing_time_ms: 112.5
    },
    stamp: null,
    cross_validation: {
      cross_validation_passed: false,
      violation_count: 3,
      critical_violations: [
        {
          rule_id: 'CV-01',
          rule_name: 'MRZ/QR DOB vs Visual OCR DOB Equality',
          severity: 'CRITICAL',
          field_name: 'dob',
          expected_value: '1984-08-12 (QR Payload)',
          actual_value: '1994-08-12 (Visual Text)',
          telemetry_code: 'ERR_DOB_MISMATCH',
          details: 'Visual printed birth year (1994) altered from cryptographic record (1984) by 10 years.'
        },
        {
          rule_id: 'CV-06',
          rule_name: 'Text Tamper Probability across OCR Boxes',
          severity: 'CRITICAL',
          field_name: 'dob',
          expected_value: '<= 0.180 (Nominal Noise)',
          actual_value: '0.940 (DocTamper Anomaly)',
          telemetry_code: 'ERR_TEXT_FORGERY',
          details: 'Scraping and ink erasure detected over DOB bounding box [180, 240, 360, 280].'
        },
        {
          rule_id: 'CV-08',
          rule_name: 'Aadhaar QR RSA-2048 PKI Signature Verification',
          severity: 'CRITICAL',
          field_name: 'qr_signature',
          expected_value: 'VALID (UIDAI Root Certificate)',
          actual_value: 'INVALID / CORRUPTED',
          telemetry_code: 'ERR_PKI_FORGED',
          details: 'QR signature hash does not decrypt with UIDAI official public key.'
        }
      ],
      warnings: [],
      violations: [],
      flags: [
        { rule_id: 'CV-01', rule_description: 'MRZ/QR DOB vs Visual OCR DOB', passed: false, telemetry_message: 'DOB discrepancy 10 years' },
        { rule_id: 'CV-02', rule_description: 'Doc Number Consistency', passed: true, telemetry_message: 'Aadhaar suffix matches' },
        { rule_id: 'CV-03', rule_description: 'Name Spelling Consistency', passed: true, telemetry_message: 'Name matches QR payload' },
        { rule_id: 'CV-04', rule_description: 'Biometric Apparent Age Consistency', passed: true, telemetry_message: 'Apparent age matches visual photo' },
        { rule_id: 'CV-05', rule_description: 'Photo Splicing Density', passed: true, telemetry_message: 'Portrait window intact' },
        { rule_id: 'CV-06', rule_description: 'Text Tamper Probability', passed: false, telemetry_message: 'Peak tamper 0.94 on DOB' },
        { rule_id: 'CV-07', rule_description: 'Stamp Consistency', passed: true, telemetry_message: 'N/A for Aadhaar' },
        { rule_id: 'CV-08', rule_description: 'Cryptographic Signature', passed: false, telemetry_message: 'RSA-2048 signature failed' }
      ],
      rules_checked: 8,
      processing_time_ms: 18.2
    },
    risk: {
      risk_score: 98.5,
      risk_level: 'RED',
      auto_clear: false,
      tripwire_triggered: true,
      tripwire_codes: [
        'TRIPWIRE_2: UIDAI RSA-2048 PKI Signature Invalid or Forged'
      ],
      reasons: [
        'STAGE 1 TRIPWIRE TRIGGERED: Aadhaar QR RSA-2048 PKCS#1 v1.5 cryptographic signature verification failed.',
        'DocTamper neural text scraper localized 0.94 anomaly probability on Date of Birth field (Visual DOB: 1994-08-12 vs Decoded: 1984-08-12).',
        'Rule CV-01 Violation: Demographic Date of Birth mismatch between visual OCR and cryptographic QR payload [ERR_DOB_MISMATCH].',
        'Rule CV-06 Violation: Localized pixel tampering detected across OCR text bounding box [ERR_TEXT_FORGERY].',
        'Rule CV-08 Violation: UIDAI Root CA signature mismatch on embedded QR payload [ERR_PKI_FORGED].'
      ],
      cross_validation_violations: [
        'CV-01: Visual OCR DOB (1994-08-12) does not match QR payload DOB (1984-08-12)',
        'CV-06: Text scraping peak tamper probability 0.94 exceeds adaptive threshold 0.18',
        'CV-08: Aadhaar QR RSA-2048 PKI signature is INVALID'
      ],
      heatmap_base64: null,
      score_breakdown: {
        base_prior_log_odds: -3.8918,
        tamper_log_odds_delta: 4.5,
        face_log_odds_delta: 0.0,
        mrz_log_odds_delta: 0.0,
        cross_val_log_odds_delta: 5.2,
        stamp_log_odds_delta: 0.0,
        metadata_log_odds_delta: 1.8,
        posterior_log_odds: 7.6082,
        raw_posterior_probability: 0.9995
      },
      model_versions: {
        pp_ocr: 'PP-OCRv4-Multilingual',
        qr_pki: 'UIDAI-RSA2048-PKCS1v15',
        face_embedder: 'AdaFace-ResNet100-ONNX',
        tamper_detector: 'DocTamper-ResNet50-DTD',
        splicing_detector: 'TruFor-SegFormer-B0'
      },
      processing_time_ms: 412.8,
      audit_hash: '3a49182d8c1192e420bfa51829e19c9284102910fae19028e102947192830192'
    },
    processing_time_ms: 412.8
  }
};

export const PRESET_TAMPERED_STAMP: DocumentInspectResponse = {
  session_id: 'SSB-2026-INSP-001094',
  status: 'completed',
  assessment: {
    risk_score: 65.0,
    risk_level: 'AMBER',
    auto_clear: false,
    tripwire_triggered: false,
    tripwire_codes: [],
    reasons: [
      'SECONDARY INSPECTION MANDATORY: Immigration stamp contour failed SSB Registry template match (SSIM: 0.42 < 0.75).',
      'Stamp text layout indicates Land Customs Station Sonauli but declared transit route is Jaigaon ICP [WRN_STAMP_EXPIRY].',
      'DocTamper detected moderate ink splicing around stamp date impression (Tamper Score: 0.38).',
      'Rule CV-07 Warning: Border transit stamp context mismatch with traveler declaration.'
    ],
    cross_validation_violations: [
      'CV-07: Transit stamp location (Sonauli) inconsistent with declared checkpost route (Jaigaon)'
    ],
    heatmap_base64: null,
    score_breakdown: {
      base_prior_log_odds: -3.8918,
      tamper_log_odds_delta: 1.8,
      face_log_odds_delta: 0.0,
      mrz_log_odds_delta: 0.0,
      cross_val_log_odds_delta: 1.6,
      stamp_log_odds_delta: 3.2,
      metadata_log_odds_delta: 0.0,
      posterior_log_odds: 2.7082,
      raw_posterior_probability: 0.937
    },
    model_versions: {
      pp_ocr: 'PP-OCRv4-Multilingual',
      stamp_verifier: 'SSB-Registry-SSIM-ORB',
      tamper_detector: 'DocTamper-ResNet50-DTD'
    },
    processing_time_ms: 365.2,
    audit_hash: 'b10a8db164e0754105b7a99be72e3fe59da5cfc5e236614791d6044f00612990'
  },
  details: {
    session_id: 'SSB-2026-INSP-001094',
    document_type: 'permit',
    ocr: {
      status: 'success',
      script_detected: 'latin',
      fields: {
        permit_type: 'ENTRY_PERMIT',
        issuing_authority: 'DEPARTMENT OF IMMIGRATION',
        holder_name: 'TASHI DORJI',
        permit_number: 'EP-2026-08192',
        valid_until: '2026-09-30'
      },
      field_confidences: {
        holder_name: 0.95,
        permit_number: 0.96
      },
      raw_boxes: [],
      mean_confidence: 0.95,
      requires_tier2_vlm: false,
      raw_text: 'ROYAL GOVERNMENT OF BHUTAN ENTRY PERMIT EP-2026-08192 TASHI DORJI VALID UNTIL 30-SEP-2026',
      qr_payload: null,
      processing_time_ms: 78.4
    },
    mrz: {
      mrz_detected: false,
      valid: false,
      raw_lines: [],
      checksum_failures: [],
      parsed_fields: {},
      processing_time_ms: 4.8
    },
    biometrics: {
      similarity: 0.79,
      match: true,
      threshold: 0.35,
      embedding_model_used: 'AdaFace-ResNet100',
      apparent_age_id: 28,
      apparent_age_live: 29,
      age_drift_years: 1,
      watchlist_hit: false,
      watchlist_distance: 0.81,
      processing_time_ms: 104.2
    },
    liveness: {
      is_live: true,
      confidence: 0.96,
      attack_type: null,
      score_2_7x: 0.97,
      score_4_0x: 0.95,
      fourier_anomaly_score: 0.05,
      processing_time_ms: 42.0
    },
    forensics: {
      tamper_score: 0.38,
      is_tampered: true,
      photo_region_tampered: false,
      heatmap_base64: null,
      reasons: ['Localized ink diffusion anomaly around immigration seal border.'],
      detected_anomalies: ['STAMP_SPLICING'],
      tampered_regions: [
        {
          bbox: [350, 480, 520, 650],
          peak_tamper_probability: 0.68,
          tamper_type: 'PHOTO_SPLICING',
          affected_field: 'immigration_stamp'
        }
      ],
      doctamper_score: 0.36,
      trufor_score: 0.41,
      ela_result: {
        max_intensity: 54.2,
        mean_intensity: 9.8,
        photo_area_anomaly: false
      },
      exif_suspicious: false,
      dqt_quantization_altered: false,
      processing_time_ms: 88.6
    },
    stamp: {
      stamp_found: true,
      stamp_score: 0.68,
      verdict: 'SUSPICIOUS',
      checkpost_id: 'SSB-UP-SON-01',
      location_name: 'Sonauli / Belahiya Checkpost Seal',
      ssim_score: 0.42,
      orb_match_count: 38,
      tamper_energy: 0.58,
      context_consistent: false,
      stamp_bbox: [350, 480, 520, 650],
      reasons: [
        'SSIM template score (0.420) is below SSB authentication threshold (0.750).',
        'Stamp geometry shows oval distortion vs official circular SSB specification.',
        'Checkpost location (Sonauli) does not align with Jaigaon corridor transit declaration.'
      ],
      processing_time_ms: 32.1
    },
    cross_validation: {
      cross_validation_passed: true,
      violation_count: 1,
      critical_violations: [],
      warnings: [
        {
          rule_id: 'CV-07',
          rule_name: 'Stamp Date & Checkpost vs Traveler Declaration',
          severity: 'WARNING',
          field_name: 'stamp_checkpost',
          expected_value: 'SSB-WB-JAI-01 (Jaigaon)',
          actual_value: 'SSB-UP-SON-01 (Sonauli)',
          telemetry_code: 'WRN_STAMP_EXPIRY',
          details: 'Physical stamp contour indicates Sonauli checkpoint while traveler presented at Jaigaon ICP.'
        }
      ],
      violations: [],
      flags: [
        { rule_id: 'CV-01', rule_description: 'MRZ/QR DOB vs Visual OCR DOB', passed: true, telemetry_message: 'N/A' },
        { rule_id: 'CV-02', rule_description: 'Doc Number Consistency', passed: true, telemetry_message: 'Permit ID verified' },
        { rule_id: 'CV-03', rule_description: 'Name Spelling Consistency', passed: true, telemetry_message: 'Name matches' },
        { rule_id: 'CV-04', rule_description: 'Biometric Apparent Age Consistency', passed: true, telemetry_message: 'Age drift 1 year' },
        { rule_id: 'CV-05', rule_description: 'Photo Splicing Density', passed: true, telemetry_message: 'Portrait intact' },
        { rule_id: 'CV-06', rule_description: 'Text Tamper Probability', passed: true, telemetry_message: 'Text areas clean' },
        { rule_id: 'CV-07', rule_description: 'Stamp Context Consistency', passed: false, telemetry_message: 'Stamp checkpost route discrepancy' },
        { rule_id: 'CV-08', rule_description: 'Cryptographic Signature', passed: true, telemetry_message: 'N/A for manual entry permit' }
      ],
      rules_checked: 8,
      processing_time_ms: 15.1
    },
    risk: {
      risk_score: 65.0,
      risk_level: 'AMBER',
      auto_clear: false,
      tripwire_triggered: false,
      tripwire_codes: [],
      reasons: [
        'SECONDARY INSPECTION MANDATORY: Immigration stamp contour failed SSB Registry template match (SSIM: 0.42 < 0.75).',
        'Stamp text layout indicates Land Customs Station Sonauli but declared transit route is Jaigaon ICP [WRN_STAMP_EXPIRY].',
        'DocTamper detected moderate ink splicing around stamp date impression (Tamper Score: 0.38).',
        'Rule CV-07 Warning: Border transit stamp context mismatch with traveler declaration.'
      ],
      cross_validation_violations: [
        'CV-07: Transit stamp location (Sonauli) inconsistent with declared checkpost route (Jaigaon)'
      ],
      heatmap_base64: null,
      score_breakdown: {
        base_prior_log_odds: -3.8918,
        tamper_log_odds_delta: 1.8,
        face_log_odds_delta: 0.0,
        mrz_log_odds_delta: 0.0,
        cross_val_log_odds_delta: 1.6,
        stamp_log_odds_delta: 3.2,
        metadata_log_odds_delta: 0.0,
        posterior_log_odds: 2.7082,
        raw_posterior_probability: 0.937
      },
      model_versions: {
        pp_ocr: 'PP-OCRv4-Multilingual',
        stamp_verifier: 'SSB-Registry-SSIM-ORB',
        tamper_detector: 'DocTamper-ResNet50-DTD'
      },
      processing_time_ms: 365.2,
      audit_hash: 'b10a8db164e0754105b7a99be72e3fe59da5cfc5e236614791d6044f00612990'
    },
    processing_time_ms: 365.2
  }
};

export const PRESET_PRESENTATION_SPOOF: DocumentInspectResponse = {
  session_id: 'SSB-2026-INSP-001095',
  status: 'completed',
  assessment: {
    risk_score: 95.0,
    risk_level: 'RED',
    auto_clear: false,
    tripwire_triggered: true,
    tripwire_codes: [
      'TRIPWIRE_4: Biometric Presentation Attack / Screen Spoofing Detected'
    ],
    reasons: [
      'STAGE 1 TRIPWIRE TRIGGERED: MiniFASNetV2-SE Dual-Scale Presentation Attack Detector flagged live capture as 2D digital screen replay attack.',
      'Scale 2.7x and 4.0x anti-spoofing confidence 0.04 (threshold >= 0.70). High-frequency 2D FFT Fourier Moiré screen matrix detected.',
      'High-risk security breach: Impersonator attempting border transit with electronic screen replay of genuine passport holder.',
      'IMMEDIATE OFFICER ACTION: Detain subject and conduct secondary identity verification under Section 14 Foreigners Act.'
    ],
    cross_validation_violations: [
      'TRIPWIRE_4: Passive Presentation Attack Detection failed (SCREEN_REPLAY / MOIRÉ PATTERN)'
    ],
    heatmap_base64: null,
    score_breakdown: {
      base_prior_log_odds: -3.8918,
      tamper_log_odds_delta: 0.0,
      face_log_odds_delta: 6.2,
      mrz_log_odds_delta: 0.0,
      cross_val_log_odds_delta: 4.8,
      stamp_log_odds_delta: 0.0,
      metadata_log_odds_delta: 0.0,
      posterior_log_odds: 7.1082,
      raw_posterior_probability: 0.9992
    },
    model_versions: {
      pp_ocr: 'PP-OCRv4-Multilingual',
      face_embedder: 'AdaFace-ResNet100-ONNX',
      liveness_detector: 'MiniFASNetV2-SE-DualScale'
    },
    processing_time_ms: 395.0,
    audit_hash: 'c8273b182049182aef1928401928471029481029481920491820491829481920'
  },
  details: {
    session_id: 'SSB-2026-INSP-001095',
    document_type: 'passport',
    ocr: {
      status: 'success',
      script_detected: 'latin',
      fields: {
        document_type: 'P',
        issuing_country: 'IND',
        surname: 'PATEL',
        given_names: 'VIKRAM SURESH',
        passport_number: 'M9283011',
        nationality: 'IND',
        dob: '1988-11-20',
        sex: 'M',
        expiry_date: '2030-11-19'
      },
      field_confidences: {
        surname: 0.97,
        given_names: 0.98,
        passport_number: 0.99
      },
      raw_boxes: [],
      mean_confidence: 0.98,
      requires_tier2_vlm: false,
      raw_text: 'PASSPORT REPUBLIC OF INDIA P<INDPATEL<<VIKRAM<SURESH<<<<<<<<<<<<<<<<<< M9283011<2IND8811204M3011197<<<<<<<<<<<<<<<8',
      qr_payload: null,
      processing_time_ms: 81.2
    },
    mrz: {
      mrz_detected: true,
      mrz_type: 'TD3',
      valid: true,
      raw_lines: [
        'P<INDPATEL<<VIKRAM<SURESH<<<<<<<<<<<<<<<<<<<<',
        'M9283011<2IND8811204M3011197<<<<<<<<<<<<<<<8'
      ],
      document_type: 'P',
      country_code: 'IND',
      surname: 'PATEL',
      given_names: 'VIKRAM SURESH',
      document_number: 'M9283011',
      doc_number_checksum_valid: true,
      nationality: 'IND',
      dob: '881120',
      dob_checksum_valid: true,
      sex: 'M',
      expiry: '301119',
      expiry_checksum_valid: true,
      optional_data: null,
      optional_data_checksum_valid: true,
      composite_checksum_valid: true,
      checksum_failures: [],
      parsed_fields: {
        surname: 'PATEL',
        given_names: 'VIKRAM SURESH',
        doc_no: 'M9283011'
      },
      processing_time_ms: 11.8
    },
    biometrics: {
      similarity: 0.74,
      match: true,
      threshold: 0.35,
      embedding_model_used: 'AdaFace-ResNet100',
      apparent_age_id: 38,
      apparent_age_live: 38,
      age_drift_years: 0,
      watchlist_hit: false,
      watchlist_distance: 0.79,
      processing_time_ms: 114.5
    },
    liveness: {
      is_live: false,
      confidence: 0.042,
      attack_type: 'SCREEN_REPLAY (iPad 4K Display Moiré Pattern)',
      score_2_7x: 0.038,
      score_4_0x: 0.046,
      fourier_anomaly_score: 0.89,
      processing_time_ms: 54.2
    },
    forensics: {
      tamper_score: 0.04,
      is_tampered: false,
      photo_region_tampered: false,
      heatmap_base64: null,
      reasons: ['Physical document substrate intact; zero tampering detected on printed document.'],
      detected_anomalies: [],
      tampered_regions: [],
      doctamper_score: 0.03,
      trufor_score: 0.05,
      ela_result: {
        max_intensity: 22.1,
        mean_intensity: 5.4,
        photo_area_anomaly: false
      },
      exif_suspicious: false,
      dqt_quantization_altered: false,
      processing_time_ms: 89.2
    },
    stamp: null,
    cross_validation: {
      cross_validation_passed: false,
      violation_count: 1,
      critical_violations: [
        {
          rule_id: 'CV-TRIPWIRE-4',
          rule_name: 'Passive Presentation Attack Detection (Liveness)',
          severity: 'CRITICAL',
          field_name: 'live_face_liveness',
          expected_value: 'GENUINE LIVE HUMAN (Liveness >= 0.70)',
          actual_value: 'SCREEN REPLAY ATTACK (Liveness = 0.042)',
          telemetry_code: 'TRIPWIRE_4_BIOMETRIC_SPOOF',
          details: 'Subject presenting iPad electronic screen reproduction of passport photograph.'
        }
      ],
      warnings: [],
      violations: [],
      flags: [
        { rule_id: 'CV-01', rule_description: 'MRZ DOB vs Visual OCR DOB', passed: true, telemetry_message: 'DOB matches' },
        { rule_id: 'CV-02', rule_description: 'MRZ Doc No vs Visual Doc No', passed: true, telemetry_message: 'Doc No matches' },
        { rule_id: 'CV-03', rule_description: 'MRZ Name vs Visual Full Name', passed: true, telemetry_message: 'Name matches' },
        { rule_id: 'CV-04', rule_description: 'Biometric Apparent Age vs DOB', passed: true, telemetry_message: 'Age consistent' },
        { rule_id: 'CV-05', rule_description: 'Photo Splicing Density', passed: true, telemetry_message: 'Document photo intact' },
        { rule_id: 'CV-06', rule_description: 'Text Tamper Probability', passed: true, telemetry_message: 'Clean' },
        { rule_id: 'CV-07', rule_description: 'Stamp Context Consistency', passed: true, telemetry_message: 'N/A' },
        { rule_id: 'CV-08', rule_description: 'Passive Presentation Attack (Liveness)', passed: false, telemetry_message: '2D Screen Replay Detected' }
      ],
      rules_checked: 8,
      processing_time_ms: 16.4
    },
    risk: {
      risk_score: 95.0,
      risk_level: 'RED',
      auto_clear: false,
      tripwire_triggered: true,
      tripwire_codes: [
        'TRIPWIRE_4: Biometric Presentation Attack / Screen Spoofing Detected'
      ],
      reasons: [
        'STAGE 1 TRIPWIRE TRIGGERED: MiniFASNetV2-SE Dual-Scale Presentation Attack Detector flagged live capture as 2D digital screen replay attack.',
        'Scale 2.7x and 4.0x anti-spoofing confidence 0.04 (threshold >= 0.70). High-frequency 2D FFT Fourier Moiré screen matrix detected.',
        'High-risk security breach: Impersonator attempting border transit with electronic screen replay of genuine passport holder.',
        'IMMEDIATE OFFICER ACTION: Detain subject and conduct secondary identity verification under Section 14 Foreigners Act.'
      ],
      cross_validation_violations: [
        'TRIPWIRE_4: Passive Presentation Attack Detection failed (SCREEN_REPLAY / MOIRÉ PATTERN)'
      ],
      heatmap_base64: null,
      score_breakdown: {
        base_prior_log_odds: -3.8918,
        tamper_log_odds_delta: 0.0,
        face_log_odds_delta: 6.2,
        mrz_log_odds_delta: 0.0,
        cross_val_log_odds_delta: 4.8,
        stamp_log_odds_delta: 0.0,
        metadata_log_odds_delta: 0.0,
        posterior_log_odds: 7.1082,
        raw_posterior_probability: 0.9992
      },
      model_versions: {
        pp_ocr: 'PP-OCRv4-Multilingual',
        face_embedder: 'AdaFace-ResNet100-ONNX',
        liveness_detector: 'MiniFASNetV2-SE-DualScale'
      },
      processing_time_ms: 395.0,
      audit_hash: 'c8273b182049182aef1928401928471029481029481920491820491829481920'
    },
    processing_time_ms: 395.0
  }
};
