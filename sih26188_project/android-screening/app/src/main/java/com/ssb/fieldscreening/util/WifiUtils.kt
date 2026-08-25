package com.ssb.fieldscreening.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
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
 * Wi-Fi network utilities and rapid auto-discovery for SSB Edge Gateway.
 *
 * Discovery strategy (fastest first):
 * 1. mDNS / NSD — instant if the backend registers "_ssb-gateway._tcp.local."
 * 2. Priority subnet probes — parallel 350 ms probes at common DHCP slots
 * 3. Full subnet parallel sweep — batched 48-host concurrent ping
 */
object WifiUtils {

    private const val PREFS_NAME = "ssb_network_prefs"
    private const val KEY_LAST_GATEWAY = "last_gateway_url"

    /** mDNS service type that the backend registers. Must match the Python Zeroconf config. */
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

    // ─── URL Normalization ────────────────────────────────────────────────────

    /**
     * Normalizes a raw string (from QR code, manual input, or copy-paste)
     * into a valid HTTP base URL (e.g., "192.168.1.5" -> "http://192.168.1.5:8000").
     */
    fun normalizeGatewayUrl(raw: String): String {
        var input = raw.trim()
        if (input.isBlank()) return "http://192.168.1.61:8000"

        // Strip trailing slashes
        while (input.endsWith("/")) {
            input = input.dropLast(1)
        }

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
        val cleanUrl = normalizeGatewayUrl(url)
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
     * The backend must register itself under the "_ssb-gateway._tcp.local." service type
     * using Python Zeroconf. Returns the resolved "http://ip:port" string or null.
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
                        if (!resolved) {
                            // Don't resume null yet — keep discovering
                        }
                    }
                    override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                        if (!resolved && cont.isActive) {
                            resolved = true
                            val ip = serviceInfo.host?.hostAddress
                            val resolvedPort = serviceInfo.port.takeIf { it > 0 } ?: port
                            val url = if (ip != null) "http://$ip:$resolvedPort" else null
                            try { discoveryListener?.let { nsdManager.stopServiceDiscovery(it) } } catch (_: Exception) {}
                            cont.resume(url)
                        }
                    }
                }

                discoveryListener = object : NsdManager.DiscoveryListener {
                    override fun onDiscoveryStarted(serviceType: String) {}
                    override fun onDiscoveryStopped(serviceType: String) {}
                    override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                        if (!resolved && cont.isActive) cont.resume(null)
                    }
                    override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {}
                    override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                        if (!resolved) {
                            try { nsdManager.resolveService(serviceInfo, resolveListener) } catch (_: Exception) {}
                        }
                    }
                    override fun onServiceLost(serviceInfo: NsdServiceInfo) {}
                }

                cont.invokeOnCancellation {
                    try { nsdManager.stopServiceDiscovery(discoveryListener) } catch (_: Exception) {}
                }

                try {
                    nsdManager.discoverServices(NSD_SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
                } catch (e: Exception) {
                    cont.resume(null)
                }
            }
        }

    // ─── Full Auto-Discovery ──────────────────────────────────────────────────

    /**
     * Rapidly discovers the active SSB Gateway using a 3-tier approach:
     * 1. Android Emulator host (10.0.2.2) — fast for dev environments
     * 2. mDNS/NSD broadcast — instant if backend registers Zeroconf service
     * 3. Parallel subnet probe — simultaneous scan of all common DHCP slots
     */
    suspend fun discoverGatewayOnSubnet(context: Context? = null, port: Int = 8000): String? = withContext(Dispatchers.IO) {
        // Tier 1: Android Emulator host
        val (emuOk, _) = testGateway("http://10.0.2.2:$port", 400L)
        if (emuOk) return@withContext "http://10.0.2.2:$port"

        // Tier 2: mDNS instant discovery (requires backend to broadcast Zeroconf)
        if (context != null) {
            val mdnsResult = discoverViamdns(context, port, 2500L)
            if (mdnsResult != null) {
                val (ok, _) = testGateway(mdnsResult, 800L)
                if (ok) return@withContext mdnsResult
            }
        }

        val subnet = getLocalSubnet() ?: return@withContext null
        val myIp = getLocalIpAddress()

        // Tier 3: Parallel probe — ALL priority candidates at once (no sequential delay)
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

        // All priority probes run in parallel — result in ~350ms
        val priorityResults = priorityIps.map { ip ->
            async {
                val (ok, _) = testGateway("http://$ip:$port", 350L)
                if (ok) "http://$ip:$port" else null
            }
        }.awaitAll().filterNotNull()
        if (priorityResults.isNotEmpty()) return@withContext priorityResults.first()

        // Tier 4: Full subnet sweep in batches of 48
        val remaining = (1..254).map { "$subnet.$it" }
            .filter { it !in priorityIps && it != myIp }

        for (batch in remaining.chunked(48)) {
            val results = batch.map { ip ->
                async {
                    val (ok, _) = testGateway("http://$ip:$port", 450L)
                    if (ok) "http://$ip:$port" else null
                }
            }.awaitAll().filterNotNull()

            if (results.isNotEmpty()) {
                return@withContext results.first()
            }
        }

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
        } catch (e: Exception) {
            // Ignore storage error
        }
    }

    /**
     * Retrieves the last connected gateway URL from SharedPreferences.
     */
    fun getLastConnectedGateway(context: Context): String? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.getString(KEY_LAST_GATEWAY, null)
        } catch (e: Exception) {
            null
        }
    }
}
