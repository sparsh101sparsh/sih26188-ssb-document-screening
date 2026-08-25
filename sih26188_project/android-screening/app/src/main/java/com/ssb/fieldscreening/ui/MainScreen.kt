package com.ssb.fieldscreening.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ssb.fieldscreening.data.model.RiskLevel
import com.ssb.fieldscreening.ui.components.AssessmentSummaryCard
import com.ssb.fieldscreening.ui.components.CrossValidationMatrix
import com.ssb.fieldscreening.ui.components.DiscrepancyDiffTable
import com.ssb.fieldscreening.ui.components.DualCameraCaptureView
import com.ssb.fieldscreening.ui.components.GatewayDiagnosticsView
import com.ssb.fieldscreening.ui.components.HeaderBar
import com.ssb.fieldscreening.ui.components.InspectionPipelineTrace
import com.ssb.fieldscreening.ui.components.OfficerDecisionCard
import com.ssb.fieldscreening.ui.components.OutboxScreen
import com.ssb.fieldscreening.ui.components.WifiConnectScreen
import com.ssb.fieldscreening.ui.components.WifiStatusBanner
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes
import com.ssb.fieldscreening.ui.viewmodel.NavigationScreen
import com.ssb.fieldscreening.ui.viewmodel.ScreeningUiState
import com.ssb.fieldscreening.ui.viewmodel.SsbScreeningViewModel

@androidx.annotation.OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: SsbScreeningViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val outboxRecords by viewModel.outboxRecords.collectAsState()
    val pendingCount by viewModel.pendingCount.collectAsState()

    // Wi-Fi connect bottom sheet visibility state
    var showWifiConnect by remember { mutableStateOf(false) }

    // Show Wi-Fi wizard bottom sheet
    if (showWifiConnect) {
        WifiConnectScreen(
            onDismiss = { showWifiConnect = false },
            onConnected = { gatewayUrl ->
                viewModel.connectToGateway(gatewayUrl)
                showWifiConnect = false
            },
            currentGatewayUrl = uiState.customGatewayUrl
        )
    }

    Scaffold(
        topBar = {
            HeaderBar(
                selectedCheckpoint = uiState.selectedCheckpoint,
                onCheckpointSelected = { viewModel.setCheckpoint(it) },
                connectivityMode = uiState.connectivityMode,
                onConnectivityModeSelected = { viewModel.setConnectivityMode(it) },
                gatewayHealth = uiState.gatewayHealth,
                gatewayLatencyMs = uiState.gatewayLatencyMs,
                onOpenDiagnostics = { viewModel.navigateTo(NavigationScreen.GATEWAY_DIAGNOSTICS) },
                onOpenWifiConnect = { showWifiConnect = true }
            )
        },
        bottomBar = {
            // Show bottom navigation bar when not on diagnostic screen
            if (uiState.activeScreen != NavigationScreen.GATEWAY_DIAGNOSTICS) {
                NavigationBarRow(
                    activeScreen = uiState.activeScreen,
                    pendingOutboxCount = pendingCount,
                    onScreenSelected = { viewModel.navigateTo(it) },
                    onOpenWifiConnect = { showWifiConnect = true }
                )
            }
        },
        containerColor = SsbColors.Background
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            AnimatedContent(
                targetState = uiState.activeScreen,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "ScreenTransition"
            ) { targetScreen ->
                when (targetScreen) {
                    NavigationScreen.CAPTURE -> {
                        CaptureScreenView(
                            uiState = uiState,
                            viewModel = viewModel,
                            onOpenWifiConnect = { showWifiConnect = true }
                        )
                    }
                    NavigationScreen.OUTBOX -> {
                        OutboxScreen(
                            records = outboxRecords,
                            pendingCount = pendingCount,
                            isSyncing = uiState.isSyncingOutbox,
                            syncMessage = uiState.syncMessage,
                            onSyncNow = { viewModel.syncPendingOutbox() }
                        )
                    }
                    NavigationScreen.GATEWAY_DIAGNOSTICS -> {
                        GatewayDiagnosticsScreen(
                            uiState = uiState,
                            viewModel = viewModel,
                            onBack = { viewModel.navigateTo(NavigationScreen.CAPTURE) }
                        )
                    }
                }
            }
        }
    }
}

/**
 * Primary Tab 1: CAPTURE
 * Focused optical & biometric live camera intake with scenario switcher.
 */
