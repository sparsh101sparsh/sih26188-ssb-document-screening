#!/usr/bin/env python3
"""
SIH26188 – Synthetic Document Dataset Generator
================================================
Generates 500 labelled document images for internal hackathon testing.

Output layout
--------------
data/synthetic_dataset/
  images/          ← RGB document images (PNG)
  masks/           ← Binary tamper masks (PNG, 255=tampered, 0=clean)
  manifest.csv     ← metadata per image
  manifest.json    ← same as CSV but JSON
  README.txt       ← dataset card

Classes
-------
  0 – genuine          (no tampering)
  1 – tampered_photo   (face/photo region replaced)
  2 – tampered_text    (text field altered, e.g. DOB / name / ID number)

Document types
--------------
  aadhaar | passport | voter_id | pan_card | driving_license

Usage
-----
  .venv/bin/python generate_dataset.py
  .venv/bin/python generate_dataset.py --total 500 --out data/synthetic_dataset --seed 42
  .venv/bin/python generate_dataset.py --total 500 --no-degrade   # faster
"""

import argparse
import csv
import json
import os
import random
import string
import textwrap
from datetime import date, timedelta
from pathlib import Path
from io import BytesIO

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─────────────────────────────────────────────────────────────────────────────
# Palette & layout constants
# ─────────────────────────────────────────────────────────────────────────────

DOC_CONFIGS = {
    "aadhaar": {
        "size": (856, 540),
        "bg": (255, 255, 255),
        "header_color": (0, 100, 180),
        "accent": (255, 153, 0),
        "label": "GOVERNMENT OF INDIA",
        "sublabel": "Unique Identification Authority of India",
        "doc_label_en": "AADHAAR",
        "photo_box": (30, 120, 210, 340),
        "mrz": False,
    },
    "passport": {
        "size": (860, 600),
        "bg": (240, 248, 255),
        "header_color": (0, 60, 120),
        "accent": (200, 160, 0),
        "label": "REPUBLIC OF INDIA",
        "sublabel": "PASSPORT",
        "doc_label_en": "PASSPORT",
        "photo_box": (30, 100, 200, 310),
        "mrz": True,
    },
    "voter_id": {
        "size": (856, 540),
        "bg": (255, 252, 240),
        "header_color": (0, 80, 0),
        "accent": (200, 50, 50),
        "label": "ELECTION COMMISSION OF INDIA",
        "sublabel": "ELECTORS PHOTO IDENTITY CARD",
        "doc_label_en": "VOTER ID",
        "photo_box": (30, 130, 200, 330),
        "mrz": False,
    },
    "pan_card": {
        "size": (856, 540),
        "bg": (255, 255, 230),
        "header_color": (180, 0, 0),
        "accent": (0, 80, 160),
        "label": "INCOME TAX DEPARTMENT",
        "sublabel": "PERMANENT ACCOUNT NUMBER CARD",
        "doc_label_en": "PAN CARD",
        "photo_box": (630, 130, 820, 330),
        "mrz": False,
    },
    "driving_license": {
        "size": (856, 540),
        "bg": (230, 245, 255),
        "header_color": (20, 60, 160),
        "accent": (200, 120, 0),
        "label": "GOVERNMENT OF INDIA",
        "sublabel": "DRIVING LICENCE",
        "doc_label_en": "DRIVING LICENSE",
        "photo_box": (30, 130, 200, 330),
        "mrz": False,
    },
}

CLASSES = ["genuine", "tampered_photo", "tampered_text"]

FIRST_NAMES = [
    "Aarav", "Aditi", "Amit", "Anjali", "Arjun", "Deepa", "Divya", "Gaurav",
    "Kavya", "Manish", "Meera", "Neha", "Nikhil", "Pooja", "Priya", "Rahul",
    "Rajesh", "Riya", "Rohit", "Sanjay", "Sangeeta", "Sneha", "Suresh",
    "Tanvi", "Varun", "Vikram", "Vivek", "Swati", "Kiran", "Ravi", "Sunita",
    "Harsha", "Yash", "Preeti", "Sachin", "Rekha", "Mohan", "Nisha", "Ajay",
]

