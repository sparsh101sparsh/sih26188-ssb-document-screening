package com.ssb.fieldscreening

import com.ssb.fieldscreening.util.WifiUtils
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class WifiUtilsTest {

    @Test
    fun `test normalizeGatewayUrl returns empty string on blank or empty input`() {
        assertEquals("", WifiUtils.normalizeGatewayUrl(""))
        assertEquals("", WifiUtils.normalizeGatewayUrl("   "))
        assertEquals("", WifiUtils.normalizeGatewayUrl("\n\t"))
    }

    @Test
    fun `test normalizeGatewayUrl normalizes standard inputs`() {
        assertEquals("http://192.168.1.50:8000", WifiUtils.normalizeGatewayUrl("192.168.1.50"))
        assertEquals("http://192.168.1.50:8000", WifiUtils.normalizeGatewayUrl("http://192.168.1.50"))
        assertEquals("http://192.168.1.50:8000", WifiUtils.normalizeGatewayUrl("192.168.1.50:8000"))
        assertEquals("http://192.168.1.50:8000", WifiUtils.normalizeGatewayUrl("http://192.168.1.50:8000/"))
        assertEquals("https://secure.ssb.gov.in:8443", WifiUtils.normalizeGatewayUrl("https://secure.ssb.gov.in:8443/"))
    }

    @Test
    fun `test parseQrPayload parses SSBPAIR protocol formats`() {
        // Standard SSBPAIR with port and token
        assertEquals(
            "http://192.168.1.50:8000",
            WifiUtils.parseQrPayload("SSBPAIR://192.168.1.50:8000/a1b2c3d4e5")
        )

        // Case-insensitive scheme
        assertEquals(
            "http://192.168.1.50:8000",
            WifiUtils.parseQrPayload("ssbpair://192.168.1.50:8000/a1b2c3d4e5")
        )

        // SSBPAIR without port (defaults to 8000)
        assertEquals(
            "http://192.168.1.50:8000",
            WifiUtils.parseQrPayload("SSBPAIR://192.168.1.50/a1b2c3d4e5")
        )

        // SSBPAIR without token
        assertEquals(
            "http://192.168.1.50:8000",
            WifiUtils.parseQrPayload("SSBPAIR://192.168.1.50:8000")
        )

        // SSBPAIR with hostname
        assertEquals(
            "http://SSBGateway:8000",
            WifiUtils.parseQrPayload("SSBPAIR://SSBGateway/tok999")
        )
    }

    @Test
    fun `test parseQrPayload backward compatibility for legacy QR payloads`() {
        // Full HTTP URL
        assertEquals(
            "http://192.168.1.50:8000",
            WifiUtils.parseQrPayload("http://192.168.1.50:8000")
        )

        // IP with custom port
        assertEquals(
            "http://192.168.1.50:9000",
            WifiUtils.parseQrPayload("192.168.1.50:9000")
        )

        // Raw IP
        assertEquals(
            "http://192.168.1.50:8000",
            WifiUtils.parseQrPayload("192.168.1.50")
        )

        // Empty string
        assertEquals("", WifiUtils.parseQrPayload(""))
        assertEquals("", WifiUtils.parseQrPayload("   "))
    }

    @Test
    fun `test isEmulator execution does not throw`() {
        val result = WifiUtils.isEmulator()
        assertNotNull(result)
    }
}
