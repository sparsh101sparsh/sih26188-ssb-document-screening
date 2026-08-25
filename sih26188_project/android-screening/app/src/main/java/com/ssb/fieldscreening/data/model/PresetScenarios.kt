package com.ssb.fieldscreening.data.model

data class PresetScenario(
    val id: String,
    val title: String,
    val subtitle: String,
    val travelerName: String,
    val documentType: String,
    val documentNumber: String,
    val expectedRiskLevel: RiskLevel,
    val riskScore: Double,
    val tripwireTriggered: Boolean,
    val badgeLabel: String,
    val inspectionResponse: InspectionResponse
)

val PRESET_SCENARIOS: List<PresetScenario> = listOf(
    // 1. Clean Passport (Auto-Clear Fast Path)
    PresetScenario(
        id = "clean_passport",
        title = "Clean Passport",
        subtitle = "Valid TD3 MRZ · 1:1 Bio Match · Valid ICAO Checksum",
        travelerName = "TRAVELER-TEST-01",
        documentType = "Passport (Republic of India)",
        documentNumber = "TEST-DOC-001",
        expectedRiskLevel = RiskLevel.GREEN,
        riskScore = 4.2,
        tripwireTriggered = false,
        badgeLabel = "GREEN / AUTO-CLEAR",
        inspectionResponse = InspectionResponse(
            sessionId = "SSB-INSP-2026-849100",
            status = "completed",
            assessment = Assessment(
                riskScore = 4.2,
                riskLevel = "GREEN",
                autoClear = true,
                tripwireTriggered = false,
                tripwireCodes = emptyList(),
                reasons = listOf(
                    "All ICAO 9303 Modulo-10 checksums validated successfully (Document No, DOB, Expiry, Composite).",
                    "Face Match Confidence (94%) exceeds verification threshold (Positive 1:1 Match).",
                    "Selfie Liveness Check confirms genuine traveler (Confidence: 98%).",
                    "Ink & substrate integrity check found no pixel splicing or surface tampering."
                ),
                crossValidationViolations = emptyList(),
                modelVersions = mapOf(
                    "pp_ocr" to "PP-OCRv4-Multilingual",
                    "mrz_engine" to "ICAO-9303-v2.1",
                    "face_embedder" to "AdaFace-ResNet100-ONNX",
                    "tamper_detector" to "DocTamper-ResNet50-DTD",
                    "stamp_verifier" to "SSB-MultiStage-ORB-SSIM"
                ),
                processingTimeMs = 412.4,
                auditHash = "SHA256:7f3b892a01d51c4a960e0a581898b3c9f2b84931a7429188e7b99c7f1a9b4412",
                heatmapBase64 = null
            ),
            details = InspectionDetails(
                sessionId = "SSB-INSP-2026-849100",
                documentType = "passport",
                ocr = OcrDetails(
                    status = "success",
                    scriptDetected = "latin",
                    fields = mapOf(
                        "full_name" to "TRAVELER-TEST-01",
                        "document_number" to "TEST-DOC-001",
                        "dob" to "14/08/1994",
                        "nationality" to "IND",
                        "sex" to "M",
                        "expiry_date" to "20/01/2034"
                    ),
                    fieldConfidences = mapOf(
                        "full_name" to 0.99,
                        "document_number" to 0.99,
                        "dob" to 0.98,
                        "expiry_date" to 0.98
                    ),
                    meanConfidence = 0.985,
                    requiresTier2Vlm = false,
                    rawText = "PASSPORT REPUBLIC OF INDIA\nSURNAME: TEST\nGIVEN NAMES: TRAVELER ONE\nNATIONALITY: INDIAN\nDOB: 14/08/1994\nSEX: M\nPLACE OF ISSUE: DELHI",
                    processingTimeMs = 38.0
                ),
                mrz = MrzDetails(
                    mrzDetected = true,
                    mrzType = "TD3",
                    valid = true,
                    rawLines = listOf(
                        "P<INDTEST<<TRAVELER<ONE<<<<<<<<<<<<<<<<<<<<<",
                        "TESTDOC0018IND9408144M3401201<<<<<<<<<<<<<<6"
                    ),
                    documentType = "P",
                    countryCode = "IND",
                    surname = "TEST",
                    givenNames = "TRAVELER ONE",
                    documentNumber = "TEST-DOC-001",
                    docNumberChecksumValid = true,
                    dobChecksumValid = true,
                    expiryChecksumValid = true,
                    compositeChecksumValid = true,
                    checksumFailures = emptyList(),
                    parsedFields = mapOf(
                        "surname" to "TEST",
                        "given_names" to "TRAVELER ONE",
                        "dob" to "940814",
                        "expiry" to "340120",
                        "sex" to "M",
                        "country" to "IND"
                    ),
                    processingTimeMs = 11.2
                ),
                biometrics = BiometricsDetails(
                    similarity = 0.94,
                    match = true,
                    threshold = 0.35,
                    embeddingModelUsed = "AdaFace-ResNet100-ONNX",
                    apparentAgeId = 32,
                    apparentAgeLive = 32,
                    ageDriftYears = 0,
                    watchlistHit = false,
                    watchlistDistance = null,
                    processingTimeMs = 98.4
                ),
                liveness = LivenessDetails(
                    isLive = true,
                    confidence = 0.98,
                    attackType = null,
                    processingTimeMs = 34.2
                ),
                forensics = ForensicsDetails(
                    tamperScore = 0.03,
                    isTampered = false,
                    photoRegionTampered = false,
                    reasons = listOf("Substrate texture uniform and consistent across portrait, text zone, and security microprint."),
                    detectedAnomalies = emptyList(),
                    tamperedRegions = emptyList(),
                    docTamperScore = 0.02,
                    truForScore = 0.04,
                    exifSuspicious = false,
                    dqtQuantizationAltered = false,
                    processingTimeMs = 122.0
                ),
                stamp = StampDetails(
                    stampFound = true,
                    stampScore = 0.92,
                    verdict = "AUTHENTIC",
                    checkpostId = "SSB_SONAULI_01",
                    locationName = "Sonauli / Belahiya Frontier",
                    ssimScore = 0.92,
                    orbMatchCount = 54,
                    tamperEnergy = 0.06,
                    contextConsistent = true,
                    stampBbox = listOf(310, 190, 450, 310),
                    reasons = listOf("Stamp contour correlates with SSB Sonauli primary registry seal (SSIM 0.92 > 0.75)."),
                    processingTimeMs = 21.0
                ),
                crossValidation = CrossValidationDetails(
                    crossValidationPassed = true,
                    violationCount = 0,
                    criticalViolations = emptyList(),
                    warnings = emptyList(),
                    flags = listOf(
                        ViolationFlag("CV-01", "MRZ DOB vs Visual OCR DOB", true, "DOB matched exactly: 1994-08-14"),
                        ViolationFlag("CV-02", "MRZ Doc No vs Visual Doc No", true, "Doc number TEST-DOC-001 matched"),
                        ViolationFlag("CV-03", "MRZ Name vs Visual Full Name", true, "TRAVELER-TEST-01 matched exactly"),
                        ViolationFlag("CV-04", "Biometric Apparent Age vs DOB", true, "Age drift (0 yrs) within ±5 yr tolerance"),
                        ViolationFlag("CV-05", "Photo Splicing Density", true, "No portrait splicing detected (Score: 0.02)"),
                        ViolationFlag("CV-06", "Text Tamper Probability", true, "No text scraping localized (Score: 0.03)"),
                        ViolationFlag("CV-07", "Stamp Context Consistency", true, "Registry seal authenticated (SSIM: 0.92)"),
                        ViolationFlag("CV-08", "Cryptographic Signature", true, "ICAO PKI & Modulo-10 valid")
                    ),
                    rulesChecked = 8,
                    processingTimeMs = 12.0
                ),
                risk = RiskDetails(
                    riskScore = 4.2,
                    riskLevel = "GREEN",
                    autoClear = true,
                    tripwireTriggered = false,
                    tripwireCodes = emptyList(),
                    reasons = listOf("All multi-stream checks passed cleanly."),
                    crossValidationViolations = emptyList(),
                    processingTimeMs = 412.4,
                    auditHash = "SHA256:7f3b892a01d51c4a960e0a581898b3c9f2b84931a7429188e7b99c7f1a9b4412"
                ),
                processingTimeMs = 412.4
            )
        )
    ),

    // 2. Forged Aadhaar (Critical DOB mismatch, Substrate tampering, Critical Trigger)
    PresetScenario(
        id = "forged_aadhaar",
        title = "Forged Aadhaar Card",
        subtitle = "Visual DOB 1994 vs MRZ 1984 · Substrate Tamper Detected",
        travelerName = "TRAVELER-TEST-02",
        documentType = "Aadhaar Card (UIDAI)",
        documentNumber = "TEST-DOC-002",
        expectedRiskLevel = RiskLevel.RED,
        riskScore = 94.5,
        tripwireTriggered = true,
        badgeLabel = "RED / DETAIN MANDATE",
        inspectionResponse = InspectionResponse(
            sessionId = "SSB-INSP-849201",
            status = "completed",
            assessment = Assessment(
                riskScore = 94.5,
                riskLevel = "RED",
                autoClear = false,
                tripwireTriggered = true,
                tripwireCodes = listOf(
                    "CRITICAL_TRIGGER_CRYPT_SIG_INVALID: UIDAI RSA-2048 Digital Signature Tampered"
                ),
                reasons = listOf(
                    "CRITICAL: Visual Date of Birth (14/08/1994) contradicts MRZ encoded birth year (1984).",
                    "Photo substrate shows localized pixel splicing and photo replacement.",
                    "Selfie Liveness Check flagged 2D digital screen replay presentation attack."
                ),
                crossValidationViolations = listOf(
                    "CV-01: MRZ DOB vs Visual OCR DOB Mismatch"
                ),
                modelVersions = mapOf(
                    "pp_ocr" to "PP-OCRv4-Multilingual",
                    "mrz_engine" to "ICAO-9303-v2.1",
                    "face_embedder" to "AdaFace-ResNet100-ONNX",
                    "tamper_detector" to "DocTamper-ResNet50-DTD",
                    "stamp_verifier" to "SSB-MultiStage-ORB-SSIM"
                ),
                processingTimeMs = 482.1,
                auditHash = "SHA256:a4f135b91b97b0a48b52f9b8c281313c054045f096238b16f39d89241512db47",
                heatmapBase64 = null
            ),
            details = InspectionDetails(
                sessionId = "SSB-INSP-849201",
                documentType = "aadhaar",
                ocr = OcrDetails(
                    status = "success",
                    scriptDetected = "latin",
                    fields = mapOf(
                        "full_name" to "TRAVELER-TEST-02",
                        "document_number" to "TEST-DOC-002",
                        "dob" to "14/08/1994",
                        "issuing_country" to "IND",
                        "gender" to "Male"
                    ),
                    fieldConfidences = mapOf("full_name" to 0.98, "dob" to 0.96, "document_number" to 0.99),
                    meanConfidence = 0.97,
                    requiresTier2Vlm = false,
                    rawText = "GOVERNMENT OF INDIA\nTRAVELER-TEST-02\nDOB: 14/08/1994\nMALE\nTEST-DOC-002\nVID: 9999 0000 1111 2222",
                    processingTimeMs = 42.0
                ),
                mrz = MrzDetails(
                    mrzDetected = true,
                    mrzType = "TD3",
                    valid = false,
                    rawLines = listOf(
                        "P<INDTEST<<TRAVELER<TWO<<<<<<<<<<<<<<<<<<<<<",
                        "TESTDOC0021IND8408141M3001011<<<<<<<<<<<<<<4"
                    ),
                    documentType = "P",
                    countryCode = "IND",
                    surname = "TEST",
                    givenNames = "TRAVELER TWO",
                    documentNumber = "TEST-DOC-002",
                    docNumberChecksumValid = true,
                    dobChecksumValid = true,
                    expiryChecksumValid = true,
                    compositeChecksumValid = true,
                    checksumFailures = emptyList(),
                    parsedFields = mapOf(
                        "surname" to "TEST",
                        "given_names" to "TRAVELER TWO",
                        "dob" to "840814"
                    ),
                    processingTimeMs = 12.5
                ),
                biometrics = BiometricsDetails(
                    similarity = 0.31,
                    match = false,
                    threshold = 0.35,
                    embeddingModelUsed = "AdaFace-ResNet100-ONNX",
                    apparentAgeId = 40,
                    apparentAgeLive = 30,
                    ageDriftYears = 10,
                    watchlistHit = false,
                    watchlistDistance = null,
                    processingTimeMs = 110.2
                ),
                liveness = LivenessDetails(
                    isLive = false,
                    confidence = 0.04,
                    attackType = "2D_SCREEN_REPLAY",
                    processingTimeMs = 38.4
                ),
                forensics = ForensicsDetails(
                    tamperScore = 0.94,
                    isTampered = true,
                    photoRegionTampered = true,
                    reasons = listOf(
                        "Localized surface substrate tampering detected in portrait zone.",
                        "Substrate analysis identified text field scraping in Date of Birth section."
                    ),
                    detectedAnomalies = listOf("PHOTO_SUBSTITUTION", "TEXT_SCRAPING"),
                    tamperedRegions = listOf(
                        TamperedRegion(
                            bbox = listOf(180, 120, 360, 150),
                            peakTamperProbability = 0.94,
                            tamperType = "TEXT_SCRAPING",
                            affectedField = "dob"
                        ),
                        TamperedRegion(
                            bbox = listOf(40, 50, 140, 170),
                            peakTamperProbability = 0.89,
                            tamperType = "PHOTO_SUBSTITUTION",
                            affectedField = "photo_substrate"
                        )
                    ),
                    docTamperScore = 0.94,
                    truForScore = 0.88,
                    exifSuspicious = false,
                    dqtQuantizationAltered = true,
                    processingTimeMs = 140.0
                ),
                stamp = StampDetails(
                    stampFound = true,
                    stampScore = 0.42,
                    verdict = "FORGED",
                    checkpostId = "SSB_JAIGAON_01",
                    locationName = "Jaigaon / Phuentsholing",
                    ssimScore = 0.42,
                    orbMatchCount = 8,
                    tamperEnergy = 0.82,
                    contextConsistent = false,
                    stampBbox = listOf(320, 200, 460, 320),
                    reasons = listOf(
                        "Stamp contour failed SSB registry template correlation (SSIM 0.42 < 0.75)."
                    ),
                    processingTimeMs = 24.0
                ),
                crossValidation = CrossValidationDetails(
                    crossValidationPassed = false,
                    violationCount = 1,
                    criticalViolations = listOf(
                        CriticalViolation(
                            ruleId = "CV-01",
                            ruleName = "MRZ DOB vs Visual OCR DOB",
                            severity = "CRITICAL",
                            fieldName = "dob",
                            expectedValue = "1984-08-14",
                            actualValue = "1994-08-14",
                            telemetryCode = "TAMPER_DOB_MISMATCH",
                            details = "Visual DOB 1994 does not match MRZ encoded birth year 1984."
                        )
                    ),
                    warnings = emptyList(),
                    flags = listOf(
                        ViolationFlag("CV-01", "MRZ DOB vs Visual OCR DOB", false, "DOB mismatch: Visual 1994 vs MRZ 1984"),
                        ViolationFlag("CV-02", "MRZ Doc No vs Visual Doc No", true, "Doc number matched exactly"),
                        ViolationFlag("CV-03", "MRZ Name vs Visual Full Name", true, "Name matched exactly"),
                        ViolationFlag("CV-04", "Biometric Apparent Age vs DOB", true, "Age drift within bounds"),
                        ViolationFlag("CV-05", "Photo Splicing Density", false, "Portrait replacement detected"),
                        ViolationFlag("CV-06", "Text Tamper Probability", false, "Text scraping localized"),
                        ViolationFlag("CV-07", "Stamp Context Consistency", false, "SSIM correlation failure"),
                        ViolationFlag("CV-08", "Cryptographic Signature", true, "Valid RSA-2048 PKI")
                    ),
                    rulesChecked = 8,
                    processingTimeMs = 14.0
                ),
                risk = RiskDetails(
                    riskScore = 94.5,
                    riskLevel = "RED",
                    autoClear = false,
                    tripwireTriggered = true,
                    tripwireCodes = listOf("TRIPWIRE_CRYPT_SIG_INVALID"),
                    reasons = listOf("Discrepancies found across OCR, MRZ, and Forensics."),
                    crossValidationViolations = listOf("CV-01"),
                    processingTimeMs = 482.1,
                    auditHash = "SHA256:a4f135b91b97b0a48b52f9b8c281313c054045f096238b16f39d89241512db47"
                ),
                processingTimeMs = 482.1
            )
        )
    ),

    // 3. Tampered Stamp (SSB Stamp SSIM 0.42 < 0.75, Secondary Inspection Hold)
    PresetScenario(
        id = "tampered_stamp",
        title = "Tampered Stamp Permit",
        subtitle = "Jaigaon / Phuentsholing Border Stamp SSIM 0.42 < 0.75 Threshold",
        travelerName = "TRAVELER-TEST-03",
        documentType = "Border Transit Permit (Indo-Bhutan)",
        documentNumber = "TEST-DOC-003",
        expectedRiskLevel = RiskLevel.AMBER,
        riskScore = 58.0,
        tripwireTriggered = false,
        badgeLabel = "AMBER / SECONDARY HOLD",
        inspectionResponse = InspectionResponse(
            sessionId = "SSB-INSP-2026-591244",
            status = "completed",
            assessment = Assessment(
                riskScore = 58.0,
                riskLevel = "AMBER",
                autoClear = false,
                tripwireTriggered = false,
                tripwireCodes = emptyList(),
                reasons = listOf(
                    "WARNING: Border transit seal failed 4-stage ORB / SSIM template correlation (SSIM: 0.42 vs 0.75 required).",
                    "ORB keypoint matches (8 points) below minimum security baseline of 35 points.",
                    "Secondary verification required at Counter 2 for physical ink chemical luminescence testing."
                ),
                crossValidationViolations = listOf("CV-07: Stamp Context Consistency"),
                modelVersions = mapOf(
                    "pp_ocr" to "PP-OCRv4-Multilingual",
                    "mrz_engine" to "ICAO-9303-v2.1",
                    "face_embedder" to "AdaFace-ResNet100-ONNX",
                    "tamper_detector" to "DocTamper-ResNet50-DTD",
                    "stamp_verifier" to "SSB-MultiStage-ORB-SSIM"
                ),
                processingTimeMs = 438.7,
                auditHash = "SHA256:d89e41b2c01948fa88c21a4e512b98e77a1120938f902484a0b23089d817412e",
                heatmapBase64 = null
            ),
            details = InspectionDetails(
                sessionId = "SSB-INSP-2026-591244",
                documentType = "border_permit",
                ocr = OcrDetails(
                    status = "success",
                    scriptDetected = "latin",
                    fields = mapOf(
                        "full_name" to "TRAVELER-TEST-03",
                        "document_number" to "TEST-DOC-003",
                        "dob" to "02/11/1988",
                        "nationality" to "BTN",
                        "permit_validity" to "7 DAYS"
                    ),
                    fieldConfidences = mapOf("full_name" to 0.97, "document_number" to 0.98),
                    meanConfidence = 0.96,
                    requiresTier2Vlm = false,
                    rawText = "ROYAL GOVERNMENT OF BHUTAN / SSB BORDER TRANSIT PERMIT\nNAME: TRAVELER-TEST-03\nCITIZENSHIP NO: TEST-DOC-003\nENTRY CHECKPOINT: JAIGAON\nSTAMP ID: JAIGAON-SEAL-01",
                    processingTimeMs = 40.0
                ),
                mrz = MrzDetails(
                    mrzDetected = false,
                    mrzType = "NONE",
                    valid = true,
                    rawLines = emptyList(),
                    documentType = "PERMIT",
                    countryCode = "BTN",
                    surname = "TEST",
                    givenNames = "TRAVELER THREE",
                    documentNumber = "TEST-DOC-003",
                    processingTimeMs = 8.0
                ),
                biometrics = BiometricsDetails(
                    similarity = 0.88,
                    match = true,
                    threshold = 0.35,
                    embeddingModelUsed = "AdaFace-ResNet100-ONNX",
                    apparentAgeId = 38,
                    apparentAgeLive = 37,
                    ageDriftYears = 1,
                    watchlistHit = false,
                    watchlistDistance = null,
                    processingTimeMs = 102.0
                ),
                liveness = LivenessDetails(
                    isLive = true,
                    confidence = 0.96,
                    attackType = null,
                    processingTimeMs = 36.0
                ),
                forensics = ForensicsDetails(
                    tamperScore = 0.34,
                    isTampered = false,
                    photoRegionTampered = false,
                    reasons = listOf("Ink bleed irregularity around circular border perimeter."),
                    detectedAnomalies = listOf("STAMP_INCONSISTENCY"),
                    tamperedRegions = listOf(
                        TamperedRegion(
                            bbox = listOf(320, 200, 460, 320),
                            peakTamperProbability = 0.58,
                            tamperType = "STAMP_IRREGULARITY",
                            affectedField = "official_seal"
                        )
                    ),
                    docTamperScore = 0.31,
                    truForScore = 0.28,
                    exifSuspicious = false,
                    dqtQuantizationAltered = false,
                    processingTimeMs = 135.0
                ),
                stamp = StampDetails(
                    stampFound = true,
                    stampScore = 0.42,
                    verdict = "TAMPERED",
                    checkpostId = "SSB_JAIGAON_01",
                    locationName = "Jaigaon / Phuentsholing",
                    ssimScore = 0.42,
                    orbMatchCount = 8,
                    tamperEnergy = 0.82,
                    contextConsistent = false,
                    stampBbox = listOf(320, 200, 460, 320),
                    reasons = listOf(
                        "Rubber stamp geometry deviates from SSB official master seal (SSIM 0.42 < 0.75 standard).",
                        "Font kerning on 'IMMIGRATION JAIGAON' does not match 2026 laser template."
                    ),
                    processingTimeMs = 28.0
                ),
                crossValidation = CrossValidationDetails(
                    crossValidationPassed = false,
                    violationCount = 1,
                    criticalViolations = listOf(
                        CriticalViolation(
                            ruleId = "CV-07",
                            ruleName = "Stamp Context Consistency",
                            severity = "HIGH",
                            fieldName = "official_seal",
                            expectedValue = "SSIM >= 0.75 (ORB >= 35)",
                            actualValue = "SSIM: 0.42 (ORB: 8)",
                            telemetryCode = "STAMP_CORRELATION_FAIL",
                            details = "Stamp geometry failed SSB registry verification."
                        )
                    ),
                    warnings = listOf("Traveler documents held for physical chemical test."),
                    flags = listOf(
                        ViolationFlag("CV-01", "MRZ DOB vs Visual OCR DOB", true, "Not applicable (Permit Card)"),
                        ViolationFlag("CV-02", "Doc No Formatting", true, "Valid Permit Series"),
                        ViolationFlag("CV-03", "Full Name Extraction", true, "TRAVELER-TEST-03 matched"),
                        ViolationFlag("CV-04", "Biometric Apparent Age", true, "Age drift (1 yr) OK"),
                        ViolationFlag("CV-05", "Photo Splicing Density", true, "No portrait tampering"),
                        ViolationFlag("CV-06", "Text Tamper Probability", true, "Text substrate clean"),
                        ViolationFlag("CV-07", "Stamp Context Consistency", false, "SSIM 0.42 failed correlation"),
                        ViolationFlag("CV-08", "Cryptographic Signature", true, "Bar-coded QR checksum valid")
                    ),
                    rulesChecked = 8,
                    processingTimeMs = 13.0
                ),
                risk = RiskDetails(
                    riskScore = 58.0,
                    riskLevel = "AMBER",
                    autoClear = false,
                    tripwireTriggered = false,
                    tripwireCodes = emptyList(),
                    reasons = listOf("Stamp correlation failure requires Secondary inspection."),
                    crossValidationViolations = listOf("CV-07"),
                    processingTimeMs = 438.7,
                    auditHash = "SHA256:d89e41b2c01948fa88c21a4e512b98e77a1120938f902484a0b23089d817412e"
                ),
                processingTimeMs = 438.7
            )
        )
    ),

    // 4. Presentation Spoof (2D Digital Screen Replay Attack)
    PresetScenario(
        id = "presentation_spoof",
        title = "Presentation Spoof",
        subtitle = "2D Screen Replay Attack · Face Mismatch · Critical Threat Level",
        travelerName = "TRAVELER-TEST-04",
        documentType = "Passport (Republic of India)",
        documentNumber = "TEST-DOC-004",
        expectedRiskLevel = RiskLevel.RED,
        riskScore = 91.0,
        tripwireTriggered = true,
        badgeLabel = "RED / DETAIN MANDATE",
        inspectionResponse = InspectionResponse(
            sessionId = "SSB-INSP-2026-918233",
            status = "completed",
            assessment = Assessment(
                riskScore = 91.0,
                riskLevel = "RED",
                autoClear = false,
                tripwireTriggered = true,
                tripwireCodes = listOf(
                    "CRITICAL_TRIGGER_BIOMETRIC_SPOOF: Detected 2D Electronic Screen Presentation Attack"
                ),
                reasons = listOf(
                    "CRITICAL: Selfie Liveness Check identified moiré screen grid artifacts in live selfie (Confidence: 4%).",
                    "Face Match Confidence (31%) below verification threshold (35%).",
                    "Subject attempted presentation spoofing using electronic display."
                ),
                crossValidationViolations = listOf(
                    "CV-05: Biometric Liveness Presentation Attack"
                ),
                modelVersions = mapOf(
                    "pp_ocr" to "PP-OCRv4-Multilingual",
                    "mrz_engine" to "ICAO-9303-v2.1",
                    "face_embedder" to "AdaFace-ResNet100-ONNX",
                    "tamper_detector" to "DocTamper-ResNet50-DTD",
                    "stamp_verifier" to "SSB-MultiStage-ORB-SSIM"
                ),
                processingTimeMs = 398.2,
                auditHash = "SHA256:39bf82710dae928c0b9f2918848123bcdef019485123908481a8b94129841289",
                heatmapBase64 = null
            ),
            details = InspectionDetails(
                sessionId = "SSB-INSP-2026-918233",
                documentType = "passport",
                ocr = OcrDetails(
                    status = "success",
                    scriptDetected = "latin",
                    fields = mapOf(
                        "full_name" to "TRAVELER-TEST-04",
                        "document_number" to "TEST-DOC-004",
                        "dob" to "28/05/1991",
                        "nationality" to "IND"
                    ),
                    fieldConfidences = mapOf("full_name" to 0.98, "document_number" to 0.98),
                    meanConfidence = 0.98,
                    requiresTier2Vlm = false,
                    rawText = "PASSPORT REPUBLIC OF INDIA\nTEST, TRAVELER FOUR\nTEST-DOC-004\nDOB: 28/05/1991",
                    processingTimeMs = 39.0
                ),
                mrz = MrzDetails(
                    mrzDetected = true,
                    mrzType = "TD3",
                    valid = true,
                    rawLines = listOf(
                        "P<INDTEST<<TRAVELER<FOUR<<<<<<<<<<<<<<<<<<<<",
                        "TESTDOC0042IND9105284M3105281<<<<<<<<<<<<<<8"
                    ),
                    documentType = "P",
                    countryCode = "IND",
                    surname = "TEST",
                    givenNames = "TRAVELER FOUR",
                    documentNumber = "TEST-DOC-004",
                    processingTimeMs = 10.5
                ),
                biometrics = BiometricsDetails(
                    similarity = 0.31,
                    match = false,
                    threshold = 0.35,
                    embeddingModelUsed = "AdaFace-ResNet100-ONNX",
                    apparentAgeId = 35,
                    apparentAgeLive = 24,
                    ageDriftYears = 11,
                    watchlistHit = false,
                    watchlistDistance = null,
                    processingTimeMs = 108.0
                ),
                liveness = LivenessDetails(
                    isLive = false,
                    confidence = 0.04,
                    attackType = "2D_SCREEN_REPLAY",
                    processingTimeMs = 35.0
                ),
                forensics = ForensicsDetails(
                    tamperScore = 0.12,
                    isTampered = false,
                    photoRegionTampered = false,
                    reasons = listOf("Document substrate is genuine; spoofing occurred in biometric live capture channel."),
                    detectedAnomalies = listOf("BIOMETRIC_SPOOF"),
                    tamperedRegions = emptyList(),
                    docTamperScore = 0.10,
                    truForScore = 0.14,
                    exifSuspicious = false,
                    dqtQuantizationAltered = false,
                    processingTimeMs = 118.0
                ),
                stamp = StampDetails(
                    stampFound = true,
                    stampScore = 0.91,
                    verdict = "AUTHENTIC",
                    checkpostId = "SSB_PANITANKI_03",
                    locationName = "Panitanki (Siliguri)",
                    ssimScore = 0.91,
                    orbMatchCount = 48,
                    tamperEnergy = 0.07,
                    contextConsistent = true,
                    stampBbox = listOf(280, 180, 420, 300),
                    reasons = listOf("Stamp matched SSB Panitanki registry."),
                    processingTimeMs = 22.0
                ),
                crossValidation = CrossValidationDetails(
                    crossValidationPassed = false,
                    violationCount = 1,
                    criticalViolations = listOf(
                        CriticalViolation(
                            ruleId = "CV-05",
                            ruleName = "Biometric Liveness Presentation Attack",
                            severity = "CRITICAL",
                            fieldName = "live_biometrics",
                            expectedValue = "Liveness >= 0.85 (3D Biological Face)",
                            actualValue = "Liveness: 0.04 (2D Screen Replay)",
                            telemetryCode = "PRESENTATION_ATTACK_DETECTED",
                            details = "Selfie Liveness Check detected digital display replay attack."
                        )
                    ),
                    warnings = emptyList(),
                    flags = listOf(
                        ViolationFlag("CV-01", "MRZ DOB vs Visual OCR DOB", true, "DOB matched"),
                        ViolationFlag("CV-02", "MRZ Doc No vs Visual Doc No", true, "Doc number matched"),
                        ViolationFlag("CV-03", "MRZ Name vs Visual Full Name", true, "Name matched"),
                        ViolationFlag("CV-04", "Biometric Apparent Age vs DOB", false, "Age drift (11 yrs) exceeded bounds"),
                        ViolationFlag("CV-05", "Biometric Liveness", false, "2D screen replay attack detected"),
                        ViolationFlag("CV-06", "Text Tamper Probability", true, "Text substrate clean"),
                        ViolationFlag("CV-07", "Stamp Context Consistency", true, "Stamp verified"),
                        ViolationFlag("CV-08", "Cryptographic Signature", true, "ICAO PKI Valid")
                    ),
                    rulesChecked = 8,
                    processingTimeMs = 12.0
                ),
                risk = RiskDetails(
                    riskScore = 91.0,
                    riskLevel = "RED",
                    autoClear = false,
                    tripwireTriggered = true,
                    tripwireCodes = listOf("TRIPWIRE_BIOMETRIC_SPOOF"),
                    reasons = listOf("2D Screen Replay attack detected."),
                    crossValidationViolations = listOf("CV-05"),
                    processingTimeMs = 398.2,
                    auditHash = "SHA256:39bf82710dae928c0b9f2918848123bcdef019485123908481a8b94129841289"
                ),
                processingTimeMs = 398.2
            )
        )
    )
)
