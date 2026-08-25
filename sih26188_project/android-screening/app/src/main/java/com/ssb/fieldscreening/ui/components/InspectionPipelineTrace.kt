package com.ssb.fieldscreening.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
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
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.ImageSearch
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import com.ssb.fieldscreening.data.model.InspectionDetails
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes

@Composable
fun InspectionPipelineTrace(
    details: InspectionDetails,
    modifier: Modifier = Modifier
) {
    var stream1Expanded by remember { mutableStateOf(false) }
    var stream2Expanded by remember { mutableStateOf(false) }
    var stream3Expanded by remember { mutableStateOf(false) }
    var stream4Expanded by remember { mutableStateOf(false) }


    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "MULTI-STREAM PIPELINE",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp,
                    color = SsbColors.TextMuted,
                    fontSize = 11.sp
                ),
                modifier = Modifier.weight(1f, fill = false),
                maxLines = 1
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "Sub-Second Diagnostics",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 10.sp,
                    color = SsbColors.AccentGlow
                ),
                maxLines = 1
            )
        }

        // Stream 1: Text & Document Format Verification
        val ocrPassed = details.mrz.valid && !details.ocr.requiresTier2Vlm
        PipelineStreamCard(
            streamNumber = "STREAM 01",
            title = "Text & Document Format Verification",
            subtitle = "Text extraction, script detection & Modulo-10 checksum validation",
            icon = Icons.Default.MenuBook,
            isPassed = ocrPassed,
            statusText = if (ocrPassed) "ICAO COMPLIANT" else "CHECKSUM / DOB MISMATCH",
            latencyMs = details.ocr.processingTimeMs + details.mrz.processingTimeMs,
            isExpanded = stream1Expanded,
            onToggleExpand = { stream1Expanded = !stream1Expanded }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // OCR Fields Key-Value Table
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(SsbColors.Background)
                        .padding(8.dp)
                ) {
                    Text(
                        text = "EXTRACTED VISUAL TEXT FIELDS",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = SsbColors.TextMuted
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    details.ocr.fields.forEach { (key, value) ->
                        val conf = details.ocr.fieldConfidences[key] ?: details.ocr.meanConfidence
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = key.replace("_", " ").uppercase(),
                                fontSize = 10.sp,
                                color = SsbColors.TextSecondary,
                                fontFamily = FontFamily.Monospace
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = value,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SsbColors.TextPrimary,
                                    fontFamily = FontFamily.Monospace
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "${(conf * 100).toInt()}%",
                                    fontSize = 9.sp,
                                    color = SsbColors.GreenPass,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }

                // MRZ Raw Lines & Checksum Flags
                if (details.mrz.mrzDetected) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.Background)
                            .padding(8.dp)
                    ) {
                        Text(
                            text = "ICAO 9303 MRZ (${details.mrz.mrzType})",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.TextMuted
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        details.mrz.rawLines.forEach { line ->
                            Text(
                                text = line,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                color = SsbColors.GoldEmblem,
                                maxLines = 1
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            ChecksumBadge("DOC NO", details.mrz.docNumberChecksumValid)
                            ChecksumBadge("DOB", details.mrz.dobChecksumValid)
                            ChecksumBadge("EXPIRY", details.mrz.expiryChecksumValid)
                            ChecksumBadge("COMPOSITE", details.mrz.compositeChecksumValid)
                        }
                    }
                }
            }
        }

        // Stream 2: Face Match & Live Selfie Verification
        val bioPassed = details.biometrics.match && details.liveness.isLive
        PipelineStreamCard(
            streamNumber = "STREAM 02",
            title = "Face Match & Live Selfie Verification",
            subtitle = "1:1 Facial biometric verification and 2D/3D presentation anti-spoofing",
            icon = Icons.Default.Face,
            isPassed = bioPassed,
            statusText = if (bioPassed) "POSITIVE 1:1 MATCH" else if (!details.liveness.isLive) "2D SCREEN SPOOF" else "BIO MISMATCH",
            latencyMs = details.biometrics.processingTimeMs + details.liveness.processingTimeMs,
            isExpanded = stream2Expanded,
            onToggleExpand = { stream2Expanded = !stream2Expanded }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Face Match Block
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.Background)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(
                                text = "FACE MATCH CONFIDENCE",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextMuted
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${(details.biometrics.similarity * 100).toInt()}%",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (details.biometrics.match) SsbColors.GreenPass else SsbColors.RedAlert
                            )
                            Text(
                                text = "Threshold: ${(details.biometrics.threshold * 100).toInt()}% | ${if (details.biometrics.match) "VERIFIED" else "FAILED"}",
                                fontSize = 9.sp,
                                color = SsbColors.TextSecondary
                            )
                        }
                    }

                    // Selfie Liveness Block
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.Background)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(
                                text = "SELFIE LIVENESS CHECK",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextMuted
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "${(details.liveness.confidence * 100).toInt()}%",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (details.liveness.isLive) SsbColors.GreenPass else SsbColors.RedAlert
                            )
                            Text(
                                text = if (details.liveness.isLive) "3D Biological Live Face" else "Attack: ${details.liveness.attackType ?: "2D_SCREEN_REPLAY"}",
                                fontSize = 9.sp,
                                color = if (details.liveness.isLive) SsbColors.TextSecondary else SsbColors.RedAlert
                            )
                        }
                    }
                }

                // Age Validation Telemetry
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(SsbColors.Background)
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "AGE VALIDATION",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = SsbColors.TextMuted
                    )
                    Text(
                        text = "ID: ${details.biometrics.apparentAgeId} yrs · Live: ${details.biometrics.apparentAgeLive} yrs (Drift: ${details.biometrics.ageDriftYears} yrs)",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = if (details.biometrics.ageDriftYears <= 5) SsbColors.TextPrimary else SsbColors.AmberWarn
                    )
                }
            }
        }

        // Stream 3: Ink & Substrate Integrity
        val forensicsPassed = !details.forensics.isTampered && details.forensics.tamperScore < 0.25
        PipelineStreamCard(
            streamNumber = "STREAM 03",
            title = "Ink & Substrate Integrity",
            subtitle = "Pixel splicing localization, substrate analysis & surface integrity checks",
            icon = Icons.Default.ImageSearch,
            isPassed = forensicsPassed,
            statusText = if (forensicsPassed) "SUBSTRATE AUTHENTIC" else "TAMPER / SPLICING DETECTED",
            latencyMs = details.forensics.processingTimeMs,
            isExpanded = stream3Expanded,
            onToggleExpand = { stream3Expanded = !stream3Expanded }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.Background)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(
                                text = "TAMPER RISK SCORE",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextMuted
                            )
                            Text(
                                text = "${(details.forensics.docTamperScore * 100).toInt()}%",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (details.forensics.docTamperScore < 0.25) SsbColors.GreenPass else SsbColors.RedAlert
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.Background)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(
                                text = "SPLICING CONFIDENCE",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextMuted
                            )
                            Text(
                                text = "${(details.forensics.truForScore * 100).toInt()}%",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (details.forensics.truForScore < 0.25) SsbColors.GreenPass else SsbColors.RedAlert
                            )
                        }
                    }
                }

                if (details.forensics.detectedAnomalies.isNotEmpty()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        details.forensics.detectedAnomalies.forEach { anomaly ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(SsbColors.RedAlert.copy(alpha = 0.2f))
                                    .border(1.dp, SsbColors.RedAlert, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = anomaly,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SsbColors.RedAlert,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }

                if (details.forensics.tamperedRegions.isNotEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.Background)
                            .padding(8.dp)
                    ) {
                        Text(
                            text = "LOCALIZED SPLICING BOUNDING BOXES",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.TextMuted
                        )
                        details.forensics.tamperedRegions.forEach { region ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "${region.tamperType} [${region.affectedField}]",
                                    fontSize = 10.sp,
                                    color = SsbColors.RedAlert,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "BBox: ${region.bbox} (${(region.peakTamperProbability * 100).toInt()}%)",
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = SsbColors.TextSecondary
                                )
                            }
                        }
                    }
                }
            }
        }

        // Stream 4: Border Permit Stamp Verification
        val stampPassed = details.stamp.ssimScore >= 0.75 && details.stamp.contextConsistent
        PipelineStreamCard(
            streamNumber = "STREAM 04",
            title = "Border Permit Stamp Verification",
            subtitle = "Multi-stage keypoint matching, seal similarity & ink context verification",
            icon = Icons.Default.Verified,
            isPassed = stampPassed,
            statusText = if (stampPassed) "AUTHENTIC STAMP" else "SEAL CORRELATION FAIL",
            latencyMs = details.stamp.processingTimeMs,
            isExpanded = stream4Expanded,
            onToggleExpand = { stream4Expanded = !stream4Expanded }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.Background)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(
                                text = "SEAL MATCH SIMILARITY (>=75%)",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextMuted
                            )
                            Text(
                                text = String.format("%.2f", details.stamp.ssimScore),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (details.stamp.ssimScore >= 0.75) SsbColors.GreenPass else SsbColors.AmberWarn
                            )
                            Text(
                                text = "Verdict: ${details.stamp.verdict}",
                                fontSize = 9.sp,
                                color = SsbColors.TextSecondary
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(6.dp))
                            .background(SsbColors.Background)
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(
                                text = "KEYPOINTS MATCHED",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.TextMuted
                            )
                            Text(
                                text = "${details.stamp.orbMatchCount} pts",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                color = if (details.stamp.orbMatchCount >= 35) SsbColors.GreenPass else SsbColors.AmberWarn
                            )
                            Text(
                                text = "Tamper Energy: ${details.stamp.tamperEnergy}",
                                fontSize = 9.sp,
                                color = SsbColors.TextSecondary
                            )
                        }
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(SsbColors.Background)
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "REGISTERED TEMPLATE: ${details.stamp.checkpostId}",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = SsbColors.TextMuted
                    )
                    Text(
                        text = details.stamp.locationName,
                        fontSize = 10.sp,
                        color = SsbColors.TextPrimary
                    )
                }
            }
        }
    }
}

