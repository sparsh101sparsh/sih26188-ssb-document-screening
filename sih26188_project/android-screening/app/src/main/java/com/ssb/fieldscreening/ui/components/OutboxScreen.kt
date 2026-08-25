package com.ssb.fieldscreening.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import com.ssb.fieldscreening.data.local.OutboxScreeningRecord
import com.ssb.fieldscreening.ui.theme.SsbColors
import com.ssb.fieldscreening.ui.theme.SsbShapes
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun OutboxScreen(
    records: List<OutboxScreeningRecord>,
    pendingCount: Int,
    isSyncing: Boolean,
    syncMessage: String?,
    onSyncNow: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Metrics & Sync Header
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
                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        Text(
                            text = "Pending Records",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = SsbColors.TextPrimary,
                            maxLines = 1
                        )
                        Text(
                            text = "Stored locally until synced to edge server",
                            fontSize = 10.5.sp,
                            color = SsbColors.TextSecondary,
                            maxLines = 1
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Sync Button
                    Button(
                        onClick = onSyncNow,
                        enabled = !isSyncing && records.isNotEmpty(),
                        modifier = Modifier
                            .height(38.dp)
                            .wrapContentWidth()
                            .testTag("sync_outbox_btn"),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SsbColors.Accent,
                            contentColor = Color.White
                        ),
                        shape = SsbShapes.control
                    ) {
                        if (isSyncing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(14.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Syncing...", fontSize = 11.sp, fontWeight = FontWeight.Bold, softWrap = false, maxLines = 1)
                        } else {
                            Icon(
                                imageVector = Icons.Default.Sync,
                                contentDescription = null,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(5.dp))
                            Text("Sync Now", fontSize = 11.sp, fontWeight = FontWeight.Bold, softWrap = false, maxLines = 1)
                        }
                    }
                }

                if (syncMessage != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(SsbShapes.item)
                            .background(SsbColors.Accent.copy(alpha = 0.12f))
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = syncMessage,
                            fontSize = 10.sp,
                            color = SsbColors.AccentGlow,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Counts Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutboxCountBox("TOTAL", "${records.size}", SsbColors.TextPrimary, Modifier.weight(1f))
                    OutboxCountBox("PENDING", "$pendingCount", if (pendingCount > 0) SsbColors.AmberWarn else SsbColors.GreenPass, Modifier.weight(1f))
                    val syncedCount = records.count { it.syncStatus == "SYNCED" }
                    OutboxCountBox("SYNCED", "$syncedCount", SsbColors.GreenPass, Modifier.weight(1f))
                }
            }
        }

        // Records list label
        Text(
            text = "RECENT SCREENINGS",
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp,
                color = SsbColors.TextMuted,
                fontSize = 10.sp
            )
        )

        if (records.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(SsbShapes.card)
                    .background(SsbColors.Surface)
                    .border(1.dp, SsbColors.Border, SsbShapes.card),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.CloudDone,
                        contentDescription = null,
                        tint = SsbColors.TextMuted,
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Outbox queue is currently empty.",
                        color = SsbColors.TextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "Screening sessions will be logged here automatically.",
                        color = SsbColors.TextSecondary,
                        fontSize = 10.5.sp
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(records, key = { it.id }) { record ->
                    OutboxRecordRow(record = record)
                }
            }
        }
    }
}

@Composable
fun OutboxCountBox(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(SsbShapes.item)
            .background(SsbColors.SurfaceInset)
            .border(1.dp, SsbColors.Border, SsbShapes.item)
            .padding(horizontal = 8.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = label, fontSize = 8.5.sp, fontWeight = FontWeight.Bold, color = SsbColors.TextMuted, letterSpacing = 0.3.sp)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = value, fontSize = 16.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, color = color)
        }
    }
}

@Composable
fun OutboxRecordRow(record: OutboxScreeningRecord) {
    val (statusColor, statusBg, statusIcon) = when (record.syncStatus) {
        "SYNCED" -> Triple(SsbColors.GreenPass, SsbColors.GreenTint, Icons.Default.CloudDone)
        "PENDING" -> Triple(SsbColors.AmberWarn, SsbColors.AmberTint, Icons.Default.CloudSync)
        else -> Triple(SsbColors.RedAlert, SsbColors.RedTint, Icons.Default.Error)
    }

    val riskColor = when (record.riskLevel) {
        "GREEN" -> SsbColors.GreenPass
        "AMBER" -> SsbColors.AmberWarn
        else -> SsbColors.RedAlert
    }

    val timeStr = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date(record.createdAt))

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = SsbColors.Surface,
        shape = SsbShapes.item,
        border = androidx.compose.foundation.BorderStroke(1.dp, SsbColors.Border)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = record.sessionId,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        color = SsbColors.AccentGlow
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(3.dp))
                            .background(statusBg)
                            .padding(horizontal = 5.dp, vertical = 1.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = statusIcon,
                                contentDescription = null,
                                tint = statusColor,
                                modifier = Modifier.size(10.dp)
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                            Text(
                                text = record.syncStatus,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = statusColor
                            )
                        }
                    }
                }

                // Risk Score Tag
                if (record.riskScore != null) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(riskColor.copy(alpha = 0.15f))
                            .border(1.dp, riskColor.copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "${record.riskLevel} (${record.riskScore.toInt()}%)",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = riskColor
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${record.travelerName ?: "TRAVELER"} · ${record.documentNumber ?: "N/A"}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = SsbColors.TextPrimary
                )
                Text(
                    text = timeStr,
                    fontSize = 9.sp,
                    fontFamily = FontFamily.Monospace,
                    color = SsbColors.TextSecondary
                )
            }

            if (record.officerDecision != null) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Officer Decision: ${record.officerDecision}",
                    fontSize = 9.sp,
                    color = SsbColors.GoldEmblem
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = record.auditHash,
                fontSize = 8.sp,
                fontFamily = FontFamily.Monospace,
                color = SsbColors.TextMuted,
                maxLines = 1
            )
        }
    }
}
