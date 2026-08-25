package com.ssb.fieldscreening

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.ssb.fieldscreening.data.local.OutboxScreeningRecord
import com.ssb.fieldscreening.data.local.SsbDatabase
import com.ssb.fieldscreening.data.model.Checkpoint
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.data.model.DEFAULT_CHECKPOINTS
import com.ssb.fieldscreening.data.model.PRESET_SCENARIOS
import com.ssb.fieldscreening.data.repository.SsbRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.UUID

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class RepositoryNetworkRobustnessTest {

    private lateinit var app: Application
    private lateinit var db: SsbDatabase
    private lateinit var repository: SsbRepository

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
        db = SsbDatabase.getInstance(app)
        repository = SsbRepository(db.outboxDao())
    }

    @Test
    fun `test inspectDocument in OFFLINE_OUTBOX mode generates local screening and saves as PENDING`() = runBlocking {
        val docBytes = byteArrayOf(1, 2, 3, 4)
        val result = repository.inspectDocument(
            documentBytes = docBytes,
            liveFaceBytes = null,
            checkpoint = DEFAULT_CHECKPOINTS[0],
            officerId = "OFFICER-TEST-01",
            mode = ConnectivityMode.OFFLINE_OUTBOX,
            activePreset = null
        )

        assertTrue(result.isSuccess)
        val response = result.getOrNull()
        assertNotNull(response)
        assertEquals("completed", response?.status)

        val records = repository.allOutboxRecords.first()
        val saved = records.find { it.sessionId == response?.sessionId }
        assertNotNull(saved)
        assertEquals("PENDING", saved?.syncStatus)
        assertEquals(0, saved?.retryCount)
    }

    @Test
    fun `test inspectDocument with unreachable gateway falls back to local screening with PENDING status`() = runBlocking {
        val docBytes = byteArrayOf(5, 6, 7, 8)
        val result = repository.inspectDocument(
            documentBytes = docBytes,
            liveFaceBytes = null,
            checkpoint = DEFAULT_CHECKPOINTS[1],
            officerId = "OFFICER-TEST-02",
            mode = ConnectivityMode.USB_TETHERED,
            activePreset = PRESET_SCENARIOS[0],
            customBaseUrl = "http://127.0.0.1:59999"
        )

        assertTrue(result.isSuccess)
        val response = result.getOrNull()
        assertNotNull(response)

        val records = repository.allOutboxRecords.first()
        val saved = records.find { it.sessionId == response?.sessionId }
        assertNotNull(saved)
        assertEquals("PENDING", saved?.syncStatus)
    }

    @Test
    fun `test syncPendingRecord caps retries at 3 and marks FAILED without network call`() = runBlocking {
        val sessionId = "SSB-FAIL-" + UUID.randomUUID().toString().take(6).uppercase()
        val recordCapped = OutboxScreeningRecord(
            sessionId = sessionId,
            checkpointId = "SSB_SONAULI_01",
            officerId = "OFFICER-TEST-01",
            transitDate = "2026-08-23 12:00:00",
            documentImageBlob = byteArrayOf(1, 2),
            liveFaceBlob = null,
            inspectionResponseJson = "{}",
            riskScore = 85.0,
            riskLevel = "RED",
            auditHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            createdAt = System.currentTimeMillis(),
            syncStatus = "PENDING",
            travelerName = "TRAVELER-TEST-01",
            documentNumber = "TEST-DOC-001",
            retryCount = 3
        )
        db.outboxDao().insertRecord(recordCapped)

        val syncResult = repository.syncPendingRecord(
            record = recordCapped,
            mode = ConnectivityMode.USB_TETHERED,
            customBaseUrl = "http://127.0.0.1:8000"
        )

        assertFalse("syncPendingRecord must return false when retryCount >= 3", syncResult)

        val updatedRecord = db.outboxDao().getRecordBySessionId(sessionId)
        assertNotNull(updatedRecord)
        assertEquals("FAILED", updatedRecord?.syncStatus)
    }

    @Test
    fun `test syncPendingRecord returns false when in OFFLINE_OUTBOX mode`() = runBlocking {
        val sessionId = "SSB-OFFLINE-" + UUID.randomUUID().toString().take(6).uppercase()
        val record = OutboxScreeningRecord(
            sessionId = sessionId,
            checkpointId = "SSB_SONAULI_01",
            officerId = "OFFICER-TEST-01",
            transitDate = "2026-08-23 12:00:00",
            documentImageBlob = byteArrayOf(1, 2),
            liveFaceBlob = null,
            inspectionResponseJson = "{}",
            riskScore = 15.0,
            riskLevel = "GREEN",
            auditHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            createdAt = System.currentTimeMillis(),
            syncStatus = "PENDING",
            travelerName = "TRAVELER-TEST-02",
            documentNumber = "TEST-DOC-002",
            retryCount = 0
        )
        db.outboxDao().insertRecord(record)

        val syncResult = repository.syncPendingRecord(
            record = record,
            mode = ConnectivityMode.OFFLINE_OUTBOX,
            customBaseUrl = null
        )

        assertFalse("syncPendingRecord must return false in OFFLINE_OUTBOX mode", syncResult)
    }

    @Test
    fun `test autoDetectGateway safely probes candidate IPs and returns null if unreachable`() = runBlocking {
        val detected = repository.autoDetectGateway()
        assertNull("autoDetectGateway must return null when no hotspot gateways respond", detected)
    }

    @Test
    fun `test all preset scenarios use strictly sanitized test identifiers`() {
        assertTrue("PRESET_SCENARIOS must not be empty", PRESET_SCENARIOS.isNotEmpty())
        for (preset in PRESET_SCENARIOS) {
            assertTrue(
                "Traveler name '${preset.travelerName}' must be a synthetic test token",
                preset.travelerName.startsWith("TRAVELER-TEST-")
            )
            assertTrue(
                "Document number '${preset.documentNumber}' must be a synthetic test token",
                preset.documentNumber.startsWith("TEST-DOC-")
            )
        }
    }
}