LAST_NAMES = [
    "Sharma", "Verma", "Singh", "Gupta", "Patel", "Kumar", "Mehta", "Joshi",
    "Rao", "Nair", "Mishra", "Pandey", "Reddy", "Iyer", "Pillai", "Chopra",
    "Saxena", "Agarwal", "Bose", "Das", "Banerjee", "Mukherjee", "Chatterjee",
    "Srivastava", "Tiwari", "Dubey", "Yadav", "Malhotra", "Kapoor", "Bajaj",
]

STATES = [
    "Uttar Pradesh", "Maharashtra", "Bihar", "West Bengal", "Madhya Pradesh",
    "Rajasthan", "Karnataka", "Gujarat", "Tamil Nadu", "Andhra Pradesh",
    "Telangana", "Kerala", "Odisha", "Jharkhand", "Assam", "Punjab", "Delhi",
]

CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Nagpur",
    "Visakhapatnam", "Bhopal", "Patna", "Vadodara", "Surat", "Agra",
]


# ─────────────────────────────────────────────────────────────────────────────
# Data generators (no external libs needed)
# ─────────────────────────────────────────────────────────────────────────────

def rand_name(rng):
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"


def rand_dob(rng):
    start = date(1960, 1, 1)
    delta = (date(2000, 12, 31) - start).days
    return start + timedelta(days=rng.randint(0, delta))


def rand_uid(rng):
    first = rng.randint(2, 9)
    rest = "".join([str(rng.randint(0, 9)) for _ in range(11)])
    uid = str(first) + rest
    return f"{uid[:4]} {uid[4:8]} {uid[8:]}"


def rand_pan(rng):
    letters = string.ascii_uppercase
    return (
        "".join(rng.choices(letters, k=5))
        + "".join([str(rng.randint(0, 9)) for _ in range(4)])
        + rng.choice(letters)
    )


def rand_passport_num(rng):
    return rng.choice(string.ascii_uppercase) + "".join(
        [str(rng.randint(0, 9)) for _ in range(7)]
    )


def rand_dl_num(rng):
    state_code = rng.choice(["DL", "MH", "KA", "TN", "UP", "GJ", "RJ"])
    year = rng.randint(10, 24)
    num = "".join([str(rng.randint(0, 9)) for _ in range(7)])
    return f"{state_code}-{year:02d}-{num}"


def rand_voterid(rng):
    return "".join(rng.choices(string.ascii_uppercase, k=3)) + "".join(
        [str(rng.randint(0, 9)) for _ in range(7)]
    )


def rand_address(rng):
    num = rng.randint(1, 999)
    street = rng.choice(["MG Road", "Gandhi Nagar", "Nehru Street",
                          "Indira Colony", "Shivaji Marg", "Laxmi Bai Road"])
    city = rng.choice(CITIES)
    state = rng.choice(STATES)
    pin = "".join([str(rng.randint(0, 9)) for _ in range(6)])
    return f"{num}, {street}, {city} - {pin}, {state}"


def rand_mrz(name, passport_num, dob, expiry, sex="M"):
    surname = name.upper().split()[-1]
    given = name.upper().split()[0]
    line1 = f"P<IND{surname}<<{given}"[:44].ljust(44, "<")
    pnum = passport_num.upper().ljust(9, "<")[:9]
    dob_str = dob.strftime("%y%m%d")
    exp_str = expiry.strftime("%y%m%d")
    line2 = f"{pnum}0IND{dob_str}{sex[0]}{exp_str}0000000000<0"[:44].ljust(44, "<")
    return line1, line2


# ─────────────────────────────────────────────────────────────────────────────
# Drawing helpers
# ─────────────────────────────────────────────────────────────────────────────

