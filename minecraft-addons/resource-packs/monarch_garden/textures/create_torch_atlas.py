"""
Create a single 32x32 texture atlas for the Landscape Torch
Layout:
- [0,0 to 8,10]: Post wood texture (sides)
- [0,8 to 4,12]: Post top/bottom
- [0,12 to 10,20]: Hat sides (dark metal)
- [12,0 to 22,10]: Hat TOP (dark metal)
- [12,12 to 22,22]: Hat BOTTOM (amber glow - the light!)
"""

from PIL import Image, ImageDraw
import os
import math
import random

SIZE = 32
OUTPUT_DIR = r"c:\Users\ampau\source\AiAssist\AiAssist\minecraft-addons\resource-packs\monarch_garden\textures\blocks"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_atlas(filename, lit=False):
    """Create a texture atlas with all surfaces"""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pixels = img.load()
    
    random.seed(42)  # Reproducible
    
    # === POST TEXTURE (wood) - left side of atlas ===
    # Post sides: 0,0 to 8,8
    wood_base = (115, 80, 50)
    for y in range(10):
        for x in range(8):
            grain = -12 if x % 3 == 0 else (6 if x % 3 == 1 else 0)
            ring = int(math.sin(y * 0.5) * 5)
            noise = random.randint(-5, 5)
            r = max(0, min(255, wood_base[0] + grain + ring + noise))
            g = max(0, min(255, wood_base[1] + grain//2 + ring//2 + noise))
            b = max(0, min(255, wood_base[2] + grain//3 + noise))
            pixels[x, y] = (r, g, b, 255)
    
    # Post top/bottom: 0,8 to 4,12
    for y in range(8, 12):
        for x in range(4):
            noise = random.randint(-8, 8)
            pixels[x, y] = (wood_base[0]+noise, wood_base[1]+noise, wood_base[2]+noise, 255)
    
    # === HAT SIDES (dark metal) - 0,12 to 12,20 ===
    hat_base = (55, 50, 48)
    for y in range(12, 20):
        for x in range(12):
            noise = random.randint(-8, 8)
            edge = 8 if (y == 12 or y == 19) else 0
            r = max(0, min(255, hat_base[0] + noise - edge))
            g = max(0, min(255, hat_base[1] + noise - edge))
            b = max(0, min(255, hat_base[2] + noise - edge))
            pixels[x, y] = (r, g, b, 255)
    
    # === HAT TOP (dark metal) - 12,0 to 24,12 ===
    for y in range(12):
        for x in range(12, 24):
            cx, cy = 18, 6
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            highlight = max(0, int(12 - dist * 1.5))
            noise = random.randint(-6, 6)
            r = max(0, min(255, hat_base[0] + noise + highlight))
            g = max(0, min(255, hat_base[1] + noise + highlight))
            b = max(0, min(255, hat_base[2] + noise + highlight))
            pixels[x, y] = (r, g, b, 255)
    
    # === HAT BOTTOM (the light!) - 12,12 to 24,24 ===
    if lit:
        # Glowing amber when lit
        for y in range(12, 24):
            for x in range(12, 24):
                cx, cy = 18, 18
                dist = math.sqrt((x - cx)**2 + (y - cy)**2)
                max_dist = 8
                t = min(1.0, dist / max_dist)
                
                # Hot center, cooler edges
                center_r, center_g, center_b = 255, 220, 120
                edge_r, edge_g, edge_b = 255, 160, 50
                
                brightness = 1.0 - (t * 0.2)
                r = int((center_r * (1-t) + edge_r * t) * brightness)
                g = int((center_g * (1-t) + edge_g * t) * brightness)
                b = int((center_b * (1-t) + edge_b * t) * brightness)
                
                # Flicker spots
                if random.random() < 0.1:
                    r = min(255, r + 20)
                    g = min(255, g + 15)
                
                pixels[x, y] = (r, g, b, 255)
    else:
        # Dark amber when off
        for y in range(12, 24):
            for x in range(12, 24):
                cx, cy = 18, 18
                dist = math.sqrt((x - cx)**2 + (y - cy)**2)
                darken = int(dist * 2)
                noise = random.randint(-5, 5)
                r = max(0, min(255, 70 - darken + noise))
                g = max(0, min(255, 50 - darken + noise))
                b = max(0, min(255, 35 - darken + noise))
                pixels[x, y] = (r, g, b, 255)
    
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)
    print(f"Created: {filepath}")

print("Creating Landscape Torch texture atlases...")
create_atlas("landscape_torch_off.png", lit=False)
create_atlas("landscape_torch_lit.png", lit=True)
print("\nDone! Both states created.")
