package com.ssb.fieldscreening

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.ssb.fieldscreening.data.model.ConnectivityMode
import com.ssb.fieldscreening.data.model.DEFAULT_CHECKPOINTS
import com.ssb.fieldscreening.data.model.OfficerActionType
import com.ssb.fieldscreening.data.model.PRESET_SCENARIOS
import com.ssb.fieldscreening.ui.viewmodel.NavigationScreen
import com.ssb.fieldscreening.ui.viewmodel.SsbScreeningViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

    @Test
    fun `read string from context matches SSB Field Screening`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("SSB Field Screening", appName)
    }

    @Test
    fun `verify default presets count and properties`() {
        assertEquals(4, PRESET_SCENARIOS.size)
        val forgedAadhaar = PRESET_SCENARIOS.find { it.id == "forged_aadhaar" }
        assertNotNull(forgedAadhaar)
        assertEquals("RED", forgedAadhaar?.expectedRiskLevel?.name)
        assertTrue(forgedAadhaar!!.riskScore > 80.0)
    }

    @Test
    fun `verify checkpoint list contains 5 border frontiers`() {
        assertEquals(5, DEFAULT_CHECKPOINTS.size)
        val sonauli = DEFAULT_CHECKPOINTS.find { it.id == "SSB_SONAULI_01" }
        assertNotNull(sonauli)
        assertEquals("Indo-Nepal Frontier", sonauli?.frontier)
    }

    @Test
    fun `verify viewModel initial state and preset selection`() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val viewModel = SsbScreeningViewModel(app)

        val initialState = viewModel.uiState.value
        assertNotNull(initialState.currentInspection)
        assertEquals(ConnectivityMode.USB_TETHERED, initialState.connectivityMode)
        assertEquals(NavigationScreen.CAPTURE, initialState.activeScreen)
        assertEquals(com.ssb.fieldscreening.ui.viewmodel.CameraState.IDLE, initialState.cameraState)

        // Test 3-tab Navigation
        viewModel.navigateTo(NavigationScreen.RESULTS)
        assertEquals(NavigationScreen.RESULTS, viewModel.uiState.value.activeScreen)
        viewModel.navigateTo(NavigationScreen.OUTBOX)
        assertEquals(NavigationScreen.OUTBOX, viewModel.uiState.value.activeScreen)
        viewModel.navigateTo(NavigationScreen.CAPTURE)
        assertEquals(NavigationScreen.CAPTURE, viewModel.uiState.value.activeScreen)

        // Select Clean Passport preset
        val cleanPreset = PRESET_SCENARIOS[0]
        viewModel.selectPreset(cleanPreset)
        assertEquals(cleanPreset.id, viewModel.uiState.value.selectedPreset?.id)

        // Submit Officer Decision
        viewModel.setDecisionRemarks("Physical security check completed.")
        viewModel.submitOfficerDecision(OfficerActionType.AUTO_CLEAR)
        assertNotNull(viewModel.uiState.value.officerDecision)
        assertEquals(OfficerActionType.AUTO_CLEAR, viewModel.uiState.value.officerDecision?.action)
    }
}
