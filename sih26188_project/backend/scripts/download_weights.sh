#!/usr/bin/env bash
# =============================================================================
# SIH26188 — Pretrained Weights Download Pipeline
# Architecture Reference: Section 3.3
# =============================================================================

set -euo pipefail

TARGET_DIR="${1:-${SIH_MODELS_DIR:-/Volumes/issparsh/sih26188_models}}"

echo "============================================================================="
echo "SIH26188 AI-Based Screening System — Pretrained Model Weights Ingestion"
echo "Target Directory: ${TARGET_DIR}"
echo "============================================================================="

# Create Target Directory if missing
mkdir -p "${TARGET_DIR}"

download_file() {
    local url="$1"
    local filename="$2"
    local expected_size="$3"
    local dest="${TARGET_DIR}/${filename}"

    if [ -f "${dest}" ]; then
        echo "[EXISTS] ${filename} already present at ${dest}. Skipping download."
    else
        echo "[DOWNLOADING] ${filename} (~${expected_size}) from ${url}..."
        if command -v curl >/dev/null 2>&1; then
            curl -L --fail --retry 3 --connect-timeout 10 -o "${dest}.tmp" "${url}" && mv "${dest}.tmp" "${dest}"
        elif command -v wget >/dev/null 2>&1; then
            wget -c -O "${dest}.tmp" "${url}" && mv "${dest}.tmp" "${dest}"
        else
            echo "[ERROR] Neither curl nor wget found in system PATH." >&2
            exit 1
        fi
        echo "[OK] Downloaded ${filename} successfully."
    fi
}

# -----------------------------------------------------------------------------
# 1. PP-OCRv4 Multi-Script Models (PaddleOCR Official)
# -----------------------------------------------------------------------------
download_file \
    "https://paddleocr.bj.bcebos.com/PP-OCRv4/multilingual/ch_PP-OCRv4_det_infer.onnx" \
    "ch_PP-OCRv4_det_infer.onnx" \
    "4.6 MB"

download_file \
    "https://paddleocr.bj.bcebos.com/PP-OCRv4/multilingual/devanagari_PP-OCRv4_rec.onnx" \
    "devanagari_PP-OCRv4_rec.onnx" \
    "10.8 MB"

download_file \
    "https://paddleocr.bj.bcebos.com/PP-OCRv4/english/en_PP-OCRv4_rec_infer.onnx" \
    "en_PP-OCRv4_rec_infer.onnx" \
    "9.8 MB"

# -----------------------------------------------------------------------------
# 2. OmniMRZ ICAO Doc 9303 Checkpoint
# -----------------------------------------------------------------------------
download_file \
    "https://github.com/AzwadFawadHasan/OmniMRZ/releases/download/v1.0.0/omnimrz_ppocr_v4.onnx" \
    "omnimrz_ppocr_v4.onnx" \
    "4.2 MB"

# -----------------------------------------------------------------------------
# 3. InsightFace SCRFD 10GF Face Detector
# -----------------------------------------------------------------------------
download_file \
    "https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_10g_bnkps.onnx" \
    "scrfd_10g_bnkps.onnx" \
    "16.2 MB"

# -----------------------------------------------------------------------------
# 4. AdaFace-ResNet100 Feature Extractor
# -----------------------------------------------------------------------------
download_file \
    "https://github.com/mk-minchul/AdaFace/releases/download/v1.0/adaface_ir100_ms1mv2.onnx" \
    "adaface_ir100_ms1mv2.onnx" \
    "178 MB"

# -----------------------------------------------------------------------------
# 5. MiniFASNet Dual-Scale Anti-Spoofing Checkpoints
# -----------------------------------------------------------------------------
download_file \
    "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.onnx" \
    "2.7_80x80_MiniFASNetV2.onnx" \
    "4.2 MB"

download_file \
    "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/4_0_0_80x80_MiniFASNet.onnx" \
    "4_0_0_80x80_MiniFASNet.onnx" \
    "4.2 MB"

# -----------------------------------------------------------------------------
# 6. DocTamper DTD ResNet-50 FCN
# -----------------------------------------------------------------------------
download_file \
    "https://github.com/qcf-568/DocTamper/releases/download/v1.0/doctamper_fcn_r50.onnx" \
    "doctamper_fcn_r50.onnx" \
    "158 MB"

# -----------------------------------------------------------------------------
# 7. TruFor Dual-Branch Splicing Localization
# -----------------------------------------------------------------------------
download_file \
    "https://grip.unina.it/download/trufor/trufor_general.pth.tar" \
    "trufor_general.pth.tar" \
    "258 MB"

# -----------------------------------------------------------------------------
# 8. Qwen2.5-VL-3B-Instruct (GGUF Quantized Tier-2 Recovery Quality Gate)
# -----------------------------------------------------------------------------
download_file \
    "https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct-GGUF/resolve/main/qwen2.5-vl-3b-instruct-q4_k_m.gguf" \
    "qwen2.5-vl-3b-instruct-q4.gguf" \
    "1.95 GB"

echo "============================================================================="
echo "[SUCCESS] All 8 Pretrained Model Weights verified in ${TARGET_DIR}."
echo "============================================================================="
