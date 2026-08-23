"""
SIH26188 — Offline Aadhaar Secure QR & Barcode Decoder Engine
Architecture Reference: Section 2.5, 6.3 (CV-08)

Provides:
- High-speed QR/Barcode localization & extraction (zxing-cpp -> cv2.QRCodeDetector fallback)
- Offline Aadhaar Secure QR (v2) decompressive parsing
- Offline RSA-2048 PKCS#1 v1.5 SHA-256 digital signature validation against UIDAI Root Certificate
- ISO/IEC 15444-1 JP2000 / JPEG face photograph extraction
- Robust demographic dictionary normalization
"""

import base64
import gzip
import hashlib
import re
import struct
import time
import zlib
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.ocr import QRPayload

logger = get_logger("sih26188.qr_decoder")

# Predefined SHA-256 ASN.1 DigestInfo prefix for PKCS#1 v1.5
SHA256_DIGEST_INFO_PREFIX = bytes([
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01,
    0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20
])


def _extract_rsa_pubkey_from_der(der_bytes: bytes) -> Tuple[int, int]:
    """
    Extracts (modulus_n, exponent_e) from SubjectPublicKeyInfo in X.509 DER certificate.
    """
    rsa_oid = b'\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01'
    idx = der_bytes.find(rsa_oid)
    if idx == -1:
        raise ValueError("RSA OID (1.2.840.113549.1.1.1) not found in certificate")

    bit_str_idx = der_bytes.find(b'\x03', idx + len(rsa_oid))
    if bit_str_idx == -1:
        raise ValueError("BIT STRING header not found in SubjectPublicKeyInfo")

    pos = bit_str_idx + 1
    length = der_bytes[pos]
    pos += 1
    if length > 128:
        num_len_bytes = length - 128
        length = int.from_bytes(der_bytes[pos:pos+num_len_bytes], 'big')
        pos += num_len_bytes

    # Skip unused bits byte
    pos += 1

    # SEQUENCE { modulus INTEGER, exponent INTEGER }
    if der_bytes[pos] != 0x30:
        raise ValueError("Expected SEQUENCE tag inside BIT STRING")
    pos += 1
    seq_len = der_bytes[pos]
    pos += 1
    if seq_len > 128:
        num_len_bytes = seq_len - 128
        seq_len = int.from_bytes(der_bytes[pos:pos+num_len_bytes], 'big')
        pos += num_len_bytes

    # INTEGER modulus
    if der_bytes[pos] != 0x02:
        raise ValueError("Expected INTEGER tag for modulus")
    pos += 1
    mod_len = der_bytes[pos]
    pos += 1
    if mod_len > 128:
        num_len_bytes = mod_len - 128
        mod_len = int.from_bytes(der_bytes[pos:pos+num_len_bytes], 'big')
        pos += num_len_bytes
    n = int.from_bytes(der_bytes[pos:pos+mod_len], 'big')
    pos += mod_len

    # INTEGER exponent
    if der_bytes[pos] != 0x02:
        raise ValueError("Expected INTEGER tag for exponent")
    pos += 1
    exp_len = der_bytes[pos]
    pos += 1
    if exp_len > 128:
        num_len_bytes = exp_len - 128
        exp_len = int.from_bytes(der_bytes[pos:pos+num_len_bytes], 'big')
        pos += num_len_bytes
    e = int.from_bytes(der_bytes[pos:pos+exp_len], 'big')

    return n, e


