"""
SIH26188 — Network Interface Selection, Pairing QR & Upload Idempotency Test Suite
Covers:
1. select_lan_ip priority scoring (Physical Wi-Fi over VPN, Ethernet over bridge)
2. select_lan_ip default route gateway scoring
3. Preservation of RFC 1918 10.x.x.x LAN subnets (distinguishing LAN from VPN)
4. Fallback to loopback 127.0.0.1 when no interface is available
5. GET /api/v1/companion/pairing-qr endpoint payload and SSBPAIR protocol compliance
6. Upload deduplication with duplicate capture_id (multipart and JSON)
7. Backward compatibility for uploads without capture_id
8. /api/v1/companion/capture alias endpoint verification
"""

import base64
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.routers.companion import companion_store, CompanionStore
from app.core.network import (
    detect_default_route_interface,
    get_all_lan_interfaces,
    is_loopback_interface,
    is_physical_interface,
    is_rfc1918,
    is_virtual_interface,
    is_vpn_interface,
    score_interface,
    select_lan_ip,
)

client = TestClient(app)

SAMPLE_JPEG_BYTES = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c"
    b"\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c"
    b"\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00"
    b"\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01"
    b"\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05"
    b"\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
)


@pytest.fixture(autouse=True)
def reset_companion_store():
    """Ensure a clean companion database before and after each test."""
    companion_store.reset(hard=True)
    yield
    companion_store.reset(hard=True)


# =============================================================================
# 1. NETWORK INTERFACE SELECTION TESTS (R1)
# =============================================================================

class TestNetworkInterfaceSelection:
    def test_classification_helpers(self):
        """Validates interface category classification functions."""
        # Physical
        assert is_physical_interface("en0") is True
        assert is_physical_interface("eth0") is True
        assert is_physical_interface("wlan0") is True
        assert is_physical_interface("wlp2s0") is True

        # VPN
        assert is_vpn_interface("utun0") is True
        assert is_vpn_interface("tun0") is True
        assert is_vpn_interface("wg0") is True
        assert is_vpn_interface("tailscale0") is True
        assert is_physical_interface("utun0") is False

        # Virtual Bridge
        assert is_virtual_interface("docker0") is True
        assert is_virtual_interface("br-1234") is True
        assert is_virtual_interface("vboxnet0") is True
        assert is_virtual_interface("virbr0") is True
        assert is_physical_interface("docker0") is False

        # Loopback
        assert is_loopback_interface("lo0", "127.0.0.1") is True
        assert is_loopback_interface("lo", "127.0.0.1") is True
        assert is_physical_interface("lo0") is False

        # RFC 1918
        assert is_rfc1918("192.168.1.1") is True
        assert is_rfc1918("172.16.0.5") is True
        assert is_rfc1918("10.0.5.20") is True
        assert is_rfc1918("127.0.0.1") is False
        assert is_rfc1918("8.8.8.8") is False
        assert is_rfc1918("169.254.1.1") is False

    def test_select_lan_ip_wifi_over_vpn(self):
        """Wi-Fi interface (en0) must take precedence over active VPN tunnel (utun0)."""
        mock_ifaces = {
            "utun0": ["10.8.0.5"],
            "en0": ["192.168.1.45"],
        }
        selected = select_lan_ip(mock_ifaces)
        assert selected == "192.168.1.45"

    def test_select_lan_ip_ethernet_over_docker_bridge(self):
        """Physical Ethernet (eth0) must take precedence over Docker container bridge (docker0)."""
        mock_ifaces = {
            "docker0": ["172.17.0.1"],
            "eth0": ["10.10.5.20"],
        }
        selected = select_lan_ip(mock_ifaces)
        assert selected == "10.10.5.20"

    def test_select_lan_ip_10_dot_lan_preserved(self):
        """10.x.x.x LAN subnet on physical interface (eth0/en0) must NOT be blacklisted as VPN."""
        mock_ifaces = {
            "en0": ["10.198.50.12"],
            "utun1": ["10.8.0.99"],
        }
        selected = select_lan_ip(mock_ifaces)
        assert selected == "10.198.50.12"

    def test_select_lan_ip_fallback_loopback(self):
        """When only loopback interface exists, falls back cleanly to 127.0.0.1."""
        mock_ifaces = {
            "lo0": ["127.0.0.1"],
        }
        selected = select_lan_ip(mock_ifaces)
        assert selected == "127.0.0.1"

    def test_select_lan_ip_empty_dict_fallback(self):
        """Empty interface dictionary falls back cleanly to 127.0.0.1."""
        assert select_lan_ip({}) == "127.0.0.1"

    def test_score_interface_priority_formula(self):
        """Validates exact score calculation for physical, default route, and VPN interfaces."""
        # Physical + Default Route + RFC1918: 100 + 50 + 20 = 170
        score_phys, meta_phys = score_interface("en0", "192.168.1.10", default_route_iface="en0")
        assert score_phys == 170
        assert meta_phys["is_physical"] is True
        assert meta_phys["is_default_route"] is True
        assert meta_phys["is_rfc1918"] is True

        # VPN: 0 + 0 + 20 - 200 = -180
        score_vpn, meta_vpn = score_interface("utun0", "10.8.0.5")
        assert score_vpn == -180
        assert meta_vpn["is_vpn"] is True

        # Virtual Bridge: 0 + 0 + 20 - 150 = -130
        score_virt, meta_virt = score_interface("docker0", "172.17.0.1")
        assert score_virt == -130
        assert meta_virt["is_virtual"] is True

        # Loopback: 0 + 0 + 0 - 500 = -500
        score_loop, meta_loop = score_interface("lo0", "127.0.0.1")
        assert score_loop == -500
        assert meta_loop["is_loopback"] is True

    def test_select_lan_ip_real_system_resolution(self):
        """Validates select_lan_ip returns a valid IPv4 address when querying system interfaces."""
        ip = select_lan_ip()
        assert isinstance(ip, str)
        parts = ip.split(".")
        assert len(parts) == 4
        assert all(p.isdigit() and 0 <= int(p) <= 255 for p in parts)


