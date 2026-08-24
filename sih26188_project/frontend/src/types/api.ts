/**
 * SIH26188 — TypeScript API Schemas & Data Contracts
 * Mirroring FastAPI Pydantic v2 schemas in backend/app/schemas/
 */

export type RiskLevel = 'GREEN' | 'AMBER' | 'RED';

export interface RiskScoreBreakdown {
  base_prior_log_odds: number;
  tamper_log_odds_delta: number;
  face_log_odds_delta: number;
  mrz_log_odds_delta: number;
  cross_val_log_odds_delta: number;
  stamp_log_odds_delta: number;
  metadata_log_odds_delta: number;
  posterior_log_odds: number;
  raw_posterior_probability: number;
}

export interface RiskAssessment {
  risk_score: number;
  risk_level: RiskLevel;
  auto_clear: boolean;
  tripwire_triggered: boolean;
  tripwire_codes: string[];
  reasons: string[];
  cross_validation_violations: string[];
  heatmap_url?: string | null;
  heatmap_base64?: string | null;
  score_breakdown?: RiskScoreBreakdown | null;
  model_versions: Record<string, string>;
  processing_time_ms: number;
  audit_hash?: string | null;
}

export interface OCRBox {
  text: string;
  confidence: number;
  polygon: number[][];
  bbox?: number[] | null;
}

export interface QRPayload {
  raw_qr_found: boolean;
  qr_type?: string | null;
  signature_valid: boolean;
  signature_algorithm?: string | null;
  demographics: Record<string, any>;
  photo_jp2_extracted: boolean;
  error_message?: string | null;
}

export interface OCRResult {
  status: string;
  script_detected: string;
  fields: Record<string, string>;
  field_confidences: Record<string, number>;
  raw_boxes: OCRBox[];
  mean_confidence: number;
  requires_tier2_vlm: boolean;
  raw_text: string;
  qr_payload?: QRPayload | null;
  processing_time_ms: number;
}

export interface MRZResult {
  mrz_detected: boolean;
  mrz_type?: string | null;
  valid: boolean;
  raw_lines: string[];
  document_type?: string | null;
  country_code?: string | null;
  surname?: string | null;
  given_names?: string | null;
  document_number?: string | null;
  doc_number_checksum_valid?: boolean | null;
  nationality?: string | null;
  dob?: string | null;
  dob_checksum_valid?: boolean | null;
  sex?: string | null;
  expiry?: string | null;
  expiry_checksum_valid?: boolean | null;
  optional_data?: string | null;
  optional_data_checksum_valid?: boolean | null;
  composite_checksum_valid?: boolean | null;
  checksum_failures: string[];
  parsed_fields: Record<string, any>;
  processing_time_ms: number;
}

export interface CrossViolation {
  rule_id: string;
  rule_name: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  field_name: string;
  expected_value?: string | null;
  actual_value?: string | null;
  telemetry_code: string;
  details: string;
}

export interface CrossValidationFlag {
  rule_id: string;
  rule_description: string;
  passed: boolean;
  telemetry_message: string;
}

export interface CrossValidationResult {
  cross_validation_passed: boolean;
  violation_count: number;
  critical_violations: CrossViolation[];
  warnings: CrossViolation[];
  violations: CrossViolation[];
  flags: CrossValidationFlag[];
  rules_checked: number;
  processing_time_ms: number;
}

export interface FaceBBox {
  bbox: number[]; // [x1, y1, x2, y2]
  confidence: number;
  landmarks?: number[][] | null;
}

export interface FaceDetectionResult {
  faces_found: number;
  faces: FaceBBox[];
  primary_face?: FaceBBox | null;
  aligned_face_extracted: boolean;
  processing_time_ms: number;
}

export interface LivenessResult {
  is_live: boolean;
  confidence: number;
  attack_type?: string | null;
  score_2_7x?: number | null;
  score_4_0x?: number | null;
  fourier_anomaly_score?: number | null;
  processing_time_ms: number;
}

export interface FaceMatchResult {
  similarity: number;
  match: boolean;
  threshold: number;
  embedding_model_used: string;
  apparent_age_id?: number | null;
  apparent_age_live?: number | null;
  age_drift_years?: number | null;
  watchlist_hit: boolean;
  watchlist_distance?: number | null;
  processing_time_ms: number;
}

