"""
Empirical Challenger Test Suite for Milestone 1 Client-Side & Schema Fixes.
Challenger: teamwork_preview_challenger_m1_2_s4

Adversarially challenges:
- AND-01 / BE-01: Kotlin data classes in InspectionModels.kt deserialize JSON with missing/null optional fields without throwing JsonDataException.
- AND-02 / BE-02: CrossValidationResult.warnings deserializes structured violation objects cleanly (not List<String>).
- AND-04: Offline scan enqueuing in SsbScreeningViewModel.kt invokes repository enqueuing.
- FE-02: Relative API calls are completely eliminated in Header.tsx and App.tsx.
"""

import re
import json
from pathlib import Path
import pytest
from app.schemas.scan import ScanResponse, DocumentInspectResponse
from app.schemas.mrz import CrossValidationResult, CrossViolation, MRZResult
from app.schemas.risk import RiskAssessment, RiskLevel
from app.schemas.ocr import OCRResult
from app.schemas.forensics import ForensicsResult
from app.schemas.biometrics import FaceMatchResult, LivenessResult
from app.schemas.stamp import StampResult


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
INSPECTION_MODELS_PATH = PROJECT_ROOT / "android-screening" / "app" / "src" / "main" / "java" / "com" / "ssb" / "fieldscreening" / "data" / "model" / "InspectionModels.kt"
VIEWMODEL_PATH = PROJECT_ROOT / "android-screening" / "app" / "src" / "main" / "java" / "com" / "ssb" / "fieldscreening" / "ui" / "viewmodel" / "SsbScreeningViewModel.kt"
HEADER_TSX_PATH = PROJECT_ROOT / "frontend" / "src" / "components" / "Header.tsx"
APP_TSX_PATH = PROJECT_ROOT / "frontend" / "src" / "App.tsx"


