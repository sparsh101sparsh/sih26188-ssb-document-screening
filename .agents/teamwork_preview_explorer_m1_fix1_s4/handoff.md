# Investigation & Remediation Plan: Android Compilation Type Mismatch Fix

**Agent**: `teamwork_preview_explorer_m1_fix1_s4`  
**Working Directory**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/.agents/teamwork_preview_explorer_m1_fix1_s4`  
**Project Root**: `/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project`  
**Date**: 2026-09-09  
**Type**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

### 1.1 Verbatim Compilation Failure
From the Forensic Audit Report (`teamwork_preview_auditor_m1_s4/handoff.md:24-25`):
```text
> Task :app:compileDebugKotlin FAILED
e: file:///Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/android-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt:474:32 Argument type mismatch: actual type is 'List<String> & List<String>', but 'List<CriticalViolation>' was expected.
```

### 1.2 Target File and Defect Site: `SsbRepository.kt:470-487`
In `android-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt`:
```kotlin
470:                 crossValidation = CrossValidationDetails(
471:                     crossValidationPassed = hasFace,
472:                     violationCount = if (hasFace) 0 else 1,
473:                     criticalViolations = emptyList(),
474:                     warnings = if (hasFace) emptyList() else listOf("Biometric selfie photo was not captured."),
475:                     flags = listOf(
476:                         ViolationFlag("CV-01", "MRZ DOB vs Visual OCR DOB", true, "DOB matched: 1992-04-19"),
477:                         ViolationFlag("CV-02", "MRZ Doc No vs Visual Doc No", true, "Doc number P8810294 matched"),
478:                         ViolationFlag("CV-03", "MRZ Name vs Visual Full Name", true, "RAO DEVENDRA matched"),
479:                         ViolationFlag("CV-04", "Biometric Apparent Age", true, "Age within tolerance"),
480:                         ViolationFlag("CV-05", "Photo Splicing Density", true, "No splicing"),
481:                         ViolationFlag("CV-06", "Text Tamper Probability", true, "Substrate intact"),
482:                         ViolationFlag("CV-07", "Stamp Context Consistency", true, "Checkpost stamp verified"),
483:                         ViolationFlag("CV-08", "Cryptographic Signature", true, "Modulo-10 valid")
484:                     ),
485:                     rulesChecked = 8,
486:                     processingTimeMs = 11.0
487:                 ),
```
At line 474, `warnings` evaluates to `listOf("Biometric selfie photo was not captured.")` (a `List<String>`) when `hasFace` is false.

### 1.3 Missing Import in `SsbRepository.kt:1-25`
`SsbRepository.kt` belongs to package `com.ssb.fieldscreening.data.repository`.
The existing imports are:
```kotlin
1: package com.ssb.fieldscreening.data.repository
...
6: import com.ssb.fieldscreening.data.model.Assessment
7: import com.ssb.fieldscreening.data.model.BiometricsDetails
8: import com.ssb.fieldscreening.data.model.Checkpoint
9: import com.ssb.fieldscreening.data.model.ConnectivityMode
10: import com.ssb.fieldscreening.data.model.CrossValidationDetails
11: import com.ssb.fieldscreening.data.model.ForensicsDetails
12: import com.ssb.fieldscreening.data.model.HealthResponse
13: import com.ssb.fieldscreening.data.model.InspectionDetails
14: import com.ssb.fieldscreening.data.model.InspectionResponse
15: import com.ssb.fieldscreening.data.model.LivenessDetails
16: import com.ssb.fieldscreening.data.model.MrzDetails
17: import com.ssb.fieldscreening.data.model.OcrDetails
18: import com.ssb.fieldscreening.data.model.PRESET_SCENARIOS
19: import com.ssb.fieldscreening.data.model.PresetScenario
20: import com.ssb.fieldscreening.data.model.RiskDetails
21: import com.ssb.fieldscreening.data.model.StampDetails
22: import com.ssb.fieldscreening.data.model.ViolationFlag
```
`com.ssb.fieldscreening.data.model.CriticalViolation` is **not imported**. Instantiating `CriticalViolation` without adding this import will trigger an `Unresolved reference: CriticalViolation` compiler error.

### 1.4 Model Definitions: `InspectionModels.kt:198-219`
In `android-screening/app/src/main/java/com/ssb/fieldscreening/data/model/InspectionModels.kt`:
```kotlin
198: @JsonClass(generateAdapter = true)
199: data class CrossValidationDetails(
200:     @Json(name = "cross_validation_passed") val crossValidationPassed: Boolean = true,
201:     @Json(name = "violation_count") val violationCount: Int = 0,
202:     @Json(name = "critical_violations") val criticalViolations: List<CriticalViolation> = emptyList(),
203:     val warnings: List<CriticalViolation> = emptyList(),
204:     val flags: List<ViolationFlag> = emptyList(),
205:     @Json(name = "rules_checked") val rulesChecked: Int = 8,
206:     @Json(name = "processing_time_ms") val processingTimeMs: Double = 14.0
207: )
208: 
209: @JsonClass(generateAdapter = true)
210: data class CriticalViolation(
211:     @Json(name = "rule_id") val ruleId: String,
212:     @Json(name = "rule_name") val ruleName: String,
213:     val severity: String,
214:     @Json(name = "field_name") val fieldName: String,
215:     @Json(name = "expected_value") val expectedValue: String? = null,
216:     @Json(name = "actual_value") val actualValue: String? = null,
217:     @Json(name = "telemetry_code") val telemetryCode: String,
218:     val details: String
219: )
```

### 1.5 Exhaustive Inventory of Usages Across the Codebase
A full repository search (`grep_search` across `android-screening`) revealed all usages of `CrossValidationDetails`, `CriticalViolation`, and `warnings`:
1. `InspectionModels.kt`:
   - Line 99: `crossValidation: CrossValidationDetails` property in `InspectionDetails`.
   - Line 199: `data class CrossValidationDetails(...)`.
   - Line 202: `criticalViolations: List<CriticalViolation>`.
   - Line 203: `val warnings: List<CriticalViolation>`.
   - Line 210: `data class CriticalViolation(...)`.
2. `PresetScenarios.kt`:
   - Line 158-159: `clean_passport` scenario: `criticalViolations = emptyList()`, `warnings = emptyList()`.
   - Line 341-353: `tampered_dob_passport` scenario: `criticalViolations = listOf(CriticalViolation(ruleId = "CV-01", ...))`, `warnings = emptyList()`.
   - Line 510-533: `counterfeit_permit` scenario:
     `criticalViolations = listOf(CriticalViolation(ruleId = "CV-07", ...))`
     `warnings = listOf(CriticalViolation(ruleId = "CV-WARN-01", ruleName = "Physical Hold", severity = "WARNING", fieldName = "document", expectedValue = null, actualValue = null, telemetryCode = "PHYSICAL_HOLD", details = "Traveler documents held for physical chemical test."))`.
   - Line 686-698: `replay_attack_passport` scenario: `criticalViolations = listOf(CriticalViolation(ruleId = "CV-05", ...))`, `warnings = emptyList()`.
3. `CrossValidationMatrix.kt`:
   - Line 38: `import com.ssb.fieldscreening.data.model.CrossValidationDetails`.
   - Line 45: `crossValidation: CrossValidationDetails` parameter.
   - Lines 173-214: Iterates over `crossValidation.criticalViolations`. No references to `.warnings`.
4. `DiscrepancyDiffTable.kt`:
   - Line 54: `val dobMismatch = details.crossValidation.criticalViolations.any { it.fieldName == "dob" }`.
5. `SsbRepository.kt`:
   - Line 10: `import com.ssb.fieldscreening.data.model.CrossValidationDetails`.
   - Line 470-474: Instantiates `CrossValidationDetails` with `warnings = if (hasFace) emptyList() else listOf("Biometric selfie photo was not captured.")`.

No other files or tests reference `CrossValidationDetails.warnings`.

### 1.6 Backend Schema Contract (`backend/app/schemas/mrz.py:38-73`)
```python
class CrossViolation(BaseModel):
    rule_id: str
    rule_name: str
    severity: str
    field_name: str
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None
    telemetry_code: str
    details: str

