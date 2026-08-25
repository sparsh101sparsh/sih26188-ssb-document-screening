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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import com.ssb.fieldscreening.data.model.PRESET_SCENARIOS
import com.ssb.fieldscreening.data.model.PresetScenario
import com.ssb.fieldscreening.data.model.RiskLevel
import com.ssb.fieldscreening.ui.theme.SsbColors

@Composable
fun PresetBar(
    selectedPreset: PresetScenario?,
    onPresetSelected: (PresetScenario) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 2.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "TACTICAL SCREENING DOSSIERS",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = SsbColors.TextMuted
                )
            )
            Text(
                text = "Live Edge AI Screening",
                style = MaterialTheme.typography.labelSmall.copy(
                    color = SsbColors.AccentGlow,
                    fontSize = 10.sp
                )
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(PRESET_SCENARIOS, key = { it.id }) { scenario ->
                PresetCard(
                    scenario = scenario,
                    isSelected = selectedPreset?.id == scenario.id,
                    onClick = { onPresetSelected(scenario) }
                )
            }
        }
    }
}

@Composable
fun PresetCard(
    scenario: PresetScenario,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val (statusColor, statusBg, statusIcon) = when (scenario.expectedRiskLevel) {
        RiskLevel.GREEN -> Triple(SsbColors.GreenPass, SsbColors.GreenTint, Icons.Default.CheckCircle)
        RiskLevel.AMBER -> Triple(SsbColors.AmberWarn, SsbColors.AmberTint, Icons.Default.Warning)
        RiskLevel.RED -> Triple(SsbColors.RedAlert, SsbColors.RedTint, Icons.Default.Error)
    }

    val scenarioIcon = when (scenario.id) {
        "clean_passport" -> Icons.Default.Lock
        "forged_aadhaar" -> Icons.Default.Fingerprint
        "tampered_stamp" -> Icons.Default.Warning
        "presentation_spoof" -> Icons.Default.Face
        else -> Icons.Default.CheckCircle
    }

    Box(
        modifier = modifier
            .width(220.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(if (isSelected) SsbColors.InteractiveSurface else SsbColors.SupportingSurface)
            .border(
                width = if (isSelected) 1.8.dp else 1.dp,
                color = if (isSelected) statusColor else SsbColors.StructuralBorder,
                shape = RoundedCornerShape(14.dp)
            )
            .clickable(onClick = onClick)
            .padding(10.dp)
            .testTag("preset_card_${scenario.id}")
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(statusBg),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = scenarioIcon,
                            contentDescription = null,
                            tint = statusColor,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = scenario.title,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.TextPrimary,
                            fontSize = 12.sp
                        ),
                        maxLines = 1
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(statusBg)
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "${scenario.riskScore.toInt()}%",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = statusColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = scenario.subtitle,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = SsbColors.TextSecondary,
                    fontSize = 10.sp,
                    lineHeight = 13.sp
                ),
                maxLines = 2
            )

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = scenario.travelerName,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = SsbColors.TextMuted,
                    fontFamily = FontFamily.Monospace
                )

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(5.dp))
                        .background(statusColor.copy(alpha = 0.15f))
                        .padding(horizontal = 4.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = scenario.badgeLabel.substringBefore(" /"),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }
        }
    }
}
