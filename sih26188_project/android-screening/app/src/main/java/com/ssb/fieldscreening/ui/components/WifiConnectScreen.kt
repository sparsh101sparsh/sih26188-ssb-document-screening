package com.ssb.fieldscreening.ui.components

import android.content.Context
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Computer
import androidx.compose.material.icons.filled.NetworkCheck
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiFind
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SheetState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes
import com.ssb.fieldscreening.util.WifiUtils
import kotlinx.coroutines.launch

/**
 * Super-simplified Wi-Fi Connection Screen.
 *
 * Provides 3 intuitive ways to connect:
 * 1. 📷 Scan QR Code on Laptop Screen (Instant, 1 second)
 * 2. ⚡ Auto-Find Laptop on Wi-Fi (1-tap network discovery)
 * 3. ⌨️ Quick IP input with preset helper chips
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WifiConnectScreen(
    onDismiss: () -> Unit,
    onConnected: (gatewayUrl: String) -> Unit,
    currentGatewayUrl: String = "http://192.168.1.61:8000"
) {
    val context = LocalContext.current
    val sheetState: SheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    // Gather Wi-Fi details
    val localIp = remember { WifiUtils.getLocalIpAddress() ?: "192.168.1.x" }
    val wifiSsid = remember { WifiUtils.getWifiSsid(context) ?: "Wi-Fi Network" }
    val isOnWifi = remember { WifiUtils.isOnWifi(context) }
    val lastConnected = remember { WifiUtils.getLastConnectedGateway(context) }

    var isScanningQr by remember { mutableStateOf(false) }
    var isAutoDiscovering by remember { mutableStateOf(false) }
    var isTestingConnection by remember { mutableStateOf(false) }
    var urlInput by remember { mutableStateOf(lastConnected ?: currentGatewayUrl) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    var confirmedUrl by remember { mutableStateOf<String?>(null) }
    var latencyMs by remember { mutableStateOf(0L) }

    // Pre-fill IP from device's subnet if blank
    LaunchedEffect(Unit) {
        val subnet = WifiUtils.getLocalSubnet()
        if (subnet != null && urlInput.contains("192.168.1.100") && !urlInput.contains(subnet)) {
            urlInput = "http://$subnet.100:8000"
        }
    }

    fun handleConnectSuccess(url: String, latency: Long) {
        val normalized = WifiUtils.normalizeGatewayUrl(url)
        WifiUtils.saveLastConnectedGateway(context, normalized)
        confirmedUrl = normalized
        latencyMs = latency
        successMessage = "Successfully connected to Laptop Web App!"
        errorMessage = null
        onConnected(normalized)
    }

    fun testAndConnect(targetUrl: String) {
        if (targetUrl.isBlank()) {
            errorMessage = "Please enter an IP address."
            return
        }
        val normalized = WifiUtils.normalizeGatewayUrl(targetUrl)
        isTestingConnection = true
        errorMessage = null
        successMessage = null

        scope.launch {
            val (ok, latency) = WifiUtils.testGateway(normalized, 2000L)
            isTestingConnection = false
            if (ok) {
                handleConnectSuccess(normalized, latency)
            } else {
                errorMessage = "Could not connect to $normalized. Make sure your laptop and phone are on the same Wi-Fi and the web app is running."
            }
        }
    }

    if (isScanningQr) {
        Dialog(
            onDismissRequest = { isScanningQr = false },
            properties = DialogProperties(
                usePlatformDefaultWidth = false,
                decorFitsSystemWindows = false
            )
        ) {
            QrScannerView(
                onQrCodeDetected = { qrPayload ->
                    isScanningQr = false
                    testAndConnect(qrPayload)
                },
                onClose = {
                    isScanningQr = false
                }
            )
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SsbColors.Surface,
        dragHandle = null
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp)
                .padding(top = 16.dp, bottom = 32.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // ── Header Bar ───────────────────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(SsbShapes.item)
                            .background(SsbColors.AccentCyan.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Wifi,
                            contentDescription = null,
                            tint = SsbColors.AccentCyan,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Connect to Laptop Web App",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = SsbColors.TextPrimary
                        )
                        Text(
                            text = if (isOnWifi) "Wi-Fi: $wifiSsid" else "Not connected to Wi-Fi",
                            fontSize = 11.sp,
                            color = if (isOnWifi) SsbColors.GreenPass else SsbColors.AmberWarn
                        )
                    }
                }
                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = SsbColors.TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            // ── Success State Card (When Connected) ───────────────────────
            if (confirmedUrl != null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(SsbShapes.card)
                        .background(SsbColors.GreenPass.copy(alpha = 0.10f))
                        .border(1.dp, SsbColors.GreenPass.copy(alpha = 0.40f), SsbShapes.card)
                        .padding(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = SsbColors.GreenPass,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Connected to Laptop!",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = SsbColors.GreenPass
                            )
                        }
                        Text(
                            text = "$confirmedUrl  •  ${latencyMs}ms latency",
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = SsbColors.TextPrimary
                        )
                        Text(
                            text = "Photos captured on this phone will stream live to the screening console.",
                            fontSize = 10.5.sp,
                            color = SsbColors.TextSecondary
                        )

                        Spacer(modifier = Modifier.height(4.dp))
                        Button(
                            onClick = onDismiss,
                            modifier = Modifier.fillMaxWidth().height(44.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = SsbColors.GreenPass,
                                contentColor = Color.White
                            ),
                            shape = SsbShapes.control
                        ) {
                            Text("Done — Start Capturing", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }

            // ── Error / Alert Banner ─────────────────────────────────────
            errorMessage?.let { err ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(SsbShapes.card)
                        .background(SsbColors.RedAlert.copy(alpha = 0.10f))
                        .border(1.dp, SsbColors.RedAlert.copy(alpha = 0.35f), SsbShapes.card)
                        .padding(12.dp)
                ) {
                    Text(
                        text = "⚠ $err",
                        fontSize = 11.sp,
                        color = SsbColors.RedAlert,
                        lineHeight = 16.sp
                    )
                }
            }

            // ── OPTION 1: SCAN QR CODE (FASTEST & RECOMMENDED) ───────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(SsbShapes.card)
                    .background(SsbColors.SurfaceRaised)
                    .border(1.5.dp, SsbColors.AccentCyan.copy(alpha = 0.50f), SsbShapes.card)
                    .padding(14.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .background(SsbColors.AccentCyan),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("1", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Scan QR Code on Laptop Screen",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.5.sp,
                                color = SsbColors.TextPrimary
                            )
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(SsbColors.GreenPass.copy(alpha = 0.15f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("FASTEST", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = SsbColors.GreenPass)
                        }
                    }

                    Text(
                        text = "Open the SSB Web App on your laptop → Click 'Connect' → Point this phone's camera at the QR code.",
                        fontSize = 11.sp,
                        color = SsbColors.TextSecondary,
                        lineHeight = 15.sp
                    )

                    Button(
                        onClick = { isScanningQr = true },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SsbColors.Accent,
                            contentColor = Color.White
                        ),
                        shape = SsbShapes.control
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Open QR Code Scanner", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }

            // ── OPTION 2: 1-TAP AUTO-DISCOVER ON WI-FI ───────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(SsbShapes.card)
                    .background(SsbColors.SurfaceInset)
                    .border(1.dp, SsbColors.Border, SsbShapes.card)
                    .padding(14.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(SsbColors.SurfaceRaised)
                                .border(1.dp, SsbColors.Border, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("2", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = SsbColors.TextPrimary)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Auto-Find Laptop on Wi-Fi",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.5.sp,
                            color = SsbColors.TextPrimary
                        )
                    }

                    Text(
                        text = "Automatically searches your local Wi-Fi ($wifiSsid) to find your laptop in 1 second.",
                        fontSize = 11.sp,
                        color = SsbColors.TextSecondary,
                        lineHeight = 15.sp
                    )

                    Button(
                        onClick = {
                            scope.launch {
                                isAutoDiscovering = true
                                errorMessage = null
                                successMessage = null
                                val found = WifiUtils.discoverGatewayOnSubnet(8000)
                                isAutoDiscovering = false
                                if (found != null) {
                                    urlInput = found
                                    testAndConnect(found)
                                } else {
                                    errorMessage = "No laptop found on $wifiSsid. Make sure backend is running, or scan the QR code above."
                                }
                            }
                        },
                        enabled = !isAutoDiscovering && !isTestingConnection,
                        modifier = Modifier.fillMaxWidth().height(44.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SsbColors.SurfaceRaised,
                            contentColor = SsbColors.AccentGlow
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp, SsbColors.AccentGlow.copy(alpha = 0.5f)
                        ),
                        shape = SsbShapes.control
                    ) {
                        if (isAutoDiscovering) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = SsbColors.AccentGlow,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Searching local Wi-Fi...", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        } else {
                            Icon(
                                imageVector = Icons.Default.WifiFind,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Auto-Find Laptop", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }

            // ── OPTION 3: MANUAL IP ADDRESS (FALLBACK) ───────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(SsbShapes.card)
                    .background(SsbColors.SurfaceInset)
                    .border(1.dp, SsbColors.Border, SsbShapes.card)
                    .padding(14.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(SsbColors.SurfaceRaised)
                                .border(1.dp, SsbColors.Border, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("3", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = SsbColors.TextPrimary)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Enter Laptop IP Manually",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.5.sp,
                            color = SsbColors.TextPrimary
                        )
                    }

                    // Text Field for URL / IP
                    OutlinedTextField(
                        value = urlInput,
                        onValueChange = {
                            urlInput = it
                            errorMessage = null
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Laptop IP Address or URL", fontSize = 11.sp) },
                        placeholder = { Text("e.g. 192.168.1.50 or http://192.168.1.50:8000", fontSize = 11.sp) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Uri,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                testAndConnect(urlInput)
                            }
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = SsbColors.Accent,
                            unfocusedBorderColor = SsbColors.Border,
                            focusedLabelColor = SsbColors.Accent,
                            unfocusedLabelColor = SsbColors.TextMuted,
                            focusedTextColor = SsbColors.TextPrimary,
                            unfocusedTextColor = SsbColors.TextPrimary
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )

                    // Quick Suggestion Chips
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        val subnet = WifiUtils.getLocalSubnet()
                        if (subnet != null) {
                            QuickChip(
                                label = "Subnet .1",
                                onClick = { urlInput = "http://$subnet.1:8000" }
                            )
                        }
                        QuickChip(
                            label = "Emulator 10.0.2.2",
                            onClick = { urlInput = "http://10.0.2.2:8000" }
                        )
                        if (lastConnected != null && lastConnected != urlInput) {
                            QuickChip(
                                label = "Last IP",
                                onClick = { urlInput = lastConnected }
                            )
                        }
                    }

                    // Test & Connect button
                    Button(
                        onClick = { testAndConnect(urlInput) },
                        enabled = !isTestingConnection && urlInput.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(44.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SsbColors.Accent,
                            contentColor = Color.White
                        ),
                        shape = SsbShapes.control
                    ) {
                        if (isTestingConnection) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Testing connection...", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        } else {
                            Icon(
                                imageVector = Icons.Default.NetworkCheck,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Connect", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickChip(
    label: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(SsbColors.SurfaceRaised)
            .border(1.dp, SsbColors.Border, RoundedCornerShape(6.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = label,
            fontSize = 9.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = SsbColors.TextSecondary
        )
    }
}
