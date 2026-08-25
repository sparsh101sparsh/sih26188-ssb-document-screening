package com.ssb.fieldscreening.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface OutboxDao {

    @Query("SELECT * FROM outbox_screening_records ORDER BY created_at DESC")
    fun getAllRecords(): Flow<List<OutboxScreeningRecord>>

    @Query("SELECT * FROM outbox_screening_records WHERE sync_status = 'PENDING' ORDER BY created_at ASC")
    fun getPendingRecords(): Flow<List<OutboxScreeningRecord>>

    @Query("SELECT COUNT(*) FROM outbox_screening_records WHERE sync_status = 'PENDING'")
    fun getPendingCount(): Flow<Int>

    @Query("SELECT * FROM outbox_screening_records WHERE session_id = :sessionId LIMIT 1")
    suspend fun getRecordBySessionId(sessionId: String): OutboxScreeningRecord?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: OutboxScreeningRecord): Long

    @Update
    suspend fun updateRecord(record: OutboxScreeningRecord)

    @Query("UPDATE outbox_screening_records SET sync_status = :status, retry_count = retry_count + 1 WHERE session_id = :sessionId")
    suspend fun updateSyncStatus(sessionId: String, status: String)

    @Query("DELETE FROM outbox_screening_records WHERE session_id = :sessionId")
    suspend fun deleteRecord(sessionId: String)

    @Query("DELETE FROM outbox_screening_records WHERE sync_status = 'SYNCED'")
    suspend fun clearSyncedRecords()
}
