package com.ssb.fieldscreening

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.ui.viewmodel.SsbScreeningViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SsbScreeningViewModelPollingTest {

    private lateinit var app: Application

    @Before
    fun setUp() {
        app = ApplicationProvider.getApplicationContext()
    }

    @Test
    fun `test initial state starts polling and populates gateway health`() = runBlocking {
        val viewModel = SsbScreeningViewModel(app)
        delay(100)

        val state = viewModel.uiState.value
        assertNotNull(state.gatewayHealth)
        assertTrue(state.gatewayLatencyMs >= 0L)
    }

    @Test
    fun `test switching to OFFLINE_OUTBOX mode immediately clears health and latency`() = runBlocking {
        val viewModel = SsbScreeningViewModel(app)

        viewModel.setConnectivityMode(ConnectivityMode.OFFLINE_OUTBOX)

        val state = viewModel.uiState.value
        assertEquals(ConnectivityMode.OFFLINE_OUTBOX, state.connectivityMode)
        assertNull(state.gatewayHealth)
        assertEquals(0L, state.gatewayLatencyMs)
    }

    @Test
    fun `test switching from OFFLINE_OUTBOX to USB_TETHERED restores health polling`() = runBlocking {
        val viewModel = SsbScreeningViewModel(app)
        viewModel.setConnectivityMode(ConnectivityMode.OFFLINE_OUTBOX)

        assertEquals(ConnectivityMode.OFFLINE_OUTBOX, viewModel.uiState.value.connectivityMode)
        assertNull(viewModel.uiState.value.gatewayHealth)

        // Switch back to tethered mode
        viewModel.setConnectivityMode(ConnectivityMode.USB_TETHERED)
        
        var attempts = 0
        while (viewModel.uiState.value.gatewayHealth == null && attempts < 140) {
            delay(50)
            attempts++
        }

        val state = viewModel.uiState.value
        assertEquals(ConnectivityMode.USB_TETHERED, state.connectivityMode)
        assertNotNull(state.gatewayHealth)
        assertTrue(state.gatewayLatencyMs >= 0L)
    }

    @Test
    fun `test updateCustomGatewayUrl updates URL and restarts polling immediately`() = runBlocking {
        val viewModel = SsbScreeningViewModel(app)
        val customUrl = "http://127.0.0.1:59999"

        viewModel.updateCustomGatewayUrl(customUrl)
        delay(100)

        val state = viewModel.uiState.value
        assertEquals(customUrl, state.customGatewayUrl)
        assertNotNull(state.gatewayHealth)
    }

    @Test
    fun `test manual checkGatewayHealth completes and maintains valid health state`() = runBlocking {
        val viewModel = SsbScreeningViewModel(app)
        viewModel.updateCustomGatewayUrl("http://127.0.0.1:59999")
        delay(50)

        viewModel.checkGatewayHealth()
        
        // Wait for coroutine to launch and then finish
        var attempts = 0
        while (attempts < 140) {
            delay(50)
            if (!viewModel.uiState.value.isGatewayChecking && viewModel.uiState.value.gatewayHealth != null) {
                break
            }
            attempts++
        }

        val state = viewModel.uiState.value
        assertNotNull(state.gatewayHealth)
        assertEquals(false, state.isGatewayChecking)
    }

    @Test
    fun `test manual checkGatewayHealth in OFFLINE_OUTBOX mode clears state without network check`() {
        val viewModel = SsbScreeningViewModel(app)
        viewModel.setConnectivityMode(ConnectivityMode.OFFLINE_OUTBOX)

        viewModel.checkGatewayHealth()

        val state = viewModel.uiState.value
        assertEquals(false, state.isGatewayChecking)
        assertNull(state.gatewayHealth)
        assertEquals(0L, state.gatewayLatencyMs)
    }
}