class CrossValidationResult(BaseModel):
    cross_validation_passed: bool
    violation_count: int = 0
    critical_violations: List[CrossViolation] = Field(default_factory=list)
    warnings: List[CrossViolation] = Field(default_factory=list)
    violations: List[CrossViolation] = Field(default_factory=list)
    flags: List[CrossValidationFlag] = Field(default_factory=list)
```
This proves that on the backend, `warnings` contains structured `CrossViolation` objects matching Android's `CriticalViolation`.

---

## 2. Logic Chain

1. **Observation 1.1 & 1.2**: In `SsbRepository.kt:474`, `warnings` is assigned a `List<String>` (`listOf("Biometric selfie photo was not captured.")`).
2. **Observation 1.4**: `CrossValidationDetails.warnings` requires `List<CriticalViolation>`.
3. **Logic Step A**: Passing `List<String>` where `List<CriticalViolation>` is required is a type incompatibility that causes `compileDebugKotlin` to fail with `Argument type mismatch`.
4. **Observation 1.3**: `CriticalViolation` is located in `com.ssb.fieldscreening.data.model`, but `SsbRepository.kt` (in `com.ssb.fieldscreening.data.repository`) does not import `CriticalViolation`.
5. **Logic Step B**: Instantiating `CriticalViolation(...)` in `SsbRepository.kt` requires adding `import com.ssb.fieldscreening.data.model.CriticalViolation`.
6. **Observation 1.4 & 1.5**: `CriticalViolation` constructor has the signature:
   ```kotlin
   CriticalViolation(
       ruleId: String,
       ruleName: String,
       severity: String,
       fieldName: String,
       expectedValue: String? = null,
       actualValue: String? = null,
       telemetryCode: String,
       details: String
   )
   ```
   In `PresetScenarios.kt:523-532`, warning violations use:
   `ruleId = "CV-WARN-01"`, `severity = "WARNING"`, `expectedValue = null`, `actualValue = null`.
7. **Logic Step C**: For missing selfie warning in `SsbRepository.kt:474`, the corresponding `CriticalViolation` object is:
   ```kotlin
   CriticalViolation(
       ruleId = "CV-WARN-02",
       ruleName = "Biometric Selfie Missing",
       severity = "WARNING",
       fieldName = "live_face",
       expectedValue = null,
       actualValue = null,
       telemetryCode = "WARN_NO_SELFIE",
       details = "Biometric selfie photo was not captured."
   )
   ```
8. **Observation 1.5**: All other call sites across the Android companion app already instantiate and handle `CriticalViolation` and `CrossValidationDetails` with complete type consistency. Only `SsbRepository.kt` needs this two-part modification.

---

## 3. Caveats

1. **Read-Only Investigation Mode**: Per instructions, no production source code has been altered during this investigation turn. All modifications are specified as a precise patch and implementation blueprint for the assigned worker.
2. **Local Sandbox Network Restriction**: Running `./gradlew` within the sandboxed subagent shell encounters a local loopback IPC restriction when connecting to the Gradle daemon. Verification should be performed outside sandbox or using the verified command flags used by the auditor.

---

## 4. Conclusion & Concrete Fix Strategy

The compilation break is localized exclusively to `android-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt`.

### Implementation Specification for Worker

#### Modification 1: Add Missing Import
In `android-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt`:
Between line 9 and line 10, add:
```kotlin
import com.ssb.fieldscreening.data.model.CriticalViolation
```

Context diff:
```diff
 import com.ssb.fieldscreening.data.model.Checkpoint
 import com.ssb.fieldscreening.data.model.ConnectivityMode
