package com.ssb.fieldscreening.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ssb.fieldscreening.data.local.OutboxScreeningRecord
import com.ssb.fieldscreening.data.local.SsbDatabase
import com.ssb.fieldscreening.data.model.Checkpoint
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.data.model.DEFAULT_CHECKPOINTS
import com.ssb.fieldscreening.data.model.HealthResponse
import com.ssb.fieldscreening.data.model.InspectionResponse
import com.ssb.fieldscreening.data.model.OfficerActionType
import com.ssb.fieldscreening.data.model.OfficerDecisionRecord
import com.ssb.fieldscreening.data.model.PRESET_SCENARIOS
import com.ssb.fieldscreening.data.model.PresetScenario
import com.ssb.fieldscreening.data.repository.SsbRepository
import com.ssb.fieldscreening.util.WifiUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class CameraState(val label: String, val stepIndex: Int, val description: String) {
    IDLE("IDLE", 0, "Sensors Ready"),
    CAPTURING("CAPTURING", 1, "Frame Acquisition"),
    UPLOADING("UPLOADING", 2, "Gateway Payload Sync"),
    PROCESSING("PROCESSING", 3, "3-Stream AI Inference"),
    COMPLETE("COMPLETE", 4, "Risk Verdict Ready")
}

enum class NavigationScreen(val title: String, val badgeText: String? = null) {
    CAPTURE("Capture", "Sensors"),
    OUTBOX("Outbox", "Queue"),
    GATEWAY_DIAGNOSTICS("Edge Gateway", "Diagnostics")
}


data class ScreeningUiState(
    val selectedPreset: PresetScenario? = null,
    val currentInspection: InspectionResponse? = null,
    val isInspecting: Boolean = false,
    val cameraState: CameraState = CameraState.IDLE,
    val inspectionProgressText: String = "",
    val connectivityMode: ConnectivityMode = ConnectivityMode.OFFLINE_OUTBOX,
    val selectedCheckpoint: Checkpoint = DEFAULT_CHECKPOINTS[0],
    val gatewayHealth: HealthResponse? = null,
    val gatewayLatencyMs: Long = 0L,
    val isGatewayChecking: Boolean = false,
    val customGatewayUrl: String = "http://192.168.1.61:8000",
    val officerId: String = "",
    val officerName: String = "",
    val officerDecision: OfficerDecisionRecord? = null,
    val decisionRemarks: String = "",
    val activeCvFilter: String = "ALL", // ALL, PASSED, VIOLATIONS
    val activeScreen: NavigationScreen = NavigationScreen.CAPTURE,
    val isSyncingOutbox: Boolean = false,
    val syncMessage: String? = null,
    val showHeatmapOverlay: Boolean = false,
    val captureDocumentUri: Uri? = null,
    val captureLiveFaceUri: Uri? = null,
    val capturedDocumentBytes: ByteArray? = null,
    val capturedLiveFaceBytes: ByteArray? = null,
    val isLiveCameraActive: Boolean = true,
    val activeCameraLens: Int = 0, // 0 = BACK (Document), 1 = FRONT (Selfie)
    val documentSampleIndex: Int = 1,
    val companionUploadStatus: String? = null
)

class SsbScreeningViewModel(application: Application) : AndroidViewModel(application) {

    private val database = SsbDatabase.getInstance(application)
    private val repository = SsbRepository(database.outboxDao())

    private val _uiState = MutableStateFlow(
        ScreeningUiState(
            customGatewayUrl = WifiUtils.getLastConnectedGateway(application) ?: "http://192.168.1.61:8000"
        )
    )
    val uiState: StateFlow<ScreeningUiState> = _uiState.asStateFlow()

    private var healthPollingJob: Job? = null