export interface TamperRegion {
  bbox: number[]; // [x1, y1, x2, y2]
  peak_tamper_probability: number;
  tamper_type: string;
  affected_field?: string | null;
}

export interface ELAResult {
  max_intensity: number;
  mean_intensity: number;
  photo_area_anomaly: boolean;
}

export interface ForensicsResult {
  tamper_score: number;
  is_tampered: boolean;
  photo_region_tampered: boolean;
  heatmap_base64?: string | null;
  reasons: string[];
  detected_anomalies: string[];
  tampered_regions: TamperRegion[];
  doctamper_score: number;
  trufor_score: number;
  ela_result?: ELAResult | null;
  exif_suspicious: boolean;
  dqt_quantization_altered: boolean;
  processing_time_ms: number;
}

export interface StampResult {
  stamp_found: boolean;
  stamp_score: number;
  verdict: 'AUTHENTIC' | 'SUSPICIOUS' | 'FORGED' | 'NOT_FOUND';
  checkpost_id?: string | null;
  location_name?: string | null;
  ssim_score?: number | null;
  orb_match_count?: number | null;
  tamper_energy?: number | null;
  context_consistent?: boolean | null;
  stamp_bbox?: number[] | null;
  reasons: string[];
  processing_time_ms: number;
}

export interface ScanResponse {
  session_id: string;
  document_type: string;
  ocr: OCRResult;
  mrz: MRZResult;
  biometrics?: FaceMatchResult | null;
  liveness?: LivenessResult | null;
  forensics: ForensicsResult;
  stamp?: StampResult | null;
  cross_validation: CrossValidationResult;
  risk: RiskAssessment;
  processing_time_ms: number;
}

export interface DocumentInspectResponse {
  session_id: string;
  status: string;
  assessment: RiskAssessment;
  details?: ScanResponse | null;
}

export interface CheckpointInfo {
  id: string;
  name: string;
  state: string;
  border: 'Indo-Nepal' | 'Indo-Bhutan';
  code: string;
}

export const CHECKPOINTS: CheckpointInfo[] = [
  { id: 'SSB-WB-JAI-01', name: 'Jaigaon / Phuentsholing', state: 'West Bengal', border: 'Indo-Bhutan', code: 'JAI' },
  { id: 'SSB-UP-SON-01', name: 'Sonauli / Belahiya', state: 'Uttar Pradesh', border: 'Indo-Nepal', code: 'SON' },
  { id: 'SSB-BH-RAX-01', name: 'Raxaul / Birgunj', state: 'Bihar', border: 'Indo-Nepal', code: 'RAX' },
  { id: 'SSB-WB-PAN-01', name: 'Panitanki / Kakarbhitta', state: 'West Bengal', border: 'Indo-Nepal', code: 'PAN' },
  { id: 'SSB-BH-JOG-01', name: 'Jogbani / Biratnagar', state: 'Bihar', border: 'Indo-Nepal', code: 'JOG' },
];

export interface OfficerDecision {
  action: 'AUTO_CLEAR' | 'SECONDARY_INSPECTION' | 'DETAIN_AND_INTERDICT';
  decisionType: 'clear' | 'secondary' | 'interdict';
  reason: string;
  officerNotes: string;
  badgeId: string;
  timestamp: string;
}

export interface ConnectedClient {
  client_ip: string;
  user_agent?: string | null;
  checkpoint_id?: string | null;
  last_seen: string;
  last_endpoint: string;
  total_requests: number;
  latency_ms?: number | null;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE' | string;
}

export interface DevicesResponse {
  status: string;
  total_devices: number;
  devices: ConnectedClient[];
  last_active_device?: ConnectedClient | null;
}

export interface CompanionCapturePayload {
  device_id: string;
  capture_type: 'document' | 'selfie' | 'face' | 'traveler_live';
  image_data: string;
  checkpoint_id?: string;
  timestamp: string;
  filename?: string;
}

export interface CompanionLatestResponse {
  has_capture: boolean;
  sequence_id: number;
  image_data?: string | null;
  capture_type?: string | null;
  device_id?: string | null;
  checkpoint_id?: string | null;
  timestamp?: string | null;
  filename?: string | null;
}

