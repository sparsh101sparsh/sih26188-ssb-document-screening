package com.ssb.fieldscreening

import android.app.Application
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.ssb.fieldscreening.data.local.OutboxDao
import com.ssb.fieldscreening.data.local.OutboxScreeningRecord
import com.ssb.fieldscreening.data.local.SsbDatabase
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.data.repository.SsbRepository
import com.ssb.fieldscreening.util.WifiUtils
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.UUID

/**
 * Empirical Challenger Verification Suite for Milestone 4:
 * 1. QR code parsing & scheme extraction (SSBPAIR://, legacy http://, raw host:port, edge cases).
 * 2. URL normalization (empty, whitespace, missing scheme, missing port, trailing slashes).
 * 3. Exponential backoff sequence verification ([0, 2000, 8000, 30000, 60000]).
 * 4. Outbox persistence, Room blob retention, and retry capping.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AndroidEmpiricalChallengerTest {

    private lateinit var db: SsbDatabase
    private lateinit var outboxDao: OutboxDao
    private lateinit var repository: SsbRepository

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Application>()
        db = Room.inMemoryDatabaseBuilder(context, SsbDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        outboxDao = db.outboxDao()
        repository = SsbRepository(outboxDao)
    }

    @After
    fun tearDown() {
        db.close()
    }

    // ─── 1. QR Parsing Empirical Challenges ───────────────────────────────────

    @Test
    fun `empirical challenge QR parsing with standard SSBPAIR scheme and port`() {
        val payload = "SSBPAIR://192.168.1.10:8000/token"
        val parsed = WifiUtils.parseQrPayload(payload)
        assertEquals("http://192.168.1.10:8000", parsed)
    }

    @Test
    fun `empirical challenge QR parsing with standard SSBPAIR scheme without port`() {
        val payload = "SSBPAIR://10.0.0.5/abc"
        val parsed = WifiUtils.parseQrPayload(payload)
        assertEquals("http://10.0.0.5:8000", parsed)
    }

    @Test
    fun `empirical challenge QR parsing with legacy http URL`() {
        val payload = "http://192.168.1.5:8000"
        val parsed = WifiUtils.parseQrPayload(payload)
        assertEquals("http://192.168.1.5:8000", parsed)
    }

    @Test
    fun `empirical challenge QR parsing with raw host and port string`() {
        val payload = "192.168.1.5:8000"
        val parsed = WifiUtils.parseQrPayload(payload)
        assertEquals("http://192.168.1.5:8000", parsed)
    }

    @Test
    fun `empirical challenge QR parsing with raw IP string`() {
        val payload = "192.168.1.5"
        val parsed = WifiUtils.parseQrPayload(payload)
        assertEquals("http://192.168.1.5:8000", parsed)
    }

    @Test
    fun `empirical challenge QR parsing with malformed and empty strings`() {
        assertEquals("", WifiUtils.parseQrPayload(""))
        assertEquals("", WifiUtils.parseQrPayload("   "))
        assertEquals("", WifiUtils.parseQrPayload("\t\n\r"))
        assertEquals("", WifiUtils.parseQrPayload("SSBPAIR://"))
        assertEquals("", WifiUtils.parseQrPayload("SSBPAIR:///token"))
        assertEquals("", WifiUtils.parseQrPayload("SSBPAIR://   /token"))
    }

    @Test
    fun `empirical challenge QR parsing case insensitivity and whitespace handling`() {
        assertEquals(
            "http://192.168.1.200:8080",
            WifiUtils.parseQrPayload("   ssbpair://192.168.1.200:8080/secure_session_99   ")
        )
        assertEquals(
            "http://SSBGateway:8000",
            WifiUtils.parseQrPayload("SSBPAIR://SSBGateway/PAIR1234")
        )
        assertEquals(
            "http://172.16.0.10:9090",
            WifiUtils.parseQrPayload("SSBPAIR://172.16.0.10:9090")
        )
    }

    // ─── 2. URL Normalization Empirical Challenges ────────────────────────────

    @Test
    fun `empirical challenge URL normalization on blank, whitespace, and tabs`() {
        assertEquals("", WifiUtils.normalizeGatewayUrl(""))
        assertEquals("", WifiUtils.normalizeGatewayUrl(" "))
        assertEquals("", WifiUtils.normalizeGatewayUrl("      "))
        assertEquals("", WifiUtils.normalizeGatewayUrl("\t\n\r"))
        assertEquals("", WifiUtils.normalizeGatewayUrl("   \n\t  \r "))
    }

    @Test
    fun `empirical challenge URL normalization trailing slashes stripped`() {
        assertEquals("http://192.168.1.1:8000", WifiUtils.normalizeGatewayUrl("http://192.168.1.1:8000/"))
        assertEquals("http://192.168.1.1:8000", WifiUtils.normalizeGatewayUrl("http://192.168.1.1:8000///"))
        assertEquals("http://192.168.1.1:8000", WifiUtils.normalizeGatewayUrl("192.168.1.1/"))
        assertEquals("https://gateway.internal:9443", WifiUtils.normalizeGatewayUrl("https://gateway.internal:9443//"))
    }

    @Test
    fun `empirical challenge URL normalization defaults to port 8000 when missing`() {
        assertEquals("http://10.200.1.5:8000", WifiUtils.normalizeGatewayUrl("10.200.1.5"))
        assertEquals("http://10.200.1.5:8000", WifiUtils.normalizeGatewayUrl("http://10.200.1.5"))
        assertEquals("http://myserver:8000", WifiUtils.normalizeGatewayUrl("myserver"))
    }

    @Test
    fun `empirical challenge URL normalization preserves existing ports and paths`() {
        assertEquals("http://192.168.1.10:3000", WifiUtils.normalizeGatewayUrl("192.168.1.10:3000"))
        assertEquals("http://192.168.1.10:8000/api/v1", WifiUtils.normalizeGatewayUrl("http://192.168.1.10:8000/api/v1"))
        assertEquals("https://cloud.ssb.gov.in:443", WifiUtils.normalizeGatewayUrl("https://cloud.ssb.gov.in:443"))
    }

    // ─── 3. Exponential Backoff Sequence Empirical Challenges ─────────────────

    @Test
    fun `empirical challenge backoff constants and delay sequence exact match`() {
        assertEquals(5, SsbRepository.MAX_RETRY_ATTEMPTS)
        val expectedDelays = listOf(0L, 2000L, 8000L, 30000L, 60000L)
        assertEquals(expectedDelays, SsbRepository.RETRY_DELAYS_MS)
        assertEquals(5, SsbRepository.RETRY_DELAYS_MS.size)

        // Verify delay for each attempt index
        assertEquals(0L, SsbRepository.RETRY_DELAYS_MS[0])
        assertEquals(2000L, SsbRepository.RETRY_DELAYS_MS[1])
        assertEquals(8000L, SsbRepository.RETRY_DELAYS_MS[2])
        assertEquals(30000L, SsbRepository.RETRY_DELAYS_MS[3])
        assertEquals(60000L, SsbRepository.RETRY_DELAYS_MS[4])
    }

    @Test
    fun `empirical challenge retry capping stops after 5 attempts and preserves image blob`() = runBlocking {
        val testBlob = byteArrayOf(0xDE.toByte(), 0xAD.toByte(), 0xBE.toByte(), 0xEF.toByte())
        val record = OutboxScreeningRecord(
            sessionId = "CHALLENGE-CAP-001",
            checkpointId = "SSB_SONAULI_01",
            officerId = "OFFICER-007",
            transitDate = "2026-08-25 10:00:00",
            documentImageBlob = testBlob,
            liveFaceBlob = testBlob,
            auditHash = "SHA256:DEADBEEF",
            syncStatus = "PENDING",
            retryCount = 5 // Already attempted 5 times (0, 1, 2, 3, 4)
        )
        outboxDao.insertRecord(record)

        // Attempt sync on capped record
        val result = repository.syncPendingRecord(
            record = record,
            mode = ConnectivityMode.AIR_GAPPED_WIFI,
            customBaseUrl = "http://127.0.0.1:8000"
        )

        assertFalse("syncPendingRecord must reject immediately without network attempt", result)

        val updated = outboxDao.getRecordBySessionId("CHALLENGE-CAP-001")
        assertNotNull(updated)
        assertEquals("FAILED", updated?.syncStatus)
        // Image blobs MUST NOT be discarded/deleted
        assertArrayEquals(testBlob, updated?.documentImageBlob)
        assertArrayEquals(testBlob, updated?.liveFaceBlob)
    }

    // ─── 4. Outbox Retention & Companion Idempotency Challenges ───────────────

    @Test
    fun `empirical challenge companion capture offline retention in Room`() = runBlocking {
        val samplePhoto = ByteArray(2048) { (it % 256).toByte() }
        val uploadResult = repository.uploadCompanionCapture(
            captureBytes = samplePhoto,
            captureType = "DOCUMENT",
            checkpointId = "SSB_JAIGAON_03",
            deviceId = "DEV-TAB-09",
            customBaseUrl = "",
            mode = ConnectivityMode.OFFLINE_OUTBOX
        )

        assertFalse("Offline companion capture returns failure to trigger UI offline state", uploadResult.isSuccess)

        val pending = outboxDao.getPendingRecords().first()
        val match = pending.find { it.checkpointId == "SSB_JAIGAON_03" }
        assertNotNull("Capture record must be safely persisted in SQLite Outbox", match)
        assertEquals("PENDING", match?.syncStatus)
        assertEquals(0, match?.retryCount)
        assertArrayEquals(samplePhoto, match?.documentImageBlob)
    }
}