@Composable
fun CaptureScreenView(
    uiState: ScreeningUiState,
    viewModel: SsbScreeningViewModel,
    onOpenWifiConnect: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Wi-Fi Status Banner — primary connection status indicator
        WifiStatusBanner(
            connectivityMode = uiState.connectivityMode,
            gatewayUrl = uiState.customGatewayUrl,
            latencyMs = uiState.gatewayLatencyMs,
            onClick = onOpenWifiConnect
        )

        // Dual Optical & Biometric Ingestion View with 5-State Machine HUD
        DualCameraCaptureView(
            selectedPreset = uiState.selectedPreset,
            inspection = uiState.currentInspection,
            isInspecting = uiState.isInspecting,
            cameraState = uiState.cameraState,
            progressText = uiState.inspectionProgressText,
            onRunInspection = {
                if (uiState.gatewayHealth == null || uiState.gatewayLatencyMs <= 0) {
                    onOpenWifiConnect()
                } else {
                    viewModel.runInspection()
                }
            },
            showHeatmapOverlay = uiState.showHeatmapOverlay,
            onToggleHeatmap = { viewModel.toggleHeatmapOverlay() },
            capturedDocumentBytes = uiState.capturedDocumentBytes,
            capturedLiveFaceBytes = uiState.capturedLiveFaceBytes,
            onDocumentCaptured = { viewModel.setCapturedDocumentBytes(it) },
            onLiveFaceCaptured = { viewModel.setCapturedLiveFaceBytes(it) },
            onClearCaptures = { viewModel.clearCapturedImages() },
            companionUploadStatus = uiState.companionUploadStatus
        )
    }
}

/**
 * Gateway Diagnostics Overlay View
 */
@Composable
fun GatewayDiagnosticsScreen(
    uiState: ScreeningUiState,
    viewModel: SsbScreeningViewModel,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = onBack,
                modifier = Modifier
                    .heightIn(min = 44.dp)
                    .sizeIn(minWidth = 56.dp, minHeight = 44.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = SsbColors.SurfaceRaised,
                    contentColor = SsbColors.TextPrimary
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border),
                shape = SsbShapes.control
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "BACK TO CONSOLE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        GatewayDiagnosticsView(
            connectivityMode = uiState.connectivityMode,
            onConnectivityModeSelected = { viewModel.setConnectivityMode(it) },
            gatewayHealth = uiState.gatewayHealth,
            gatewayLatencyMs = uiState.gatewayLatencyMs,
            isCheckingHealth = uiState.isGatewayChecking,
            onCheckHealth = { viewModel.checkGatewayHealth() },
            customUrl = uiState.customGatewayUrl,
            onUpdateCustomUrl = { viewModel.updateCustomGatewayUrl(it) }
        )
    }
}

/**
 * Streamlined 3-Tab Bottom Navigation Bar
 * CAPTURE · OUTBOX · CONNECT (Wi-Fi)
 * Enforces >= 56dp touch targets across all tabs.
 */
@Composable
fun NavigationBarRow(
    activeScreen: NavigationScreen,
    pendingOutboxCount: Int,
    onScreenSelected: (NavigationScreen) -> Unit,
    onOpenWifiConnect: () -> Unit = {}
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding(),
        color = SsbColors.Surface,
        shadowElevation = 2.dp,
        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp)
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tab 1: CAPTURE (Min 56dp touch target)
            val isCaptureSelected = activeScreen == NavigationScreen.CAPTURE
            NavTabItem(
                label = "CAPTURE",
                sublabel = "Viewfinder",
                icon = Icons.Default.QrCodeScanner,
                isSelected = isCaptureSelected,
                badgeCount = null,
                onClick = { onScreenSelected(NavigationScreen.CAPTURE) },
                testTag = "nav_tab_capture",
                modifier = Modifier.weight(1f)
            )

            // Tab 2: OUTBOX (Min 56dp touch target)
            val isOutboxSelected = activeScreen == NavigationScreen.OUTBOX
            NavTabItem(
                label = "OUTBOX",
                sublabel = "Queue",
                icon = Icons.Default.Inbox,
                isSelected = isOutboxSelected,
                badgeCount = if (pendingOutboxCount > 0) pendingOutboxCount else null,
                onClick = { onScreenSelected(NavigationScreen.OUTBOX) },
                testTag = "nav_tab_outbox",
                modifier = Modifier.weight(1f)
            )

            // Tab 3: CONNECT — Wi-Fi pairing (Min 56dp touch target)
            NavTabItem(
                label = "CONNECT",
                sublabel = "Wi-Fi",
                icon = Icons.Default.Wifi,
                isSelected = false,
                badgeCount = null,
                onClick = onOpenWifiConnect,
                testTag = "nav_tab_connect_wifi",
                modifier = Modifier.weight(1f)
            )
        }
    }
}

/**
 * 56dp High-Contrast Ergonomic Navigation Tab Item
 */