@Composable
fun PipelineStreamCard(
    streamNumber: String,
    title: String,
    subtitle: String,
    icon: ImageVector,
    isPassed: Boolean,
    statusText: String,
    latencyMs: Double,
    isExpanded: Boolean,
    onToggleExpand: () -> Unit,
    content: @Composable () -> Unit
) {
    val statusColor = if (isPassed) SsbColors.GreenPass else SsbColors.RedAlert
    val statusBg = if (isPassed) SsbColors.GreenTint else SsbColors.RedTint

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SsbColors.Surface,
        shape = SsbShapes.item,
        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onToggleExpand)
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(SsbShapes.item)
                            .background(SsbColors.SurfaceInset)
                            .border(1.dp, SsbColors.Border, SsbShapes.item),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = if (isPassed) SsbColors.AccentGlow else SsbColors.RedAlert,
                            modifier = Modifier.size(17.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = streamNumber,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = SsbColors.AccentInk,
                                fontFamily = FontFamily.Monospace
                            )
                            Box(
                                modifier = Modifier
                                    .clip(SsbShapes.chip)
                                    .background(statusBg)
                                    .border(1.dp, statusColor.copy(alpha = 0.35f), SsbShapes.chip)
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                    .wrapContentWidth()
                            ) {
                                Text(
                                    text = statusText,
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = statusColor,
                                    softWrap = false,
                                    maxLines = 1
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = SsbColors.TextPrimary,
                                fontSize = 12.sp
                            ),
                            maxLines = 1
                        )
                    }
                }

                Spacer(modifier = Modifier.width(6.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "${latencyMs.toInt()}ms",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = SsbColors.TextSecondary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = "Expand",
                        tint = SsbColors.TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 12.dp, end = 12.dp, bottom = 12.dp)
                ) {
                    content()
                }
            }
        }
    }
}

@Composable
fun ChecksumBadge(label: String, isValid: Boolean) {
    Box(
        modifier = Modifier
            .clip(SsbShapes.chip)
            .background(if (isValid) SsbColors.GreenTint else SsbColors.RedTint)
            .border(
                1.dp,
                if (isValid) SsbColors.GreenPass.copy(alpha = 0.4f) else SsbColors.RedAlert.copy(alpha = 0.4f),
                SsbShapes.chip
            )
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = if (isValid) Icons.Default.CheckCircle else Icons.Default.Error,
                contentDescription = null,
                tint = if (isValid) SsbColors.GreenPass else SsbColors.RedAlert,
                modifier = Modifier.size(10.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
                text = "$label: ${if (isValid) "OK" else "FAIL"}",
                fontSize = 8.5.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                color = if (isValid) SsbColors.GreenPass else SsbColors.RedAlert
            )
        }
    }
}
