package com.ssb.fieldscreening.util

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.camera.core.ImageProxy
import java.io.ByteArrayOutputStream
import kotlin.math.max
import kotlin.math.roundToInt

object ImageUtils {

    const val MAX_IMAGE_DIMENSION = 1280
    const val MAX_JPEG_QUALITY = 80

    /**
     * Resizes a [Bitmap] such that the long edge is at most [maxDimension],
     * preserving aspect ratio.
     */
    fun resizeBitmap(bitmap: Bitmap, maxDimension: Int = MAX_IMAGE_DIMENSION): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        val longestEdge = max(width, height)

        if (longestEdge <= maxDimension) {
            return bitmap
        }

        val scaleFactor = maxDimension.toFloat() / longestEdge.toFloat()
        val targetWidth = (width * scaleFactor).roundToInt().coerceAtLeast(1)
        val targetHeight = (height * scaleFactor).roundToInt().coerceAtLeast(1)

        return Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
    }

    /**
     * Compresses a [Bitmap] into JPEG byte array with quality <= 80%.
     */
    fun compressToJpeg(bitmap: Bitmap, quality: Int = MAX_JPEG_QUALITY): ByteArray {
        val safeQuality = quality.coerceIn(1, MAX_JPEG_QUALITY)
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, safeQuality, outputStream)
        return outputStream.toByteArray()
    }

    /**
     * Rotates a [Bitmap] by specified degrees if non-zero.
     */
    fun rotateBitmap(bitmap: Bitmap, rotationDegrees: Int): Bitmap {
        if (rotationDegrees % 360 == 0) return bitmap
        val matrix = Matrix().apply {
            postRotate(rotationDegrees.toFloat())
        }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    /**
     * Full pipeline: rotate, resize to <= [maxDimension] on longest edge,
     * and compress to JPEG with quality <= [quality]%.
     */
    fun processBitmap(
        bitmap: Bitmap,
        rotationDegrees: Int = 0,
        maxDimension: Int = MAX_IMAGE_DIMENSION,
        quality: Int = MAX_JPEG_QUALITY
    ): ByteArray {
        val rotated = if (rotationDegrees != 0) rotateBitmap(bitmap, rotationDegrees) else bitmap
        val resized = resizeBitmap(rotated, maxDimension)
        return compressToJpeg(resized, quality)
    }

    /**
     * Converts a CameraX [ImageProxy] into a compressed JPEG [ByteArray].
     */
    fun processImageProxy(
        imageProxy: ImageProxy,
        maxDimension: Int = MAX_IMAGE_DIMENSION,
        quality: Int = MAX_JPEG_QUALITY
    ): ByteArray {
        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
        val bitmap = imageProxy.toBitmap()
        return processBitmap(bitmap, rotationDegrees, maxDimension, quality)
    }

    /**
     * Decodes a raw byte array, resizes it to max 1280px on long edge,
     * and re-compresses to JPEG <= 80%.
     */
    fun decodeAndCompress(
        rawBytes: ByteArray,
        maxDimension: Int = MAX_IMAGE_DIMENSION,
        quality: Int = MAX_JPEG_QUALITY
    ): ByteArray {
        val bitmap = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size)
            ?: return rawBytes
        return processBitmap(bitmap, 0, maxDimension, quality)
    }
}