class QRDecoder:
    """
    Offline QR and Barcode Decoder with native Aadhaar Secure QR parsing and RSA-2048 PKI validation.
    """

    def __init__(self, cert_path: Optional[Path] = None):
        self.cert_path = cert_path or settings.UIDAI_ROOT_CERT_PATH
        self.public_key_n: Optional[int] = None
        self.public_key_e: Optional[int] = None
        self._crypto_cert: Optional[Any] = None
        self._load_uidai_cert()

    def _load_uidai_cert(self) -> None:
        """Loads and parses the offline UIDAI X.509 Root Certificate."""
        if not self.cert_path or not self.cert_path.exists():
            logger.warning(f"UIDAI root certificate not found at {self.cert_path}. Offline PKI validation disabled.")
            return

        try:
            cert_content = self.cert_path.read_text(encoding="utf-8")
            # Try cryptography library if available
            try:
                from cryptography import x509
                self._crypto_cert = x509.load_pem_x509_certificate(cert_content.encode("utf-8"))
                logger.info("UIDAI Root Certificate loaded via cryptography library.")
            except ImportError:
                self._crypto_cert = None

            # Parse DER bytes for pure Python RSA validation
            pem_lines = [
                l.strip() for l in cert_content.splitlines()
                if l.strip() and not l.startswith("-----")
            ]
            der_bytes = base64.b64decode("".join(pem_lines))
            self.public_key_n, self.public_key_e = _extract_rsa_pubkey_from_der(der_bytes)
            logger.info(
                f"UIDAI RSA-2048 Public Key extracted: Modulus bits={self.public_key_n.bit_length()}, "
                f"Exponent={self.public_key_e}"
            )
        except Exception as e:
            logger.error(f"Failed to load UIDAI root certificate: {e}")
            self.public_key_n = None
            self.public_key_e = None

    def verify_pkcs1_v15_signature(self, signed_data: bytes, signature: bytes) -> bool:
        """
        Verifies PKCS#1 v1.5 SHA-256 digital signature over signed_data against the UIDAI public key.
        Uses pure Python modular exponentiation or cryptography library.
        """
        if len(signature) != 256:
            logger.warning(f"Invalid signature length: {len(signature)} bytes (expected 256 bytes for RSA-2048)")
            return False

        # Attempt verification via cryptography library if loaded
        if self._crypto_cert is not None:
            try:
                from cryptography.hazmat.primitives import hashes
                from cryptography.hazmat.primitives.asymmetric import padding

                pubkey = self._crypto_cert.public_key()
                pubkey.verify(signature, signed_data, padding.PKCS1v15(), hashes.SHA256())
                return True
            except Exception:
                return False

        # Pure Python RSA-2048 PKCS#1 v1.5 verification
        if self.public_key_n is None or self.public_key_e is None:
            logger.warning("UIDAI Public Key not initialized for PKI verification")
            return False

        try:
            sig_int = int.from_bytes(signature, byteorder="big")
            if sig_int >= self.public_key_n:
                return False

            # s^e mod n
            em_int = pow(sig_int, self.public_key_e, self.public_key_n)
            em_bytes = em_int.to_bytes(256, byteorder="big")

            # Build expected PKCS#1 v1.5 block for SHA-256
            digest = hashlib.sha256(signed_data).digest()
            t = SHA256_DIGEST_INFO_PREFIX + digest
            ps_len = 256 - len(t) - 3
            if ps_len < 8:
                return False
            expected_em = b'\x00\x01' + (b'\xff' * ps_len) + b'\x00' + t

            return em_bytes == expected_em
        except Exception as e:
            logger.warning(f"Error during pure Python signature verification: {e}")
            return False

    def decode_qr_image(self, image: Any) -> Optional[bytes]:
        """
        Detects and decodes raw QR code payload from image array or PIL image.
        Tries zxing-cpp, then cv2.QRCodeDetector.
        """
        # Try zxing-cpp
        try:
            import zxingcpp
            import numpy as np

            if hasattr(image, "convert"):  # PIL Image
                np_img = np.array(image.convert("RGB"))
            else:
                np_img = image

            results = zxingcpp.read_barcodes(np_img)
            if results:
                raw_bytes = results[0].bytes
                if raw_bytes:
                    return bytes(raw_bytes)
                if results[0].text:
                    return results[0].text.encode("utf-8")
        except Exception as e:
            logger.debug(f"zxing-cpp detection skipped or failed: {e}")

        # Fallback to OpenCV QRCodeDetector
        try:
            import cv2
            import numpy as np

            if hasattr(image, "convert"):
                np_img = np.array(image.convert("RGB"))
                cv_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)
            else:
                cv_img = image

            detector = cv2.QRCodeDetector()
            val, pts, _ = detector.detectAndDecode(cv_img)
            if val:
                return val.encode("utf-8")
        except Exception as e:
            logger.debug(f"OpenCV QRCodeDetector skipped or failed: {e}")

        return None

    def parse_aadhaar_secure_payload(self, raw_bytes: bytes) -> QRPayload:
        """
        Decompresses and parses Aadhaar Secure QR v2 binary payload, verifies RSA signature,
        and extracts structured demographics.
        """
        start_time = time.perf_counter()

        # Step 1: Decompress payload
        decompressed = None
        for decompress_func in [
            lambda b: gzip.decompress(b),
            lambda b: zlib.decompress(b),
            lambda b: zlib.decompress(b, -zlib.MAX_WBITS),
            lambda b: zlib.decompress(b, 16 + zlib.MAX_WBITS),
        ]:
            try:
                decompressed = decompress_func(raw_bytes)
                break
            except Exception:
                continue

        # If decompression did not succeed, check if payload is already uncompressed binary or big-integer string
        if decompressed is None:
            # Check if payload is big integer string
            try:
                text = raw_bytes.decode("utf-8", errors="ignore").strip()
                if text.isdigit() and len(text) > 100:
                    big_int = int(text)
                    byte_len = (big_int.bit_length() + 7) // 8
                    int_bytes = big_int.to_bytes(byte_len, byteorder="big")
                    for df in [lambda b: gzip.decompress(b), lambda b: zlib.decompress(b)]:
                        try:
                            decompressed = df(int_bytes)
                            break
                        except Exception:
                            continue
            except Exception:
                pass

        payload_bytes = decompressed if decompressed is not None else raw_bytes

        # Check for Aadhaar XML / Plain Text fallback
        if b"<PrintLetterBarcodeData" in payload_bytes or b"<QPDB" in payload_bytes:
            return self._parse_xml_barcode(payload_bytes)

        # Aadhaar Secure QR format: [Signed Data: 0 to N-256] + [RSA-2048 Signature: N-256 to N]
        if len(payload_bytes) >= 256:
            signed_data = payload_bytes[:-256]
            signature = payload_bytes[-256:]
            is_valid = self.verify_pkcs1_v15_signature(signed_data, signature)

            demographics, photo_found = self._extract_demographics_from_bytes(signed_data)

            return QRPayload(
                raw_qr_found=True,
                qr_type="AADHAAR_SECURE_V2",
                signature_valid=is_valid,
                signature_algorithm="SHA256withRSA",
                demographics=demographics,
                photo_jp2_extracted=photo_found,
                error_message=None if is_valid else "Offline RSA-2048 PKI Signature Verification Failed",
            )
        else:
            # Insufficient length for secure signed QR
            return QRPayload(
                raw_qr_found=True,
                qr_type="QR_GENERIC",
                signature_valid=False,
                demographics={"raw_content": payload_bytes.decode("utf-8", errors="replace")},
                photo_jp2_extracted=False,
                error_message="Payload too short for Aadhaar Secure QR format",
            )

    def _extract_demographics_from_bytes(self, data: bytes) -> Tuple[Dict[str, Any], bool]:
        """
        Extracts Aadhaar demographic text fields and detects embedded JP2/JPEG face photo.
        Fields are null-delimiter or 255-delimiter separated in Secure QR format.
        """
        demographics: Dict[str, Any] = {}
        photo_found = False

        # Look for image markers
        # JP2: \x00\x00\x00\x0c\x6a\x50\x20\x20 or \xff\x4f\xff\x51
        # JPEG: \xff\xd8\xff
        jp2_idx = data.find(b'\x00\x00\x00\x0c\x6a\x50\x20\x20')
        if jp2_idx == -1:
            jp2_idx = data.find(b'\xff\x4f\xff\x51')
        if jp2_idx == -1:
            jp2_idx = data.find(b'\xff\xd8\xff')

        text_part = data[:jp2_idx] if jp2_idx != -1 else data
        photo_found = (jp2_idx != -1)

        # Split text fields by 0x00 or 0xFF or 0x01
        delimiters = [b'\x00', b'\xff', b'\x01']
        best_fields = []
        for delim in delimiters:
            parts = [
                p.decode("utf-8", errors="ignore").strip()
                for p in text_part.split(delim)
                if p.strip()
            ]
            if len(parts) > len(best_fields):
                best_fields = parts

        # Standard Aadhaar field sequence:
        # [0]: Email/Mobile indicator
        # [1]: Reference ID
        # [2]: Full Name
        # [3]: DOB (DD-MM-YYYY or YYYY-MM-DD or YYYY)
        # [4]: Gender (M/F/T)
        # [5]: Care of
        # [6]: District
        # [7]: Landmark
        # [8]: Locality
        # [9]: Post Office
        # [10]: State
        # [11]: Pincode
        # [12]: Sub-district / VTC
        if len(best_fields) >= 4:
            # Map discovered tokens
            # Try to identify DOB via regex
            dob_val = None
            gender_val = None
            name_val = None
            ref_id_val = None

            for field in best_fields:
                if re.match(r'^\d{2}[-/]\d{2}[-/]\d{4}$', field) or re.match(r'^\d{4}[-/]\d{2}[-/]\d{2}$', field):
                    dob_val = field
                elif field in ["M", "F", "T", "Male", "Female", "Transgender", "MALE", "FEMALE"]:
                    gender_val = field[0].upper()
                elif re.match(r'^\d{4,16}$', field) and not ref_id_val:
                    ref_id_val = field
                elif re.match(r'^[A-Za-z\s\.\,\'-]{3,50}$', field) and not name_val:
                    name_val = field

            demographics["full_name"] = name_val or (best_fields[2] if len(best_fields) > 2 else "")
            demographics["dob"] = dob_val or (best_fields[3] if len(best_fields) > 3 else "")
            demographics["gender"] = gender_val or (best_fields[4] if len(best_fields) > 4 else "")
            demographics["reference_id"] = ref_id_val or (best_fields[1] if len(best_fields) > 1 else "")
            demographics["fields"] = best_fields
        else:
            demographics["raw_text"] = text_part.decode("utf-8", errors="replace")

        return demographics, photo_found

    def _parse_xml_barcode(self, xml_bytes: bytes) -> QRPayload:
        """Parses older XML-based Aadhaar QR code."""
        text = xml_bytes.decode("utf-8", errors="ignore")
        demographics: Dict[str, Any] = {}

        for attr, key in [
            ("name", "full_name"),
            ("dob", "dob"),
            ("gender", "gender"),
            ("uid", "masked_uid"),
            ("co", "care_of"),
            ("dist", "district"),
            ("state", "state"),
            ("pc", "pincode"),
            ("yob", "yob"),
        ]:
            match = re.search(rf'{attr}="([^"]+)"', text, re.IGNORECASE)
            if match:
                demographics[key] = match.group(1)

        return QRPayload(
            raw_qr_found=True,
            qr_type="AADHAAR_XML_LEGACY",
            signature_valid=False,  # Legacy XML does not have PKCS#1 v1.5 RSA signature
            signature_algorithm=None,
            demographics=demographics,
            photo_jp2_extracted=False,
            error_message="Legacy XML format without digital signature",
        )

    def decode(self, image_or_bytes: Union[Any, bytes, str]) -> QRPayload:
        """
        Master QR decoding method. Accepts image, raw bytes, or base64 string.
        """
        if isinstance(image_or_bytes, bytes):
            return self.parse_aadhaar_secure_payload(image_or_bytes)
        elif isinstance(image_or_bytes, str):
            # Check if base64 encoded
            try:
                decoded_bytes = base64.b64decode(image_or_bytes)
                return self.parse_aadhaar_secure_payload(decoded_bytes)
            except Exception:
                return self.parse_aadhaar_secure_payload(image_or_bytes.encode("utf-8"))
        else:
            # Document image array or PIL object
            raw_bytes = self.decode_qr_image(image_or_bytes)
            if raw_bytes:
                return self.parse_aadhaar_secure_payload(raw_bytes)
            return QRPayload(
                raw_qr_found=False,
                qr_type=None,
                signature_valid=False,
                demographics={},
                photo_jp2_extracted=False,
                error_message="No QR code detected in document image",
            )


# Global Singleton Instance
qr_decoder = QRDecoder()
