"""
SIH26188 — Robust Network Interface & LAN IP Selection Module
Provides multi-platform interface inspection, default-route gateway resolution,
and priority-scored selection of physical LAN/Wi-Fi IPv4 addresses over VPN tunnels,
virtual bridges, and loopbacks.

Priority scoring formula:
  Score = (is_physical * 100) + (is_default_route * 50) + (is_rfc1918 * 20)
          - (is_vpn * 200) - (is_virtual * 150) - (is_loopback * 500)
"""

import ipaddress
import logging
import os
import platform
import re
import socket
import subprocess
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("sih26188.network")

# Known interface prefixes / patterns
PHYSICAL_PREFIXES = (
    "en",      # macOS / BSD / modern Linux Ethernet/Wi-Fi (en0, enp3s0, ens33, etc.)
    "eth",     # Classic Linux Ethernet (eth0, eth1)
    "wlan",    # Linux Wi-Fi (wlan0, wlan1)
    "wl",      # Linux Wi-Fi (wlp2s0, wls1)
    "eno",     # Onboard Ethernet
    "ens",     # PCI slot Ethernet
    "enp",     # PCI bus Ethernet
    "em",      # BSD Intel Ethernet
    "igb",     # BSD Intel Gigabit Ethernet
    "ix",      # BSD 10G Ethernet
)

VPN_PREFIXES = (
    "utun",        # macOS VPN / WireGuard / Tailscale / OpenVPN
    "tun",         # Linux TUN device
    "tap",         # Linux TAP device
    "ppp",         # Point-to-Point Protocol
    "wg",          # WireGuard
    "tailscale",   # Tailscale
    "wireguard",   # WireGuard
    "nord",        # NordVPN
    "openvpn",     # OpenVPN
    "cscotun",     # Cisco AnyConnect
    "ipsec",       # IPsec
    "zt",          # ZeroTier
    "proton",      # ProtonVPN
)

VIRTUAL_PREFIXES = (
    "docker",      # Docker bridge
    "br-",         # Docker custom bridge (br-xxx)
    "br0",         # Linux bridge
    "bridge",      # macOS bridge / Linux bridge
    "vboxnet",     # VirtualBox host-only
    "virbr",       # libvirt bridge
    "vmnet",       # VMware network
    "veth",        # Virtual Ethernet pair (containers)
    "dummy",       # Dummy interface
    "cni",         # Container Network Interface (Kubernetes)
    "flannel",     # Flannel overlay
    "calico",      # Calico overlay
    "awdl",        # Apple Wireless Direct Link (peer-to-peer, not LAN AP)
    "llw",         # Low Latency WLAN (Apple)
    "anpi",        # Apple internal
    "ap",          # Access point virtual interface (unless physical)
)

LOOPBACK_PREFIXES = (
    "lo",          # Linux / macOS loopback (lo, lo0)
)


def is_rfc1918(ip_str: str) -> bool:
    """Returns True if IPv4 address is in RFC 1918 private address space."""
    try:
        ip = ipaddress.IPv4Address(ip_str)
        return ip.is_private and not ip.is_loopback and not ip.is_link_local
    except ValueError:
        return False


