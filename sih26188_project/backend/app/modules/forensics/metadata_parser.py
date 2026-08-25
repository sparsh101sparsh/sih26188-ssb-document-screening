"""
SIH26188 — EXIF & JPEG Quantization Table (DQT) Metadata Parser
Architecture Reference: Section 2.3

Performs binary inspection of JPEG/PNG metadata headers, APP1 EXIF tags, APP13 Photoshop blocks,
XMP editing history, and DQT quantization matrices to detect traces of digital manipulation tools
(Adobe Photoshop, GIMP, Canva, PicsArt, etc.) and timestamp discrepancies.
"""

import re
import struct
from typing import Any, Dict, List, Optional, Tuple

from app.core.logging import get_logger

logger = get_logger("sih26188.forensics.metadata")

# Known image editing and graphic design software signatures (case-insensitive)
EDITING_SOFTWARE_SIGNATURES = [
    "photoshop",
    "adobe",
    "gimp",
    "canva",
    "picsart",
    "snapseed",
    "pixelmator",
    "lightroom",
    "coreldraw",
    "paint.net",
    "affinity",
    "illustrator",
    "inkscape",
    "imagemagick",
    "photopea",
    "fotor",
    "pixlr",
    "befunky",
]

# Standard ISO/IEC 10918-1 JPEG Luminance Baseline Quantization Table
STANDARD_LUMINANCE_DQT = [
    16, 11, 10, 16, 24, 40, 51, 61,
    12, 12, 14, 19, 26, 58, 60, 55,
    14, 13, 16, 24, 40, 57, 69, 56,
    14, 17, 22, 29, 51, 87, 80, 62,
    18, 22, 37, 56, 68, 109, 103, 77,
    24, 35, 55, 64, 81, 104, 113, 92,
    49, 64, 78, 87, 103, 121, 120, 101,
    72, 92, 95, 98, 112, 100, 103, 99
]


