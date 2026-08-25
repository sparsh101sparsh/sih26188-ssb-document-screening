package com.ssb.fieldscreening

import android.graphics.Bitmap
import com.ssb.fieldscreening.util.ImageUtils
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ImageUtilsTest {

    @Test
    fun `resizeBitmap downscales long edge to 1280 maintaining aspect ratio`() {
        val original = Bitmap.createBitmap(2560, 1440, Bitmap.Config.ARGB_8888)
        val resized = ImageUtils.resizeBitmap(original, 1280)

        assertEquals(1280, resized.width)
        assertEquals(720, resized.height)
    }

    @Test
    fun `resizeBitmap with tall portrait image scales height to 1280`() {
        val original = Bitmap.createBitmap(1080, 1920, Bitmap.Config.ARGB_8888)
        val resized = ImageUtils.resizeBitmap(original, 1280)

        assertEquals(1280, resized.height)
        assertEquals(720, resized.width)
    }

    @Test
    fun `resizeBitmap leaves smaller images untouched`() {
        val original = Bitmap.createBitmap(800, 600, Bitmap.Config.ARGB_8888)
        val resized = ImageUtils.resizeBitmap(original, 1280)

        assertEquals(800, resized.width)
        assertEquals(600, resized.height)
    }

    @Test
    fun `compressToJpeg produces valid JPEG ByteArray`() {
        val bitmap = Bitmap.createBitmap(640, 480, Bitmap.Config.ARGB_8888)
        val bytes = ImageUtils.compressToJpeg(bitmap, 80)

        assertTrue(bytes.isNotEmpty())
        // JPEG magic header: 0xFF, 0xD8
        assertEquals(0xFF.toByte(), bytes[0])
        assertEquals(0xD8.toByte(), bytes[1])
    }

    @Test
    fun `compressToJpeg caps quality at 80 percent`() {
        val bitmap = Bitmap.createBitmap(320, 240, Bitmap.Config.ARGB_8888)
        val bytesCap = ImageUtils.compressToJpeg(bitmap, 100) // Requested 100, should cap at 80
        val bytes80 = ImageUtils.compressToJpeg(bitmap, 80)

        assertEquals(bytes80.size, bytesCap.size)
    }

    @Test
    fun `processBitmap full pipeline returns valid compressed JPEG bytes`() {
        val original = Bitmap.createBitmap(3840, 2160, Bitmap.Config.ARGB_8888)
        val result = ImageUtils.processBitmap(original, rotationDegrees = 90, maxDimension = 1280, quality = 75)

        assertTrue(result.isNotEmpty())
        assertEquals(0xFF.toByte(), result[0])
        assertEquals(0xD8.toByte(), result[1])
    }
}