class TestAND01AndBE01Nullability:
    """Adversarial verification of AND-01 / BE-01."""

    def test_inspection_models_file_exists(self):
        assert INSPECTION_MODELS_PATH.exists(), f"InspectionModels.kt not found at {INSPECTION_MODELS_PATH}"

    def test_inspection_details_has_nullable_sub_objects(self):
        """InspectionDetails must have nullable biometrics, liveness, and stamp with default nulls."""
        content = INSPECTION_MODELS_PATH.read_text()
        
        # Match InspectionDetails class definition up to the closing paren on a line by itself
        match = re.search(r"data class InspectionDetails\s*\((.*?)\n\)", content, re.DOTALL)
        assert match, "InspectionDetails data class not found in InspectionModels.kt"
        class_body = match.group(1)

        # 1. biometrics: BiometricsDetails? = null
        assert re.search(r"val\s+biometrics\s*:\s*BiometricsDetails\?\s*=\s*null", class_body), \
            "biometrics must be nullable with default null in InspectionDetails!"

        # 2. liveness: LivenessDetails? = null
        assert re.search(r"val\s+liveness\s*:\s*LivenessDetails\?\s*=\s*null", class_body), \
            "liveness must be nullable with default null in InspectionDetails!"

        # 3. stamp: StampDetails? = null
        assert re.search(r"val\s+stamp\s*:\s*StampDetails\?\s*=\s*null", class_body), \
            "stamp must be nullable with default null in InspectionDetails!"

    def test_stamp_details_has_nullable_optional_fields(self):
        """StampDetails must have nullable fields for checkpost_id, ssim_score, orb_match_count, etc."""
        content = INSPECTION_MODELS_PATH.read_text()
        match = re.search(r"data class StampDetails\s*\((.*?)\n\)", content, re.DOTALL)
        assert match, "StampDetails data class not found"
        body = match.group(1)

        assert re.search(r"val\s+checkpostId\s*:\s*String\?\s*=\s*null", body), "checkpostId must be String?"
        assert re.search(r"val\s+locationName\s*:\s*String\?\s*=\s*null", body), "locationName must be String?"
        assert re.search(r"val\s+ssimScore\s*:\s*Double\?\s*=\s*null", body), "ssimScore must be Double?"
        assert re.search(r"val\s+orbMatchCount\s*:\s*Int\?\s*=\s*null", body), "orbMatchCount must be Int?"
        assert re.search(r"val\s+tamperEnergy\s*:\s*Double\?\s*=\s*null", body), "tamperEnergy must be Double?"
        assert re.search(r"val\s+contextConsistent\s*:\s*Boolean\?\s*=\s*null", body), "contextConsistent must be Boolean?"

    def test_biometrics_details_has_nullable_optional_fields(self):
        """BiometricsDetails must have nullable apparentAgeId, apparentAgeLive, ageDriftYears, watchlistDistance."""
        content = INSPECTION_MODELS_PATH.read_text()
        match = re.search(r"data class BiometricsDetails\s*\((.*?)\n\)", content, re.DOTALL)
        assert match, "BiometricsDetails data class not found"
        body = match.group(1)

        assert re.search(r"val\s+apparentAgeId\s*:\s*Int\?\s*=\s*null", body), "apparentAgeId must be Int?"
        assert re.search(r"val\s+apparentAgeLive\s*:\s*Int\?\s*=\s*null", body), "apparentAgeLive must be Int?"
        assert re.search(r"val\s+ageDriftYears\s*:\s*Int\?\s*=\s*null", body), "ageDriftYears must be Int?"
        assert re.search(r"val\s+watchlistDistance\s*:\s*Double\?\s*=\s*null", body), "watchlistDistance must be Double?"

    def test_mrz_details_has_nullable_checksum_fields(self):
        """MrzDetails must declare all checksum fields as Boolean? with default null."""
        content = INSPECTION_MODELS_PATH.read_text()
        match = re.search(r"data class MrzDetails\s*\((.*?)\n\)", content, re.DOTALL)
        assert match, "MrzDetails data class not found"
        body = match.group(1)

        assert re.search(r"val\s+docNumberChecksumValid\s*:\s*Boolean\?\s*=\s*null", body), "docNumberChecksumValid must be Boolean?"
        assert re.search(r"val\s+dobChecksumValid\s*:\s*Boolean\?\s*=\s*null", body), "dobChecksumValid must be Boolean?"
        assert re.search(r"val\s+expiryChecksumValid\s*:\s*Boolean\?\s*=\s*null", body), "expiryChecksumValid must be Boolean?"
        assert re.search(r"val\s+compositeChecksumValid\s*:\s*Boolean\?\s*=\s*null", body), "compositeChecksumValid must be Boolean?"
        assert re.search(r"val\s+optionalDataChecksumValid\s*:\s*Boolean\?\s*=\s*null", body), "optionalDataChecksumValid must be Boolean?"

    def test_backend_and_client_field_mapping_parity(self):
        """Verify that backend ScanResponse fields match Kotlin InspectionDetails Json annotations."""
        content = INSPECTION_MODELS_PATH.read_text()
        
        # Check that field names map correctly via @Json annotations
        mappings = {
            "session_id": "sessionId",
            "document_type": "documentType",
            "cross_validation": "crossValidation",
            "processing_time_ms": "processingTimeMs"
        }
        for json_key, kotlin_prop in mappings.items():
            pattern = rf'@Json\(name\s*=\s*"{json_key}"\)\s*val\s+{kotlin_prop}'
            assert re.search(pattern, content), f"Missing @Json(name = '{json_key}') for {kotlin_prop} in InspectionModels.kt"


