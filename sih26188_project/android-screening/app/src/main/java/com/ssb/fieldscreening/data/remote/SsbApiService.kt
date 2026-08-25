package com.ssb.fieldscreening.data.remote

import com.ssb.fieldscreening.data.model.CompanionUploadAck
import com.ssb.fieldscreening.data.model.HealthResponse
import com.ssb.fieldscreening.data.model.InspectionResponse
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.RequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import java.util.concurrent.TimeUnit

interface SsbApiService {

    @GET("api/v1/health")
    suspend fun getHealth(): Response<HealthResponse>

    @Multipart
    @POST("api/v1/scan/inspect")
    suspend fun inspectDocument(
        @Part documentImage: MultipartBody.Part,
        @Part livePhoto: MultipartBody.Part? = null,
        @Part("checkpoint_id") checkpointId: RequestBody? = null,
        @Part("transit_date") transitDate: RequestBody? = null
    ): Response<InspectionResponse>

    @Multipart
    @POST("api/v1/companion/upload")
    suspend fun uploadCompanionCapture(
        @Part file: MultipartBody.Part,
        @Part("capture_type") captureType: RequestBody,
        @Part("device_id") deviceId: RequestBody,
        @Part("checkpoint_id") checkpointId: RequestBody
    ): Response<CompanionUploadAck>
}

object ApiClientFactory {
    val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .callTimeout(20, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    fun createService(baseUrl: String): SsbApiService {
        val formattedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(formattedUrl)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(SsbApiService::class.java)
    }

    /**
     * Creates a service with custom short timeouts — used by WifiUtils for parallel subnet scanning.
     */
    fun createServiceWithTimeout(
        baseUrl: String,
        connectTimeoutMs: Long,
        readTimeoutMs: Long
    ): SsbApiService {
        val shortClient = OkHttpClient.Builder()
            .connectTimeout(connectTimeoutMs, TimeUnit.MILLISECONDS)
            .readTimeout(readTimeoutMs, TimeUnit.MILLISECONDS)
            .callTimeout(connectTimeoutMs + readTimeoutMs, TimeUnit.MILLISECONDS)
            .retryOnConnectionFailure(false)
            .build()
        val formattedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(formattedUrl)
            .client(shortClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(SsbApiService::class.java)
    }
}