class MetadataParser:
    """
    Binary parser for JPEG EXIF, XMP, IPTC/Photoshop APP13, DQT quantization tables,
    and PNG text metadata chunks.
    """

    def parse(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Parses all forensic metadata from image binary.

        Returns:
            Structured dictionary containing:
            - exif_suspicious (bool)
            - dqt_quantization_altered (bool)
            - software (Optional[str])
            - camera_make (Optional[str])
            - camera_model (Optional[str])
            - creation_date (Optional[str])
            - modification_date (Optional[str])
            - editing_traces (List[str])
            - anomalies (List[str])
            - quantization_tables (Dict[int, List[int]])
            - reasons (List[str])
        """
        if len(image_bytes) < 4:
            return self._empty_result(["Corrupted image payload (under 4 bytes)"])

        # Check format
        if image_bytes[:2] == b"\xff\xd8":
            return self._parse_jpeg(image_bytes)
        elif image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
            return self._parse_png(image_bytes)
        else:
            return self._parse_generic_or_fallback(image_bytes)

    def _empty_result(self, reasons: Optional[List[str]] = None) -> Dict[str, Any]:
        return {
            "exif_suspicious": False,
            "dqt_quantization_altered": False,
            "software": None,
            "camera_make": None,
            "camera_model": None,
            "creation_date": None,
            "modification_date": None,
            "editing_traces": [],
            "anomalies": [],
            "quantization_tables": {},
            "reasons": reasons or [],
        }

    def _parse_jpeg(self, data: bytes) -> Dict[str, Any]:
        offset = 2
        length_total = len(data)

        exif_tags: Dict[str, Any] = {}
        quantization_tables: Dict[int, List[int]] = {}
        editing_traces: List[str] = []
        anomalies: List[str] = []
        reasons: List[str] = []

        software_detected: Optional[str] = None
        has_photoshop_app13 = False
        has_xmp_history = False

        while offset < length_total:
            if offset + 2 > length_total or data[offset] != 0xFF:
                break
            marker = data[offset + 1]
            offset += 2

            # Standalone markers without payload length
            if marker in (0xD8, 0xD9, 0x00) or (0xD0 <= marker <= 0xD7):
                continue

            if offset + 2 > length_total:
                break
            seg_len = struct.unpack(">H", data[offset : offset + 2])[0]
            if seg_len < 2 or offset + seg_len > length_total:
                break

            seg_data = data[offset + 2 : offset + seg_len]
            offset += seg_len

            # APP1 (EXIF or XMP)
            if marker == 0xE1:
                if seg_data.startswith(b"Exif\x00\x00"):
                    parsed_exif = self._parse_tiff_exif(seg_data[6:])
                    exif_tags.update(parsed_exif)
                elif b"http://ns.adobe.com/xap/1.0/" in seg_data:
                    xmp_str = seg_data.decode("utf-8", errors="ignore")
                    if "photoshop" in xmp_str.lower() or "adobe" in xmp_str.lower():
                        editing_traces.append("XMP: Adobe Photoshop / Creative Cloud schema present")
                    if "xmpMM:History" in xmp_str or "stEvt:action=\"saved\"" in xmp_str:
                        has_xmp_history = True
                        editing_traces.append("XMP: Document modification history records detected")

            # APP13 (Photoshop 3.0 / IPTC / IRB)
            elif marker == 0xED:
                if b"Photoshop 3.0" in seg_data or b"8BIM" in seg_data:
                    has_photoshop_app13 = True
                    editing_traces.append("APP13: Adobe Photoshop 8BIM Image Resource Block marker found")

            # DQT (Define Quantization Table)
            elif marker == 0xDB:
                dqt_tables = self._parse_dqt_segment(seg_data)
                quantization_tables.update(dqt_tables)

            # COM (Comment)
            elif marker == 0xFE:
                comment_str = seg_data.decode("utf-8", errors="ignore")
                for sig in EDITING_SOFTWARE_SIGNATURES:
                    if sig in comment_str.lower():
                        editing_traces.append(f"JPEG Comment: '{comment_str}' matches known editing tool '{sig}'")
                        software_detected = comment_str

            # SOS (Start of Scan - begins entropy coded data)
            elif marker == 0xDA:
                break

        # Check software string from EXIF
        if "Software" in exif_tags:
            software_val = str(exif_tags["Software"]).strip()
            software_detected = software_val
            for sig in EDITING_SOFTWARE_SIGNATURES:
                if sig in software_val.lower():
                    editing_traces.append(f"EXIF Software Tag: '{software_val}' matches editor signature '{sig}'")

        # Timestamp comparison
        creation_date = exif_tags.get("DateTimeOriginal") or exif_tags.get("DateTimeDigitized")
        modification_date = exif_tags.get("DateTime")

        if creation_date and modification_date and str(creation_date) != str(modification_date):
            anomalies.append("TIMESTAMP_DISCREPANCY")
            reasons.append(
                f"EXIF anomaly: Creation timestamp ({creation_date}) differs from modification timestamp ({modification_date})"
            )

        # DQT Analysis
        dqt_altered = False
        if quantization_tables:
            # Check Table 0 (Luminance)
            t0 = quantization_tables.get(0)
            if t0:
                # Check for flat table [1, 1, ..., 1] (typical of lossless re-saving or synthetic export)
                if all(v == 1 for v in t0):
                    dqt_altered = True
                    anomalies.append("DQT_FLAT_QUANTIZATION")
                    editing_traces.append("DQT: All-1s lossless quantization table detected (synthetic re-export)")
                # Check for non-standard quantization matrix signature
                elif self._is_custom_dqt(t0):
                    dqt_altered = True
                    anomalies.append("DQT_CUSTOM_MATRIX")
                    editing_traces.append("DQT: Non-standard quantization matrix indicates software re-compression")

        # Determine overall suspicious status
        is_suspicious = bool(editing_traces or has_photoshop_app13 or has_xmp_history)

        if has_photoshop_app13:
            anomalies.append("APP13_PHOTOSHOP_IRB")
            reasons.append("ERR_EXIF_EDITED: Adobe Photoshop APP13 segment present in document container")

        if software_detected and any(s in software_detected.lower() for s in EDITING_SOFTWARE_SIGNATURES):
            anomalies.append("SUSPICIOUS_SOFTWARE_TAG")
            reasons.append(f"ERR_EXIF_EDITED: Editing software signature detected ({software_detected})")

        if is_suspicious and not reasons:
            reasons.append("ERR_EXIF_EDITED: Document metadata shows signs of post-processing or re-saving")
        elif not is_suspicious and not reasons:
            reasons.append("INF_METADATA_CLEAN: No suspicious editing software metadata traces detected")

        return {
            "exif_suspicious": is_suspicious,
            "dqt_quantization_altered": dqt_altered,
            "software": software_detected or exif_tags.get("Software"),
            "camera_make": exif_tags.get("Make"),
            "camera_model": exif_tags.get("Model"),
            "creation_date": str(creation_date) if creation_date else None,
            "modification_date": str(modification_date) if modification_date else None,
            "editing_traces": editing_traces,
            "anomalies": anomalies,
            "quantization_tables": quantization_tables,
            "reasons": reasons,
        }

    def _parse_png(self, data: bytes) -> Dict[str, Any]:
        """Parses PNG text chunks (tEXt, zTXt, iTXt) for editor signatures."""
        offset = 8
        length_total = len(data)
        editing_traces: List[str] = []
        anomalies: List[str] = []
        reasons: List[str] = []
        software_detected: Optional[str] = None

        while offset + 8 <= length_total:
            length = struct.unpack(">I", data[offset : offset + 4])[0]
            chunk_type = data[offset + 4 : offset + 8]
            chunk_data = data[offset + 8 : offset + 8 + length]
            offset += 12 + length

            if chunk_type in (b"tEXt", b"zTXt", b"iTXt"):
                text_str = chunk_data.decode("latin-1", errors="ignore")
                for sig in EDITING_SOFTWARE_SIGNATURES:
                    if sig in text_str.lower():
                        editing_traces.append(f"PNG text chunk '{chunk_type.decode()}': '{text_str[:80]}' contains '{sig}'")
                        if not software_detected:
                            software_detected = text_str[:50]

            elif chunk_type == b"IEND":
                break

        is_suspicious = bool(editing_traces)
        if is_suspicious:
            anomalies.append("SUSPICIOUS_SOFTWARE_TAG")
            reasons.append(f"ERR_EXIF_EDITED: PNG container contains editing signature ({software_detected})")
        else:
            reasons.append("INF_METADATA_CLEAN: Clean PNG container without editing signatures")

        return {
            "exif_suspicious": is_suspicious,
            "dqt_quantization_altered": False,
            "software": software_detected,
            "camera_make": None,
            "camera_model": None,
            "creation_date": None,
            "modification_date": None,
            "editing_traces": editing_traces,
            "anomalies": anomalies,
            "quantization_tables": {},
            "reasons": reasons,
        }

    def _parse_generic_or_fallback(self, data: bytes) -> Dict[str, Any]:
        """Raw byte string search fallback for embedded strings."""
        data_sample = data[:4096] + data[-2048:]
        editing_traces = []
        software_detected = None

        for sig in EDITING_SOFTWARE_SIGNATURES:
            if sig.encode("utf-8") in data_sample.lower():
                editing_traces.append(f"Raw binary contains editing marker '{sig}'")
                software_detected = sig.capitalize()

        is_suspicious = bool(editing_traces)
        reasons = [f"ERR_EXIF_EDITED: Software string detected: {software_detected}"] if is_suspicious else ["INF_METADATA_CLEAN: No editing markers found"]

        return {
            "exif_suspicious": is_suspicious,
            "dqt_quantization_altered": False,
            "software": software_detected,
            "camera_make": None,
            "camera_model": None,
            "creation_date": None,
            "modification_date": None,
            "editing_traces": editing_traces,
            "anomalies": ["SUSPICIOUS_SOFTWARE_TAG"] if is_suspicious else [],
            "quantization_tables": {},
            "reasons": reasons,
        }

    def _parse_tiff_exif(self, tiff_data: bytes) -> Dict[str, Any]:
        """Parses TIFF header and IFD entries inside JPEG APP1."""
        if len(tiff_data) < 8:
            return {}

        endian = "<" if tiff_data[:2] == b"II" else ">"
        magic = struct.unpack(f"{endian}H", tiff_data[2:4])[0]
        if magic != 42:
            return {}

        ifd0_offset = struct.unpack(f"{endian}I", tiff_data[4:8])[0]
        tags: Dict[str, Any] = {}

        TAG_NAMES = {
            0x010E: "ImageDescription",
            0x010F: "Make",
            0x0110: "Model",
            0x0131: "Software",
            0x0132: "DateTime",
            0x013B: "Artist",
            0x014C: "HostComputer",
            0x8769: "ExifIFDPointer",
            0x9003: "DateTimeOriginal",
            0x9004: "DateTimeDigitized",
            0x9286: "UserComment",
        }

        def _read_ifd(offset: int):
            if offset + 2 > len(tiff_data):
                return
            num_entries = struct.unpack(f"{endian}H", tiff_data[offset : offset + 2])[0]
            curr = offset + 2

            for _ in range(min(num_entries, 64)):
                if curr + 12 > len(tiff_data):
                    break
                tag_id, tag_type, count, val_or_offset = struct.unpack(
                    f"{endian}HHI I", tiff_data[curr : curr + 12]
                )
                curr += 12

                tag_name = TAG_NAMES.get(tag_id)
                if not tag_name:
                    continue

                if tag_name == "ExifIFDPointer":
                    _read_ifd(val_or_offset)
                    continue

                # Type 2: ASCII String
                if tag_type == 2:
                    if count <= 4:
                        # Value stored inline
                        raw_bytes = struct.pack(f"{endian}I", val_or_offset)[:count]
                    else:
                        # Stored at offset
                        if val_or_offset + count <= len(tiff_data):
                            raw_bytes = tiff_data[val_or_offset : val_or_offset + count]
                        else:
                            raw_bytes = b""
                    val_str = raw_bytes.split(b"\x00")[0].decode("utf-8", errors="ignore").strip()
                    tags[tag_name] = val_str

        try:
            _read_ifd(ifd0_offset)
        except Exception as e:
            logger.debug(f"Error parsing IFD entries: {e}")

        return tags

    def _parse_dqt_segment(self, seg_data: bytes) -> Dict[int, List[int]]:
        """Parses DQT segment containing 1 or more 64-byte quantization tables."""
        tables: Dict[int, List[int]] = {}
        idx = 0
        while idx < len(seg_data):
            info = seg_data[idx]
            precision = (info >> 4) & 0x0F  # 0 = 8-bit, 1 = 16-bit
            table_id = info & 0x0F
            idx += 1

            element_size = 2 if precision == 1 else 1
            table_len = 64 * element_size

            if idx + table_len > len(seg_data):
                break

            if element_size == 1:
                table = list(seg_data[idx : idx + 64])
            else:
                table = list(struct.unpack(f">{64}H", seg_data[idx : idx + 128]))

            tables[table_id] = table
            idx += table_len

        return tables

    def _is_custom_dqt(self, table: List[int]) -> bool:
        """Determines if a quantization table diverges significantly from standard JPEG scaling.

        Evaluates whether the quantization matrix conforms to:
          1. Standard IJG (Independent JPEG Group) quality curves (Q1..Q100).
          2. Standard smartphone camera ISP profiles (monotonic high-frequency dampening).

        A table is flagged as custom only if it exhibits unnatural non-monotonic frequency
        disruptions or cannot match any valid standard compression profile.
        """
        if len(table) != 64:
            return False

        # 1. Check if table matches any standard IJG quality curve (Q1..Q100)
        for q in range(1, 101):
            s = 5000 / q if q < 50 else 200 - q * 2
            scaled = [max(1, min(255, int((STANDARD_LUMINANCE_DQT[i] * s + 50) / 100))) for i in range(64)]
            diff = sum(abs(table[i] - scaled[i]) for i in range(64))
            if diff < 250:
                return False

        # 2. Check if table follows valid camera sensor ISP compression (low-freq < high-freq)
        low_freq_mean = sum(table[:8]) / 8.0
        high_freq_mean = sum(table[-8:]) / 8.0
        if low_freq_mean <= high_freq_mean and max(table) <= 255 and min(table) >= 1:
            # Check for excessive erratic jumps between adjacent zigzag entries
            jumps = sum(1 for i in range(63) if abs(table[i+1] - table[i]) > 100)
            if jumps <= 2:
                return False

        return True


# Global Singleton
metadata_parser = MetadataParser()
