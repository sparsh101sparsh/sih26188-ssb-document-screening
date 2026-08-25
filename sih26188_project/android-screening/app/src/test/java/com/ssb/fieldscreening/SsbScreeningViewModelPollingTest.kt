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
    fun `test initial state starts in clean offline outbox mode`() = runBlocking {
        val viewModel = SsbScreeningViewModel(app)
        val state = viewModel.uiState.value
        assertEquals(ConnectivityMode.OFFLINE_OUTBOX, state.connectivityMode)
        assertNull(state.gatewayHealth)
        assertEquals(0L, state.gatewayLatencyMs)
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
    fun `test switching connectivity mode updates state cleanly`() = runBlocking {
        val viewModel = SsbScreeningViewModel(app)
        viewModel.setConnectivityMode(ConnectivityMode.OFFLINE_OUTBOX)

        assertEquals(ConnectivityMode.OFFLINE_OUTBOX, viewModel.uiState.value.connectivityMode)
        assertNull(viewModel.uiState.value.gatewayHealth)

        // Switch to Wi-Fi mode
        viewModel.setConnectivityMode(ConnectivityMode.AIR_GAPPED_WIFI)
        val state = viewModel.uiState.value
        assertEquals(ConnectivityMode.AIR_GAPPED_WIFI, state.connectivityMode)
    }

    @Test
    fun `test updateCustomGatewayUrl updates URL and resets connection health`() = runBlocking {
        val viewModel = SsbScreeningViewModel(app)
        val customUrl = "http://192.168.1.50:8000"

        viewModel.updateCustomGatewayUrl(customUrl)

        val state = viewModel.uiState.value
        assertEquals(customUrl, state.customGatewayUrl)
        assertNull(state.gatewayHealth)
        assertEquals(0L, state.gatewayLatencyMs)
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