# =============================================================================
# 2. PAIRING QR ENDPOINT TESTS (R4)
# =============================================================================

class TestPairingQREndpoint:
    def test_get_pairing_qr_contract(self):
        """GET /api/v1/companion/pairing-qr must return valid SSBPAIR QR payload and metadata."""
        res = client.get("/api/v1/companion/pairing-qr")
        assert res.status_code == 200
        data = res.json()

        assert data["status"] == "active"
        assert "qr_payload" in data
        assert "gateway_id" in data
        assert "pairing_token" in data
        assert "current_lan_ip" in data
        assert "port" in data
        assert "fallback_url" in data

        # Validate SSBPAIR protocol URI format: SSBPAIR://<ip>:<port>/<token>
        pairing_token = data["pairing_token"]
        current_ip = data["current_lan_ip"]
        port = data["port"]
        expected_qr = f"SSBPAIR://{current_ip}:{port}/{pairing_token}"
        assert data["qr_payload"] == expected_qr
        assert len(pairing_token) == 8
        assert data["fallback_url"] == f"http://{current_ip}:{port}"
        assert data["gateway_id"] == "SSBGateway"


# =============================================================================
# 3. UPLOAD IDEMPOTENCY WITH CAPTURE_ID TESTS (R5)
# =============================================================================

class TestUploadIdempotency:
    def test_multipart_upload_idempotency_duplicate_ack(self):
        """
        Uploading a capture with the same capture_id twice must return HTTP 200 with
        status='duplicate' on the second attempt and NOT create duplicate rows or files.
        """
        capture_id = "session-unique-uuid-001"

        # 1. First upload
        files1 = {"file": ("face1.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")}
        data1 = {
            "capture_type": "selfie",
            "device_id": "phone-alpha",
            "checkpoint_id": "WB-JAI-01",
            "capture_id": capture_id,
        }
        res1 = client.post("/api/v1/companion/upload", files=files1, data=data1)
        assert res1.status_code == 200
        json1 = res1.json()
        assert json1["status"] == "success"
        assert json1["sequence_id"] == 1
        assert json1["capture_id"] == capture_id
        orig_uuid = json1["capture_uuid"]

        # Verify buffer size is 1
        assert companion_store.get_buffer_size() == 1

        # 2. Second upload (simulated retry with exact same capture_id)
        files2 = {"file": ("face1.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")}
        data2 = {
            "capture_type": "selfie",
            "device_id": "phone-alpha",
            "checkpoint_id": "WB-JAI-01",
            "capture_id": capture_id,
        }
        res2 = client.post("/api/v1/companion/upload", files=files2, data=data2)
        assert res2.status_code == 200
        json2 = res2.json()
        assert json2["status"] == "duplicate"
        assert json2["message"] == "Already received"
        assert json2["capture_uuid"] == orig_uuid
        assert json2["sequence_id"] == 1
        assert json2["capture_id"] == capture_id

        # Buffer size MUST still be 1 (no duplicate row)
        assert companion_store.get_buffer_size() == 1

    def test_json_upload_idempotency(self):
        """JSON uploads with duplicate capture_id must also return duplicate ACK."""
        capture_id = "json-session-batch-789"
        b64_img = base64.b64encode(SAMPLE_JPEG_BYTES).decode("utf-8")

        payload = {
            "image_base64": b64_img,
            "capture_type": "document",
            "device_id": "tablet-01",
            "checkpoint_id": "SSB-SONAULI",
            "capture_id": capture_id,
        }

        # First request
        res1 = client.post("/api/v1/companion/upload", json=payload)
        assert res1.status_code == 200
        assert res1.json()["status"] == "success"
        assert res1.json()["sequence_id"] == 1

        # Second request
        res2 = client.post("/api/v1/companion/upload", json=payload)
        assert res2.status_code == 200
        json2 = res2.json()
        assert json2["status"] == "duplicate"
        assert json2["message"] == "Already received"
        assert json2["capture_id"] == capture_id
        assert json2["sequence_id"] == 1

        assert companion_store.get_buffer_size() == 1

    def test_upload_without_capture_id_backwards_compatible(self):
        """Uploads without capture_id continue to increment sequence IDs monotonically."""
        res1 = client.post(
            "/api/v1/companion/upload",
            files={"file": ("snap1.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")},
        )
        assert res1.status_code == 200
        assert res1.json()["sequence_id"] == 1

        res2 = client.post(
            "/api/v1/companion/upload",
            files={"file": ("snap2.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")},
        )
        assert res2.status_code == 200
        assert res2.json()["sequence_id"] == 2

        assert companion_store.get_buffer_size() == 2

    def test_capture_alias_route(self):
        """POST /api/v1/companion/capture alias endpoint functions identically to /upload."""
        res = client.post(
            "/api/v1/companion/capture",
            files={"file": ("snap.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")},
            data={"capture_id": "alias-test-uuid"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        assert res.json()["capture_id"] == "alias-test-uuid"
