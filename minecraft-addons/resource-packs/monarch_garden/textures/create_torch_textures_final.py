"""
Generate FINAL quality textures for the Landscape Torch
Creates detailed 16x16 textures with proper shading and visual appeal
"""

from PIL import Image, ImageDraw, ImageFilter
import os
import math
import random

# Texture size
SIZE = 16

# Output directory
OUTPUT_DIR = r"c:\Users\ampau\source\AiAssist\AiAssist\minecraft-addons\resource-packs\monarch_garden\textures\blocks"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_hat_texture():
    """Dark metal/slate hat with rivets and weathering"""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pixels = img.load()
    
    # Base dark metal color
    base_r, base_g, base_b = 55, 50, 48
    
    for y in range(SIZE):
        for x in range(SIZE):
            # Add noise for weathered metal look
            noise = random.randint(-8, 8)
            
            # Darker at edges (beveled look)
            edge_dist = min(x, y, SIZE-1-x, SIZE-1-y)
            edge_darken = max(0, 3 - edge_dist) * 8
            
            # Highlight in center-ish area
            center_dist = math.sqrt((x - 7.5)**2 + (y - 7.5)**2)
            highlight = max(0, int(15 - center_dist * 2))
            
            r = max(0, min(255, base_r + noise + highlight - edge_darken))
            g = max(0, min(255, base_g + noise + highlight - edge_darken))
            b = max(0, min(255, base_b + noise + highlight - edge_darken))
            
            pixels[x, y] = (r, g, b, 255)
    
    # Add corner rivets
    rivet_color = (70, 65, 60, 255)
    rivet_highlight = (90, 85, 80, 255)
    for rx, ry in [(2, 2), (13, 2), (2, 13), (13, 13)]:
        pixels[rx, ry] = rivet_highlight
        if rx+1 < SIZE:
            pixels[rx+1, ry] = rivet_color
        if ry+1 < SIZE:
            pixels[rx, ry+1] = rivet_color
    
    filepath = os.path.join(OUTPUT_DIR, "landscape_torch_hat.png")
    img.save(filepath)
    print(f"Created: {filepath}")

def create_post_texture():
    """Wooden post with grain and knots"""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pixels = img.load()
    
    # Wood base colors
    base_r, base_g, base_b = 115, 80, 50
    
    for y in range(SIZE):
        for x in range(SIZE):
            # Vertical grain lines
            grain = 0
            if x % 3 == 0:
                grain = -12
            elif x % 3 == 1:
                grain = 6
            
            # Add some horizontal variation (growth rings visible on cut)
            ring_variation = int(math.sin(y * 0.5) * 5)
            
            # Random noise for texture
            noise = random.randint(-5, 5)
            
            r = max(0, min(255, base_r + grain + ring_variation + noise))
            g = max(0, min(255, base_g + grain//2 + ring_variation//2 + noise))
            b = max(0, min(255, base_b + grain//3 + noise))
            
            pixels[x, y] = (r, g, b, 255)
    
    # Add a subtle knot
    knot_x, knot_y = 10, 8
    for dy in range(-1, 2):
        for dx in range(-1, 2):
            if 0 <= knot_x+dx < SIZE and 0 <= knot_y+dy < SIZE:
                dist = abs(dx) + abs(dy)
                darken = 25 - dist * 8
                r, g, b, a = pixels[knot_x+dx, knot_y+dy]
                pixels[knot_x+dx, knot_y+dy] = (max(0, r-darken), max(0, g-darken), max(0, b-darken), 255)
    
    filepath = os.path.join(OUTPUT_DIR, "landscape_torch_post.png")
    img.save(filepath)
    print(f"Created: {filepath}")

def create_amber_glow_texture():
    """Bright glowing amber with flickering effect - the star of the show"""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pixels = img.load()
    
    # Hot amber core colors
    center_r, center_g, center_b = 255, 200, 80
    edge_r, edge_g, edge_b = 255, 140, 30
    
    for y in range(SIZE):
        for x in range(SIZE):
            # Distance from center for glow falloff
            cx, cy = SIZE // 2, SIZE // 2
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            max_dist = math.sqrt(cx**2 + cy**2)
            
            # Interpolate between center (hot) and edge (cooler amber)
            t = min(1.0, dist / max_dist)
            
            # Core is brighter
            brightness = 1.0 - (t * 0.3)
            
            r = int((center_r * (1-t) + edge_r * t) * brightness)
            g = int((center_g * (1-t) + edge_g * t) * brightness)
            b = int((center_b * (1-t) + edge_b * t) * brightness)
            
            # Flickering effect - random bright spots
            if random.random() < 0.15:
                flicker = random.randint(10, 30)
                r = min(255, r + flicker)
                g = min(255, g + flicker // 2)
            
            # Add subtle noise
            noise = random.randint(-8, 8)
            r = max(0, min(255, r + noise))
            g = max(0, min(255, g + noise // 2))
            b = max(0, min(255, b + noise // 3))
            
            pixels[x, y] = (r, g, b, 255)
    
    # Add hot bright center spots
    for _ in range(3):
        hx = random.randint(5, 10)
        hy = random.randint(5, 10)
        pixels[hx, hy] = (255, 230, 150, 255)
    
    filepath = os.path.join(OUTPUT_DIR, "landscape_torch_amber.png")
    img.save(filepath)
    print(f"Created: {filepath}")

def create_off_texture():
    """Unlit amber glass/crystal - dark but hinting at its nature"""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pixels = img.load()
    
    # Dark amber/brown - like unlit glass
    base_r, base_g, base_b = 70, 50, 30
    
    for y in range(SIZE):
        for x in range(SIZE):
            # Slight gradient for depth
            cx, cy = SIZE // 2, SIZE // 2
            dist = math.sqrt((x - cx)**2 + (y - cy)**2)
            
            # Darker at edges
            edge_factor = dist / 10
            
            # Subtle glass-like highlight
            highlight = 0
            if 5 <= x <= 8 and 3 <= y <= 6:
                highlight = 15
            
            noise = random.randint(-5, 5)
            
            r = max(0, min(255, int(base_r - edge_factor * 10 + highlight + noise)))
            g = max(0, min(255, int(base_g - edge_factor * 8 + highlight // 2 + noise)))
            b = max(0, min(255, int(base_b - edge_factor * 5 + noise)))
            
            pixels[x, y] = (r, g, b, 255)
    
    filepath = os.path.join(OUTPUT_DIR, "landscape_torch_off.png")
    img.save(filepath)
    print(f"Created: {filepath}")

# Create all textures
print("Creating FINAL quality Landscape Torch textures...")
print()

random.seed(42)  # Reproducible results
create_hat_texture()
create_post_texture()
create_amber_glow_texture()
create_off_texture()

print()
print("All FINAL textures created successfully!")
print(f"Location: {OUTPUT_DIR}")