def is_loopback_ip(ip_str: str) -> bool:
    """Returns True if IP address is loopback (127.0.0.0/8 or ::1)."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_loopback
    except ValueError:
        return ip_str.startswith("127.") or ip_str == "::1"


def is_loopback_interface(iface_name: str, ip_str: Optional[str] = None) -> bool:
    """Determines if the interface is loopback."""
    name_lower = iface_name.lower()
    if any(name_lower == p or name_lower.startswith(p) for p in LOOPBACK_PREFIXES):
        return True
    if ip_str and is_loopback_ip(ip_str):
        return True
    return False


def is_vpn_interface(iface_name: str) -> bool:
    """Determines if the interface name corresponds to a VPN tunnel."""
    name_lower = iface_name.lower()
    return any(name_lower.startswith(prefix) for prefix in VPN_PREFIXES)


def is_virtual_interface(iface_name: str) -> bool:
    """Determines if the interface name corresponds to a virtual bridge, container, or VM interface."""
    name_lower = iface_name.lower()
    return any(name_lower.startswith(prefix) for prefix in VIRTUAL_PREFIXES)


def is_physical_interface(iface_name: str) -> bool:
    """
    Determines if interface is a physical Wi-Fi or Ethernet adapter.
    Excludes VPN, virtual bridge, and loopback adapters.
    """
    name_lower = iface_name.lower()
    if is_loopback_interface(name_lower) or is_vpn_interface(name_lower) or is_virtual_interface(name_lower):
        return False
    return any(name_lower.startswith(prefix) for prefix in PHYSICAL_PREFIXES)


def detect_default_route_interface() -> Optional[str]:
    """
    Detects the interface name of the default network gateway route.
    Uses platform-specific routing table inspections with graceful fallback.
    """
    system_type = platform.system().lower()

    # 1. macOS / BSD: netstat -rn -f inet or route -n get default
    if "darwin" in system_type or "bsd" in system_type:
        try:
            out = subprocess.check_output(["netstat", "-rn", "-f", "inet"], text=True, stderr=subprocess.DEVNULL)
            for line in out.splitlines():
                parts = line.split()
                if len(parts) >= 4 and parts[0] in ("default", "0.0.0.0"):
                    iface = parts[-1]
                    logger.debug(f"[Network] Detected default route via netstat: {iface}")
                    return iface
        except Exception as e:
            logger.debug(f"[Network] netstat default route detection failed: {e}")

        try:
            out = subprocess.check_output(["route", "-n", "get", "default"], text=True, stderr=subprocess.DEVNULL)
            m = re.search(r"interface:\s*([^\s]+)", out)
            if m:
                iface = m.group(1).strip()
                logger.debug(f"[Network] Detected default route via route get default: {iface}")
                return iface
        except Exception as e:
            logger.debug(f"[Network] route get default failed: {e}")

    # 2. Linux: ip route show default or netstat -rn
    elif "linux" in system_type:
        try:
            out = subprocess.check_output(["ip", "route", "show", "default"], text=True, stderr=subprocess.DEVNULL)
            m = re.search(r"dev\s+([^\s]+)", out)
            if m:
                iface = m.group(1).strip()
                logger.debug(f"[Network] Detected default route via ip route: {iface}")
                return iface
        except Exception as e:
            logger.debug(f"[Network] ip route default detection failed: {e}")

        try:
            out = subprocess.check_output(["netstat", "-rn"], text=True, stderr=subprocess.DEVNULL)
            for line in out.splitlines():
                parts = line.split()
                if len(parts) >= 8 and parts[0] in ("0.0.0.0", "default"):
                    iface = parts[-1]
                    logger.debug(f"[Network] Detected default route via Linux netstat: {iface}")
                    return iface
        except Exception as e:
            logger.debug(f"[Network] Linux netstat failed: {e}")

    # 3. Cross-platform UDP socket probe fallback
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.2)
        s.connect(("1.1.1.1", 80))
        probe_ip = s.getsockname()[0]
        s.close()
        if probe_ip and not probe_ip.startswith("127."):
            logger.debug(f"[Network] Socket probe resolved local outbound IP: {probe_ip}")
    except Exception:
        pass

    return None


def get_all_lan_interfaces() -> Dict[str, List[str]]:
    """
    Returns a dictionary of all available network interfaces and their IPv4 addresses.
    Format: { "iface_name": ["ip1", "ip2"] }
    """
    interfaces: Dict[str, List[str]] = {}

    # 1. Try psutil if available
    try:
        import psutil  # type: ignore
        for iface_name, snics in psutil.net_if_addrs().items():
            ips = []
            for snic in snics:
                if snic.family == socket.AF_INET and snic.address:
                    ips.append(snic.address)
            if ips:
                interfaces[iface_name] = ips
        if interfaces:
            return interfaces
    except (ImportError, Exception):
        pass

    # 2. Try netifaces if available
    try:
        import netifaces  # type: ignore
        for iface in netifaces.interfaces():
            addrs = netifaces.ifaddresses(iface)
            if netifaces.AF_INET in addrs:
                ips = [a["addr"] for a in addrs[netifaces.AF_INET] if "addr" in a]
                if ips:
                    interfaces[iface] = ips
        if interfaces:
            return interfaces
    except (ImportError, Exception):
        pass

    # 3. Try ip addr (Linux)
    try:
        out = subprocess.check_output(["ip", "-4", "addr", "show"], text=True, stderr=subprocess.DEVNULL)
        cur_iface = None
        for line in out.splitlines():
            m_iface = re.match(r"^\d+:\s+([^:]+):", line)
            if m_iface:
                cur_iface = m_iface.group(1).split("@")[0].strip()
                if cur_iface not in interfaces:
                    interfaces[cur_iface] = []
            elif cur_iface:
                m_ip = re.search(r"inet\s+(\d+\.\d+\.\d+\.\d+)", line)
                if m_ip:
                    ip = m_ip.group(1)
                    if ip not in interfaces[cur_iface]:
                        interfaces[cur_iface].append(ip)
        if interfaces:
            return interfaces
    except Exception:
        pass

    # 4. Try ifconfig (macOS / BSD / Linux fallback)
    try:
        out = subprocess.check_output(["ifconfig"], text=True, stderr=subprocess.DEVNULL)
        cur_iface = None
        for line in out.splitlines():
            if line and not line.startswith("\t") and not line.startswith(" "):
                cur_iface = line.split(":")[0].strip()
                if cur_iface not in interfaces:
                    interfaces[cur_iface] = []
            elif cur_iface:
                m_ip = re.search(r"inet\s+(\d+\.\d+\.\d+\.\d+)", line)
                if m_ip:
                    ip = m_ip.group(1)
                    if ip not in interfaces[cur_iface]:
                        interfaces[cur_iface].append(ip)
        if interfaces:
            return interfaces
    except Exception:
        pass

    # 5. Last resort: gethostbyname
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if "host" not in interfaces:
                interfaces["host"] = []
            if ip not in interfaces["host"]:
                interfaces["host"].append(ip)
    except Exception:
        pass

    if not interfaces:
        interfaces["lo0"] = ["127.0.0.1"]

    return interfaces


def score_interface(
    iface_name: str,
    ip_str: str,
    default_route_iface: Optional[str] = None,
) -> Tuple[int, Dict[str, Any]]:
    """
    Computes priority score for a given network interface and IPv4 address.
    Formula:
      score = (is_physical * 100) + (is_default_route * 50) + (is_rfc1918 * 20)
              - (is_vpn * 200) - (is_virtual * 150) - (is_loopback * 500)
    """
    is_loopback = 1 if is_loopback_interface(iface_name, ip_str) else 0
    is_vpn = 1 if is_vpn_interface(iface_name) else 0
    is_virtual = 1 if is_virtual_interface(iface_name) else 0
    is_physical = 1 if (is_physical_interface(iface_name) and not is_vpn and not is_virtual and not is_loopback) else 0
    is_default = 1 if (default_route_iface and iface_name == default_route_iface) else 0
    is_rfc = 1 if is_rfc1918(ip_str) else 0

    score = (
        (is_physical * 100)
        + (is_default * 50)
        + (is_rfc * 20)
        - (is_vpn * 200)
        - (is_virtual * 150)
        - (is_loopback * 500)
    )

    metadata = {
        "iface": iface_name,
        "ip": ip_str,
        "is_physical": bool(is_physical),
        "is_default_route": bool(is_default),
        "is_rfc1918": bool(is_rfc),
        "is_vpn": bool(is_vpn),
        "is_virtual": bool(is_virtual),
        "is_loopback": bool(is_loopback),
        "score": score,
    }
    return score, metadata


def select_lan_ip(interfaces_dict: Optional[Dict[str, Any]] = None) -> str:
    """
    Selects the optimal LAN IPv4 address for frontline pairing and mDNS broadcasts.
    Prioritizes physical Wi-Fi/Ethernet interfaces on local subnets while penalizing VPNs,
    virtual bridges, and loopbacks.

    Args:
        interfaces_dict: Optional dictionary of {iface_name: [ip1, ip2]} or {iface_name: "ip"}
                         or psutil/netifaces structure for unit testing.

    Returns:
        Selected IPv4 address string (e.g. "192.168.1.50" or "10.0.0.5" or "127.0.0.1" fallback).
    """
    # 1. Normalize input interfaces or inspect system
    raw_ifaces = interfaces_dict if interfaces_dict is not None else get_all_lan_interfaces()
    normalized_ifaces: Dict[str, List[str]] = {}

    for iface, val in raw_ifaces.items():
        if isinstance(val, str):
            normalized_ifaces[iface] = [val]
        elif isinstance(val, list):
            ip_list = []
            for item in val:
                if isinstance(item, str):
                    ip_list.append(item)
                elif isinstance(item, dict) and "address" in item:
                    ip_list.append(item["address"])
                elif isinstance(item, dict) and "addr" in item:
                    ip_list.append(item["addr"])
                elif hasattr(item, "address"):
                    ip_list.append(getattr(item, "address"))
            normalized_ifaces[iface] = ip_list
        elif isinstance(val, dict) and ("address" in val or "addr" in val):
            normalized_ifaces[iface] = [val.get("address") or val.get("addr")]

    # 2. Detect default route interface (only if interfaces_dict was not passed with simulated interfaces or when detecting system default)
    default_route_iface = None
    if interfaces_dict is None:
        default_route_iface = detect_default_route_interface()

    candidates: List[Tuple[int, str, str, Dict[str, Any]]] = []

    # 3. Evaluate each interface
    for iface_name, ips in normalized_ifaces.items():
        for ip in ips:
            if not ip:
                continue
            # Ignore link-local (169.254.x.x)
            if ip.startswith("169.254."):
                continue
            try:
                socket.inet_aton(ip)
            except (socket.error, ValueError):
                continue

            score, meta = score_interface(iface_name, ip, default_route_iface)
            logger.info(
                f"[Network] Evaluated interface '{iface_name}' ({ip}): "
                f"physical={meta['is_physical']}, default_route={meta['is_default_route']}, "
                f"rfc1918={meta['is_rfc1918']}, vpn={meta['is_vpn']}, virtual={meta['is_virtual']}, "
                f"loopback={meta['is_loopback']} -> Score: {score}"
            )
            candidates.append((score, iface_name, ip, meta))

    if not candidates:
        logger.warning("[Network] No network interface candidates found. Falling back to 127.0.0.1")
        return "127.0.0.1"

    # Sort descending by score, tie-break by iface_name
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)

    best_score, best_iface, best_ip, best_meta = candidates[0]

    # If the highest scored candidate is loopback or score is severely negative with other options,
    # check if there's any non-loopback candidate with valid IP
    if best_meta["is_loopback"] and len(candidates) > 1:
        non_loopbacks = [c for c in candidates if not c[3]["is_loopback"]]
        if non_loopbacks:
            best_score, best_iface, best_ip, best_meta = non_loopbacks[0]

    logger.info(
        f"[Network] Selected LAN IP: {best_ip} (Interface: {best_iface}, Score: {best_score})"
    )
    return best_ip