+import com.ssb.fieldscreening.data.model.CriticalViolation
 import com.ssb.fieldscreening.data.model.CrossValidationDetails
 import com.ssb.fieldscreening.data.model.ForensicsDetails
```

#### Modification 2: Update Warnings Parameter in `generateSyntheticInspection`
In `android-screening/app/src/main/java/com/ssb/fieldscreening/data/repository/SsbRepository.kt`:
Replace line 474:
```diff
                 crossValidation = CrossValidationDetails(
                     crossValidationPassed = hasFace,
                     violationCount = if (hasFace) 0 else 1,
                     criticalViolations = emptyList(),
-                    warnings = if (hasFace) emptyList() else listOf("Biometric selfie photo was not captured."),
+                    warnings = if (hasFace) emptyList() else listOf(
+                        CriticalViolation(
+                            ruleId = "CV-WARN-02",
+                            ruleName = "Biometric Selfie Missing",
+                            severity = "WARNING",
+                            fieldName = "live_face",
+                            expectedValue = null,
+                            actualValue = null,
+                            telemetryCode = "WARN_NO_SELFIE",
+                            details = "Biometric selfie photo was not captured."
+                        )
+                    ),
                     flags = listOf(
```

---

## 5. Verification Method

Once the worker applies the two changes above, independent verification can be executed as follows:

1. **Android Kotlin Compilation & Unit Test Suite**:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/android-screening
   mkdir -p /tmp/.android
   JAVA_HOME=/opt/homebrew/opt/openjdk@21 ANDROID_USER_HOME=/tmp/.android ./gradlew -g /tmp/gradle_user_home testDebugUnitTest
   ```
   *Expected Outcome*:
   - Task `:app:compileDebugKotlin` succeeds with exit code 0.
   - `RepositoryNetworkRobustnessTest` executes and passes (specifically verifying offline local screening and outbox JSON serialization with `hasFace == false`).
   - Build completes with 0 errors.

2. **Android Debug APK Assembly**:
   ```bash
   cd /Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/android-screening
   JAVA_HOME=/opt/homebrew/opt/openjdk@21 ANDROID_USER_HOME=/tmp/.android ./gradlew -g /tmp/gradle_user_home assembleDebug
   ```
   *Expected Outcome*: Successful generation of `app-debug.apk`.

3. **Invalidation Conditions**:
   - If `compileDebugKotlin` reports `Unresolved reference: CriticalViolation`, the import was omitted.
   - If `compileDebugKotlin` reports `No value passed for parameter...`, one of the required constructor arguments (`ruleId`, `ruleName`, `severity`, `fieldName`, `telemetryCode`, `details`) was missing.
