package com.ssb.fieldscreening.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

enum class RiskLevel {
    GREEN,   // AUTO-CLEAR (Score 0 - <25)
    AMBER,   // SECONDARY HOLD (Score 25 - <70)
    RED      // DETAIN MANDATE (Score 70 - 100 or Tripwire)
}

enum class ConnectivityMode(val label: String, val endpoint: String, val description: String) {
    USB_TETHERED("USB Reverse Tether", "http://127.0.0.1:8000", "Zero-RF Latency <2ms via adb reverse"),
    AIR_GAPPED_WIFI("Air-Gapped Wi-Fi AP", "http://192.168.2.1:8000", "Isolated SSB_GATEWAY_SECURE AP"),
    OFFLINE_OUTBOX("Offline Outbox", "", "SQLCipher Encrypted Local Audit Queue")
}

data class Checkpoint(
    val id: String,
    val name: String,
    val frontier: String,
    val code: String
)

val DEFAULT_CHECKPOINTS = listOf(
    Checkpoint("SSB_SONAULI_01", "Sonauli (Maharajganj)", "Indo-Nepal Frontier", "IND-NPL-01"),
    Checkpoint("SSB_RAXAUL_02", "Raxaul (East Champaran)", "Indo-Nepal Frontier", "IND-NPL-02"),
    Checkpoint("SSB_JAIGAON_01", "Jaigaon / Phuentsholing", "Indo-Bhutan Frontier", "IND-BTN-01"),
    Checkpoint("SSB_PANITANKI_03", "Panitanki (Siliguri)", "Indo-Nepal Frontier", "IND-NPL-03"),
    Checkpoint("SSB_RANIGANJ_04", "Raniganj Checkpost", "Indo-Nepal Frontier", "IND-NPL-04")
)

@JsonClass(generateAdapter = true)
data class HealthResponse(
    val status: String = "healthy",
    @Json(name = "engine_mode") val engineMode: String = "M4_MPS / ONNX_RT",
    @Json(name = "models_loaded") val modelsLoaded: ModelsLoadedMap = ModelsLoadedMap(),
    @Json(name = "uptime_seconds") val uptimeSeconds: Double = 3420.5
)

@JsonClass(generateAdapter = true)
data class ModelsLoadedMap(
    @Json(name = "pp_ocrv4") val ppOcrV4: Boolean = true,
    @Json(name = "adaface") val adaFace: Boolean = true,
    @Json(name = "minifasnet") val miniFasNet: Boolean = true,
    @Json(name = "trufor") val truFor: Boolean = true,
    @Json(name = "doctamper") val docTamper: Boolean = true,
    @Json(name = "stamp_verifier") val stampVerifier: Boolean = true
)

