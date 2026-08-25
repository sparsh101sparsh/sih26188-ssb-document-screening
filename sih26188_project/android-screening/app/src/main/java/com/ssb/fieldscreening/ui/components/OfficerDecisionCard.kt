package com.ssb.fieldscreening.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AssignmentTurnedIn
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import com.ssb.fieldscreening.data.model.OfficerActionType
import com.ssb.fieldscreening.data.model.OfficerDecisionRecord
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun OfficerDecisionCard(
    officerId: String,
    officerName: String,
    decisionRecord: OfficerDecisionRecord?,
    remarks: String,
    onRemarksChanged: (String) -> Unit,
    onDecisionMade: (OfficerActionType) -> Unit,
    modifier: Modifier = Modifier
) {
    val effectiveOfficerId = officerId.ifBlank { "OFFICER-7482" }

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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Gavel,
                        contentDescription = null,
                        tint = SsbColors.Accent,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Officer Authorization",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.2.sp,
                            color = SsbColors.TextPrimary,
                            fontSize = 11.5.sp
                        )
                    )
                }

                // Active Officer Badge
                Box(
                    modifier = Modifier
                        .clip(SsbShapes.chip)
                        .background(SsbColors.SurfaceInset)
                        .border(1.dp, SsbColors.Border, SsbShapes.chip)
                        .padding(horizontal = 7.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "OFFICER: $effectiveOfficerId",
                        fontSize = 9.5.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = SsbColors.TextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Remarks / Incident Notes
            OutlinedTextField(
                value = remarks,
                onValueChange = onRemarksChanged,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("officer_remarks_input"),
                placeholder = {
                    Text(
                        text = "Enter field remarks or physical verification notes...",
                        fontSize = 11.sp,
                        color = SsbColors.TextMuted
                    )
                },
                maxLines = 2,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SsbColors.Accent,
                    unfocusedBorderColor = SsbColors.Border,
                    focusedContainerColor = SsbColors.Background,
                    unfocusedContainerColor = SsbColors.Background,
                    focusedTextColor = SsbColors.TextPrimary,
                    unfocusedTextColor = SsbColors.TextPrimary
                ),
                shape = SsbShapes.item
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Touch-Optimized 3-Button Action Grid with Min 56dp High-Contrast Targets
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Button 1: CLEAR
                Button(
                    onClick = { onDecisionMade(OfficerActionType.AUTO_CLEAR) },
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 52.dp)
                        .testTag("officer_clear_btn"),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp, vertical = 4.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SsbColors.GreenPass.copy(alpha = 0.16f),
                        contentColor = SsbColors.GreenPass
                    ),
                    shape = SsbShapes.item,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.GreenPass.copy(alpha = 0.45f))
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "CLEAR",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 0.1.sp,
                            softWrap = false,
                            maxLines = 1
                        )
                    }
                }

                // Button 2: HOLD
                Button(
                    onClick = { onDecisionMade(OfficerActionType.SECONDARY_HOLD) },
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 52.dp)
                        .testTag("officer_hold_btn"),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp, vertical = 4.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SsbColors.AmberWarn.copy(alpha = 0.16f),
                        contentColor = SsbColors.AmberWarn
                    ),
                    shape = SsbShapes.item,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.AmberWarn.copy(alpha = 0.45f))
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "HOLD",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 0.1.sp,
                            softWrap = false,
                            maxLines = 1
                        )
                    }
                }

                // Button 3: DETAIN
                Button(
                    onClick = { onDecisionMade(OfficerActionType.DETAIN_MANDATE) },
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 52.dp)
                        .testTag("officer_detain_btn"),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 4.dp, vertical = 4.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SsbColors.RedAlert.copy(alpha = 0.25f),
                        contentColor = SsbColors.RedAlert
                    ),
                    shape = SsbShapes.item,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.RedAlert.copy(alpha = 0.65f))
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Error,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "DETAIN",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 0.1.sp,
                            softWrap = false,
                            maxLines = 1
                        )
                    }
                }
            }

            // Signed Confirmation Box if decision already made
            if (decisionRecord != null) {
                Spacer(modifier = Modifier.height(10.dp))
                val (decColor, decIcon, decText) = when (decisionRecord.action) {
                    OfficerActionType.AUTO_CLEAR -> Triple(SsbColors.GreenPass, Icons.Default.Check, "TRAVELER CLEARED FOR TRANSIT")
                    OfficerActionType.SECONDARY_HOLD -> Triple(SsbColors.AmberWarn, Icons.Default.Warning, "ESCORTED TO SECONDARY COUNTER")
                    OfficerActionType.DETAIN_MANDATE -> Triple(SsbColors.RedAlert, Icons.Default.Error, "INTERDICTION & DETENTION MANDATE ISSUED")
                }

                val timeStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date(decisionRecord.timestamp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(SsbShapes.item)
                        .background(decColor.copy(alpha = 0.15f))
                        .border(1.dp, decColor.copy(alpha = 0.6f), SsbShapes.item)
                        .padding(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = decIcon,
                                contentDescription = null,
                                tint = decColor,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = decText,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = decColor
                            )
                        }

                        Text(
                            text = timeStr,
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Monospace,
                            color = SsbColors.TextSecondary
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Signed by: ${decisionRecord.officerName} · ${decisionRecord.officerId}",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = SsbColors.TextPrimary
                    )

                    Text(
                        text = "Digital Signature: ${decisionRecord.digitalSignatureHash}",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace,
                        color = SsbColors.TextMuted
                    )
                }
            }
        }
    }
}
