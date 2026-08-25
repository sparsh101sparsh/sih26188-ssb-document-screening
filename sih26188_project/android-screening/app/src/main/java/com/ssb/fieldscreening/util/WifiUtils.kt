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

    /**
     * Parses a QR code payload supporting the SSBPAIR scheme:
     * - SSBPAIR://<host>:<port>/<token> -> "http://<host>:<port>"
     * - SSBPAIR://<host>/<token> -> "http://<host>:8000"
     * - Legacy http://<host>:<port> or raw <host>:<port> strings
     */
    fun parseQrPayload(raw: String): String {
        val input = raw.trim()
        if (input.isBlank()) return ""

        if (input.startsWith("SSBPAIR://", ignoreCase = true)) {
            val withoutScheme = input.substring(10) // drop "SSBPAIR://"
            val hostPortPart = withoutScheme.substringBefore("/").trim().trimEnd('/')
            if (hostPortPart.isBlank()) return ""
            val result = if (hostPortPart.contains(":")) {
                "http://$hostPortPart"
            } else {
                "http://$hostPortPart:8000"
            }
            Log.d("[WifiUtils]", "Parsed SSBPAIR payload '$raw' -> '$result'")
            return result
        }

        return normalizeGatewayUrl(input)
    }

    /**
     * Normalizes a raw string (from QR code, manual input, or copy-paste)
     * into a valid HTTP base URL (e.g., "192.168.1.5" -> "http://192.168.1.5:8000").
     * Returns empty string if input is blank.
     */
    fun normalizeGatewayUrl(raw: String): String {
        var input = raw.trim()
        if (input.isBlank()) return ""

        if (input.startsWith("SSBPAIR://", ignoreCase = true)) {
            return parseQrPayload(input)
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
     * The backend registers itself under "_ssb-gateway._tcp.local." service type.
     * Returns the resolved "http://ip:port" string or null.
     */
    suspend fun discoverViamdns(context: Context, port: Int = 8000, timeoutMs: Long = 3000L): String? =
        withTimeoutOrNull(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                val nsdManager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager
                    ?: run { cont.resume(null); return@suspendCancellableCoroutine }

                var discoveryListener: NsdManager.DiscoveryListener? = null
                var resolved = false

                val resolveListener = object : NsdManager.ResolveListener {
                    override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                        Log.w("[WifiUtils]", "mDNS resolve failed: errorCode=$errorCode")
                    }
                    override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                        if (!resolved && cont.isActive) {
                            resolved = true
                            val ip = serviceInfo.host?.hostAddress
                            val resolvedPort = serviceInfo.port.takeIf { it > 0 } ?: port
                            val url = if (ip != null) "http://$ip:$resolvedPort" else null
                            Log.i("[WifiUtils]", "mDNS resolved service: $url")
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
                        if (!resolved && cont.isActive) cont.resume(null)
                    }
                    override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
                    override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                        Log.d("[WifiUtils]", "mDNS service found: ${serviceInfo.serviceName}, resolving...")
                        if (!resolved) {
                            try { nsdManager.resolveService(serviceInfo, resolveListener) } catch (_: Exception) {}
                        }
                    }
                    override fun onServiceLost(serviceInfo: NsdServiceInfo) {
                        Log.d("[WifiUtils]", "mDNS service lost: ${serviceInfo.serviceName}")
                    }
                }

                cont.invokeOnCancellation {
                    try { nsdManager.stopServiceDiscovery(discoveryListener) } catch (_: Exception) {}
                }

                try {
                    nsdManager.discoverServices(NSD_SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
                } catch (e: Exception) {
                    Log.w("[WifiUtils]", "mDNS discoverServices threw exception: ${e.message}")
                    cont.resume(null)
                }
            }
        }

    // ─── 4-Tier Auto-Discovery ────────────────────────────────────────────────

    /**
     * Rapidly discovers the active SSB Gateway using 4 tiers:
     * Tier 0: Saved gateway URL from SharedPreferences (1s timeout)
     * Tier 1: Android Emulator host (10.0.2.2) (only if running inside emulator)
     * Tier 2: mDNS/NSD broadcast (3s timeout)
     * Tier 3: Parallel priority subnet probe (13 candidate slots, 350ms timeout)
     */
    suspend fun discoverGatewayOnSubnet(context: Context? = null, port: Int = 8000): String? = withContext(Dispatchers.IO) {
        Log.d("[AutoDiscovery]", "Starting 4-tier gateway discovery sequence (port=$port)")

        // Tier 0: Saved gateway URL from SharedPreferences
        if (context != null) {
            val saved = getLastConnectedGateway(context)
            if (!saved.isNullOrBlank()) {
                Log.d("[AutoDiscovery]", "Tier 0 (Saved Gateway): Probing $saved (1000ms timeout)")
                val (savedOk, latency) = testGateway(saved, 1000L)
                if (savedOk) {
                    Log.i("[AutoDiscovery]", "Tier 0 (Saved Gateway) succeeded: $saved (${latency}ms)")
                    return@withContext saved
                } else {
                    Log.d("[AutoDiscovery]", "Tier 0 (Saved Gateway) unreachable: $saved")
                }
            }
        }

        // Tier 1: Android Emulator host (only if running on emulator hardware)
        if (isEmulator()) {
            val emuUrl = "http://10.0.2.2:$port"
            Log.d("[AutoDiscovery]", "Tier 1 (Emulator): Probing $emuUrl (400ms timeout)")
            val (emuOk, latency) = testGateway(emuUrl, 400L)
            if (emuOk) {
                Log.i("[AutoDiscovery]", "Tier 1 (Emulator) succeeded: $emuUrl (${latency}ms)")
                return@withContext emuUrl
            } else {
                Log.d("[AutoDiscovery]", "Tier 1 (Emulator) unreachable: $emuUrl")
            }
        } else {
            Log.d("[AutoDiscovery]", "Tier 1 (Emulator) skipped: physical device detected")
        }

        // Tier 2: mDNS / NSD instant discovery (requires Zeroconf broadcaster)
        if (context != null) {
            Log.d("[AutoDiscovery]", "Tier 2 (mDNS): Resolving $NSD_SERVICE_TYPE (3000ms timeout)")
            val mdnsResult = discoverViamdns(context, port, 3000L)
            if (mdnsResult != null) {
                val (ok, latency) = testGateway(mdnsResult, 800L)
                if (ok) {
                    Log.i("[AutoDiscovery]", "Tier 2 (mDNS) succeeded: $mdnsResult (${latency}ms)")
                    return@withContext mdnsResult
                }
            }
        }

        // Tier 3: Parallel probe — 13 priority candidates on local subnet
        val subnet = getLocalSubnet()
        val myIp = getLocalIpAddress()
        if (subnet != null) {
            val priorityIps = listOf(
                "$subnet.1",
                "$subnet.2",
                "$subnet.3",
                "$subnet.100",
                "$subnet.101",
                "$subnet.102",
                "$subnet.103",
                "$subnet.104",
                "$subnet.105",
                "$subnet.110",
                "$subnet.120",
                "$subnet.150",
                "$subnet.200",
            ).filter { it != myIp }

            Log.d("[AutoDiscovery]", "Tier 3 (Priority Probes): Scanning 13 IPs on subnet $subnet: $priorityIps")

            val priorityResults = priorityIps.map { ip ->
                async {
                    val candidate = "http://$ip:$port"
                    val (ok, _) = testGateway(candidate, 350L)
                    if (ok) candidate else null
                }
            }.awaitAll().filterNotNull()

            if (priorityResults.isNotEmpty()) {
                val found = priorityResults.first()
                Log.i("[AutoDiscovery]", "Tier 3 (Priority IP probe) succeeded: $found")
                return@withContext found
            }
        }

        Log.w("[AutoDiscovery]", "All 4 discovery tiers failed to find an active gateway.")
        null
    }

    // ─── Persistence ─────────────────────────────────────────────────────────

    /**
     * Persists the last connected gateway URL to SharedPreferences.
     */
    fun saveLastConnectedGateway(context: Context, url: String) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_LAST_GATEWAY, url).apply()
            Log.d("[WifiUtils]", "Saved last connected gateway URL: $url")
        } catch (e: Exception) {
            Log.w("[WifiUtils]", "Failed to save last connected gateway: ${e.message}")
        }
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
