"""
SIH26188 — Unit & Property Test Suite for ICAO Doc 9303 MRZ Engine
Architecture Reference: Section 2.5, 6.3

Comprehensive tests for:
- Pure Python ICAO Doc 9303 Modulo-10 (7-3-1) mathematical checksum calculation
- TD1 (3x30), TD2 (2x36), TD3 (2x44) travel document parsing and check digit verification
- Detection and error reporting for single-character alterations and corrupted check digits
- Edge cases: filler '<' handling, single-string parsing, malformed inputs
"""

import pytest
from app.modules.mrz.mrz_engine import (
    calculate_mrz_check_digit,
    clean_mrz_field,
    icao_char_value,
    mrz_engine,
    parse_mrz_names,
    verify_check_digit,
)
from app.schemas.mrz import MRZResult


class TestMRZMathematicalChecksum:
    """Tests the pure-mathematical ICAO Doc 9303 7-3-1 Modulo-10 calculation."""

    def test_icao_char_mapping(self):
        """Verifies character value mapping: 0-9 -> 0-9, A-Z -> 10-35, '<' -> 0."""
        assert icao_char_value('0') == 0
        assert icao_char_value('9') == 9
        assert icao_char_value('A') == 10
        assert icao_char_value('B') == 11
        assert icao_char_value('Z') == 35
        assert icao_char_value('a') == 10  # lowercase tolerance
        assert icao_char_value('z') == 35
        assert icao_char_value('<') == 0
        assert icao_char_value('') == 0

    def test_known_checksum_values(self):
        """Tests standard ICAO Doc 9303 test vectors for check digit generation."""
        # '520727' -> (5*7 + 2*3 + 0*1 + 7*7 + 2*3 + 7*1) = 35 + 6 + 0 + 49 + 6 + 7 = 103 -> 3
        assert calculate_mrz_check_digit("520727") == "3"

        # 'L898902C3' -> (21*7 + 8*3 + 9*1 + 8*7 + 9*3 + 0*1 + 2*7 + 12*3 + 3*1)
        # = 147 + 24 + 9 + 56 + 27 + 0 + 14 + 36 + 3 = 316 -> 6
        assert calculate_mrz_check_digit("L898902C3") == "6"

        # '740812' -> (7*7 + 4*3 + 0*1 + 8*7 + 1*3 + 2*1) = 49 + 12 + 0 + 56 + 3 + 2 = 122 -> 2
        assert calculate_mrz_check_digit("740812") == "2"

        # '120415' -> (1*7 + 2*3 + 0*1 + 4*7 + 1*3 + 5*1) = 7 + 6 + 0 + 28 + 3 + 5 = 49 -> 9
        assert calculate_mrz_check_digit("120415") == "9"

        # All '<' fillers produce 0
        assert calculate_mrz_check_digit("<<<<<<<<<<") == "0"

    def test_verify_check_digit(self):
        """Verifies check digit comparison with filler tolerance."""
        assert verify_check_digit("520727", "3") is True
        assert verify_check_digit("520727", "4") is False
        assert verify_check_digit("<<<<<<<<", "<") is True  # Filler tolerance
        assert verify_check_digit("<<<<<<<<", "0") is True


class TestTD3PassportMRZ:
    """Tests TD3 (2 lines x 44 characters) Standard Passport MRZ format."""

    @pytest.fixture
    def valid_td3_lines(self):
        return [
            "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
            "L898902C36UTO7408122F1204159ZE144226<<<<<<22",
        ]

    def test_valid_td3_parsing(self, valid_td3_lines):
        result = mrz_engine.parse_mrz_lines(valid_td3_lines)
        assert result.mrz_detected is True
        assert result.mrz_type == "TD3"
        assert result.valid is True
        assert result.document_type == "P"
        assert result.country_code == "UTO"
        assert result.surname == "ERIKSSON"
        assert result.given_names == "ANNA MARIA"
        assert result.document_number == "L898902C3"
        assert result.doc_number_checksum_valid is True
        assert result.nationality == "UTO"
        assert result.dob == "740812"
        assert result.dob_checksum_valid is True
        assert result.sex == "F"
        assert result.expiry == "120415"
        assert result.expiry_checksum_valid is True
        assert result.composite_checksum_valid is True
        assert len(result.checksum_failures) == 0

    def test_td3_corrupted_doc_number_cd(self, valid_td3_lines):
        # Corrupt CD1 from '6' to '5'
        corrupted_lines = [
            valid_td3_lines[0],
            "L898902C35UTO7408122F1204159ZE144226<<<<<<22",
        ]
        result = mrz_engine.parse_mrz_lines(corrupted_lines)
        assert result.valid is False
        assert result.doc_number_checksum_valid is False
        assert any("CD1" in f for f in result.checksum_failures)

    def test_td3_corrupted_dob_cd(self, valid_td3_lines):
        # Corrupt CD2 from '2' to '9'
        corrupted_lines = [
            valid_td3_lines[0],
            "L898902C36UTO7408129F1204159ZE144226<<<<<<22",
        ]
        result = mrz_engine.parse_mrz_lines(corrupted_lines)
        assert result.valid is False
        assert result.dob_checksum_valid is False
        assert any("CD2" in f for f in result.checksum_failures)

    def test_td3_corrupted_expiry_cd(self, valid_td3_lines):
        # Corrupt CD3 from '9' to '0'
        corrupted_lines = [
            valid_td3_lines[0],
            "L898902C36UTO7408122F1204150ZE144226<<<<<<22",
        ]
        result = mrz_engine.parse_mrz_lines(corrupted_lines)
        assert result.valid is False
        assert result.expiry_checksum_valid is False
        assert any("CD3" in f for f in result.checksum_failures)

    def test_td3_corrupted_composite_cd(self, valid_td3_lines):
        # Corrupt composite CD from '2' to '7'
        corrupted_lines = [
            valid_td3_lines[0],
            "L898902C36UTO7408122F1204159ZE144226<<<<<<27",
        ]
        result = mrz_engine.parse_mrz_lines(corrupted_lines)
        assert result.valid is False
        assert result.composite_checksum_valid is False
        assert any("Composite" in f for f in result.checksum_failures)

    def test_td3_joined_single_string(self, valid_td3_lines):
        joined = "".join(valid_td3_lines)
        assert len(joined) == 88
        result = mrz_engine.parse_mrz_lines([joined])
        assert result.mrz_type == "TD3"
        assert result.valid is True
        assert result.document_number == "L898902C3"


