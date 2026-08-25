package com.ssb.fieldscreening.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ssb.fieldscreening.data.model.Assessment
import com.ssb.fieldscreening.data.model.RiskLevel
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes

@Composable
fun AssessmentSummaryCard(
    assessment: Assessment,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    val riskLevel = try {
        RiskLevel.valueOf(assessment.riskLevel)
    } catch (e: Exception) {
        if (assessment.riskScore < 25.0) RiskLevel.GREEN
        else if (assessment.riskScore < 70.0) RiskLevel.AMBER
        else RiskLevel.RED
    }

    val infiniteTransition = rememberInfiniteTransition(label = "verdictGlow")
    val redGlowAlpha = infiniteTransition.animateFloat(
        initialValue = 0.30f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "redGlowAlpha"
    ).value

    val (badgeColor, _, _, badgeIcon, bannerTitle, actionDirective) = when (riskLevel) {
        RiskLevel.GREEN -> VerdictConfig(
            badgeColor = SsbColors.GreenPass,
            badgeTint = SsbColors.GreenTint,
            badgeDark = SsbColors.GreenDark,
            badgeIcon = Icons.Default.CheckCircle,
            bannerTitle = "AUTO-CLEAR PASS",
            actionDirective = "APPROVED — Safe for fast-path border transit clearance"
        )
        RiskLevel.AMBER -> VerdictConfig(
            badgeColor = SsbColors.AmberWarn,
            badgeTint = SsbColors.AmberTint,
            badgeDark = SsbColors.AmberDark,
            badgeIcon = Icons.Default.Warning,
            bannerTitle = "SECONDARY INSPECTION HOLD",
            actionDirective = "MANUAL HOLD — Direct subject to Counter 2 for physical verification"
        )
        RiskLevel.RED -> VerdictConfig(
            badgeColor = SsbColors.RedAlert,
            badgeTint = SsbColors.RedTint,
            badgeDark = SsbColors.RedDark,
            badgeIcon = Icons.Default.Error,
            bannerTitle = "CRITICAL SECURITY ALERT · DETAIN",
            actionDirective = "INTERDICTION MANDATE — Detain subject under Section 4(2) Passport Act"
        )
    }

    val cardBorder = if (riskLevel == RiskLevel.RED) {
        androidx.compose.foundation.BorderStroke(1.dp, SsbColors.RedAlert.copy(alpha = redGlowAlpha))
    } else {
        androidx.compose.foundation.BorderStroke(1.dp, badgeColor.copy(alpha = 0.4f))
    }

    val bannerBg = if (riskLevel == RiskLevel.RED) {
        badgeColor.copy(alpha = 0.16f * redGlowAlpha + 0.12f)
    } else {
        badgeColor.copy(alpha = 0.14f)
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = SsbColors.SupportingSurface,
        shape = SsbShapes.card,
        border = cardBorder,
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Highly Visually Dominant Full-Width Semantic Alert Banner
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(bannerBg)
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(SsbShapes.item)
                        .background(badgeColor)
                        .border(
                            1.dp,
                            Color.White.copy(alpha = 0.35f),
                            SsbShapes.item
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = badgeIcon,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(26.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = bannerTitle,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.4.sp,
                                color = badgeColor,
                                fontSize = 13.5.sp
                            ),
                            modifier = Modifier.weight(1f, fill = false)
                        )

                        Spacer(modifier = Modifier.width(6.dp))

                        Box(
                            modifier = Modifier
                                .clip(SsbShapes.chip)
                                .background(badgeColor.copy(alpha = 0.18f))
                                .border(1.dp, badgeColor.copy(alpha = 0.35f), SsbShapes.chip)
                                .padding(horizontal = 7.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "TIER: ${assessment.riskLevel}",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = badgeColor
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(3.dp))

                    Text(
                        text = actionDirective,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = SsbColors.TextPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            lineHeight = 15.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Risk: ",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextMuted
                            )
                            Text(
                                text = "${assessment.riskScore.toInt()}/100",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = badgeColor
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = null,
                                tint = SsbColors.TextMuted,
                                modifier = Modifier.size(12.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            val durationSeconds = assessment.processingTimeMs / 1000.0
                            Text(
                                text = "${String.format("%.1f", durationSeconds)}s",
                                fontSize = 10.5.sp,
                                fontFamily = FontFamily.Monospace,
                                color = SsbColors.TextMuted
                            )
                        }
                    }
                }
            }

            // Card Body: Risk Score Details + Reasons + Tripwires
            Column(modifier = Modifier.padding(14.dp)) {
                // Tripwire Violation Alerts Box
                if (assessment.tripwireCodes.isNotEmpty()) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("tripwires_box"),
                        color = SsbColors.RedTint,
                        shape = SsbShapes.item,
                        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.RedAlert.copy(alpha = 0.35f))
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.FlashOn,
                                    contentDescription = null,
                                    tint = SsbColors.RedAlert,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Security Trigger Alerts",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SsbColors.RedAlert
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            assessment.tripwireCodes.forEach { tripwire ->
                                Text(
                                    text = "• $tripwire",
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Medium,
                                    color = SsbColors.TextPrimary,
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // Core Findings Box
                if (assessment.reasons.isNotEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(SsbShapes.item)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.item)
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "Core Findings & Observations",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.TextMuted,
                            letterSpacing = 0.3.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        assessment.reasons.forEach { reason ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.Top
                            ) {
                                Box(
                                    modifier = Modifier
                                        .padding(top = 5.dp, end = 8.dp)
                                        .size(5.dp)
                                        .clip(CircleShape)
                                        .background(badgeColor)
                                )
                                Text(
                                    text = reason,
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = SsbColors.TextPrimary,
                                        fontSize = 11.5.sp,
                                        lineHeight = 16.sp
                                    ),
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // Cryptographic Audit Hash Bar
                if (assessment.auditHash.isNotBlank()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(SsbShapes.item)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.item)
                            .clickable {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                                val clip = ClipData.newPlainText("Audit Hash", assessment.auditHash)
                                clipboard?.setPrimaryClip(clip)
                                Toast.makeText(context, "Audit Hash copied", Toast.LENGTH_SHORT).show()
                            }
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                            .testTag("audit_hash_bar"),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Key,
                                contentDescription = null,
                                tint = SsbColors.TextMuted,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "AUDIT: ${assessment.auditHash.take(24)}...",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                color = SsbColors.TextSecondary
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "Copy Hash",
                            tint = SsbColors.TextMuted,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}

private data class VerdictConfig(
    val badgeColor: Color,
    val badgeTint: Color,
    val badgeDark: Color,
    val badgeIcon: androidx.compose.ui.graphics.vector.ImageVector,
    val bannerTitle: String,
    val actionDirective: String
)

