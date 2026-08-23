#!/usr/bin/env python3
"""
SIH26188 — Document Forensics Test Runner (Pillow + NumPy only)
================================================================
Runs classical forensic checks on a single document image:
  1. ELA  – Error Level Analysis  (detects re-saved/edited regions)
  2. Noise Map – High-frequency residual noise (inconsistency = tampering)
  3. Photo-Region Crop  – Isolates portrait area for inspection
  4. Edge Anomaly Map   – Detects unnatural sharp boundaries (splicing)
  5. Brightness / Saturation Consistency

Usage:
  .venv/bin/python run_test.py <image_path>
  .venv/bin/python run_test.py /path/to/aadhaar.jpg
"""

import sys
import os
import math
import time
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_font(size=14):
    for p in ["/System/Library/Fonts/Helvetica.ttc",
              "/System/Library/Fonts/Arial.ttf",
              "/Library/Fonts/Arial.ttf"]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def pil_to_arr(img: Image.Image) -> np.ndarray:
    return np.array(img.convert("RGB"), dtype=np.float32)


def arr_to_pil(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


# ─────────────────────────────────────────────────────────────────────────────
# 1. ELA — Error Level Analysis
# ─────────────────────────────────────────────────────────────────────────────

def ela(img: Image.Image, quality: int = 75, amplify: int = 15) -> tuple[Image.Image, float]:
    """
    Save image at low JPEG quality, then amplify the difference.
    Tampered regions (re-saved / pasted) show higher error levels.
    Returns (ela_image, mean_ela_score).
    """
    buf = BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    recompressed = Image.open(buf).convert("RGB")

    orig_arr = pil_to_arr(img)
    recomp_arr = pil_to_arr(recompressed)

    diff = np.abs(orig_arr - recomp_arr) * amplify
    diff = np.clip(diff, 0, 255).astype(np.uint8)

    ela_img = Image.fromarray(diff)
    # Amplify contrast for visibility
    ela_img = ImageEnhance.Contrast(ela_img).enhance(3.0)

    score = float(np.mean(diff))
    return ela_img, score


# ─────────────────────────────────────────────────────────────────────────────
# 2. Noise Map — High-frequency residual
# ─────────────────────────────────────────────────────────────────────────────

def noise_map(img: Image.Image) -> tuple[Image.Image, float]:
    """
    Extract high-frequency noise residual by subtracting a smoothed version.
    Inconsistent noise patterns across regions = possible splicing.
    """
    gray = img.convert("L")
    smoothed = gray.filter(ImageFilter.GaussianBlur(radius=2))

    g_arr = np.array(gray, dtype=np.float32)
    s_arr = np.array(smoothed, dtype=np.float32)

    residual = np.abs(g_arr - s_arr)

    # Normalize to 0-255
    r_max = residual.max()
    if r_max > 0:
        residual_vis = (residual / r_max * 255).astype(np.uint8)
    else:
        residual_vis = residual.astype(np.uint8)

    noise_img = Image.fromarray(residual_vis).convert("RGB")
    noise_img = ImageEnhance.Contrast(noise_img).enhance(4.0)

    score = float(np.std(residual))
    return noise_img, score


# ─────────────────────────────────────────────────────────────────────────────
# 3. Edge Anomaly Map
# ─────────────────────────────────────────────────────────────────────────────

def edge_map(img: Image.Image) -> tuple[Image.Image, float]:
    """
    Sobel-like edge detection using Pillow FIND_EDGES.
    Artificial boundaries around spliced regions show as bright rings.
    """
    gray = img.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edges_arr = np.array(edges, dtype=np.float32)

    score = float(np.mean(edges_arr))
    edge_vis = ImageEnhance.Contrast(edges.convert("RGB")).enhance(3.0)
    return edge_vis, score


# ─────────────────────────────────────────────────────────────────────────────
# 4. Brightness & Saturation Region Consistency
# ─────────────────────────────────────────────────────────────────────────────

def region_consistency(img: Image.Image, grid: int = 4) -> tuple[float, float, list]:
    """
    Divide image into a grid, compute brightness + saturation per block.
    High variance across blocks = suspicious inconsistency.
    Returns (brightness_std, saturation_std, block_scores).
    """
    w, h = img.size
    bw, bh = w // grid, h // grid
    hsv_blocks = []

    img_rgb = img.convert("RGB")
    arr = np.array(img_rgb, dtype=np.float32) / 255.0

    for row in range(grid):
        for col in range(grid):
            y0, y1 = row * bh, (row + 1) * bh
            x0, x1 = col * bw, (col + 1) * bw
            block = arr[y0:y1, x0:x1]

            r, g, b = block[:, :, 0], block[:, :, 1], block[:, :, 2]
            brightness = 0.299 * r + 0.587 * g + 0.114 * b
            cmax = np.maximum(np.maximum(r, g), b)
            cmin = np.minimum(np.minimum(r, g), b)
            saturation = np.where(cmax > 0, (cmax - cmin) / (cmax + 1e-8), 0)

            hsv_blocks.append({
                "row": row, "col": col,
                "brightness": float(np.mean(brightness)),
                "saturation": float(np.mean(saturation)),
            })

    brightnesses = [b["brightness"] for b in hsv_blocks]
    saturations  = [b["saturation"] for b in hsv_blocks]
    return float(np.std(brightnesses)), float(np.std(saturations)), hsv_blocks


# ─────────────────────────────────────────────────────────────────────────────
# 5. JPEG Ghost (double compression) detection
# ─────────────────────────────────────────────────────────────────────────────

def jpeg_ghost(img: Image.Image, quality: int = 60) -> tuple[Image.Image, float]:
    """
    Re-compress at a different quality and look for 'ghost' artifacts.
    Regions with different original compression quality stand out.
    """
    buf = BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    ghost = Image.open(buf).convert("RGB")

    orig = pil_to_arr(img)
    g    = pil_to_arr(ghost)
    diff = np.abs(orig - g)

    # Normalize per-channel
    ghost_map = np.mean(diff, axis=2)
    gmax = ghost_map.max()
    if gmax > 0:
        ghost_vis = (ghost_map / gmax * 255).astype(np.uint8)
    else:
        ghost_vis = ghost_map.astype(np.uint8)

    ghost_img = ImageEnhance.Contrast(
        Image.fromarray(ghost_vis).convert("RGB")
    ).enhance(3.0)

    score = float(np.mean(ghost_map))
    return ghost_img, score


# ─────────────────────────────────────────────────────────────────────────────
# Risk scoring
# ─────────────────────────────────────────────────────────────────────────────

def compute_risk(ela_score, noise_score, edge_score, brightness_std, saturation_std, ghost_score):
    """
    Heuristic risk scoring (0–100).
    Tuned for typical Aadhaar / passport documents.
    """
    score = 0.0

    # ELA: high ELA mean → tampered regions (threshold ~8 is suspicious)
    if ela_score > 20:
        score += 35
    elif ela_score > 12:
        score += 20
    elif ela_score > 7:
        score += 10

    # Noise std: inconsistent noise → splicing (threshold ~6)
    if noise_score > 12:
        score += 25
    elif noise_score > 8:
        score += 15
    elif noise_score > 5:
        score += 8

    # Brightness std across regions (threshold ~0.12)
    if brightness_std > 0.20:
        score += 20
    elif brightness_std > 0.12:
        score += 10

    # Saturation std across regions
    if saturation_std > 0.15:
        score += 15
    elif saturation_std > 0.08:
        score += 8

    # Ghost score
    if ghost_score > 20:
        score += 5

    return min(100.0, round(score, 1))


def risk_label(score):
    if score >= 60:
        return "HIGH RISK — LIKELY TAMPERED", (220, 30, 30)
    elif score >= 35:
        return "MEDIUM RISK — SUSPICIOUS", (210, 130, 0)
    else:
        return "LOW RISK — LIKELY GENUINE", (30, 160, 70)


# ─────────────────────────────────────────────────────────────────────────────
# Report builder
# ─────────────────────────────────────────────────────────────────────────────

def build_report(
    original: Image.Image,
    ela_img: Image.Image,
    noise_img: Image.Image,
    edge_img: Image.Image,
    ghost_img: Image.Image,
    ela_score: float,
    noise_score: float,
    edge_score: float,
    ghost_score: float,
    brightness_std: float,
    saturation_std: float,
    risk_score: float,
    image_path: str,
) -> Image.Image:

    label_text, label_color = risk_label(risk_score)

    THUMB_W, THUMB_H = 460, 300
    PAD = 20
    HEADER_H = 110
    ROW1_H = THUMB_H
    METRICS_H = 220
    FOOTER_H = 40

    cols = 5  # original + 4 forensic maps
    canvas_w = cols * THUMB_W + (cols + 1) * PAD
    canvas_h = HEADER_H + PAD + ROW1_H + PAD + METRICS_H + FOOTER_H

    canvas = Image.new("RGB", (canvas_w, canvas_h), (14, 14, 22))
    draw   = ImageDraw.Draw(canvas)

    # ── Header ──────────────────────────────────────────────────────────────
    draw.rectangle([0, 0, canvas_w, HEADER_H], fill=(20, 20, 35))

    draw.text((PAD, 12), "SIH26188 — AI Document Forensics Test",
              font=get_font(26), fill=(255, 220, 60))
    draw.text((PAD, 46), f"File: {os.path.basename(image_path)}",
              font=get_font(15), fill=(160, 180, 210))
    draw.text((PAD, 68), f"Resolution: {original.width} × {original.height} px   |   "
                         f"Mode: {original.mode}",
              font=get_font(14), fill=(140, 160, 190))

    # Risk badge
    badge_x = canvas_w - 520
    draw.rectangle([badge_x, 14, canvas_w - PAD, 96],
                   fill=label_color)
    draw.text((badge_x + 12, 18),
              f"RISK SCORE: {risk_score:.0f}/100",
              font=get_font(24), fill=(255, 255, 255))
    draw.text((badge_x + 12, 52),
              label_text,
              font=get_font(16), fill=(255, 255, 255))

    # ── Panel row ────────────────────────────────────────────────────────────
    panels = [
        ("Original Document",          original),
        ("ELA Map\n(re-save artifacts)", ela_img),
        ("Noise Residual\n(splicing traces)", noise_img),
        ("Edge Anomalies\n(boundary detection)", edge_img),
        ("JPEG Ghost\n(double-compression)", ghost_img),
    ]

    for i, (title, panel_img) in enumerate(panels):
        x = PAD + i * (THUMB_W + PAD)
        y = HEADER_H + PAD

        thumb = panel_img.resize((THUMB_W, THUMB_H), Image.LANCZOS)
        canvas.paste(thumb, (x, y))

        border_col = (80, 80, 120) if i == 0 else (60, 100, 160)
        draw.rectangle([x, y, x + THUMB_W - 1, y + THUMB_H - 1],
                       outline=border_col, width=2)

        label_y = y + THUMB_H + 6
        for li, line in enumerate(title.split("\n")):
            col = (200, 210, 230) if li == 0 else (120, 140, 170)
            draw.text((x + 4, label_y + li * 18), line, font=get_font(14), fill=col)

    # ── Metrics section ───────────────────────────────────────────────────────
    my = HEADER_H + PAD + ROW1_H + PAD + 40
    draw.text((PAD, my - 30), "── Forensic Metrics ──────────────────────────",
              font=get_font(14), fill=(80, 100, 140))

    metrics = [
        ("ELA Mean Score",        ela_score,       8.0,   "Higher = more re-saved pixels (editing traces)"),
        ("Noise Std Deviation",   noise_score,     6.0,   "Higher = inconsistent sensor noise (splicing)"),
        ("Edge Energy Mean",      edge_score,      10.0,  "Unusually sharp edges = artificial boundary"),
        ("Brightness Std (grid)", brightness_std,  0.12,  "High variance across regions = illumination mismatch"),
        ("Saturation Std (grid)", saturation_std,  0.08,  "High variance = color profile inconsistency"),
        ("JPEG Ghost Score",      ghost_score,     15.0,  "High = regions compressed at different quality"),
    ]

    bar_w = 300
    for idx, (name, val, threshold, desc) in enumerate(metrics):
        col_idx = idx % 3
        row_idx = idx // 3
        mx = PAD + col_idx * (canvas_w // 3)
        mmy = my + row_idx * 80

        # Label + value
        color = (220, 60, 60) if val > threshold else (60, 200, 100)
        flag  = "⚠" if val > threshold else "✓"
        draw.text((mx, mmy), f"{flag}  {name}: {val:.3f}",
                  font=get_font(15), fill=color)
        draw.text((mx, mmy + 20), f"   Threshold: {threshold}  |  {desc}",
                  font=get_font(11), fill=(110, 130, 160))

        # Mini bar
        bar_fill = min(1.0, val / (threshold * 3))
        draw.rectangle([mx, mmy + 38, mx + bar_w, mmy + 52],
                       fill=(40, 40, 60))
        fill_col = (200, 60, 60) if val > threshold else (60, 180, 80)
        draw.rectangle([mx, mmy + 38, mx + int(bar_w * bar_fill), mmy + 52],
                       fill=fill_col)

    # ── Footer ────────────────────────────────────────────────────────────────
    draw.rectangle([0, canvas_h - FOOTER_H, canvas_w, canvas_h],
                   fill=(10, 10, 18))
    draw.text((PAD, canvas_h - FOOTER_H + 12),
              "SIH26188 | Sashastra Seema Bal Border Screening System | "
              "Classical Forensics: ELA + Noise + Edge + JPEG Ghost | "
              "No GPU required",
              font=get_font(12), fill=(70, 90, 120))

    return canvas


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def run_test(image_path: str, out_dir: str = "data/test_results") -> str:
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    t0 = time.perf_counter()

    print(f"\n🔍 Loading: {image_path}")
    img = Image.open(image_path).convert("RGB")
    print(f"   Resolution : {img.width} × {img.height} px")

    print("   Running ELA ...", end=" ", flush=True)
    ela_img, ela_score = ela(img)
    print(f"score={ela_score:.2f}")

    print("   Running Noise Map ...", end=" ", flush=True)
    noise_img, noise_score = noise_map(img)
    print(f"std={noise_score:.2f}")

    print("   Running Edge Map ...", end=" ", flush=True)
    edge_img, edge_score = edge_map(img)
    print(f"mean={edge_score:.2f}")

    print("   Running JPEG Ghost ...", end=" ", flush=True)
    ghost_img, ghost_score = jpeg_ghost(img)
    print(f"score={ghost_score:.2f}")

    print("   Running Region Consistency ...", end=" ", flush=True)
    b_std, s_std, blocks = region_consistency(img)
    print(f"brightness_std={b_std:.3f}, saturation_std={s_std:.3f}")

    risk = compute_risk(ela_score, noise_score, edge_score, b_std, s_std, ghost_score)
    label, _ = risk_label(risk)

    elapsed = time.perf_counter() - t0

    print(f"\n{'='*60}")
    print(f"  RISK SCORE : {risk:.0f}/100")
    print(f"  VERDICT    : {label}")
    print(f"  Time       : {elapsed:.2f}s")
    print(f"{'='*60}\n")

    report = build_report(
        img, ela_img, noise_img, edge_img, ghost_img,
        ela_score, noise_score, edge_score, ghost_score,
        b_std, s_std, risk, image_path
    )

    stem = Path(image_path).stem
    out_path = os.path.join(out_dir, f"{stem}_forensics_report.png")
    report.save(out_path, format="PNG")
    print(f"✅ Report saved → {out_path}")
    return out_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: .venv/bin/python run_test.py <image_path>")
        sys.exit(1)
    run_test(sys.argv[1])
