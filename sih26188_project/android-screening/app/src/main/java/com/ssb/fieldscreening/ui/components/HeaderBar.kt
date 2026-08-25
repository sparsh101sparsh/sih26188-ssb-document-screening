package com.ssb.fieldscreening.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ssb.fieldscreening.data.model.Checkpoint
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.data.model.DEFAULT_CHECKPOINTS
import com.ssb.fieldscreening.data.model.HealthResponse
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@Composable
fun HeaderBar(
    selectedCheckpoint: Checkpoint,
    onCheckpointSelected: (Checkpoint) -> Unit,
    connectivityMode: ConnectivityMode,
    onConnectivityModeSelected: (ConnectivityMode) -> Unit,
    gatewayHealth: HealthResponse?,
    gatewayLatencyMs: Long,
    onOpenDiagnostics: (() -> Unit)? = null,
    onOpenWifiConnect: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    var checkpointMenuExpanded by remember { mutableStateOf(false) }
    var currentTimeMillis by remember { mutableLongStateOf(System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        while (true) {
            currentTimeMillis = System.currentTimeMillis()
            delay(1000)
        }
    }

    val utcFormat = remember {
        SimpleDateFormat("HH:mm:ss 'UTC'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    val isOnline = connectivityMode != ConnectivityMode.OFFLINE_OUTBOX
    val isWifi = connectivityMode == ConnectivityMode.AIR_GAPPED_WIFI
    val statusColor = when {
        !isOnline -> SsbColors.AmberWarn
        isWifi && gatewayLatencyMs > 0 -> SsbColors.GreenPass
        gatewayLatencyMs > 0 -> SsbColors.GreenPass
        else -> SsbColors.AmberWarn
    }
    val statusLabel = when {
        !isOnline -> "Offline"
        isWifi && gatewayLatencyMs > 0 -> "Wi-Fi Connected"
        isWifi -> "Wi-Fi Connecting..."
        gatewayLatencyMs > 0 -> "USB Link"
        else -> "Connecting..."
    }

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding(),
        color = SsbColors.Surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f, fill = false),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(SsbShapes.item)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.item),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "SSB",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.AccentInk,
                            letterSpacing = 0.4.sp
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "GOVT OF INDIA · MHA",
                            fontSize = 8.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SsbColors.TextMuted,
                            letterSpacing = 0.5.sp,
                            maxLines = 1
                        )
                        Text(
                            text = "Sashastra Seema Bal",
                            fontSize = 13.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.TextPrimary,
                            letterSpacing = (-0.2).sp,
                            maxLines = 1
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .height(34.dp)
                            .clip(SsbShapes.chip)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.chip)
                            .clickable { (onOpenWifiConnect ?: onOpenDiagnostics)?.invoke() }
                            .padding(horizontal = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(statusColor.copy(alpha = pulseAlpha))
                            )
                            Text(
                                text = statusLabel,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = statusColor,
                                softWrap = false,
                                maxLines = 1
                            )
                        }
                    }

                    IconButton(
                        onClick = { onOpenDiagnostics?.invoke() },
                        modifier = Modifier
                            .size(34.dp)
                            .clip(SsbShapes.item)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.item)
                            .testTag("header_diagnostics_gear_btn")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Diagnostics",
                            tint = SsbColors.TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(modifier = Modifier.weight(1f, fill = false)) {
                    Row(
                        modifier = Modifier
                            .heightIn(min = 32.dp)
                            .clip(SsbShapes.chip)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.chip)
                            .clickable { checkpointMenuExpanded = true }
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                            .testTag("checkpoint_selector_dropdown"),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Post",
                            fontSize = 9.5.sp,
                            fontWeight = FontWeight.Medium,
                            color = SsbColors.TextMuted
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = selectedCheckpoint.name,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SsbColors.TextPrimary,
                            maxLines = 1
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Icon(
                            imageVector = Icons.Default.ArrowDropDown,
                            contentDescription = "Dropdown",
                            tint = SsbColors.TextSecondary,
                            modifier = Modifier.size(15.dp)
                        )
                    }

                    DropdownMenu(
                        expanded = checkpointMenuExpanded,
                        onDismissRequest = { checkpointMenuExpanded = false },
                        modifier = Modifier.background(SsbColors.Surface)
                    ) {
                        DEFAULT_CHECKPOINTS.forEach { checkpoint ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(
                                            text = checkpoint.name,
                                            fontWeight = FontWeight.SemiBold,
                                            color = if (checkpoint.id == selectedCheckpoint.id) SsbColors.AccentInk else SsbColors.TextPrimary
                                        )
                                        Text(
                                            text = "${checkpoint.frontier} · ${checkpoint.code}",
                                            fontSize = 11.sp,
                                            color = SsbColors.TextSecondary
                                        )
                                    }
                                },
                                onClick = {
                                    onCheckpointSelected(checkpoint)
                                    checkpointMenuExpanded = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = utcFormat.format(Date(currentTimeMillis)),
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = SsbColors.TextMuted,
                        maxLines = 1
                    )
                    val modePillText = when (connectivityMode) {
                        ConnectivityMode.USB_TETHERED -> "USB"
                        ConnectivityMode.AIR_GAPPED_WIFI -> "WI-FI"
                        ConnectivityMode.OFFLINE_OUTBOX -> "LOCAL"
                    }
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                            .wrapContentWidth()
                    ) {
                        Text(
                            text = modePillText,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.AccentInk,
                            letterSpacing = 0.5.sp,
                            softWrap = false,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}
