package com.ssb.fieldscreening.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [OutboxScreeningRecord::class],
    version = 1,
    exportSchema = false
)
abstract class SsbDatabase : RoomDatabase() {
    abstract fun outboxDao(): OutboxDao

    companion object {
        @Volatile
        private var INSTANCE: SsbDatabase? = null

        fun getInstance(context: Context): SsbDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SsbDatabase::class.java,
                    "ssb_field_screening.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