    val outboxRecords: StateFlow<List<OutboxScreeningRecord>> = repository.allOutboxRecords
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    val pendingCount: StateFlow<Int> = repository.pendingCount
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = 0
        )

    init {
        // No automatic assumption of connectivity on startup.
        // Connection is verified when the user initiates connection via Wi-Fi / QR.
    }

    fun connectToGateway(url: String) {
        val normalized = WifiUtils.normalizeGatewayUrl(url)
        WifiUtils.saveLastConnectedGateway(getApplication<Application>(), normalized)
        _uiState.update {
            it.copy(
                customGatewayUrl = normalized,
                connectivityMode = ConnectivityMode.AIR_GAPPED_WIFI
            )
        }
        checkGatewayHealth()
        startHealthPolling()
    }

    fun selectPreset(scenario: PresetScenario) {
        _uiState.update {
            it.copy(
                selectedPreset = scenario,
                currentInspection = scenario.inspectionResponse,
                cameraState = CameraState.COMPLETE,
                officerDecision = null,
                decisionRemarks = "",
                showHeatmapOverlay = false
            )
        }
    }

    fun setCameraState(state: CameraState) {
        _uiState.update { it.copy(cameraState = state) }
    }

    fun runInspection(documentBytes: ByteArray? = null, liveFaceBytes: ByteArray? = null) {
        val currentState = _uiState.value
        val docBytes = documentBytes ?: currentState.capturedDocumentBytes
        val faceBytes = liveFaceBytes ?: currentState.capturedLiveFaceBytes

        if (currentState.connectivityMode == ConnectivityMode.OFFLINE_OUTBOX || currentState.gatewayHealth == null) {
            // Offline Mode: Queue directly to local outbox without running fake AI compute
            viewModelScope.launch {
                _uiState.update {
                    it.copy(
                        isInspecting = false,
                        cameraState = CameraState.IDLE,
                        inspectionProgressText = "",
                        companionUploadStatus = "⚠️ Saved in Offline Outbox (Connect to Laptop to Inspect)"
                    )
                }
            }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isInspecting = true,
                    cameraState = CameraState.UPLOADING,
                    inspectionProgressText = "Streaming frames to Laptop Edge Gateway..."
                )
            }

            val result = repository.inspectDocument(
                documentBytes = docBytes ?: ByteArray(1024) { 0x42 },
                liveFaceBytes = faceBytes,
                checkpoint = currentState.selectedCheckpoint,
                officerId = currentState.officerId,
                mode = currentState.connectivityMode,
                activePreset = currentState.selectedPreset,
                customBaseUrl = currentState.customGatewayUrl
            )

            result.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        isInspecting = false,
                        cameraState = CameraState.COMPLETE,
                        currentInspection = response,
                        officerDecision = null,
                        inspectionProgressText = "",
                        activeScreen = NavigationScreen.CAPTURE
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isInspecting = false,
                        cameraState = CameraState.IDLE,
                        inspectionProgressText = "",
                        companionUploadStatus = "⚠️ Gateway Error: ${error.message ?: "Inspection failed"}"
                    )
                }
            }
        }
    }

    fun setConnectivityMode(mode: ConnectivityMode) {
        _uiState.update {
            if (mode == ConnectivityMode.OFFLINE_OUTBOX) {
                it.copy(
                    connectivityMode = mode,
                    gatewayHealth = null,
                    gatewayLatencyMs = 0L
                )
            } else {
                it.copy(
                    connectivityMode = mode
                )
            }
        }
        if (mode != ConnectivityMode.OFFLINE_OUTBOX) {
            checkGatewayHealth()
            startHealthPolling()
        }
    }

    fun setCheckpoint(checkpoint: Checkpoint) {
        _uiState.update { it.copy(selectedCheckpoint = checkpoint) }
    }

    fun setOfficerId(officerId: String, name: String) {
        _uiState.update { it.copy(officerId = officerId, officerName = name) }
    }

    fun setDecisionRemarks(remarks: String) {
        _uiState.update { it.copy(decisionRemarks = remarks) }
    }

    fun setCvFilter(filter: String) {
        _uiState.update { it.copy(activeCvFilter = filter) }
    }

    fun navigateTo(screen: NavigationScreen) {
        _uiState.update { it.copy(activeScreen = screen) }
    }

    fun toggleHeatmapOverlay() {
        _uiState.update { it.copy(showHeatmapOverlay = !it.showHeatmapOverlay) }
    }

    fun submitOfficerDecision(action: OfficerActionType) {
        val currentState = _uiState.value
        val inspection = currentState.currentInspection ?: return
        val signatureSource = "${currentState.officerId}:${action.name}:${inspection.sessionId}:${System.currentTimeMillis()}"
        val signatureHash = hashSha256(signatureSource)

        val record = OfficerDecisionRecord(
            action = action,
            officerId = currentState.officerId,
            officerName = currentState.officerName,
            checkpointId = currentState.selectedCheckpoint.id,
            sessionId = inspection.sessionId,
            remarks = currentState.decisionRemarks,
            timestamp = System.currentTimeMillis(),
            digitalSignatureHash = signatureHash
        )

        _uiState.update { it.copy(officerDecision = record) }

        viewModelScope.launch {
            repository.markOfficerDecision(inspection.sessionId, action.name + " - " + currentState.decisionRemarks)
        }
    }

    private fun startHealthPolling() {
        healthPollingJob?.cancel()
        healthPollingJob = viewModelScope.launch(Dispatchers.IO) {
            while (isActive) {
                val currentState = _uiState.value
                if (currentState.connectivityMode != ConnectivityMode.OFFLINE_OUTBOX && currentState.customGatewayUrl.isNotBlank()) {
                    val (health, latency) = repository.checkHealth(
                        currentState.connectivityMode,
                        currentState.customGatewayUrl
                    )
                    if (health != null && latency > 0) {
                        _uiState.update {
                            it.copy(
                                gatewayHealth = health,
                                gatewayLatencyMs = latency,
                                connectivityMode = ConnectivityMode.AIR_GAPPED_WIFI
                            )
                        }
                    } else {
                        _uiState.update {
                            it.copy(
                                gatewayHealth = null,
                                gatewayLatencyMs = 0L,
                                connectivityMode = ConnectivityMode.OFFLINE_OUTBOX
                            )
                        }
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            gatewayHealth = null,
                            gatewayLatencyMs = 0L
                        )
                    }
                }
                delay(3000L)
            }
        }
    }

    fun checkGatewayHealth() {
        val currentState = _uiState.value
        if (currentState.customGatewayUrl.isBlank() || currentState.connectivityMode == ConnectivityMode.OFFLINE_OUTBOX) {
            _uiState.update {
                it.copy(
                    gatewayHealth = null,
                    gatewayLatencyMs = 0L,
                    isGatewayChecking = false,
                    connectivityMode = ConnectivityMode.OFFLINE_OUTBOX
                )
            }
            return
        }

        _uiState.update { it.copy(isGatewayChecking = true) }
        viewModelScope.launch(Dispatchers.IO) {
            val (health, latency) = repository.checkHealth(
                ConnectivityMode.AIR_GAPPED_WIFI,
                currentState.customGatewayUrl
            )
            if (health != null && latency > 0) {
                _uiState.update {
                    it.copy(
                        gatewayHealth = health,
                        gatewayLatencyMs = latency,
                        connectivityMode = ConnectivityMode.AIR_GAPPED_WIFI,
                        isGatewayChecking = false
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        gatewayHealth = null,
                        gatewayLatencyMs = 0L,
                        connectivityMode = ConnectivityMode.OFFLINE_OUTBOX,
                        isGatewayChecking = false
                    )
                }
            }
        }
    }

    fun updateCustomGatewayUrl(url: String) {
        _uiState.update {
            it.copy(
                customGatewayUrl = url,
                gatewayHealth = null,
                gatewayLatencyMs = 0L,
                connectivityMode = ConnectivityMode.OFFLINE_OUTBOX
            )
        }
    }

    fun syncPendingOutbox() {
        val currentState = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncingOutbox = true, syncMessage = "Connecting to Edge Gateway...") }
            delay(300)
            val pendingList = outboxRecords.value.filter { it.syncStatus == "PENDING" }
            var syncedCount = 0
            for (record in pendingList) {
                _uiState.update { it.copy(syncMessage = "Syncing session ${record.sessionId}...") }
                val success = repository.syncPendingRecord(record, currentState.connectivityMode, currentState.customGatewayUrl)
                if (success) syncedCount++
                delay(100)
            }
            _uiState.update {
                it.copy(
                    isSyncingOutbox = false,
                    syncMessage = if (pendingList.isNotEmpty()) "Synced $syncedCount of ${pendingList.size} records successfully." else "Outbox is up to date."
                )
            }
            delay(3000)
            _uiState.update { it.copy(syncMessage = null) }
        }
    }

    fun setDocumentUri(uri: Uri?) {
        _uiState.update { it.copy(captureDocumentUri = uri) }
    }

    fun setLiveFaceUri(uri: Uri?) {
        _uiState.update { it.copy(captureLiveFaceUri = uri) }
    }

    fun setCapturedDocumentBytes(bytes: ByteArray) {
        _uiState.update {
            it.copy(
                capturedDocumentBytes = bytes,
                companionUploadStatus = "📡 Transmitting to Desktop..."
            )
        }
        val currentState = _uiState.value
        viewModelScope.launch {
            val result = repository.uploadCompanionCapture(
                captureBytes = bytes,
                captureType = "document",
                checkpointId = currentState.selectedCheckpoint.id,
                deviceId = currentState.officerId.ifBlank { "field-companion-1" },
                customBaseUrl = currentState.customGatewayUrl,
                mode = currentState.connectivityMode
            )
            result.onSuccess { ack ->
                val timeStr = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
                _uiState.update {
                    it.copy(companionUploadStatus = "✓ Delivered to Desktop (#${ack.sequence_id} • $timeStr)")
                }
            }.onFailure {
                _uiState.update {
                    it.copy(companionUploadStatus = "⚠️ Saved in Offline Outbox (Will auto-sync)")
                }
            }
        }
    }

    fun setCapturedLiveFaceBytes(bytes: ByteArray) {
        _uiState.update {
            it.copy(
                capturedLiveFaceBytes = bytes,
                companionUploadStatus = "📡 Transmitting to Desktop..."
            )
        }
        val currentState = _uiState.value
        viewModelScope.launch {
            val result = repository.uploadCompanionCapture(
                captureBytes = bytes,
                captureType = "selfie",
                checkpointId = currentState.selectedCheckpoint.id,
                deviceId = currentState.officerId.ifBlank { "field-companion-1" },
                customBaseUrl = currentState.customGatewayUrl,
                mode = currentState.connectivityMode
            )
            result.onSuccess { ack ->
                val timeStr = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
                _uiState.update {
                    it.copy(companionUploadStatus = "✓ Delivered to Desktop (#${ack.sequence_id} • $timeStr)")
                }
            }.onFailure {
                _uiState.update {
                    it.copy(companionUploadStatus = "⚠️ Saved in Offline Outbox (Will auto-sync)")
                }
            }
        }
    }

    fun setActiveCameraLens(lens: Int) {
        _uiState.update { it.copy(activeCameraLens = lens) }
    }

    fun clearCapturedImages() {
        _uiState.update {
            it.copy(
                capturedDocumentBytes = null,
                capturedLiveFaceBytes = null,
                captureDocumentUri = null,
                captureLiveFaceUri = null,
                cameraState = CameraState.IDLE
            )
        }
    }

    private fun hashSha256(input: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        val bytes = md.digest(input.toByteArray())
        val sb = StringBuilder("SIG-SHA256:")
        for (b in bytes.take(16)) {
            sb.append(String.format("%02X", b))
        }
        return sb.toString()
    }
}