@Composable
fun NavTabItem(
    label: String,
    sublabel: String,
    icon: ImageVector,
    isSelected: Boolean,
    badgeCount: Int?,
    onClick: () -> Unit,
    testTag: String,
    accentColor: Color? = null,
    modifier: Modifier = Modifier
) {
    val baseColor = accentColor ?: SsbColors.Accent
    val color = when {
        isSelected -> SsbColors.AccentInk
        accentColor != null -> accentColor  // accent tabs always show in accent color
        else -> SsbColors.TextMuted
    }
    val bg = when {
        isSelected -> SsbColors.AccentTint
        accentColor != null -> baseColor.copy(alpha = 0.10f)
        else -> Color.Transparent
    }
    val border = when {
        isSelected -> SsbColors.Accent.copy(alpha = 0.28f)
        accentColor != null -> baseColor.copy(alpha = 0.30f)
        else -> Color.Transparent
    }

    Box(
        modifier = modifier
            .heightIn(min = 56.dp)
            .sizeIn(minWidth = 56.dp, minHeight = 56.dp)
            .clip(SsbShapes.control)
            .background(bg)
            .border(1.dp, border, SsbShapes.control)
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 6.dp)
            .testTag(testTag),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (badgeCount != null && badgeCount > 0) {
                BadgedBox(
                    badge = {
                        Badge(
                            containerColor = SsbColors.AmberWarn,
                            contentColor = Color.Black
                        ) {
                            Text(
                                text = "$badgeCount",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        tint = color,
                        modifier = Modifier.size(20.dp)
                    )
                }
            } else {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = if (isSelected || accentColor != null) FontWeight.SemiBold else FontWeight.Medium,
                color = color,
                letterSpacing = 0.3.sp
            )
        }
    }
}

@Composable
fun EmptyStateView(message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            color = SsbColors.Surface,
            shape = SsbShapes.card,
            border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border),
            shadowElevation = 1.dp
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 22.dp, vertical = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "No inspection yet",
                    fontWeight = FontWeight.SemiBold,
                    color = SsbColors.TextPrimary,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = message,
                    color = SsbColors.TextSecondary,
                    fontSize = 13.sp
                )
            }
        }
    }
}


@Composable
fun InsightKpiRow(
    score: Double,
    riskLevel: String,
    latencyMs: Double,
    violationCount: Int,
    rulesChecked: Int
) {
    val scoreColor = when (riskLevel) {
        "GREEN" -> SsbColors.GreenPass
        "AMBER" -> SsbColors.AmberWarn
        else -> SsbColors.RedAlert
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SsbColors.Surface,
        shape = SsbShapes.card,
        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border),
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "SCREENING TELEMETRY",
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = SsbColors.TextMuted,
                    letterSpacing = 0.5.sp
                )
                Text(
                    text = "3-STREAM ENGINE",
                    fontSize = 9.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold,
                    color = SsbColors.AccentInk
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TelemetryTile(
                    label = "THREAT",
                    value = String.format("%.1f", score),
                    sublabel = riskLevel,
                    valueColor = scoreColor,
                    modifier = Modifier.weight(1f)
                )
                TelemetryTile(
                    label = "TIME",
                    value = "${latencyMs.toInt()}ms",
                    sublabel = "realtime",
                    valueColor = SsbColors.Accent,
                    modifier = Modifier.weight(1f)
                )
                TelemetryTile(
                    label = "DIFFS",
                    value = "$violationCount",
                    sublabel = if (violationCount == 0) "clean" else "review",
                    valueColor = if (violationCount == 0) SsbColors.GreenPass else SsbColors.RedAlert,
                    modifier = Modifier.weight(1f)
                )
                TelemetryTile(
                    label = "GUARDS",
                    value = "$rulesChecked",
                    sublabel = "rules",
                    valueColor = SsbColors.TextPrimary,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun TelemetryTile(
    label: String,
    value: String,
    sublabel: String,
    valueColor: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(SsbShapes.item)
            .background(SsbColors.SurfaceInset)
            .border(1.dp, SsbColors.Border, SsbShapes.item)
            .padding(horizontal = 8.dp, vertical = 7.dp)
    ) {
        Column {
            Text(
                text = label,
                fontSize = 8.5.sp,
                fontWeight = FontWeight.Bold,
                color = SsbColors.TextMuted,
                letterSpacing = 0.4.sp,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = valueColor,
                softWrap = false,
                maxLines = 1
            )
            Spacer(modifier = Modifier.height(1.dp))
            Text(
                text = sublabel,
                fontSize = 9.sp,
                fontWeight = FontWeight.Medium,
                color = SsbColors.TextSecondary,
                maxLines = 1
            )
        }
    }
}

