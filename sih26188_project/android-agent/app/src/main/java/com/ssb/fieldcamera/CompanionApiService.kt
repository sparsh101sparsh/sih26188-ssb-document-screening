package com.ssb.fieldcamera

import android.content.Context
import android.content.SharedPreferences
import android.provider.Settings
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class UploadResult(
    val success: Boolean,
    val sequenceId: Int = 0,
    val message: String = ""
)

data class VerdictResult(
    val hasVerdict: Boolean,
    val sequenceId: Int = 0,
    val verdict: String = "",
    val riskLevel: String = "",
    val riskScore: Double = 0.0,
    val details: String = ""
)

class CompanionApiService(context: Context? = null) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .writeTimeout(8, TimeUnit.SECONDS)
        .build()

    private var prefs: SharedPreferences? = context?.getSharedPreferences("ssb_field_prefs", Context.MODE_PRIVATE)
    private var serverUrl: String = prefs?.getString("server_url", "http://10.0.2.2:8000") ?: "http://10.0.2.2:8000"

    fun setServerUrl(url: String, context: Context? = null) {
        val trimmed = url.trim().trimEnd('/')
        serverUrl = trimmed
        context?.getSharedPreferences("ssb_field_prefs", Context.MODE_PRIVATE)
            ?.edit()
            ?.putString("server_url", trimmed)
            ?.apply()
    }

    fun getServerUrl(): String = serverUrl

    fun getDeviceId(context: Context): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "field-unit-01"
    }

    suspend fun uploadPhoto(context: Context, imageBytes: ByteArray, captureType: String): UploadResult {
        return try {
            val deviceId = getDeviceId(context)
            val checkpointId = prefs?.getString("checkpoint_id", "WB-JAI-01") ?: "WB-JAI-01"
            val normalizedType = if (captureType == "selfie" || captureType == "traveler_live") "traveler_live" else "document"

            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", "field_capture.jpg",
                    imageBytes.toRequestBody("image/jpeg".toMediaType()))
                .addFormDataPart("capture_type", normalizedType)
                .addFormDataPart("device_id", deviceId)
                .addFormDataPart("checkpoint_id", checkpointId)
                .build()

            val request = Request.Builder()
                .url("$serverUrl/api/v1/companion/upload")
                .header("X-Checkpoint-ID", checkpointId)
                .header("User-Agent", "SSB-Android-Companion/2.0")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val bodyStr = response.body?.string() ?: "{}"
                val json = JSONObject(bodyStr)
                val seq = json.optInt("sequence_id", 0)
                UploadResult(success = true, sequenceId = seq, message = "Synced to Desktop")
            } else {
                UploadResult(success = false, message = "HTTP ${response.code}")
            }
        } catch (e: Exception) {
            UploadResult(success = false, message = e.message ?: "Network error")
        }
    }

    suspend fun checkConnection(context: Context? = null): Boolean {
        return try {
            val checkpointId = prefs?.getString("checkpoint_id", "WB-JAI-01") ?: "WB-JAI-01"
            val request = Request.Builder()
                .url("$serverUrl/api/v1/health")
                .header("X-Checkpoint-ID", checkpointId)
                .header("User-Agent", "SSB-Android-Companion/2.0")
                .get()
                .build()

            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    suspend fun fetchLatestVerdict(sequenceId: Int? = null): VerdictResult {
        return try {
            val url = if (sequenceId != null && sequenceId > 0) {
                "$serverUrl/api/v1/companion/result/$sequenceId"
            } else {
                "$serverUrl/api/v1/companion/verdict"
            }
            val request = Request.Builder()
                .url(url)
                .get()
                .build()

            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val bodyStr = response.body?.string() ?: "{}"
                val json = JSONObject(bodyStr)
                VerdictResult(
                    hasVerdict = json.optBoolean("has_verdict", false),
                    sequenceId = json.optInt("sequence_id", 0),
                    verdict = json.optString("verdict", "PENDING"),
                    riskLevel = json.optString("risk_level", "GREEN"),
                    riskScore = json.optDouble("risk_score", 0.0),
                    details = json.optString("details", "")
                )
            } else {
                VerdictResult(hasVerdict = false)
            }
        } catch (e: Exception) {
            VerdictResult(hasVerdict = false)
        }
    }
}
