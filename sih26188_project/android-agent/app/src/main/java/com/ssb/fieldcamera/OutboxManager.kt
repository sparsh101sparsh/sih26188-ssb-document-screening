package com.ssb.fieldcamera

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.MessageDigest

@Entity(tableName = "outbox_items")
data class OutboxItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val imageBytes: ByteArray,
    val captureType: String,
    val timestamp: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val syncStatus: String = "PENDING",
    val sha256Hash: String = ""
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as OutboxItem
        return id == other.id
    }

    override fun hashCode(): Int {
        return id.hashCode()
    }
}

@Dao
interface OutboxDao {
    @Query("SELECT * FROM outbox_items WHERE syncStatus = 'PENDING' ORDER BY timestamp ASC")
    suspend fun getPendingItems(): List<OutboxItem>

    @Query("SELECT COUNT(*) FROM outbox_items WHERE syncStatus = 'PENDING'")
    suspend fun getPendingCount(): Int

    @Insert
    suspend fun insert(item: OutboxItem): Long

    @Delete
    suspend fun delete(item: OutboxItem)

    @Query("UPDATE outbox_items SET retryCount = retryCount + 1 WHERE id = :id")
    suspend fun incrementRetryCount(id: Long)

    @Query("DELETE FROM outbox_items WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("DELETE FROM outbox_items WHERE retryCount >= 5")
    suspend fun purgeExpiredItems()
}

@Database(
    entities = [OutboxItem::class],
    version = 2,
    exportSchema = false
)
abstract class OutboxDatabase : RoomDatabase() {
    abstract fun outboxDao(): OutboxDao

    companion object {
        @Volatile
        private var INSTANCE: OutboxDatabase? = null

        fun getDatabase(context: Context): OutboxDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    OutboxDatabase::class.java,
                    "ssb_outbox_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

class OutboxManager(context: Context) {
    private val dao = OutboxDatabase.getDatabase(context).outboxDao()

    suspend fun addToOutbox(imageBytes: ByteArray, captureType: String): Long {
        val hash = calculateSHA256(imageBytes)
        val item = OutboxItem(
            imageBytes = imageBytes,
            captureType = captureType,
            timestamp = System.currentTimeMillis(),
            sha256Hash = hash
        )
        return dao.insert(item)
    }

    suspend fun getPendingCount(): Int {
        return dao.getPendingCount()
    }

    suspend fun syncPending(uploadFunction: suspend (ByteArray, String) -> UploadResult) {
        val pendingItems = withContext(Dispatchers.IO) { 
            dao.purgeExpiredItems()
            dao.getPendingItems() 
        }
        
        for (item in pendingItems) {
            if (item.retryCount >= 5) {
                dao.deleteById(item.id)
                continue
            }

            val result = uploadFunction(item.imageBytes, item.captureType)
            
            if (result.success) {
                dao.deleteById(item.id)
            } else {
                dao.incrementRetryCount(item.id)
            }
        }
    }

    fun calculateSHA256(bytes: ByteArray): String {
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(bytes)
            hash.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            ""
        }
    }
}