class TestAND02AndBE02WarningsType:
    """Adversarial verification of AND-02 / BE-02."""

    def test_cross_validation_details_warnings_is_list_of_critical_violation(self):
        """CrossValidationDetails.warnings MUST be List<CriticalViolation>, NOT List<String>."""
        content = INSPECTION_MODELS_PATH.read_text()
        match = re.search(r"data class CrossValidationDetails\s*\((.*?)\n\)", content, re.DOTALL)
        assert match, "CrossValidationDetails data class not found"
        body = match.group(1)

        # Must NOT be List<String>
        assert not re.search(r"val\s+warnings\s*:\s*List<String>", body), \
            "Regression: CrossValidationDetails.warnings is typed as List<String>! Must be List<CriticalViolation>"

        # Must be List<CriticalViolation>
        assert re.search(r"val\s+warnings\s*:\s*List<CriticalViolation>\s*=\s*emptyList\(\)", body), \
            "CrossValidationDetails.warnings must be List<CriticalViolation> = emptyList()"

    def test_critical_violation_properties_and_nullability(self):
        """CriticalViolation in Kotlin must declare expectedValue and actualValue as String?."""
        content = INSPECTION_MODELS_PATH.read_text()
        match = re.search(r"data class CriticalViolation\s*\((.*?)\n\)", content, re.DOTALL)
        assert match, "CriticalViolation data class not found"
        body = match.group(1)

        assert re.search(r"val\s+expectedValue\s*:\s*String\?\s*=\s*null", body), \
            "CriticalViolation.expectedValue must be String? = null"
        assert re.search(r"val\s+actualValue\s*:\s*String\?\s*=\s*null", body), \
            "CriticalViolation.actualValue must be String? = null"

    def test_backend_cross_violation_matches_client_schema(self):
        """Verify backend CrossViolation schema matches CriticalViolation fields in Android."""
        violation = CrossViolation(
            rule_id="CV-07",
            rule_name="Transit Stamp Expiry Verification",
            severity="WARNING",
            field_name="stamp_expiry",
            expected_value=None,
            actual_value=None,
            telemetry_code="WARN_STAMP_EXPIRY",
            details="Stamp date indicates travel permit is expired"
        )
        data = violation.model_dump(mode="json")
        expected_keys = {"rule_id", "rule_name", "severity", "field_name", "expected_value", "actual_value", "telemetry_code", "details"}
        assert set(data.keys()) == expected_keys
        assert data["expected_value"] is None
        assert data["actual_value"] is None


class TestAND04OfflineScanEnqueuing:
    """Adversarial verification of AND-04."""

    def test_viewmodel_file_exists(self):
        assert VIEWMODEL_PATH.exists(), f"SsbScreeningViewModel.kt not found at {VIEWMODEL_PATH}"

    def test_offline_mode_invokes_repository_enqueuing(self):
        """In runInspection(), when offline or gatewayHealth == null, repository.inspectDocument MUST be invoked."""
        content = VIEWMODEL_PATH.read_text()

        # Find runInspection method
        match = re.search(r"fun runInspection\s*\([^)]*\)\s*\{(.*?)\n    fun ", content, re.DOTALL)
        assert match, "runInspection method not found in SsbScreeningViewModel.kt"
        body = match.group(1)

        # Check offline branch
        assert "currentState.connectivityMode == ConnectivityMode.OFFLINE_OUTBOX || currentState.gatewayHealth == null" in body, \
            "Missing offline / gatewayHealth check in runInspection"

        offline_block_match = re.search(
            r"if\s*\([^)]*(?:OFFLINE_OUTBOX|gatewayHealth == null)[^)]*\)\s*\{(.*?)\n            return",
            body,
            re.DOTALL
        )
        assert offline_block_match, "Offline check block not properly structured before return"
        offline_block = offline_block_match.group(1)

        # Must call repository.inspectDocument inside a coroutine
        assert "viewModelScope.launch" in offline_block, "Offline queuing must launch coroutine"
        assert "repository.inspectDocument(" in offline_block, \
            "AND-04 Regression: repository.inspectDocument is NOT called in offline mode! Scans will be lost!"
        assert "companionUploadStatus" in offline_block, "UI must update status indicating offline outbox persistence"


