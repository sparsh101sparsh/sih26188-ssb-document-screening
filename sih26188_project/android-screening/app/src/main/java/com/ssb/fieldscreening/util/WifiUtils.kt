package com.ssb.fieldscreening.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import com.ssb.fieldscreening.data.remote.ApiClientFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.withContext
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

/**
 * Wi-Fi network utilities and rapid auto-discovery for SSB Edge Gateway.
 */
object WifiUtils {

    private const val PREFS_NAME = "ssb_network_prefs"
    private const val KEY_LAST_GATEWAY = "last_gateway_url"

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

    /**
     * Rapidly scans the local network to find the active SSB Gateway.
     * Probes priority hosts (router, emulator, known slots) first, then sweeps the rest.
     */
    suspend fun discoverGatewayOnSubnet(port: Int = 8000): String? = withContext(Dispatchers.IO) {
        // 1. First probe Android Emulator host if applicable
        val (emuOk, _) = testGateway("http://10.0.2.2:$port", 400L)
        if (emuOk) return@withContext "http://10.0.2.2:$port"

        val subnet = getLocalSubnet() ?: return@withContext null
        val myIp = getLocalIpAddress()

        // 2. Priority candidates first (Router .1, common laptop DHCP ranges)
        val priorityIps = listOf(
            "$subnet.1",
            "$subnet.100",
            "$subnet.101",
            "$subnet.102",
            "$subnet.103",
            "$subnet.104",
            "$subnet.105",
            "$subnet.110",
            "$subnet.120",
            "$subnet.150",
            "$subnet.2",
            "$subnet.3"
        ).filter { it != myIp }

        for (ip in priorityIps) {
            val (ok, _) = testGateway("http://$ip:$port", 350L)
            if (ok) return@withContext "http://$ip:$port"
        }

        // 3. Parallel sweep across remaining subnet in batches of 48
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
