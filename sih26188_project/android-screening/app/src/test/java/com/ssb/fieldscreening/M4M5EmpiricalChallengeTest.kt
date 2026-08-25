package com.ssb.fieldscreening

import android.app.Application
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.ssb.fieldscreening.data.local.OutboxDao
import com.ssb.fieldscreening.data.local.OutboxScreeningRecord
import com.ssb.fieldscreening.data.local.SsbDatabase
import com.ssb.fieldscreening.data.model.Checkpoint
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.data.model.DEFAULT_CHECKPOINTS
import com.ssb.fieldscreening.data.model.OfficerActionType
import com.ssb.fieldscreening.data.model.PRESET_SCENARIOS
import com.ssb.fieldscreening.data.repository.SsbRepository
import com.ssb.fieldscreening.ui.MainScreen
import com.ssb.fieldscreening.ui.theme.SsbInspectionTheme
import com.ssb.fieldscreening.ui.viewmodel.NavigationScreen
import com.ssb.fieldscreening.ui.viewmodel.SsbScreeningViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class M4M5EmpiricalChallengeTest {

    @get:Rule
    val composeTestRule = createComposeRule()

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

    // ==========================================
    // M4 Navigation & UI Structure Challenges
    // ==========================================

    @Test
    fun `challenge navigation bar contains exactly 3 primary tactical tabs`() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val viewModel = SsbScreeningViewModel(app)

        composeTestRule.setContent {
            SsbInspectionTheme {
                MainScreen(viewModel = viewModel)
            }
        }

        // Verify Tab 1: CAPTURE
        composeTestRule.onNodeWithTag("nav_tab_capture").assertExists()
        // Verify Tab 2: OUTBOX
        composeTestRule.onNodeWithTag("nav_tab_outbox").assertExists()
        // Verify Tab 3: CONNECT (Wi-Fi)
        composeTestRule.onNodeWithTag("nav_tab_connect_wifi").assertExists()
    }

    @Test
    fun `challenge capture screen and scenario preset selection`() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val viewModel = SsbScreeningViewModel(app)

        // Select a scenario with violations to have rich content
        val forgedScenario = PRESET_SCENARIOS[1]
        viewModel.selectPreset(forgedScenario)

        composeTestRule.setContent {
            SsbInspectionTheme {
                MainScreen(viewModel = viewModel)
            }
        }

        // Navigate to CAPTURE tab
        composeTestRule.onNodeWithTag("nav_tab_capture").performClick()
        composeTestRule.waitForIdle()
        assertEquals(NavigationScreen.CAPTURE, viewModel.uiState.value.activeScreen)
        assertEquals(forgedScenario.id, viewModel.uiState.value.selectedPreset?.id)
    }

    @Test
    fun `challenge officer decision workflow and remarks entry`() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val viewModel = SsbScreeningViewModel(app)

        val scenario = PRESET_SCENARIOS[1]
        viewModel.selectPreset(scenario)

        // Input remarks
        viewModel.setDecisionRemarks("Suspect photo tampering detected.")
        assertEquals("Suspect photo tampering detected.", viewModel.uiState.value.decisionRemarks)

        // Submit DETAIN
        viewModel.submitOfficerDecision(OfficerActionType.DETAIN_MANDATE)
        assertEquals(OfficerActionType.DETAIN_MANDATE, viewModel.uiState.value.officerDecision?.action)
        assertEquals("Suspect photo tampering detected.", viewModel.uiState.value.officerDecision?.remarks)
    }

    @Test
    fun `challenge gateway diagnostics navigation and auto detect trigger`() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val viewModel = SsbScreeningViewModel(app)

        composeTestRule.setContent {
            SsbInspectionTheme {
                MainScreen(viewModel = viewModel)
            }
        }

        // Open Gateway Diagnostics via Header Bar Gear Button
        composeTestRule.onNodeWithTag("header_diagnostics_gear_btn").assertExists()
        composeTestRule.onNodeWithTag("header_diagnostics_gear_btn").performClick()
        composeTestRule.waitForIdle()
        assertEquals(NavigationScreen.GATEWAY_DIAGNOSTICS, viewModel.uiState.value.activeScreen)

        // Verify Auto-Detect Button and Ping Button exist
        composeTestRule.onNodeWithTag("auto_detect_gateway_btn").assertExists()
        composeTestRule.onNodeWithTag("ping_gateway_btn").assertExists()
        composeTestRule.onNodeWithTag("custom_gateway_url_input").assertExists()
    }

    // ==========================================
    // M5 Room OutboxDao & Retry Capping Challenges
    // ==========================================

    @Test
    fun `challenge OutboxDao CRUD operations and retryCount increment`() = runBlocking {
        val record = OutboxScreeningRecord(
            sessionId = "SSB-TEST-001",
            checkpointId = "SSB_SONAULI_01",
            officerId = "OFFICER-TEST-01",
            transitDate = "2026-08-23 12:00:00",
            documentImageBlob = byteArrayOf(0x10, 0x20),
            liveFaceBlob = byteArrayOf(0x30, 0x40),
            auditHash = "SHA256:TEST001",
            syncStatus = "PENDING",
            retryCount = 0
        )

        // Insert
        val id = outboxDao.insertRecord(record)
        assertTrue(id > 0)

        // Query by session ID
        val retrieved = outboxDao.getRecordBySessionId("SSB-TEST-001")
        assertNotNull(retrieved)
        assertEquals("SSB-TEST-001", retrieved?.sessionId)
        assertEquals(0, retrieved?.retryCount)
        assertEquals("PENDING", retrieved?.syncStatus)

        // Update sync status (increments retry_count)
        outboxDao.updateSyncStatus("SSB-TEST-001", "FAILED")
        val updated1 = outboxDao.getRecordBySessionId("SSB-TEST-001")
        assertEquals(1, updated1?.retryCount)
        assertEquals("FAILED", updated1?.syncStatus)

        outboxDao.updateSyncStatus("SSB-TEST-001", "FAILED")
        val updated2 = outboxDao.getRecordBySessionId("SSB-TEST-001")
        assertEquals(2, updated2?.retryCount)

        outboxDao.updateSyncStatus("SSB-TEST-001", "FAILED")
        val updated3 = outboxDao.getRecordBySessionId("SSB-TEST-001")
        assertEquals(3, updated3?.retryCount)

        // Clear and delete
        outboxDao.deleteRecord("SSB-TEST-001")
        assertNull(outboxDao.getRecordBySessionId("SSB-TEST-001"))
    }

    @Test
    fun `challenge SsbRepository syncPendingRecord capping at 3 retries`() = runBlocking {
        // Case 1: Record with retryCount = 0 against unreachable host
        val record0 = OutboxScreeningRecord(
            sessionId = "SSB-RETRY-0",
            checkpointId = "SSB_SONAULI_01",
            officerId = "OFFICER-TEST-01",
            transitDate = "2026-08-23 12:00:00",
            documentImageBlob = byteArrayOf(0x01),
            auditHash = "SHA256:RETRY0",
            syncStatus = "PENDING",
            retryCount = 0
        )
        outboxDao.insertRecord(record0)

        val syncResult0 = repository.syncPendingRecord(record0, ConnectivityMode.USB_TETHERED, "http://127.0.0.1:9999")
        assertFalse(syncResult0)
        val afterSync0 = outboxDao.getRecordBySessionId("SSB-RETRY-0")
        assertEquals(1, afterSync0?.retryCount)
        assertEquals("FAILED", afterSync0?.syncStatus)

        // Case 2: Record with retryCount = 3 (MUST be capped immediately without network attempt)
        val record3 = OutboxScreeningRecord(
            sessionId = "SSB-RETRY-3",
            checkpointId = "SSB_SONAULI_01",
            officerId = "OFFICER-TEST-01",
            transitDate = "2026-08-23 12:00:00",
            documentImageBlob = byteArrayOf(0x01),
            auditHash = "SHA256:RETRY3",
            syncStatus = "PENDING",
            retryCount = 3
        )
        outboxDao.insertRecord(record3)

        val syncResult3 = repository.syncPendingRecord(record3, ConnectivityMode.USB_TETHERED, "http://127.0.0.1:8000")
        assertFalse(syncResult3) // Must immediately abort and return false
        val afterSync3 = outboxDao.getRecordBySessionId("SSB-RETRY-3")
        assertEquals(4, afterSync3?.retryCount) // updateSyncStatus called marking FAILED and incrementing retryCount
        assertEquals("FAILED", afterSync3?.syncStatus)
    }

    @Test
    fun `challenge SsbRepository dead branch fix in OFFLINE_OUTBOX mode`() = runBlocking {
        val docBytes = byteArrayOf(0x0A, 0x0B, 0x0C)
        val result = repository.inspectDocument(
            documentBytes = docBytes,
            liveFaceBytes = null,
            checkpoint = DEFAULT_CHECKPOINTS[0],
            officerId = "OFFICER-TEST-01",
            mode = ConnectivityMode.OFFLINE_OUTBOX,
            activePreset = null
        )

        assertTrue(result.isSuccess)
        val inspection = result.getOrNull()
        assertNotNull(inspection)

        // Verify record was inserted with syncStatus == "PENDING"
        val records = repository.allOutboxRecords.first()
        val saved = records.find { it.sessionId == inspection?.sessionId }
        assertNotNull(saved)
        assertEquals("PENDING", saved?.syncStatus)
        assertEquals(0, saved?.retryCount)
        assertEquals("OFFICER-TEST-01", saved?.officerId)
    }
}
