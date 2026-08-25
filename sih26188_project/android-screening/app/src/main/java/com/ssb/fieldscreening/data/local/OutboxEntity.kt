package com.ssb.fieldscreening.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "outbox_screening_records",
    indices = [
        Index(value = ["sync_status"], name = "idx_outbox_sync"),
        Index(value = ["session_id"], unique = true, name = "idx_outbox_session")
    ]
)
data class OutboxScreeningRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "session_id")
    val sessionId: String,

    @ColumnInfo(name = "checkpoint_id")
    val checkpointId: String,

    @ColumnInfo(name = "officer_id")
    val officerId: String,

    @ColumnInfo(name = "transit_date")
    val transitDate: String,

    @ColumnInfo(name = "document_image_blob", typeAffinity = ColumnInfo.BLOB)
    val documentImageBlob: ByteArray,

    @ColumnInfo(name = "live_face_blob", typeAffinity = ColumnInfo.BLOB)
    val liveFaceBlob: ByteArray? = null,

    @ColumnInfo(name = "inspection_response_json")
    val inspectionResponseJson: String? = null,

    @ColumnInfo(name = "risk_score")
    val riskScore: Double? = null,

    @ColumnInfo(name = "risk_level")
    val riskLevel: String? = null,

    @ColumnInfo(name = "audit_hash")
    val auditHash: String,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "PENDING", // PENDING, SYNCED, FAILED

    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 0,

    @ColumnInfo(name = "officer_decision")
    val officerDecision: String? = null,

    @ColumnInfo(name = "traveler_name")
    val travelerName: String? = null,

    @ColumnInfo(name = "document_number")
    val documentNumber: String? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as OutboxScreeningRecord
        if (id != other.id) return false
        if (sessionId != other.sessionId) return false
        if (!documentImageBlob.contentEquals(other.documentImageBlob)) return false
        return true
    }

    override fun hashCode(): Int {
        var result = id.hashCode()
        result = 31 * result + sessionId.hashCode()
        result = 31 * result + documentImageBlob.contentHashCode()
        return result
    }
}