class TestTD1IdentityCardMRZ:
    """Tests TD1 (3 lines x 30 characters) Identity Card format."""

    @pytest.fixture
    def valid_td1_lines(self):
        doc_no = "D23145890"
        cd1 = calculate_mrz_check_digit(doc_no)  # 7
        opt1 = "<<<<<<<<<<<<<<<"
        l1 = f"I<UTOD23145890{cd1}{opt1}"

        dob = "740812"
        cd2 = calculate_mrz_check_digit(dob)  # 2
        sex = "F"
        exp = "120415"
        cd3 = calculate_mrz_check_digit(exp)  # 9
        nat = "UTO"
        opt2 = "<<<<<<<<<<<"

        comp_str = l1[5:30] + dob + cd2 + exp + cd3 + opt2
        comp_cd = calculate_mrz_check_digit(comp_str)  # 6
        l2 = f"{dob}{cd2}{sex}{exp}{cd3}{nat}{opt2}{comp_cd}"
        l3 = "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"

        return [l1, l2, l3]

    def test_valid_td1_parsing(self, valid_td1_lines):
        result = mrz_engine.parse_mrz_lines(valid_td1_lines)
        assert result.mrz_detected is True
        assert result.mrz_type == "TD1"
        assert result.valid is True
        assert result.document_number == "D23145890"
        assert result.surname == "ERIKSSON"
        assert result.given_names == "ANNA MARIA"
        assert result.dob == "740812"
        assert result.expiry == "120415"
        assert result.doc_number_checksum_valid is True
        assert result.dob_checksum_valid is True
        assert result.expiry_checksum_valid is True
        assert result.composite_checksum_valid is True

    def test_td1_corrupted_doc_number(self, valid_td1_lines):
        # Alter doc number digit 'D23145890' -> 'D23145891'
        corrupted_lines = [
            f"I<UTOD23145891{valid_td1_lines[0][14:]}",
            valid_td1_lines[1],
            valid_td1_lines[2],
        ]
        result = mrz_engine.parse_mrz_lines(corrupted_lines)
        assert result.valid is False
        assert result.doc_number_checksum_valid is False


class TestTD2TravelDocumentMRZ:
    """Tests TD2 (2 lines x 36 characters) format."""

    @pytest.fixture
    def valid_td2_lines(self):
        l1 = "I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<"
        doc_no = "D23145890"
        cd1 = calculate_mrz_check_digit(doc_no)
        nat = "UTO"
        dob = "740812"
        cd2 = calculate_mrz_check_digit(dob)
        sex = "F"
        exp = "120415"
        cd3 = calculate_mrz_check_digit(exp)
        opt = "<<<<<<<"

        comp_str = doc_no + cd1 + dob + cd2 + exp + cd3 + opt
        comp_cd = calculate_mrz_check_digit(comp_str)
        l2 = f"{doc_no}{cd1}{nat}{dob}{cd2}{sex}{exp}{cd3}{opt}{comp_cd}"

        return [l1, l2]

    def test_valid_td2_parsing(self, valid_td2_lines):
        result = mrz_engine.parse_mrz_lines(valid_td2_lines)
        assert result.mrz_detected is True
        assert result.mrz_type == "TD2"
        assert result.valid is True
        assert result.document_number == "D23145890"
        assert result.surname == "ERIKSSON"
        assert result.given_names == "ANNA MARIA"
        assert result.doc_number_checksum_valid is True
        assert result.dob_checksum_valid is True
        assert result.expiry_checksum_valid is True
        assert result.composite_checksum_valid is True


class TestMRZEdgeCases:
    """Tests edge cases, empty lines, and malformed inputs."""

    def test_empty_lines(self):
        result = mrz_engine.parse_mrz_lines([])
        assert result.mrz_detected is False
        assert result.valid is False

    def test_malformed_line_count(self):
        result = mrz_engine.parse_mrz_lines(["JUST_ONE_LINE"])
        assert result.valid is False

    def test_name_cleaner(self):
        surname, given = parse_mrz_names("KUMAR<<RAMESH<PRASAD<<<<<<<<<<")
        assert surname == "KUMAR"
        assert given == "RAMESH PRASAD"
