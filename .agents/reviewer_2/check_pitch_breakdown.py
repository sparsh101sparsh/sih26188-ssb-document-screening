import re

with open('sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md', 'r') as f:
    text = f.read()

# Split text into sections
# The pitch script is in Section 3
section3_match = re.search(r'## 3\. Minute-by-Minute 8-Minute Winning Pitch Script(.*?)## 4\. The Top 3 Winning Demo Moments Detailed', text, re.DOTALL)
if section3_match:
    sec3_text = section3_match.group(1)
    # Extract dialogue lines
    d_lines = [l[1:].strip() for l in sec3_text.splitlines() if l.startswith('>')]
    full_d = ' '.join(d_lines)
    clean_d = re.sub(r'[*_#]', '', full_d)
    words = clean_d.split()
    total_w = len(words)
    print(f"Section 3 (8-Minute Pitch Script Only) Spoken Words: {total_w}")
    print(f"Spoken Word Cadence: {total_w / 8.0:.1f} WPM")
    
    # Minute by minute breakdown
    minutes = re.findall(r'### MINUTE (\d+:\d+ – \d+:\d+): (.*?)(?=(?:### MINUTE|\Z))', sec3_text, re.DOTALL)
    print(f"\nMinute-by-Minute Breakdown ({len(minutes)} segments):")
    total_accum = 0
    for min_range, content in minutes:
        m_lines = [l[1:].strip() for l in content.splitlines() if l.startswith('>')]
        m_d = ' '.join(m_lines)
        m_clean = re.sub(r'[*_#]', '', m_d)
        w_cnt = len(m_clean.split())
        total_accum += w_cnt
        print(f"  Minute {min_range}: {w_cnt} words")
    print(f"Sum across segments: {total_accum} words")

# Also check WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md Section 9.2
with open('sih26188_wave2/WAVE_2_MASTER_RESEARCH_AND_MVP_BLUEPRINT.md', 'r') as f:
    master_text = f.read()

master_sec9_match = re.search(r'### 9\.2 Minute-by-Minute 8-Minute Script(.*?)### 9\.3 The Top 3 Winning Demo Moments', master_text, re.DOTALL)
if master_sec9_match:
    m_sec9 = master_sec9_match.group(1)
    m_lines = [l[1:].strip() for l in m_sec9.splitlines() if l.startswith('>')]
    m_clean = re.sub(r'[*_#]', '', ' '.join(m_lines))
    m_words = len(m_clean.split())
    print(f"\nMaster Blueprint Section 9.2 Spoken Words: {m_words} ({m_words/8.0:.1f} WPM)")
