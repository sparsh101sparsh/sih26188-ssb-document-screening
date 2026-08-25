"""
SIH26188 Milestone 4 Backend Empirical Challenge Suite
Adversarial stress-testing of:
1. select_lan_ip with complex network topologies, VPNs, bridges, subnets, and malformed inputs.
2. Concurrent / rapid-fire duplicate capture uploads verifying idempotency, thread-safety, and zero DB/file corruption.
3. GET /api/v1/companion/pairing-qr token runtime stability, URI protocol compliance, and fallback URL correctness.
4. Companion store resilience under edge-case payloads, malformed data, and race conditions.
"""

import base64
import concurrent.futures
import io
import re
import sqlite3
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.routers.companion import (
    companion_store,
    CompanionStore,
    PAIRING_TOKEN,
)
from app.core.network import (
    PHYSICAL_PREFIXES,
    VPN_PREFIXES,
    VIRTUAL_PREFIXES,
    LOOPBACK_PREFIXES,
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

SAMPLE_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


@pytest.fixture(autouse=True)
def clean_database():
    """Reset the SQLite store before and after each test."""
    companion_store.reset(hard=True)
    yield
    companion_store.reset(hard=True)


# =============================================================================
# PART 1: EMPIRICAL STRESS TESTS FOR select_lan_ip & NETWORK SCORING
# =============================================================================

class TestNetworkSelectorEmpiricalStress:
    """Stress tests IP resolution heuristics across adversarial and complex topologies."""

    def test_complex_multi_vpn_multi_bridge_scenario(self):
        """
        Host with multiple VPN tunnels (utun0, tun0, wg0, tailscale0),
        virtual bridges (docker0, br-abc, virbr0, vboxnet0),
        and one physical Wi-Fi (en0 on 192.168.1.120).
        Must select en0.
        """
        mock_ifaces = {
            "lo0": ["127.0.0.1"],
            "utun0": ["10.8.0.5"],
            "utun1": ["10.14.0.2"],
            "tun0": ["172.25.0.10"],
            "wg0": ["10.200.200.1"],
            "tailscale0": ["100.64.0.15"],
            "docker0": ["172.17.0.1"],
            "br-987654": ["172.18.0.1"],
            "virbr0": ["192.168.122.1"],
            "vboxnet0": ["192.168.56.1"],
            "awdl0": ["169.254.10.20"],
            "en0": ["192.168.1.120"],
        }
        selected = select_lan_ip(mock_ifaces)
        assert selected == "192.168.1.120"

    def test_multiple_physical_nics_with_default_route(self):
        """
        Host has en0 (Wi-Fi 192.168.1.50) and eth0 (Ethernet 10.0.0.10).
        Default route is set to eth0. Eth0 score should exceed en0.
        """
        score_en0, _ = score_interface("en0", "192.168.1.50", default_route_iface="eth0")
        score_eth0, _ = score_interface("eth0", "10.0.0.10", default_route_iface="eth0")
        assert score_eth0 > score_en0
        assert score_eth0 == 170  # 100 (phys) + 50 (default) + 20 (rfc1918)
        assert score_en0 == 120   # 100 (phys) + 0 (not default) + 20 (rfc1918)

    def test_rfc1918_class_a_b_c_preservation_on_physical_nics(self):
        """
        Verify that 10.x.x.x (Class A), 172.16-31.x.x (Class B), and 192.168.x.x (Class C)
        are all correctly recognized as RFC 1918 and selected when on physical adapters.
        """
        # Class A on physical vs VPN
        assert select_lan_ip({"utun0": ["10.8.0.1"], "wlan0": ["10.50.100.5"]}) == "10.50.100.5"

        # Class B on physical vs Docker bridge
        assert select_lan_ip({"docker0": ["172.17.0.1"], "ens33": ["172.20.5.8"]}) == "172.20.5.8"

        # Class C on physical vs Tailscale
        assert select_lan_ip({"tailscale0": ["100.100.1.2"], "enp3s0": ["192.168.0.25"]}) == "192.168.0.25"

    def test_empty_and_null_interfaces_dict(self):
        """Empty or degenerate interface structures must gracefully fallback to 127.0.0.1 without throwing exceptions."""
        assert select_lan_ip({}) == "127.0.0.1"
        assert select_lan_ip({"lo": ["127.0.0.1"]}) == "127.0.0.1"
        assert select_lan_ip({"dummy_empty": []}) == "127.0.0.1"

    def test_link_local_and_invalid_ip_filtering(self):
        """
        169.254.x.x link-local and invalid socket IP strings must be ignored.
        """
        mock_ifaces = {
            "en0": ["169.254.1.5", "invalid.ip.string", "999.999.999.999"],
            "en1": ["192.168.2.88"],
        }
        selected = select_lan_ip(mock_ifaces)
        assert selected == "192.168.2.88"

    def test_psutil_and_netifaces_dict_structures(self):
        """
        Test compatibility with nested dictionary representations (like netifaces or psutil output format).
        """
        psutil_mock = {
            "utun0": [{"address": "10.8.0.1", "family": 2}],
            "en0": [{"address": "192.168.1.99", "family": 2}],
        }
        assert select_lan_ip(psutil_mock) == "192.168.1.99"

        netifaces_mock = {
            "docker0": [{"addr": "172.17.0.1"}],
            "eth0": [{"addr": "10.0.0.15"}],
        }
        assert select_lan_ip(netifaces_mock) == "10.0.0.15"

    def test_public_ip_on_physical_nic_fallback(self):
        """
        If a server has a public IP (e.g. AWS/VPS eth0: 54.210.10.5) and no RFC1918 IP,
        it should still choose physical eth0 over loopback.
        """
        mock_ifaces = {
            "lo0": ["127.0.0.1"],
            "eth0": ["54.210.10.5"],
        }
        selected = select_lan_ip(mock_ifaces)
        assert selected == "54.210.10.5"

    def test_all_vpn_prefixes_penalized(self):
        """Ensure all known VPN prefixes in VPN_PREFIXES are penalized appropriately."""
        for vpn_p in VPN_PREFIXES:
            iface = f"{vpn_p}0"
            score, meta = score_interface(iface, "10.8.0.1")
            assert meta["is_vpn"] is True
            assert score < 0

    def test_all_virtual_prefixes_penalized(self):
        """Ensure all known virtual prefixes in VIRTUAL_PREFIXES are penalized."""
        for virt_p in VIRTUAL_PREFIXES:
            iface = f"{virt_p}0" if not virt_p.endswith("-") else f"{virt_p}123"
            score, meta = score_interface(iface, "172.16.0.1")
            assert meta["is_virtual"] is True
            assert score < 0


# =============================================================================
# PART 2: EMPIRICAL CONCURRENCY & DUPLICATE UPLOAD STRESS TESTS
# =============================================================================

class TestConcurrentUploadDeduplication:
    """Stress tests upload idempotency and SQLite WAL concurrency under rapid parallel requests."""

    def test_rapid_fire_duplicate_capture_id_exact_ack(self):
        """
        Simulate 10 simultaneous / rapid-fire uploads with the exact same capture_id.
        Verification:
        - Exactly 1 new record stored in companion SQLite database.
        - Buffer count is exactly 1.
        - 1 response has status='success' and 9 responses have status='duplicate' (or all return consistent metadata).
        - Every response returns the exact same sequence_id and capture_uuid.
        - Zero data corruption, zero DB locked errors.
        """
        capture_id = "RAPID-FIRE-CONCURRENT-CAP-001"
        num_requests = 10

        def send_upload(req_index: int):
            files = {"file": (f"snap_{req_index}.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")}
            data = {
                "capture_type": "document",
                "device_id": f"field-unit-{req_index}",
                "checkpoint_id": "WB-JAI-01",
                "capture_id": capture_id,
            }
            res = client.post("/api/v1/companion/capture", files=files, data=data)
            return res.status_code, res.json()

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(send_upload, i) for i in range(num_requests)]
            results = [f.result() for f in futures]

        # 1. All 10 requests must succeed with HTTP 200
        assert all(code == 200 for code, _ in results)

        statuses = [body["status"] for _, body in results]
        success_count = statuses.count("success")
        duplicate_count = statuses.count("duplicate")

        assert success_count == 1
        assert duplicate_count == 9

        # 2. Extract sequence_id and capture_uuid across all 10 responses
        sequence_ids = {body["sequence_id"] for _, body in results}
        capture_uuids = {body["capture_uuid"] for _, body in results}
        capture_ids = {body["capture_id"] for _, body in results}

        assert len(sequence_ids) == 1, f"Expected 1 unique sequence_id, got {sequence_ids}"
        assert len(capture_uuids) == 1, f"Expected 1 unique capture_uuid, got {capture_uuids}"
        assert capture_ids == {capture_id}

        # 3. Verify SQLite state
        assert companion_store.get_buffer_size() == 1
        gallery = client.get("/api/v1/companion/gallery").json()
        assert gallery["total"] == 1
        assert gallery["items"][0]["capture_id"] == capture_id

    def test_concurrent_distinct_capture_ids_monotonicity(self):
        """
        Simulate 10 concurrent uploads with 10 DISTINCT capture_ids.
        Verification:
        - Exactly 10 stored records in database.
        - Sequence IDs 1 to 10 allocated monotonically without collisions or locks.
        - All 10 responses return status='success'.
        """
        num_requests = 10

        def send_distinct_upload(req_index: int):
            c_id = f"DISTINCT-CAP-{req_index:03d}"
            files = {"file": (f"photo_{req_index}.jpg", io.BytesIO(SAMPLE_JPEG_BYTES), "image/jpeg")}
            data = {
                "capture_type": "selfie",
                "device_id": f"field-unit-{req_index}",
                "checkpoint_id": "WB-JAI-01",
                "capture_id": c_id,
            }
            res = client.post("/api/v1/companion/upload", files=files, data=data)
            return res.status_code, res.json()

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(send_distinct_upload, i) for i in range(num_requests)]
            results = [f.result() for f in futures]

        assert all(code == 200 for code, _ in results)
        assert all(body["status"] == "success" for _, body in results)

        seq_ids = [body["sequence_id"] for _, body in results]
        assert len(set(seq_ids)) == 10
        assert set(seq_ids) == set(range(1, 11))
        assert companion_store.get_buffer_size() == 10

    def test_malformed_and_empty_payload_rejection(self):
        """Adversarial stress test on malformed payloads: 400 Bad Request expected with zero DB side-effects."""
        # 1. Empty file upload
        res1 = client.post(
            "/api/v1/companion/capture",
            files={"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")},
            data={"capture_id": "bad-empty"},
        )
        assert res1.status_code == 400

        # 2. Missing file and missing base64
        res2 = client.post(
            "/api/v1/companion/capture",
            data={"capture_type": "document"},
        )
        assert res2.status_code == 400

        # 3. Invalid base64 in JSON payload
        res3 = client.post(
            "/api/v1/companion/upload",
            json={"image_base64": "NOT_VALID_BASE64_$%^&*", "capture_id": "bad-b64"},
        )
        assert res3.status_code == 400

        # 4. JSON body is a list instead of object
        res4 = client.post(
            "/api/v1/companion/upload",
            json=["not", "an", "object"],
        )
        assert res4.status_code == 400

        # Verify no corrupt records were inserted
        assert companion_store.get_buffer_size() == 0


