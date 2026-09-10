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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cable
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.ui.theme.SsbColors

/**
 * Clean, high-contrast banner showing real-time Wi-Fi & Laptop connection status.
 */
@Composable
fun WifiStatusBanner(
    connectivityMode: ConnectivityMode,
    gatewayUrl: String,
    latencyMs: Long,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isUsb = connectivityMode == ConnectivityMode.USB_TETHERED || gatewayUrl.contains("127.0.0.1")
    val isConnected = (connectivityMode == ConnectivityMode.AIR_GAPPED_WIFI || connectivityMode == ConnectivityMode.USB_TETHERED) && latencyMs > 0
    val isOffline = connectivityMode == ConnectivityMode.OFFLINE_OUTBOX

    val infiniteTransition = rememberInfiniteTransition(label = "wifipulse")
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "dotPulse"
    )

    val (bgColor, borderColor, dotColor, textColor) = when {
        isConnected -> Quadruple(
            SsbColors.GreenPass.copy(alpha = 0.12f),
            SsbColors.GreenPass.copy(alpha = 0.45f),
            SsbColors.GreenPass,
            SsbColors.GreenPass
        )
        isOffline -> Quadruple(
            SsbColors.AmberWarn.copy(alpha = 0.12f),
            SsbColors.AmberWarn.copy(alpha = 0.40f),
            SsbColors.AmberWarn,
            SsbColors.AmberWarn
        )
        else -> Quadruple(
            SsbColors.AccentCyan.copy(alpha = 0.10f),
            SsbColors.AccentCyan.copy(alpha = 0.35f),
            SsbColors.AccentCyan,
            SsbColors.AccentCyan
        )
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 9.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.weight(1f, fill = false),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Status dot
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(dotColor.copy(alpha = if (isConnected) pulseAlpha else 1f))
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = when {
                        isConnected && isUsb -> Icons.Default.Cable
                        isConnected -> Icons.Default.Wifi
                        else -> Icons.Default.WifiOff
                    },
                    contentDescription = null,
                    tint = textColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f, fill = false)) {
                    Text(
                        text = when {
                            isConnected && isUsb -> "Connected via USB Cable"
                            isConnected -> "Connected to Laptop Web App"
                            isOffline -> "Offline Mode — Tap to Pair"
                            else -> "Not Connected — Tap to Pair via USB / Wi-Fi"
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = textColor,
                        maxLines = 1
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    if (isConnected) {
                        val cleanUrl = gatewayUrl.removePrefix("http://")
                        val linkType = if (isUsb) "USB Reverse Tether" else "Air-Gapped Wi-Fi"
                        Text(
                            text = "$linkType • $cleanUrl • ${latencyMs}ms",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            color = textColor.copy(alpha = 0.85f),
                            maxLines = 1
                        )
                    } else {
                        Text(
                            text = "Tap to connect via USB or scan QR code",
                            fontSize = 10.sp,
                            color = textColor.copy(alpha = 0.80f),
                            maxLines = 1
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Quick Action Tag
            Surface(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .clickable(onClick = onClick),
                color = textColor.copy(alpha = 0.15f),
                shape = RoundedCornerShape(6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (!isConnected) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = null,
                            tint = textColor,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                    Text(
                        text = if (isConnected) "Change" else "Pair QR",
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = textColor,
                        maxLines = 1,
                        softWrap = false
                    )
                }
            }
        }
    }
}

private data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
