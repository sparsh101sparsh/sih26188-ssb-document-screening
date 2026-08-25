package com.ssb.fieldscreening

import android.app.Application
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import com.ssb.fieldscreening.data.local.SsbDatabase
import com.ssb.fieldscreening.data.model.Checkpoint
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.data.model.DEFAULT_CHECKPOINTS
import com.ssb.fieldscreening.data.repository.SsbRepository
import com.ssb.fieldscreening.ui.components.CameraPermissionRationaleCard
import com.ssb.fieldscreening.ui.components.DualCameraCaptureView
import com.ssb.fieldscreening.ui.theme.SsbInspectionTheme
import com.ssb.fieldscreening.ui.viewmodel.SsbScreeningViewModel
import com.ssb.fieldscreening.util.ImageUtils
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CameraPipelineTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `test ViewModel captures and stores document and face bytes`() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val viewModel = SsbScreeningViewModel(app)

        val sampleDocBytes = byteArrayOf(0x01, 0x02, 0x03, 0x04)
        val sampleFaceBytes = byteArrayOf(0x05, 0x06, 0x07, 0x08)

        assertNull(viewModel.uiState.value.capturedDocumentBytes)
        assertNull(viewModel.uiState.value.capturedLiveFaceBytes)

        viewModel.setCapturedDocumentBytes(sampleDocBytes)
        assertArrayEquals(sampleDocBytes, viewModel.uiState.value.capturedDocumentBytes)

        viewModel.setCapturedLiveFaceBytes(sampleFaceBytes)
        assertArrayEquals(sampleFaceBytes, viewModel.uiState.value.capturedLiveFaceBytes)

        viewModel.clearCapturedImages()
        assertNull(viewModel.uiState.value.capturedDocumentBytes)
        assertNull(viewModel.uiState.value.capturedLiveFaceBytes)
    }

    @Test
    fun `test repository persists real document and face blobs to Outbox database`() = runBlocking {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val db = SsbDatabase.getInstance(app)
        val repository = SsbRepository(db.outboxDao())

        val docBytes = ImageUtils.compressToJpeg(
            android.graphics.Bitmap.createBitmap(320, 240, android.graphics.Bitmap.Config.ARGB_8888),
            80
        )
        val faceBytes = ImageUtils.compressToJpeg(
            android.graphics.Bitmap.createBitmap(160, 160, android.graphics.Bitmap.Config.ARGB_8888),
            80
        )

        val result = repository.inspectDocument(
            documentBytes = docBytes,
            liveFaceBytes = faceBytes,
            checkpoint = DEFAULT_CHECKPOINTS[0],
            officerId = "OFFICER-TEST-01",
            mode = ConnectivityMode.OFFLINE_OUTBOX,
            activePreset = null
        )

        assertTrue(result.isSuccess)
        val inspection = result.getOrNull()
        assertNotNull(inspection)

        val records = repository.allOutboxRecords.first()
        val latest = records.find { it.sessionId == inspection?.sessionId }
        assertNotNull(latest)
        assertNotNull(latest?.documentImageBlob)
        assertNotNull(latest?.liveFaceBlob)
        assertArrayEquals(docBytes, latest?.documentImageBlob)
        assertArrayEquals(faceBytes, latest?.liveFaceBlob)
    }

    @Test
    fun `test camera permission rationale card UI renders and handles click`() {
        var requested = false
        composeTestRule.setContent {
            SsbInspectionTheme {
                CameraPermissionRationaleCard(
                    onRequestPermission = { requested = true }
                )
            }
        }

        composeTestRule.onNodeWithTag("grant_camera_permission_btn").assertExists()
        composeTestRule.onNodeWithTag("grant_camera_permission_btn").performClick()
        assertTrue(requested)
    }
}