class TestFE02RelativeApiCallsElimination:
    """Adversarial verification of FE-02."""

    def test_header_tsx_uses_api_base_url_for_devices(self):
        """Header.tsx must fetch devices using ${API_BASE_URL}/api/v1/devices, never a bare relative URL."""
        content = HEADER_TSX_PATH.read_text()
        
        # Ensure import of API_BASE_URL
        assert "API_BASE_URL" in content, "Header.tsx must import API_BASE_URL"
        
        # Check fetch call
        fetch_matches = re.findall(r"fetch\s*\((.*?)\)", content)
        assert len(fetch_matches) > 0, "No fetch calls found in Header.tsx"
        for arg in fetch_matches:
            # Must not be a raw relative string literal like '/api/v1/devices'
            assert not re.match(r"""^['"`]/api/v1/devices['"`]""", arg.strip()), \
                f"FE-02 Failure: Bare relative URL found in Header.tsx fetch: {arg}"
            assert "API_BASE_URL" in arg, f"Header.tsx fetch must use API_BASE_URL: {arg}"

    def test_app_tsx_uses_api_base_url_for_all_endpoints(self):
        """App.tsx must use API_BASE_URL for companion gallery and stream."""
        content = APP_TSX_PATH.read_text()
        
        # Check gallery fetch
        assert not re.search(r"""fetch\s*\(\s*['"`]/api/v1/companion/gallery""", content), \
            "FE-02 Failure: Bare relative URL found for companion/gallery in App.tsx!"
        assert re.search(r"""fetch\s*\(\s*`\$\{API_BASE_URL\}/api/v1/companion/gallery""", content), \
            "App.tsx must use ${API_BASE_URL}/api/v1/companion/gallery"

        # Check SSE stream EventSource
        assert not re.search(r"""new\s+EventSource\s*\(\s*['"`]/api/v1/companion/stream""", content), \
            "FE-02 Failure: Bare relative URL found for companion/stream in App.tsx!"
        assert re.search(r"""new\s+EventSource\s*\(\s*`\$\{API_BASE_URL\}/api/v1/companion/stream""", content), \
            "App.tsx must use ${API_BASE_URL}/api/v1/companion/stream"

    def test_zero_bare_api_calls_in_frontend_src(self):
        """Adversarially sweep all .tsx and .ts files under frontend/src for bare '/api/v1' string literals."""
        frontend_src = PROJECT_ROOT / "frontend" / "src"
        violations = []
        for p in frontend_src.rglob("*.ts*"):
            text = p.read_text()
            # Look for fetch('/api/v1 or fetch("/api/v1
            matches = re.findall(r"""fetch\s*\(\s*['"](/api/v1[^'"]*)['"]""", text)
            if matches:
                violations.append((str(p.relative_to(PROJECT_ROOT)), matches))
            event_matches = re.findall(r"""EventSource\s*\(\s*['"](/api/v1[^'"]*)['"]""", text)
            if event_matches:
                violations.append((str(p.relative_to(PROJECT_ROOT)), event_matches))

        assert len(violations) == 0, f"Found bare relative API calls in frontend: {violations}"


class TestDynamicInspectContract:
    """Dynamic end-to-end HTTP tests against FastAPI verifying payload nullability and structure."""

    @pytest.fixture(scope="class")
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        with TestClient(app) as test_client:
            yield test_client

    @pytest.fixture(scope="class")
    def sample_jpeg(self) -> bytes:
        return (
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
            + b"\x00" * 300
            + b"\xff\xd9"
        )

    def test_document_only_inspection_emits_null_biometrics_and_liveness(self, client, sample_jpeg):
        """Document-only scan (without live selfie) must emit null for biometrics and liveness."""
        import io
        resp = client.post(
            "/api/v1/scan/inspect",
            files={"document_image": ("doc.jpg", io.BytesIO(sample_jpeg), "image/jpeg")},
            data={"checkpoint_id": "SSB_SONAULI_01"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        details = data.get("details")
        assert details is not None
        assert details["biometrics"] is None
        assert details["liveness"] is None
        assert isinstance(details["cross_validation"]["warnings"], list)

    def test_full_inspection_emits_structured_biometrics_and_liveness(self, client, sample_jpeg):
        """Document scan with live selfie must emit non-null biometrics and liveness objects."""
        import io
        resp = client.post(
            "/api/v1/scan/inspect",
            files={
                "document_image": ("doc.jpg", io.BytesIO(sample_jpeg), "image/jpeg"),
                "live_face_image": ("selfie.jpg", io.BytesIO(sample_jpeg), "image/jpeg")
            },
            data={"checkpoint_id": "SSB_SONAULI_01"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        details = data.get("details")
        assert details is not None
        assert details["biometrics"] is not None
        assert details["liveness"] is not None
        assert "similarity" in details["biometrics"]
        assert "is_live" in details["liveness"]

