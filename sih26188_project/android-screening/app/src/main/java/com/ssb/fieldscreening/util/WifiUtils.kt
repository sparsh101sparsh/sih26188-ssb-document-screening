package com.ssb.fieldscreening.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import com.ssb.fieldscreening.data.remote.ApiClientFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections
import kotlin.coroutines.resume

/**
 * Wi-Fi network utilities and rapid 4-tier auto-discovery for SSB Edge Gateway.
 *
 * Discovery strategy:
 * Tier 0: Saved gateway URL from SharedPreferences (1s timeout)
 * Tier 1: Emulator 10.0.2.2 (only on Android Emulator environments, 400ms timeout)
 * Tier 2: mDNS / NSD — instant if backend registers Zeroconf "_ssb-gateway._tcp" (3s timeout)
 * Tier 3: Priority subnet probes — parallel 350ms probes at 13 common DHCP slots
 */
object WifiUtils {

    private const val PREFS_NAME = "ssb_network_prefs"
    private const val KEY_LAST_GATEWAY = "last_gateway_url"

    /** mDNS service type that the backend registers. Must match Python Zeroconf config. */
    const val NSD_SERVICE_TYPE = "_ssb-gateway._tcp"

    // ─── Network Info ─────────────────────────────────────────────────────────

    /**
     * Returns the device's own local IPv4 address (e.g. "192.168.1.101").
     */
    fun getLocalIpAddress(): String? {
        return try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        val host = addr.hostAddress ?: continue
                        if (!host.startsWith("127.")) return host
                    }
                }
            }
            null
        } catch (ex: Exception) {
            Log.w("[WifiUtils]", "Failed to retrieve local IP: ${ex.message}")
            null
        }
    }

    /**
     * Derives the subnet prefix from the device's local IP.
     * E.g. "192.168.1.101" -> "192.168.1"
     */
    fun getLocalSubnet(): String? {
        val ip = getLocalIpAddress() ?: return null
        val parts = ip.split(".")
        return if (parts.size == 4) "${parts[0]}.${parts[1]}.${parts[2]}" else null
    }

    /**
     * Returns true if the device is currently connected to a Wi-Fi network.
     */
    fun isOnWifi(context: Context): Boolean {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(network) ?: return false
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Returns the Wi-Fi SSID name (clean without quotes).
     */
    fun getWifiSsid(context: Context): String? {
        return try {
            val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            val ssid = wm.connectionInfo?.ssid
            ssid?.trim('"')?.takeIf { it.isNotBlank() && it != "<unknown ssid>" }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Detects if the current process is running inside an Android Emulator.
     */
    fun isEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT ?: ""
        val model = Build.MODEL ?: ""
        val hardware = Build.HARDWARE ?: ""
        val brand = Build.BRAND ?: ""
        val device = Build.DEVICE ?: ""
        val product = Build.PRODUCT ?: ""

        return fingerprint.startsWith("generic") ||
                fingerprint.startsWith("unknown") ||
                fingerprint.contains("generic") ||
                model.contains("google_sdk") ||
                model.contains("Emulator") ||
                model.contains("Android SDK built for x86") ||
                hardware.contains("goldfish") ||
                hardware.contains("ranchu") ||
                brand.startsWith("generic") ||
                device.startsWith("generic") ||
                product.contains("sdk") ||
                product.contains("google_sdk")
    }

    // ─── URL Normalization & QR Parsing ──────────────────────────────────────

    data class QrPairingInfo(
        val url: String,
        val pairingToken: String? = null,
        val gatewayId: String? = null
    )

    /**
     * Parses a QR code payload supporting:
     * 1. Structured JSON bootstrap: {"version":1,"host":"192.168.1.5","port":8000,"pairing_token":"...","gateway_id":"..."}
     * 2. SSBPAIR scheme: SSBPAIR://<host>:<port>/<token>
     * 3. Plain URL: http://<host>:<port> or raw <host>:<port>
     */
    fun parseQrPayload(raw: String): QrPairingInfo {
        val input = raw.trim()
        if (input.isBlank()) return QrPairingInfo("")

        // 1. Modern Structured JSON Bootstrap Payload
        if (input.startsWith("{") && input.endsWith("}")) {
            try {
                val json = org.json.JSONObject(input)
                val host = json.optString("host", "").trim()
                val port = json.optInt("port", 8000)
                val token = json.optString("pairing_token", "").trim().takeIf { it.isNotBlank() }
                val gwId = json.optString("gateway_id", "SSBGateway").trim().takeIf { it.isNotBlank() }
                val explicitUrl = json.optString("url", "").trim()

                val resolvedUrl = if (explicitUrl.isNotBlank()) {
                    normalizeGatewayUrl(explicitUrl)
                } else if (host.isNotBlank()) {
                    "http://$host:$port"
                } else {
                    ""
                }
                Log.d("[WifiUtils]", "Parsed JSON QR payload -> url=$resolvedUrl, token=$token, gatewayId=$gwId")
                return QrPairingInfo(url = resolvedUrl, pairingToken = token, gatewayId = gwId)
            } catch (e: Exception) {
                Log.w("[WifiUtils]", "JSON QR parse failed: ${e.message}")
            }
        }

        // 2. Legacy SSBPAIR URI scheme
        if (input.startsWith("SSBPAIR://", ignoreCase = true)) {
            val withoutScheme = input.substring(10) // drop "SSBPAIR://"
            val hostPortPart = withoutScheme.substringBefore("/").trim().trimEnd('/')
            val token = withoutScheme.substringAfter("/", "").trim().takeIf { it.isNotBlank() }
            if (hostPortPart.isBlank()) return QrPairingInfo("")
            val url = if (hostPortPart.contains(":")) {
                "http://$hostPortPart"
            } else {
                "http://$hostPortPart:8000"
            }
            Log.d("[WifiUtils]", "Parsed SSBPAIR payload '$raw' -> '$url', token=$token")
            return QrPairingInfo(url = url, pairingToken = token, gatewayId = "SSBGateway")
        }

        // 3. Fallback raw URL / IP:Port
        return QrPairingInfo(url = normalizeGatewayUrl(input))
    }

    /**
     * Backward-compatible helper returning just the URL string.
     */
    fun parseQrPayloadUrl(raw: String): String = parseQrPayload(raw).url

    /**
     * Normalizes a raw string (from QR code, manual input, or copy-paste)
     * into a valid HTTP base URL (e.g., "192.168.1.5" -> "http://192.168.1.5:8000").
     * Returns empty string if input is blank.
     */
    fun normalizeGatewayUrl(raw: String): String {
        var input = raw.trim()
        if (input.isBlank()) return ""

        if (input.startsWith("{") && input.endsWith("}")) {
            return parseQrPayload(input).url
        }

        if (input.startsWith("SSBPAIR://", ignoreCase = true)) {
            return parseQrPayload(input).url
        }

        // Strip trailing slashes
        while (input.endsWith("/")) {
            input = input.dropLast(1)
        }
        if (input.isBlank()) return ""

        // Add http:// prefix if missing
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
            input = "http://$input"
        }

        // If no port specified and no path, append :8000
        val urlWithoutScheme = input.substringAfter("://")
        if (!urlWithoutScheme.contains(":") && !urlWithoutScheme.contains("/")) {
            input = "$input:8000"
        }

        return input
    }

    // ─── Gateway Health Check ─────────────────────────────────────────────────

    /**
     * Pings the gateway health endpoint with a custom timeout.
     * Returns Pair(isReachable, latencyMs).
     */
    suspend fun testGateway(url: String, timeoutMs: Long = 1500L): Pair<Boolean, Long> = withContext(Dispatchers.IO) {
        if (url.isBlank()) return@withContext Pair(false, 0L)
        val cleanUrl = normalizeGatewayUrl(url)
        if (cleanUrl.isBlank()) return@withContext Pair(false, 0L)

        val formattedBase = if (cleanUrl.endsWith("/")) cleanUrl else "$cleanUrl/"
        return@withContext try {
            val start = System.currentTimeMillis()
            val service = ApiClientFactory.createServiceWithTimeout(
                baseUrl = formattedBase,
                connectTimeoutMs = timeoutMs,
                readTimeoutMs = timeoutMs
            )
            val response = service.getHealth()
            val latency = System.currentTimeMillis() - start
            Pair(response.isSuccessful, latency)
        } catch (e: Exception) {
            Pair(false, 0L)
        }
    }

    // ─── mDNS / NSD Discovery ────────────────────────────────────────────────

    /**
     * Attempts to find the SSB Gateway via mDNS (Android NSD) within [timeoutMs].
     * Supports modern API 34+ registerServiceInfoCallback with legacy fallback.
     * Returns the resolved "http://ip:port" string or null.
     */
    suspend fun discoverViamdns(context: Context, port: Int = 8000, timeoutMs: Long = 3500L): String? =
        withTimeoutOrNull(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                val nsdManager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager
                    ?: run { cont.resume(null); return@suspendCancellableCoroutine }

                var discoveryListener: NsdManager.DiscoveryListener? = null
                var resolved = false

                // Only acquire MulticastLock on Android 12 and below; Android 13+ manages it automatically.
                val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                val multicastLock = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                    wifiManager?.createMulticastLock("SSB_mDNS")?.apply {
                        setReferenceCounted(false)
                        try { acquire() } catch (_: Exception) {}
                    }
                } else null

                val resolveListener = object : NsdManager.ResolveListener {
                    override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                        Log.w("[WifiUtils]", "mDNS legacy resolve failed: errorCode=$errorCode")
                    }
                    override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                        if (!resolved && cont.isActive) {
                            resolved = true
                            try { if (multicastLock?.isHeld == true) multicastLock.release() } catch (_: Exception) {}
                            val ip = serviceInfo.host?.hostAddress
                            val resolvedPort = serviceInfo.port.takeIf { it > 0 } ?: port
                            val url = if (ip != null) "http://$ip:$resolvedPort" else null
                            Log.i("[WifiUtils]", "mDNS resolved service (legacy): $url")
                            try { discoveryListener?.let { nsdManager.stopServiceDiscovery(it) } } catch (_: Exception) {}
                            cont.resume(url)
                        }
                    }
                }

                discoveryListener = object : NsdManager.DiscoveryListener {
                    override fun onDiscoveryStarted(serviceType: String) {
                        Log.d("[WifiUtils]", "mDNS discovery started for $serviceType")
                    }
                    override fun onDiscoveryStopped(serviceType: String) {
                        Log.d("[WifiUtils]", "mDNS discovery stopped")
                    }
                    override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                        Log.w("[WifiUtils]", "mDNS start discovery failed: $errorCode")
                        try { if (multicastLock?.isHeld == true) multicastLock.release() } catch (_: Exception) {}
                        if (!resolved && cont.isActive) cont.resume(null)
                    }
                    override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
                    override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                        Log.d("[WifiUtils]", "mDNS service found: ${serviceInfo.serviceName}, resolving...")
                        if (resolved) return

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                            try {
                                val callback = object : NsdManager.ServiceInfoCallback {
                                    override fun onServiceUpdated(updatedInfo: NsdServiceInfo) {
                                        if (!resolved && cont.isActive) {
                                            resolved = true
                                            val hostAddr = updatedInfo.hostAddresses.firstOrNull()?.hostAddress ?: updatedInfo.host?.hostAddress
                                            val resolvedPort = updatedInfo.port.takeIf { it > 0 } ?: port
                                            val url = if (hostAddr != null) "http://$hostAddr:$resolvedPort" else null
                                            Log.i("[WifiUtils]", "mDNS ServiceInfoCallback resolved: $url")
                                            try { nsdManager.unregisterServiceInfoCallback(this) } catch (_: Exception) {}
                                            try { discoveryListener?.let { nsdManager.stopServiceDiscovery(it) } } catch (_: Exception) {}
                                            try { if (multicastLock?.isHeld == true) multicastLock.release() } catch (_: Exception) {}
                                            cont.resume(url)
                                        }
                                    }
                                    override fun onServiceLost() {}
                                    override fun onServiceInfoCallbackRegistrationFailed(errorCode: Int) {
                                        Log.w("[WifiUtils]", "ServiceInfoCallback registration failed: $errorCode")
                                    }
                                    override fun onServiceInfoCallbackUnregistered() {}
                                }
                                nsdManager.registerServiceInfoCallback(serviceInfo, context.mainExecutor, callback)
                            } catch (e: Exception) {
                                Log.w("[WifiUtils]", "registerServiceInfoCallback failed, fallback to resolveService: ${e.message}")
                                @Suppress("DEPRECATION")
                                try { nsdManager.resolveService(serviceInfo, resolveListener) } catch (_: Exception) {}
                            }
                        } else {
                            @Suppress("DEPRECATION")
                            try { nsdManager.resolveService(serviceInfo, resolveListener) } catch (_: Exception) {}
                        }
                    }
                    override fun onServiceLost(serviceInfo: NsdServiceInfo) {
                        Log.d("[WifiUtils]", "mDNS service lost: ${serviceInfo.serviceName}")
                    }
                }

                cont.invokeOnCancellation {
                    try { discoveryListener?.let { nsdManager.stopServiceDiscovery(it) } } catch (_: Exception) {}
                    try { if (multicastLock?.isHeld == true) multicastLock.release() } catch (_: Exception) {}
                }

                try {
                    nsdManager.discoverServices(NSD_SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
                } catch (e: Exception) {
                    Log.w("[WifiUtils]", "mDNS discoverServices threw exception: ${e.message}")
                    try { if (multicastLock?.isHeld == true) multicastLock.release() } catch (_: Exception) {}
                    cont.resume(null)
                }
            }
        }

    // ─── Deterministic Auto-Discovery Sequence ────────────────────────────────

    /**
     * Deterministic, high-reliability discovery hierarchy:
     * Tier 0: USB Cable / ADB Reverse Host (127.0.0.1) — 1200ms timeout
     * Tier 1: Saved Paired Gateway from SharedPreferences — 1200ms timeout
     * Tier 2: Android Emulator host (10.0.2.2) (if in emulator) — 500ms timeout
     * Tier 3: NSD / mDNS service discovery (_ssb-gateway._tcp) — 3500ms timeout
     *
     * Note: Blind subnet scanning has been removed to avoid latency, noise, and firewall blocks.
     */
    suspend fun discoverGatewayOnSubnet(
        context: Context? = null,
        port: Int = 8000,
        excludeLoopback: Boolean = false,
    ): String? = withContext(Dispatchers.IO) {
        Log.d("[AutoDiscovery]", "Starting deterministic gateway discovery (port=$port)")

        // Tier 0: USB Cable / ADB Reverse Host (127.0.0.1)
        if (!excludeLoopback) {
            val usbUrl = "http://127.0.0.1:$port"
            val (usbOk, usbLatency) = testGateway(usbUrl, 1200L)
            if (usbOk) {
                Log.i("[AutoDiscovery]", "Tier 0 (USB Cable / ADB Reverse): Connected via 127.0.0.1 (${usbLatency}ms)")
                return@withContext usbUrl
            }
        }

        // Tier 1: Saved Paired Gateway from SharedPreferences
        if (context != null) {
            val saved = getLastConnectedGateway(context)
            if (!saved.isNullOrBlank() && (!excludeLoopback || !saved.contains("127.0.0.1"))) {
                Log.d("[AutoDiscovery]", "Tier 1 (Saved Paired Gateway): Probing $saved (1200ms timeout)")
                val (savedOk, latency) = testGateway(saved, 1200L)
                if (savedOk) {
                    Log.i("[AutoDiscovery]", "Tier 1 (Saved Paired Gateway) succeeded: $saved (${latency}ms)")
                    return@withContext saved
                } else {
                    Log.d("[AutoDiscovery]", "Tier 1 (Saved Paired Gateway) unreachable: $saved")
                }
            }
        }

        // Tier 2: Android Emulator host (only if running inside emulator environment)
        if (isEmulator()) {
            val emuUrl = "http://10.0.2.2:$port"
            val (emuOk, latency) = testGateway(emuUrl, 500L)
            if (emuOk) {
                Log.i("[AutoDiscovery]", "Tier 2 (Emulator) succeeded: $emuUrl (${latency}ms)")
                return@withContext emuUrl
            }
        }

        // Tier 3: NSD / mDNS instant discovery
        if (context != null) {
            Log.d("[AutoDiscovery]", "Tier 3 (NSD/mDNS): Resolving $NSD_SERVICE_TYPE (3500ms timeout)")
            val mdnsResult = discoverViamdns(context, port, 3500L)
            if (mdnsResult != null) {
                val (ok, latency) = testGateway(mdnsResult, 1000L)
                if (ok) {
                    Log.i("[AutoDiscovery]", "Tier 3 (NSD/mDNS) succeeded: $mdnsResult (${latency}ms)")
                    return@withContext mdnsResult
                }
            }
        }

        Log.w("[AutoDiscovery]", "All discovery tiers completed without finding an active gateway.")
        null
    }

    // ─── Identity & Credential Persistence ────────────────────────────────────

    private const val KEY_DEVICE_ID = "paired_device_id"
    private const val KEY_DEVICE_TOKEN = "paired_device_token"
    private const val KEY_GATEWAY_ID = "paired_gateway_id"

    /**
     * Persists paired gateway identity, device_id, and authentication credentials.
     */
    fun savePairedCredentials(
        context: Context,
        gatewayUrl: String,
        gatewayId: String? = null,
        deviceId: String? = null,
        deviceToken: String? = null
    ) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val editor = prefs.edit().putString(KEY_LAST_GATEWAY, gatewayUrl)
            if (!gatewayId.isNullOrBlank()) editor.putString(KEY_GATEWAY_ID, gatewayId)
            if (!deviceId.isNullOrBlank()) editor.putString(KEY_DEVICE_ID, deviceId)
            if (!deviceToken.isNullOrBlank()) editor.putString(KEY_DEVICE_TOKEN, deviceToken)
            editor.apply()
            Log.d("[WifiUtils]", "Saved paired credentials for $gatewayUrl: deviceId=$deviceId, gatewayId=$gatewayId")
        } catch (e: Exception) {
            Log.w("[WifiUtils]", "Failed to save paired credentials: ${e.message}")
        }
    }

    fun getPairedDeviceId(context: Context): String? {
        return try {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_DEVICE_ID, null)?.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }

    fun getPairedDeviceToken(context: Context): String? {
        return try {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_DEVICE_TOKEN, null)?.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }

    fun getPairedGatewayId(context: Context): String? {
        return try {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_GATEWAY_ID, null)?.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Persists the last connected gateway URL to SharedPreferences.
     */
    fun saveLastConnectedGateway(context: Context, url: String) {
        savePairedCredentials(context = context, gatewayUrl = url)
    }

    /**
     * Retrieves the last connected gateway URL from SharedPreferences.
     */
    fun getLastConnectedGateway(context: Context): String? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.getString(KEY_LAST_GATEWAY, null)?.takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }
}
