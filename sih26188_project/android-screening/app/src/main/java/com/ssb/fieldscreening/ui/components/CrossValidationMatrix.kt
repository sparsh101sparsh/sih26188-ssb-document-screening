package com.ssb.fieldscreening.ui.components

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
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.wrapContentWidth
import com.ssb.fieldscreening.data.model.CrossValidationDetails
import com.ssb.fieldscreening.data.model.ViolationFlag
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes

@Composable
fun CrossValidationMatrix(
    crossValidation: CrossValidationDetails,
    activeFilter: String,
    onFilterChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val flags = crossValidation.flags
    val totalRules = flags.size.ifZero(8)
    val passedCount = flags.count { it.passed }
    val violationCount = flags.count { !it.passed }

    val filteredFlags = when (activeFilter) {
        "PASSED" -> flags.filter { it.passed }
        "VIOLATIONS" -> flags.filter { !it.passed }
        else -> flags
    }

    Surface(
        modifier = modifier.fillMaxWidth(),
        color = SsbColors.Surface,
        shape = SsbShapes.card,
        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
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
                    Icon(
                        imageVector = Icons.Default.FilterList,
                        contentDescription = null,
                        tint = SsbColors.AccentGlow,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "CROSS-VALIDATION MATRIX",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                            color = SsbColors.TextPrimary,
                            fontSize = 11.sp
                        ),
                        maxLines = 1
                    )
                }

                Spacer(modifier = Modifier.width(6.dp))

                Text(
                    text = "${crossValidation.rulesChecked} Rules · ${crossValidation.processingTimeMs.toInt()}ms",
                    fontSize = 9.5.sp,
                    fontFamily = FontFamily.Monospace,
                    color = SsbColors.TextSecondary,
                    maxLines = 1
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Interactive Filter Chips: All, Passed, Violations
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChipItem(
                    label = "ALL",
                    count = totalRules,
                    isSelected = activeFilter == "ALL",
                    selectedColor = SsbColors.AccentGlow,
                    onClick = { onFilterChange("ALL") },
                    testTag = "filter_chip_all"
                )
                FilterChipItem(
                    label = "PASSED",
                    count = passedCount,
                    isSelected = activeFilter == "PASSED",
                    selectedColor = SsbColors.GreenPass,
                    onClick = { onFilterChange("PASSED") },
                    testTag = "filter_chip_passed"
                )
                FilterChipItem(
                    label = "VIOLATIONS",
                    count = violationCount,
                    isSelected = activeFilter == "VIOLATIONS",
                    selectedColor = SsbColors.RedAlert,
                    onClick = { onFilterChange("VIOLATIONS") },
                    testTag = "filter_chip_violations"
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Tabular Rules Matrix List
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (filteredFlags.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No rules match the selected filter.",
                            color = SsbColors.TextMuted,
                            fontSize = 12.sp
                        )
                    }
                } else {
                    filteredFlags.forEach { flag ->
                        CrossValidationRow(flag = flag)
                    }
                }
            }

            // Critical Violations Details Box if present
            if (crossValidation.criticalViolations.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(SsbShapes.item)
                        .background(SsbColors.RedTint)
                        .border(1.dp, SsbColors.RedAlert.copy(alpha = 0.35f), SsbShapes.item)
                        .padding(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Error,
                            contentDescription = null,
                            tint = SsbColors.RedAlert,
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Critical Cross-Validation Discrepancies",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.RedAlert
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    crossValidation.criticalViolations.forEach { cv ->
                        Text(
                            text = "[${cv.ruleId}] ${cv.ruleName}: Expected '${cv.expectedValue}' vs Found '${cv.actualValue}'",
                            fontSize = 10.5.sp,
                            fontFamily = FontFamily.Monospace,
                            color = SsbColors.TextPrimary,
                            lineHeight = 15.sp
                        )
                        Text(
                            text = "Telemetry: ${cv.telemetryCode} — ${cv.details}",
                            fontSize = 9.5.sp,
                            color = SsbColors.TextSecondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun FilterChipItem(
    label: String,
    count: Int,
    isSelected: Boolean,
    selectedColor: Color,
    onClick: () -> Unit,
    testTag: String
) {
    Box(
        modifier = Modifier
            .clip(SsbShapes.chip)
            .background(if (isSelected) selectedColor.copy(alpha = 0.16f) else SsbColors.SurfaceInset)
            .border(
                1.dp,
                if (isSelected) selectedColor else SsbColors.Border,
                SsbShapes.chip
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 5.dp)
            .testTag(testTag)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = label,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) selectedColor else SsbColors.TextSecondary,
                softWrap = false,
                maxLines = 1
            )
            Spacer(modifier = Modifier.width(4.dp))
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(if (isSelected) selectedColor else SsbColors.Border)
                    .padding(horizontal = 5.dp, vertical = 1.dp)
            ) {
                Text(
                    text = "$count",
                    fontSize = 8.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) Color.White else SsbColors.TextPrimary
                )
            }
        }
    }
}

@Composable
fun CrossValidationRow(flag: ViolationFlag) {
    val statusColor = if (flag.passed) SsbColors.GreenPass else SsbColors.RedAlert
    val statusBg = if (flag.passed) SsbColors.GreenTint else SsbColors.RedTint
    val statusIcon = if (flag.passed) Icons.Default.CheckCircle else Icons.Default.Error
    val statusText = if (flag.passed) "PASSED" else "FAILED"

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(SsbShapes.item)
            .background(SsbColors.SurfaceInset)
            .border(0.8.dp, if (flag.passed) SsbColors.Border else statusColor.copy(alpha = 0.45f), SsbShapes.item)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f, fill = false)
        ) {
            Box(
                modifier = Modifier
                    .clip(SsbShapes.badge)
                    .background(SsbColors.Surface)
                    .border(1.dp, SsbColors.Border, SsbShapes.badge)
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = flag.ruleId,
                    fontSize = 9.5.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = SsbColors.AccentInk
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(
                    text = flag.ruleDescription,
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = SsbColors.TextPrimary,
                    maxLines = 1
                )
                Text(
                    text = flag.telemetryMessage,
                    fontSize = 10.sp,
                    color = if (flag.passed) SsbColors.TextSecondary else statusColor,
                    maxLines = 1
                )
            }
        }

        Spacer(modifier = Modifier.width(6.dp))

        Box(
            modifier = Modifier
                .clip(SsbShapes.chip)
                .background(statusBg)
                .border(1.dp, statusColor.copy(alpha = 0.3f), SsbShapes.chip)
                .padding(horizontal = 6.dp, vertical = 2.dp)
                .wrapContentWidth()
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = statusIcon,
                    contentDescription = null,
                    tint = statusColor,
                    modifier = Modifier.size(11.dp)
                )
                Spacer(modifier = Modifier.width(3.dp))
                Text(
                    text = statusText,
                    fontSize = 8.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = statusColor,
                    softWrap = false,
                    maxLines = 1
                )
            }
        }
    }
}

private fun Int.ifZero(default: Int): Int = if (this == 0) default else this