def draw_guilloche(draw, size, color):
    w, h = size
    for i in range(0, w + h, 18):
        x0, y0 = max(0, i - h), max(0, i - w)
        x1, y1 = min(w, i), min(h, i)
        r, g, b = color[:3]
        draw.line([(x0, y0), (x1, y1)], fill=(r, g, b, 25), width=1)


def draw_corner_seals(draw, size, color):
    w, h = size
    r = 20
    for cx, cy in [(r, r), (w - r, r), (r, h - r), (w - r, h - r)]:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=2)
        draw.ellipse([cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2],
                     outline=color, width=1)


def get_font(size=14):
    candidates = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_field(draw, xy, label, value, label_color=(100, 100, 100),
               value_color=(20, 20, 20), label_size=11, value_size=14,
               max_width=None):
    x, y = xy
    lf = get_font(label_size)
    vf = get_font(value_size)
    draw.text((x, y), label.upper(), font=lf, fill=label_color)
    y2 = y + label_size + 4
    if max_width:
        lines = textwrap.wrap(str(value), width=max(8, max_width // (value_size // 2)))
        for line in lines:
            draw.text((x, y2), line, font=vf, fill=value_color)
            y2 += value_size + 2
    else:
        draw.text((x, y2), str(value), font=vf, fill=value_color)
        y2 += value_size + 4
    return y2


def make_face_placeholder(w, h, skin_tone=(210, 185, 160), tampered=False):
    img = Image.new("RGB", (w, h), (180, 200, 220))
    draw = ImageDraw.Draw(img)
    skin = skin_tone

    # Body silhouette
    bw, bh = int(w * 0.6), int(h * 0.35)
    bx = (w - bw) // 2
    draw.ellipse([bx, int(h * 0.72), bx + bw, h + 20], fill=skin)

    # Head
    hw = int(w * 0.44)
    hh = int(h * 0.46)
    hx = (w - hw) // 2
    hy = int(h * 0.12)
    draw.ellipse([hx, hy, hx + hw, hy + hh], fill=skin)

    # Eyes
    ew = max(3, int(hw * 0.12))
    for ex_off in [-0.15, 0.15]:
        ex = int(w / 2 + hw * ex_off - ew / 2)
        ey = hy + int(hh * 0.38)
        draw.ellipse([ex, ey, ex + ew, ey + ew], fill=(50, 30, 20))

    # Border — red if tampered
    border_col = (180, 40, 40) if tampered else (100, 100, 100)
    border_w = 4 if tampered else 2
    draw.rectangle([0, 0, w - 1, h - 1], outline=border_col, width=border_w)
    return img


def paste_photo(doc_img, box, tampered, rng):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    skin_tones = [
        (220, 190, 160), (200, 165, 130), (170, 130, 100),
        (140, 100, 70),  (100, 70, 50),
    ]
    skin = rng.choice(skin_tones)
    if tampered:
        # Use a visibly different skin tone
        skin = rng.choice([s for s in skin_tones if s != skin])
    face = make_face_placeholder(w, h, skin_tone=skin, tampered=tampered)
    doc_img.paste(face, (x0, y0))
    mask = np.zeros((doc_img.height, doc_img.width), dtype=np.uint8)
    if tampered:
        mask[y0:y1, x0:x1] = 255
    return mask


# ─────────────────────────────────────────────────────────────────────────────
# Document renderers
# ─────────────────────────────────────────────────────────────────────────────

def render_doc(doc_type, cfg, person, tamper_class, rng):
    w, h = cfg["size"]
    img = Image.new("RGBA", cfg["size"], (*cfg["bg"], 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # ── Header ──
    draw.rectangle([0, 0, w, 60], fill=(*cfg["header_color"], 255))
    draw.text((12, 10), cfg["label"], font=get_font(20), fill=(255, 255, 255, 255))
    draw.text((12, 35), cfg["sublabel"], font=get_font(13), fill=(200, 220, 255, 255))
    draw.rectangle([0, 60, w, 68], fill=(*cfg["accent"], 255))
    draw_guilloche(draw, cfg["size"], cfg["header_color"])
    draw_corner_seals(draw, cfg["size"], cfg["accent"])

    # ── Doc type label top-right ──
    draw.text((w - 180, 14), cfg["doc_label_en"], font=get_font(22),
              fill=(*cfg["accent"], 255))

    img = img.convert("RGB")

    # ── Photo ──
    pb = cfg["photo_box"]
    photo_mask = paste_photo(img, pb, tampered=(tamper_class == "tampered_photo"), rng=rng)

    draw = ImageDraw.Draw(img)

    # Determine field area (left of photo for PAN, right for others)
    if doc_type == "pan_card":
        fx, fy_start = 30, 85
    else:
        fx = pb[2] + 20
        fy_start = 82

    # ── Person data ──
    name = person["name"]
    dob = person["dob"]

    if tamper_class == "tampered_text":
        # Subtly alter name and DOB
        name = rng.choice(FIRST_NAMES) + " " + name.split()[-1]
        dob = dob.replace(year=dob.year + rng.randint(1, 8))

    fy = fy_start
    if doc_type == "aadhaar":
        uid = person["uid"]
        if tamper_class == "tampered_text":
            parts = uid.split()
            parts[-1] = "".join([str(rng.randint(0, 9)) for _ in range(4)])
            uid = " ".join(parts)
        fy = draw_field(draw, (fx, fy), "Name", name, value_size=16)
        fy = draw_field(draw, (fx, fy + 4), "Date of Birth", dob.strftime("%d/%m/%Y"))
        fy = draw_field(draw, (fx, fy + 4), "Gender", person["sex"])
        fy = draw_field(draw, (fx, fy + 4), "Address", person["address"],
                        value_size=11, max_width=380)
        draw.text((fx, fy + 6), uid, font=get_font(20), fill=(30, 30, 30))

    elif doc_type == "passport":
        pnum = person["passport_num"]
        expiry = person["dob"].replace(year=person["dob"].year + 10)
        fy = draw_field(draw, (fx, fy), "Surname", name.split()[-1], value_size=16)
        fy = draw_field(draw, (fx, fy + 4), "Given Name(s)", name.split()[0], value_size=16)
        fy = draw_field(draw, (fx, fy + 4), "Nationality", "INDIAN")
        fy = draw_field(draw, (fx, fy + 4), "Date of Birth", dob.strftime("%d %b %Y"))
        fy = draw_field(draw, (fx, fy + 4), "Sex", person["sex"])
        fy = draw_field(draw, (fx, fy + 4), "Place of Birth", person["city"])
        fy = draw_field(draw, (fx, fy + 4), "Passport No.", pnum,
                        value_size=16, value_color=(0, 60, 120))
        # MRZ zone
        mrz_y = h - 85
        draw.rectangle([0, mrz_y - 8, w, h - 38], fill=(228, 234, 244))
        l1, l2 = rand_mrz(person["name"], pnum, person["dob"], expiry,
                           person["sex"][0])
        draw.text((10, mrz_y), l1, font=get_font(13), fill=(20, 20, 60))
        draw.text((10, mrz_y + 18), l2, font=get_font(13), fill=(20, 20, 60))

    elif doc_type == "voter_id":
        vid = person["voter_id"]
        if tamper_class == "tampered_text":
            vid = rand_voterid(rng)
        fy = draw_field(draw, (fx, fy), "Elector's Name", name, value_size=16)
        fy = draw_field(draw, (fx, fy + 4), "Father's Name",
                        rng.choice(FIRST_NAMES) + " " + name.split()[-1])
        fy = draw_field(draw, (fx, fy + 4), "Date of Birth", dob.strftime("%d/%m/%Y"))
        fy = draw_field(draw, (fx, fy + 4), "Sex", person["sex"])
        fy = draw_field(draw, (fx, fy + 4), "Address", person["address"],
                        value_size=11, max_width=380)
        draw.text((fx, fy + 6), f"EPIC No: {vid}", font=get_font(14),
                  fill=(0, 60, 0))

    elif doc_type == "pan_card":
        pan = person["pan"]
        if tamper_class == "tampered_text":
            pan = rand_pan(rng)
        fy = draw_field(draw, (fx, fy), "Name", name, value_size=18,
                        value_color=(160, 0, 0))
        fy = draw_field(draw, (fx, fy + 6), "Father's Name",
                        rng.choice(FIRST_NAMES) + " " + name.split()[-1])
        fy = draw_field(draw, (fx, fy + 6), "Date of Birth", dob.strftime("%d/%m/%Y"))
        draw.text((fx, fy + 12), pan, font=get_font(24), fill=(0, 60, 140))

    elif doc_type == "driving_license":
        dl = person["dl_num"]
        expiry = person["dob"].replace(year=person["dob"].year + 20)
        if tamper_class == "tampered_text":
            dl = rand_dl_num(rng)
        fy = draw_field(draw, (fx, fy), "Name", name, value_size=16)
        fy = draw_field(draw, (fx, fy + 4), "Date of Birth", dob.strftime("%d/%m/%Y"))
        fy = draw_field(draw, (fx, fy + 4), "Blood Group",
                        rng.choice(["A+", "B+", "O+", "AB+", "A-", "B-"]))
        fy = draw_field(draw, (fx, fy + 4), "Address", person["address"],
                        value_size=11, max_width=380)
        fy = draw_field(draw, (fx, fy + 4), "Licence No.", dl, value_size=16,
                        value_color=(0, 60, 140))
        draw_field(draw, (fx, fy + 4), "Valid Upto", expiry.strftime("%d/%m/%Y"))

    # ── Bottom bar ──
    draw.rectangle([0, h - 38, w, h], fill=(*cfg["header_color"],))
    draw.text((10, h - 28), "SPECIMEN ONLY – NOT A GENUINE DOCUMENT",
              font=get_font(11), fill=(255, 220, 100))

    # ── Watermark ──
    wf = get_font(64)
    draw.text((w // 2 - 110, h // 2 - 35), "SPECIMEN",
              font=wf, fill=(200, 200, 200))

    # ── Text mask ──
    text_mask = np.zeros((h, w), dtype=np.uint8)
    if tamper_class == "tampered_text":
        x_end = min(w, fx + 420)
        text_mask[fy_start:min(h, fy_start + 280), fx:x_end] = 255

    mask = np.maximum(photo_mask, text_mask)
    return img, mask


# ─────────────────────────────────────────────────────────────────────────────
# Camera degradation
# ─────────────────────────────────────────────────────────────────────────────

def apply_degradation(img, rng):
    arr = np.array(img, dtype=np.float32)
    sigma = abs(rng.gauss(0, rng.uniform(2, 7)))
    arr += np.random.normal(0, sigma, arr.shape)
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    if rng.random() < 0.4:
        img = img.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.2, 0.8)))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=rng.randint(78, 96))
    buf.seek(0)
    return Image.open(buf).copy()


# ─────────────────────────────────────────────────────────────────────────────
# Person factory
# ─────────────────────────────────────────────────────────────────────────────

def make_person(rng):
    dob = rand_dob(rng)
    return {
        "name": rand_name(rng),
        "dob": dob,
        "sex": rng.choice(["Male", "Female"]),
        "uid": rand_uid(rng),
        "pan": rand_pan(rng),
        "passport_num": rand_passport_num(rng),
        "voter_id": rand_voterid(rng),
        "dl_num": rand_dl_num(rng),
        "address": rand_address(rng),
        "city": rng.choice(CITIES),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main generation loop
# ─────────────────────────────────────────────────────────────────────────────

def generate_dataset(total: int, out_dir: Path, seed: int = 42, degrade: bool = True):
    rng = random.Random(seed)
    np.random.seed(seed)

    images_dir = out_dir / "images"
    masks_dir = out_dir / "masks"
    images_dir.mkdir(parents=True, exist_ok=True)
    masks_dir.mkdir(parents=True, exist_ok=True)

    doc_types = list(DOC_CONFIGS.keys())
    records = []

    for i in range(total):
        doc_type = doc_types[i % len(doc_types)]
        tamper_class = CLASSES[i % len(CLASSES)]
        cfg = DOC_CONFIGS[doc_type]
        person = make_person(rng)

        img, mask = render_doc(doc_type, cfg, person, tamper_class, rng)

        if degrade:
            img = apply_degradation(img, rng)

        img_id = f"{i:04d}_{doc_type}_{tamper_class}"
        img.save(images_dir / f"{img_id}.png", format="PNG")
        Image.fromarray(mask).save(masks_dir / f"{img_id}_mask.png", format="PNG")

        records.append({
            "id": img_id,
            "filename": f"images/{img_id}.png",
            "mask_filename": f"masks/{img_id}_mask.png",
            "doc_type": doc_type,
            "tamper_class": tamper_class,
            "label": CLASSES.index(tamper_class),
            "width": cfg["size"][0],
            "height": cfg["size"][1],
            "person_name": person["name"],
            "dob": person["dob"].isoformat(),
        })

        if (i + 1) % 50 == 0 or (i + 1) == total:
            print(f"  [{i+1:3d}/{total}] {img_id}")

    # Manifest CSV
    csv_path = out_dir / "manifest.csv"
    with open(csv_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(records[0].keys()))
        w.writeheader()
        w.writerows(records)

    # Manifest JSON
    with open(out_dir / "manifest.json", "w") as f:
        json.dump(records, f, indent=2, default=str)

    class_counts = {c: sum(1 for r in records if r["tamper_class"] == c) for c in CLASSES}
    doc_counts   = {d: sum(1 for r in records if r["doc_type"] == d) for d in doc_types}

    (out_dir / "README.txt").write_text(
        f"SIH26188 Synthetic Document Dataset\n"
        f"=====================================\n"
        f"Total images : {total}\n"
        f"Seed         : {seed}\n"
        f"Degradation  : {'Yes' if degrade else 'No'}\n\n"
        f"CLASS DISTRIBUTION\n"
        + "\n".join(f"  {c}: {n}" for c, n in class_counts.items())
        + "\n\nDOCUMENT TYPE DISTRIBUTION\n"
        + "\n".join(f"  {d}: {n}" for d, n in doc_counts.items())
        + "\n\nFILES\n"
        "  images/        PNG document images (RGB)\n"
        "  masks/         Binary tamper masks (255=tampered, 0=clean)\n"
        "  manifest.csv   Labels + metadata\n"
        "  manifest.json  Same data as JSON\n\n"
        "LABEL ENCODING\n"
        "  0 = genuine\n"
        "  1 = tampered_photo\n"
        "  2 = tampered_text\n\n"
        "DISCLAIMER: All documents are SYNTHETIC SPECIMENS. No real citizen data.\n"
    )

    print(f"\n✅ Done! Dataset at: {out_dir.resolve()}")
    print(f"   Images  : {total}")
    print(f"   Classes : {class_counts}")
    print(f"   Types   : {doc_counts}")
    print(f"   Manifest: {csv_path}")
    return records


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SIH26188 Synthetic Dataset Generator")
    parser.add_argument("--total", type=int, default=500)
    parser.add_argument("--out", type=str, default="data/synthetic_dataset")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no-degrade", action="store_true",
                        help="Skip camera degradation (faster)")
    args = parser.parse_args()

    out_path = Path(args.out)
    print(f"🔄 Generating {args.total} synthetic document images → {out_path}")
    generate_dataset(args.total, out_path, seed=args.seed, degrade=not args.no_degrade)