# =============================================================================
# PART 3: PAIRING QR RUNTIME STABILITY & CONTRACT VERIFICATION
# =============================================================================

class TestPairingQREndpointEmpirical:
    """Validates runtime token stability, protocol payload formatting, and fallback URLs."""

    def test_token_stability_across_repeated_calls(self):
        """
        Token must remain completely constant and stable across repeated invocations
        throughout the entire lifetime of the backend process.
        """
        tokens = set()
        for _ in range(50):
            res = client.get("/api/v1/companion/pairing-qr")
            assert res.status_code == 200
            data = res.json()
            tokens.add(data["pairing_token"])

        assert len(tokens) == 1, f"Pairing token mutated during process runtime: {tokens}"
        token = tokens.pop()
        assert token == PAIRING_TOKEN
        assert len(token) == 8

    def test_pairing_qr_payload_strict_protocol_format(self):
        """
        qr_payload must strictly adhere to SSBPAIR URI protocol specification:
        SSBPAIR://<host>:<port>/<token>
        """
        res = client.get("/api/v1/companion/pairing-qr")
        assert res.status_code == 200
        data = res.json()

        payload = data["qr_payload"]
        pattern = r"^SSBPAIR://([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}):(\d{1,5})/([0-9a-fA-F]{8})$"
        match = re.match(pattern, payload)
        assert match is not None, f"Payload '{payload}' does not match SSBPAIR format regex {pattern}"

        ip, port_str, token = match.groups()
        assert ip == data["current_lan_ip"]
        assert int(port_str) == data["port"]
        assert token == data["pairing_token"]

    def test_fallback_url_correctness(self):
        """Fallback URL must match standard HTTP gateway address: http://<ip>:<port>"""
        res = client.get("/api/v1/companion/pairing-qr")
        assert res.status_code == 200
        data = res.json()

        expected_url = f"http://{data['current_lan_ip']}:{data['port']}"
        assert data["fallback_url"] == expected_url

    def test_companion_info_endpoint(self):
        """GET /api/v1/companion/info returns primary IP, local IP list, and active device count."""
        res = client.get("/api/v1/companion/info")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "primary_ip" in data
        assert "local_ips" in data
        assert isinstance(data["local_ips"], list)
        assert "active_devices_count" in data
