import math
from PIL import Image, ImageDraw, ImageFont

def render_pyramid_diagram():
    # Scale factor for supersampling (sharp rendering)
    S = 4
    W = 1200 * S
    H = 1350 * S
    
    img = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Load fonts
    font_path_bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    if not font_path_bold:
        font_path_bold = "/System/Library/Fonts/Helvetica.ttc"
    font_path_reg = "/System/Library/Fonts/Supplemental/Arial.ttf"
    
    title_font = ImageFont.truetype(font_path_bold, 40 * S)
    sub_font = ImageFont.truetype(font_path_reg, 26 * S)
    
    # Colors for 5 tiers (from Top [0] to Bottom [4])
    # Matching the exact clean gradient blues from the reference image
    colors = [
        {"top": (165, 202, 255), "left": (120, 168, 250), "right": (90, 138, 225), "edge": (210, 232, 255)}, # Level 5 (Top Spire)
        {"top": (118, 170, 252), "left": (78, 138, 242),  "right": (52, 108, 210), "edge": (185, 215, 255)}, # Level 4
        {"top": (82, 142, 248),  "left": (56, 118, 232),  "right": (36, 88, 188),  "edge": (155, 195, 255)}, # Level 3
        {"top": (56, 118, 238),  "left": (42, 98, 218),   "right": (26, 72, 172),  "edge": (125, 175, 255)}, # Level 2
        {"top": (42, 98, 218),   "left": (32, 78, 192),   "right": (22, 58, 152),  "edge": (95, 148, 248)},  # Level 1 (Base)
    ]
    
    # Arrow segment colors (Top to Bottom)
    arrow_colors = [
        (140, 182, 252),
        (92, 152, 246),
        (66, 126, 236),
        (46, 106, 222),
        (32, 82, 196),
    ]
    
    # Geometry for 3D Isometric Stepped Tower
    cx = 280 * S
    base_y = 1200 * S
    
    # Isometric angles (28-30 degrees)
    iso_dx = math.cos(math.radians(28))
    iso_dy = math.sin(math.radians(28))
    
    # Half-widths and Heights for the 5 tiers (Bottom [0] to Top [4])
    tier_sizes = [
        {"w": 195 * S, "h": 145 * S}, # Bottom Base
        {"w": 155 * S, "h": 155 * S}, # Tier 2
        {"w": 120 * S, "h": 165 * S}, # Tier 3
        {"w": 88 * S,  "h": 180 * S}, # Tier 4
        {"w": 55 * S,  "h": 205 * S}, # Top Spire
    ]
    
    # Compute block center Y positions
    cur_y = base_y
    block_centers = []
    
    for i in range(5):
        h = tier_sizes[i]["h"]
        w = tier_sizes[i]["w"]
        top_cy = cur_y - h
        block_centers.append({"base_cy": cur_y, "top_cy": top_cy, "w": w, "h": h})
        cur_y = top_cy
        
    # Draw blocks from Bottom (0) to Top (4)
    for i in range(5):
        col = colors[4 - i]
        b = block_centers[i]
        w = b["w"]
        h = b["h"]
        top_cy = b["top_cy"]
        base_cy = b["base_cy"]
        
        # 4 vertices of Top Face (rhombus)
        pt_top_N = (cx, top_cy - w * iso_dy)
        pt_top_E = (cx + w * iso_dx, top_cy)
        pt_top_S = (cx, top_cy + w * iso_dy)
        pt_top_W = (cx - w * iso_dx, top_cy)
        
        # Bottom vertices for sides
        pt_bot_S = (cx, base_cy + w * iso_dy)
        pt_bot_E = (cx + w * iso_dx, base_cy)
        pt_bot_W = (cx - w * iso_dx, base_cy)
        
        # Draw Left Face (West - South)
        draw.polygon([pt_top_W, pt_top_S, pt_bot_S, pt_bot_W], fill=col["left"], outline=col["edge"], width=max(1, 2*S))
        
        # Draw Right Face (South - East)
        draw.polygon([pt_top_S, pt_top_E, pt_bot_E, pt_bot_S], fill=col["right"], outline=col["edge"], width=max(1, 2*S))
        
        # Draw Top Face
        draw.polygon([pt_top_N, pt_top_E, pt_top_S, pt_top_W], fill=col["top"], outline=col["edge"], width=max(1, 2*S))

    # Draw Middle Vertical Segmented Arrow
    arrow_x = 580 * S
    arrow_w = 26 * S
    
    arrow_bottom = 1170 * S
    arrow_top = 150 * S
    arrow_span = arrow_bottom - arrow_top
    segment_h = arrow_span / 5.0
    
    # Exact Text Data as requested by user
    levels_data = [
        {
            "title_lines": ["Technical", "Superiority"],
            "sub_lines": ["Fast, multimodal and", "sovereign AI screening"]
        },
        {
            "title_lines": ["Implementation", "Advantages"],
            "sub_lines": ["Edge-ready and", "field deployable"]
        },
        {
            "title_lines": ["Market", "Differentiation"],
            "sub_lines": ["Sovereign alternative", "to cloud & e-gates"]
        },
        {
            "title_lines": ["User Experience", ""],
            "sub_lines": ["Simple, explainable", "decision support"]
        },
        {
            "title_lines": ["Why We Will Win", ""],
            "sub_lines": ["Built for real", "border conditions"]
        },
    ]
    
    # Draw segments of arrow (0 = Top, 4 = Bottom)
    for i in range(5):
        seg_top = arrow_top + i * segment_h
        seg_bot = seg_top + segment_h
        seg_col = arrow_colors[i]
        
        if i == 0:
            # Top arrow tip
            tip_h = 42 * S
            tip_pt = (arrow_x + arrow_w / 2, seg_top - tip_h)
            draw.polygon([
                tip_pt,
                (arrow_x + arrow_w + 12 * S, seg_top),
                (arrow_x + arrow_w, seg_top),
                (arrow_x + arrow_w, seg_bot - 2 * S),
                (arrow_x, seg_bot - 2 * S),
                (arrow_x, seg_top),
                (arrow_x - 12 * S, seg_top),
            ], fill=seg_col, outline=(75, 125, 225), width=max(1, 2*S))
        else:
            draw.rectangle(
                [arrow_x, seg_top + 2 * S, arrow_x + arrow_w, seg_bot - 2 * S],
                fill=seg_col,
                outline=(75, 125, 225),
                width=max(1, 2*S)
            )
            
        # Draw Horizontal Leader Line to text
        line_y = seg_top + segment_h * 0.40
        line_start_x = arrow_x + arrow_w
        line_end_x = 680 * S
        draw.line([(line_start_x, line_y), (line_end_x, line_y)], fill=(156, 163, 175), width=max(1, 2*S))
        
        # Draw Text on the Right
        text_x = 710 * S
        data = levels_data[i]
        
        # Calculate Y for Title lines
        t_y = line_y - 45 * S
        if data["title_lines"][1]:
            # 2 title lines
            draw.text((text_x, t_y), data["title_lines"][0], fill=(31, 41, 55), font=title_font)
            draw.text((text_x, t_y + 46 * S), data["title_lines"][1], fill=(31, 41, 55), font=title_font)
            sub_start_y = t_y + 104 * S
        else:
            # 1 title line
            draw.text((text_x, t_y + 20 * S), data["title_lines"][0], fill=(31, 41, 55), font=title_font)
            sub_start_y = t_y + 80 * S
            
        # Draw Subtitle lines
        for s_idx, s_line in enumerate(data["sub_lines"]):
            draw.text((text_x, sub_start_y + s_idx * 34 * S), s_line, fill=(75, 85, 99), font=sub_font)
        
    # Resize with High-Quality Lanczos Filter for super crisp anti-aliasing
    final_w = 1200
    final_h = 1350
    final_img = img.resize((final_w, final_h), Image.Resampling.LANCZOS)
    
    output_path = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/feasibility_pyramid_exact_text.jpg"
    final_img.save(output_path, quality=98)
    print("Successfully generated:", output_path)

if __name__ == "__main__":
    render_pyramid_diagram()