@JsonClass(generateAdapter = true)
data class CompanionUploadAck(
    val status: String = "RECEIVED",
    val message: String? = null,
    val sequence_id: Int = 0,
    val capture_uuid: String? = null,
    val capture_type: String = "document",
    val device_id: String? = null,
    val checkpoint_id: String? = null,
    val filename: String? = null,
    val sha256_hash: String? = null,
    val file_size_bytes: Long? = null,
    val timestamp: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class InspectionResponse(
    @Json(name = "session_id") val sessionId: String,
    val status: String,
    val assessment: Assessment,
    val details: InspectionDetails
)

@JsonClass(generateAdapter = true)
data class Assessment(
    @Json(name = "risk_score") val riskScore: Double,
    @Json(name = "risk_level") val riskLevel: String,
    @Json(name = "auto_clear") val autoClear: Boolean,
    @Json(name = "tripwire_triggered") val tripwireTriggered: Boolean,
    @Json(name = "tripwire_codes") val tripwireCodes: List<String> = emptyList(),
    val reasons: List<String> = emptyList(),
    @Json(name = "cross_validation_violations") val crossValidationViolations: List<String> = emptyList(),
    @Json(name = "model_versions") val modelVersions: Map<String, String> = emptyMap(),
    @Json(name = "processing_time_ms") val processingTimeMs: Double,
    @Json(name = "audit_hash") val auditHash: String,
    @Json(name = "heatmap_base64") val heatmapBase64: String? = null
)

@JsonClass(generateAdapter = true)
data class InspectionDetails(
    @Json(name = "session_id") val sessionId: String,
    @Json(name = "document_type") val documentType: String,
    val ocr: OcrDetails,
    val mrz: MrzDetails,
    val biometrics: BiometricsDetails,
    val liveness: LivenessDetails,
    val forensics: ForensicsDetails,
    val stamp: StampDetails,
    @Json(name = "cross_validation") val crossValidation: CrossValidationDetails,
    val risk: RiskDetails? = null,
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class OcrDetails(
    val status: String = "success",
    @Json(name = "script_detected") val scriptDetected: String = "latin",
    val fields: Map<String, String> = emptyMap(),
    @Json(name = "field_confidences") val fieldConfidences: Map<String, Double> = emptyMap(),
    @Json(name = "mean_confidence") val meanConfidence: Double = 0.97,
    @Json(name = "requires_tier2_vlm") val requiresTier2Vlm: Boolean = false,
    @Json(name = "raw_text") val rawText: String = "",
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 42.0
)

@JsonClass(generateAdapter = true)
data class MrzDetails(
    @Json(name = "mrz_detected") val mrzDetected: Boolean = true,
    @Json(name = "mrz_type") val mrzType: String = "TD3",
    val valid: Boolean = true,
    @Json(name = "raw_lines") val rawLines: List<String> = emptyList(),
    @Json(name = "document_type") val documentType: String = "P",
    @Json(name = "country_code") val countryCode: String = "IND",
    val surname: String = "",
    @Json(name = "given_names") val givenNames: String = "",
    @Json(name = "document_number") val documentNumber: String = "",
    @Json(name = "doc_number_checksum_valid") val docNumberChecksumValid: Boolean = true,
    @Json(name = "dob_checksum_valid") val dobChecksumValid: Boolean = true,
    @Json(name = "expiry_checksum_valid") val expiryChecksumValid: Boolean = true,
    @Json(name = "composite_checksum_valid") val compositeChecksumValid: Boolean = true,
    @Json(name = "checksum_failures") val checksumFailures: List<String> = emptyList(),
    @Json(name = "parsed_fields") val parsedFields: Map<String, String> = emptyMap(),
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 12.5
)

@JsonClass(generateAdapter = true)
data class BiometricsDetails(
    val similarity: Double = 0.0,
    val match: Boolean = false,
    val threshold: Double = 0.35,
    @Json(name = "embedding_model_used") val embeddingModelUsed: String = "AdaFace-ResNet100-ONNX",
    @Json(name = "apparent_age_id") val apparentAgeId: Int = 30,
    @Json(name = "apparent_age_live") val apparentAgeLive: Int = 30,
    @Json(name = "age_drift_years") val ageDriftYears: Int = 0,
    @Json(name = "watchlist_hit") val watchlistHit: Boolean = false,
    @Json(name = "watchlist_distance") val watchlistDistance: Double? = null,
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 110.2
)

@JsonClass(generateAdapter = true)
data class LivenessDetails(
    @Json(name = "is_live") val isLive: Boolean = true,
    val confidence: Double = 0.98,
    @Json(name = "attack_type") val attackType: String? = null,
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 38.4
)

@JsonClass(generateAdapter = true)
data class ForensicsDetails(
    @Json(name = "tamper_score") val tamperScore: Double = 0.0,
    @Json(name = "is_tampered") val isTampered: Boolean = false,
    @Json(name = "photo_region_tampered") val photoRegionTampered: Boolean = false,
    val reasons: List<String> = emptyList(),
    @Json(name = "detected_anomalies") val detectedAnomalies: List<String> = emptyList(),
    @Json(name = "tampered_regions") val tamperedRegions: List<TamperedRegion> = emptyList(),
    @Json(name = "doctamper_score") val docTamperScore: Double = 0.0,
    @Json(name = "trufor_score") val truForScore: Double = 0.0,
    @Json(name = "exif_suspicious") val exifSuspicious: Boolean = false,
    @Json(name = "dqt_quantization_altered") val dqtQuantizationAltered: Boolean = false,
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 140.0
)

@JsonClass(generateAdapter = true)
data class TamperedRegion(
    val bbox: List<Int> = emptyList(), // [x1, y1, x2, y2]
    @Json(name = "peak_tamper_probability") val peakTamperProbability: Double = 0.0,
    @Json(name = "tamper_type") val tamperType: String = "",
    @Json(name = "affected_field") val affectedField: String = ""
)

@JsonClass(generateAdapter = true)
data class StampDetails(
    @Json(name = "stamp_found") val stampFound: Boolean = true,
    @Json(name = "stamp_score") val stampScore: Double = 0.92,
    val verdict: String = "AUTHENTIC",
    @Json(name = "checkpost_id") val checkpostId: String = "SSB_JAIGAON_01",
    @Json(name = "location_name") val locationName: String = "Jaigaon / Phuentsholing",
    @Json(name = "ssim_score") val ssimScore: Double = 0.92,
    @Json(name = "orb_match_count") val orbMatchCount: Int = 42,
    @Json(name = "tamper_energy") val tamperEnergy: Double = 0.08,
    @Json(name = "context_consistent") val contextConsistent: Boolean = true,
    @Json(name = "stamp_bbox") val stampBbox: List<Int> = emptyList(),
    val reasons: List<String> = emptyList(),
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 24.0
)

@JsonClass(generateAdapter = true)
data class CrossValidationDetails(
    @Json(name = "cross_validation_passed") val crossValidationPassed: Boolean = true,
    @Json(name = "violation_count") val violationCount: Int = 0,
    @Json(name = "critical_violations") val criticalViolations: List<CriticalViolation> = emptyList(),
    val warnings: List<String> = emptyList(),
    val flags: List<ViolationFlag> = emptyList(),
    @Json(name = "rules_checked") val rulesChecked: Int = 8,
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 14.0
)

@JsonClass(generateAdapter = true)
data class CriticalViolation(
    @Json(name = "rule_id") val ruleId: String,
    @Json(name = "rule_name") val ruleName: String,
    val severity: String,
    @Json(name = "field_name") val fieldName: String,
    @Json(name = "expected_value") val expectedValue: String,
    @Json(name = "actual_value") val actualValue: String,
    @Json(name = "telemetry_code") val telemetryCode: String,
    val details: String
)

@JsonClass(generateAdapter = true)
data class ViolationFlag(
    @Json(name = "rule_id") val ruleId: String,
    @Json(name = "rule_description") val ruleDescription: String,
    val passed: Boolean,
    @Json(name = "telemetry_message") val telemetryMessage: String
)

@JsonClass(generateAdapter = true)
data class RiskDetails(
    @Json(name = "risk_score") val riskScore: Double,
    @Json(name = "risk_level") val riskLevel: String,
    @Json(name = "auto_clear") val autoClear: Boolean,
    @Json(name = "tripwire_triggered") val tripwireTriggered: Boolean,
    @Json(name = "tripwire_codes") val tripwireCodes: List<String> = emptyList(),
    val reasons: List<String> = emptyList(),
    @Json(name = "cross_validation_violations") val crossValidationViolations: List<String> = emptyList(),
    @Json(name = "processing_time_ms") val processingTimeMs: Double = 0.0,
    @Json(name = "audit_hash") val auditHash: String = ""
)

enum class OfficerActionType {
    AUTO_CLEAR,
    SECONDARY_HOLD,
    DETAIN_MANDATE
}

data class OfficerDecisionRecord(
    val action: OfficerActionType,
    val officerId: String,
    val officerName: String,
    val checkpointId: String,
    val sessionId: String,
    val remarks: String,
    val timestamp: Long = System.currentTimeMillis(),
    val digitalSignatureHash: String
)
