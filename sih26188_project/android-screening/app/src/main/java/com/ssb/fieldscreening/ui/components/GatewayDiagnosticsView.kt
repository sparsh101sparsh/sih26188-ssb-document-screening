package com.ssb.fieldscreening.ui.components

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
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cable
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.NetworkCheck
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Router
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.data.model.HealthResponse
import com.ssb.fieldscreening.data.remote.ApiClientFactory
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun GatewayDiagnosticsView(
    connectivityMode: ConnectivityMode,
    onConnectivityModeSelected: (ConnectivityMode) -> Unit,
    gatewayHealth: HealthResponse?,
    gatewayLatencyMs: Long,
    isCheckingHealth: Boolean,
    onCheckHealth: () -> Unit,
    customUrl: String,
    onUpdateCustomUrl: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var urlInput by remember { mutableStateOf(customUrl) }
    var isAutoDetecting by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Gateway Live Health Banner
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = SsbColors.Surface,
            shape = SsbShapes.card,
            border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border),
            shadowElevation = 1.dp
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f, fill = false),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Dns,
                            contentDescription = null,
                            tint = SsbColors.AccentGlow,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "EDGE GATEWAY HARDWARE LINK",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.TextPrimary,
                            maxLines = 1
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Button(
                        onClick = onCheckHealth,
                        enabled = !isCheckingHealth,
                        modifier = Modifier
                            .height(34.dp)
                            .wrapContentWidth()
                            .testTag("ping_gateway_btn"),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SsbColors.SurfaceRaised,
                            contentColor = SsbColors.TextPrimary
                        ),
                        shape = SsbShapes.control,
                        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border)
                    ) {
                        if (isCheckingHealth) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(13.dp),
                                color = SsbColors.AccentGlow,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = null,
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("PING", fontSize = 10.sp, fontWeight = FontWeight.Bold, softWrap = false, maxLines = 1)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val statusText = gatewayHealth?.status?.uppercase() ?: "STANDBY"
                    val isHealthy = statusText == "HEALTHY" || statusText == "SIMULATED_EDGE_STANDBY"
                    val color = if (isHealthy) SsbColors.GreenPass else SsbColors.RedAlert

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(SsbShapes.item)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.item)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(text = "STATUS", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = SsbColors.TextMuted)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = statusText,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = color,
                                maxLines = 1
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(SsbShapes.item)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.item)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(text = "LINK LATENCY", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = SsbColors.TextMuted)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${gatewayLatencyMs} ms",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (gatewayLatencyMs < 20) SsbColors.GreenPass else SsbColors.AmberWarn,
                                maxLines = 1
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .weight(1.3f)
                            .clip(SsbShapes.item)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.item)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(text = "ACCELERATOR", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = SsbColors.TextMuted)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = gatewayHealth?.engineMode ?: "Local NPU/MPS",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = SsbColors.AccentGlow,
                                maxLines = 1
                            )
                        }
                    }
                }
            }
        }

        // Connectivity Modes Selector
        Text(
            text = "FIELD CONNECTIVITY PROFILES",
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp,
                color = SsbColors.TextMuted,
                fontSize = 10.sp
            )
        )

        ConnectivityMode.entries.forEach { mode ->
            val isSelected = mode == connectivityMode
            val (modeIcon, modeColor) = when (mode) {
                ConnectivityMode.USB_TETHERED -> Pair(Icons.Default.Cable, SsbColors.GreenPass)
                ConnectivityMode.AIR_GAPPED_WIFI -> Pair(Icons.Default.Wifi, SsbColors.AccentCyan)
                ConnectivityMode.OFFLINE_OUTBOX -> Pair(Icons.Default.CloudOff, SsbColors.AmberWarn)
            }

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onConnectivityModeSelected(mode) },
                color = if (isSelected) SsbColors.SurfaceRaised else SsbColors.Surface,
                shape = SsbShapes.item,
                border = androidx.compose.foundation.BorderStroke(
                    width = if (isSelected) 1.5.dp else 1.dp,
                    color = if (isSelected) modeColor else SsbColors.Border
                )
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(SsbShapes.item)
                            .background(modeColor.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = modeIcon,
                            contentDescription = null,
                            tint = modeColor,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = mode.label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextPrimary
                            )
                            if (isSelected) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "● ACTIVE",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = modeColor
                                )
                            }
                        }
                        Text(
                            text = mode.description,
                            fontSize = 10.sp,
                            color = SsbColors.TextSecondary
                        )
                        if (mode.endpoint.isNotBlank()) {
                            Text(
                                text = mode.endpoint,
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Monospace,
                                color = SsbColors.TextMuted
                            )
                        }
                    }
                }
            }
        }

        // Custom Endpoint Configurator
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = SsbColors.Surface,
            shape = RoundedCornerShape(10.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "CUSTOM FASTAPI GATEWAY ENDPOINT",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = SsbColors.TextMuted,
                        modifier = Modifier.weight(1f, fill = false),
                        maxLines = 1
                    )

                    Spacer(modifier = Modifier.width(6.dp))

                    Button(
                        onClick = {
                            coroutineScope.launch {
                                isAutoDetecting = true
                                val candidateGateways = listOf(
                                    "http://192.168.43.1:8000",
                                    "http://192.168.1.1:8000",
                                    "http://192.168.2.1:8000",
                                    "http://10.0.0.1:8000"
                                )
                                var detectedUrl: String? = null
                                withContext(Dispatchers.IO) {
                                    for (cand in candidateGateways) {
                                        try {
                                            val service = ApiClientFactory.createService(cand)
                                            val resp = service.getHealth()
                                            if (resp.isSuccessful && resp.body() != null) {
                                                detectedUrl = cand
                                                break
                                            }
                                        } catch (e: Exception) {
                                            // Candidate unreachable, try next
                                        }
                                    }
                                }
                                if (detectedUrl != null) {
                                    urlInput = detectedUrl!!
                                    onUpdateCustomUrl(detectedUrl!!)
                                }
                                isAutoDetecting = false
                            }
                        },
                        enabled = !isAutoDetecting,
                        modifier = Modifier
                            .height(30.dp)
                            .wrapContentWidth()
                            .testTag("auto_detect_gateway_btn"),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SsbColors.SurfaceRaised,
                            contentColor = SsbColors.AccentGlow
                        ),
                        shape = RoundedCornerShape(6.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.AccentGlow.copy(alpha = 0.5f))
                    ) {
                        if (isAutoDetecting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(12.dp),
                                color = SsbColors.AccentGlow,
                                strokeWidth = 1.5.dp
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("SCANNING...", fontSize = 9.sp, fontWeight = FontWeight.Bold, softWrap = false, maxLines = 1)
                        } else {
                            Icon(
                                imageVector = Icons.Default.NetworkCheck,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("AUTO-DETECT", fontSize = 9.sp, fontWeight = FontWeight.Bold, softWrap = false, maxLines = 1)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = urlInput,
                        onValueChange = { urlInput = it },
                        modifier = Modifier.weight(1f).testTag("custom_gateway_url_input"),
                        placeholder = { Text("http://127.0.0.1:8000", fontSize = 11.sp) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = SsbColors.Accent,
                            unfocusedBorderColor = SsbColors.Border,
                            focusedContainerColor = SsbColors.Background,
                            unfocusedContainerColor = SsbColors.Background,
                            focusedTextColor = SsbColors.TextPrimary,
                            unfocusedTextColor = SsbColors.TextPrimary
                        ),
                        shape = RoundedCornerShape(6.dp)
                    )

                    Button(
                        onClick = { onUpdateCustomUrl(urlInput) },
                        modifier = Modifier.height(44.dp).testTag("apply_url_btn"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SsbColors.Accent,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text("APPLY", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // On-Device & Edge Models Loaded Matrix
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = SsbColors.Surface,
            shape = RoundedCornerShape(10.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = "FIELD INFERENCE ENGINE RUNTIMES",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = SsbColors.TextMuted
                )
                Spacer(modifier = Modifier.height(8.dp))

                val models = listOf(
                    Triple("Text Extraction & OCR Engine", "Latin, Devanagari, Tibetan, Bengali", true),
                    Triple("Document Format & MRZ Validator", "TD1, TD2, TD3 Checksum Modulo-10", true),
                    Triple("Biometric Face Match Embedder", "512D High-Confidence Matching", true),
                    Triple("Anti-Spoofing Liveness Engine", "2D/3D Presentation Attack Detector", true),
                    Triple("Substrate & Splicing Detector", "Pixel Tamper Splicing Localization", true),
                    Triple("Border Permit Stamp Verifier", "Keypoints & Seal Correlation", true)
                )

                models.forEach { (name, desc, loaded) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = name,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextPrimary
                            )
                            Text(
                                text = desc,
                                fontSize = 9.sp,
                                color = SsbColors.TextSecondary
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = SsbColors.GreenPass,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "LOADED",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = SsbColors.GreenPass
                            )
                        }
                    }
                }
            }
        }
    }
}
