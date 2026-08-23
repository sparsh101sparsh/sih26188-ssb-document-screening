#!/usr/bin/env python3
import re

with open("/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_wave2/docs/05_SIH_PITCH_SCRIPT_AND_SCORING_STRATEGY.md") as f:
    text = f.read()

# Extract spoken dialogue (text within blockquotes > *"..."*)
spoken_lines = re.findall(r'>\s*\*"?(.*?)"?\*?', text)
all_spoken_text = " ".join(spoken_lines)
# Remove markdown bold/italic tags
clean_text = re.sub(r'[\*_`]', '', all_spoken_text)
words = clean_text.split()
total_words = len(words)

print(f"Total Spoken Words in Pitch Script: {total_words}")
# Standard presentation speaking rate is ~130 - 150 words per minute
# Total pitch time = 8 minutes
cadence_8min = total_words / 8.0
cadence_6min = total_words / 6.0 # assuming 2 mins reserved for demo pauses/actions

print(f"Speaking rate across full 8.0 minutes: {cadence_8min:.1f} WPM")
print(f"Speaking rate across 6.0 minutes active speech (allowing 2.0 min demo action buffers): {cadence_6min:.1f} WPM")

# Let's count words per minute section
sections = re.split(r'### MINUTE\s+', text)[1:]
print(f"\nFound {len(sections)} minute sections in pitch:")
for idx, sec in enumerate(sections, 1):
    header = sec.splitlines()[0]
    spoken_in_sec = " ".join(re.findall(r'>\s*\*"?(.*?)"?\*?', sec))
    w_count = len(re.sub(r'[\*_`]', '', spoken_in_sec).split())
    print(f"  Section {idx} ({header[:30]}): {w_count} spoken words")

