package com.ssb.fieldscreening

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.ssb.fieldscreening.data.model.PRESET_SCENARIOS
import com.ssb.fieldscreening.ui.components.AssessmentSummaryCard
import com.ssb.fieldscreening.ui.theme.SsbInspectionTheme
import com.github.takahirom.roborazzi.RobolectricDeviceQualifiers
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = RobolectricDeviceQualifiers.Pixel8, sdk = [34])
class GreetingScreenshotTest {

    @get:Rule val composeTestRule = createComposeRule()

    @Test
    fun ssb_assessment_card_screenshot() {
        val scenario = PRESET_SCENARIOS[1] // Forged Aadhaar
        composeTestRule.setContent {
            SsbInspectionTheme {
                AssessmentSummaryCard(assessment = scenario.inspectionResponse.assessment)
            }
        }

        composeTestRule.onRoot().captureRoboImage(filePath = "src/test/screenshots/ssb_assessment_card.png")
    }
}
