import re

# 1. LATENCY ARITHMETIC VERIFICATION
print("=== 1. LATENCY BUDGET ARITHMETIC VERIFICATION ===")
# Table from 04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md
# Stage 1: Pre-Processing
# Laplacian: 1.8 ms P50, 3.2 ms P95
# HSV Glare: 2.4 ms P50, 3.6 ms P95
# Perspective Rectify: 12.0 ms P50, 16.5 ms P95
stage1_p50 = 1.8 + 2.4 + 12.0
stage1_p95 = 3.2 + 3.6 + 16.5
print(f"Stage 1 (Sequential Pre-processing): P50 = {stage1_p50:.1f} ms, P95 = {stage1_p95:.1f} ms")

# Stage 2: Stream A (Text & OCR & Tampering)
# PP-OCR Det: 18.5 ms P50, 24.0 ms P95
# PP-OCR SVTR: 42.0 ms P50, 55.0 ms P95
# ICAO 9303: 1.8 ms P50, 2.5 ms P95
# TruFor: 82.0 ms P50, 98.0 ms P95
# DocTamper: 45.0 ms P50, 58.0 ms P95
# Adaptive Otsu: 3.5 ms P50, 5.5 ms P95
stream_a_p50 = 18.5 + 42.0 + 1.8 + 82.0 + 45.0 + 3.5
stream_a_p95 = 24.0 + 55.0 + 2.5 + 98.0 + 58.0 + 5.5
print(f"Stream A (Text & Tampering): P50 = {stream_a_p50:.1f} ms, P95 = {stream_a_p95:.1f} ms")

# Stage 3: Stream C (Security Code / PKI)
# zxing-cpp: 12.0 ms P50, 18.0 ms P95
# RSA-2048: 5.5 ms P50, 8.0 ms P95
# JPEG extract: 3.5 ms P50, 5.0 ms P95
stream_c_p50 = 12.0 + 5.5 + 3.5
stream_c_p95 = 18.0 + 8.0 + 5.0
print(f"Stream C (Security & PKI): P50 = {stream_c_p50:.1f} ms, P95 = {stream_c_p95:.1f} ms")

# Stage 4: Stream B (Biometrics)
# SCRFD-10GF: 7.8 ms P50, 11.2 ms P95
# MiniFASNetV2: 5.2 ms P50, 7.5 ms P95
# AdaFace ID: 3.2 ms P50, 4.8 ms P95
# AdaFace Live: 3.2 ms P50, 4.8 ms P95
stream_b_p50 = 7.8 + 5.2 + 3.2 + 3.2
stream_b_p95 = 11.2 + 7.5 + 4.8 + 4.8
print(f"Stream B (Biometrics): P50 = {stream_b_p50:.1f} ms, P95 = {stream_b_p95:.1f} ms")

# Stage 6: Post-Process
# Discrepancy Matrix: 4.5 ms P50, 7.0 ms P95
# SQLite Audit: 8.0 ms P50, 14.0 ms P95
stage6_p50 = 4.5 + 8.0
stage6_p95 = 7.0 + 14.0
print(f"Stage 6 (Sequential Post-process): P50 = {stage6_p50:.1f} ms, P95 = {stage6_p95:.1f} ms")

total_seq_p50 = stage1_p50 + stream_a_p50 + stream_c_p50 + stream_b_p50 + stage6_p50
total_seq_p95 = stage1_p95 + stream_a_p95 + stream_c_p95 + stream_b_p95 + stage6_p95
print(f"Calculated Total Sequential: P50 = {total_seq_p50:.1f} ms, P95 = {total_seq_p95:.1f} ms")

parallel_core_p50 = max(stream_a_p50, stream_b_p50, stream_c_p50)
parallel_core_p95 = max(stream_a_p95, stream_b_p95, stream_c_p95)
total_par_p50 = stage1_p50 + parallel_core_p50 + stage6_p50
total_par_p95 = stage1_p95 + parallel_core_p95 + stage6_p95
print(f"Calculated Total Parallel: P50 = {total_par_p50:.1f} ms, P95 = {total_par_p95:.1f} ms")

# Memory profiling sum
# PPOCR (120+180=300), AdaFace (278), SCRFD (150), MiniFASNet (80), TruFor (650), DocTamper (450)
vram_models_mb = 120 + 180 + 278 + 150 + 80 + 650 + 450
print(f"Total Model VRAM: {vram_models_mb} MB ({vram_models_mb/1024:.2f} GB)")

# 2. PITCH SCRIPT WORD COUNT & CADENCE VERIFICATION
print("\n=== 2. PITCH SCRIPT WORD COUNT & CADENCE VERIFICATION ===")
with open('sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md', 'r') as f:
    pitch_text = f.read()

# Extract spoken dialogue (lines starting with >)
dialogue_lines = [line[1:].strip() for line in pitch_text.splitlines() if line.startswith('>')]
full_dialogue = ' '.join(dialogue_lines)
# Remove markdown bold/italics
clean_dialogue = re.sub(r'[*_#]', '', full_dialogue)
words = clean_dialogue.split()
total_words = len(words)
wpm_8min = total_words / 8.0

print(f"Total Spoken Dialogue Words: {total_words}")
print(f"Effective Speaking Rate (over 8 mins): {wpm_8min:.1f} words/minute")
print(f"Standard Professional Pitch Cadence: 130 - 150 WPM")
if 100 <= wpm_8min <= 160:
    print("[PASS] Speech cadence is well-paced and realistic for an 8-minute presentation!")
else:
    print("[WARN] Speech cadence outside standard range.")

# 3. 12-WEEK SPRINT PLAN ROLES & WEEKS VERIFICATION
print("\n=== 3. 12-WEEK SPRINT PLAN & ROLES VERIFICATION ===")
with open('sih26188_wave2/docs/04_SIH_GRAND_FINALE_MVP_BLUEPRINT.md', 'r') as f:
    bp_text = f.read()

roles_found = re.findall(r'ROLE \d: (.*?)]', bp_text)
print(f"Roles Defined ({len(roles_found)}):")
for r in roles_found:
    print(f"  - {r}")

weeks_found = re.findall(r'W\d+-\d+|Week \d+|WEEKS \d+–\d+', bp_text)
print(f"Sprint Milestones referenced: {set(weeks_found)}")
