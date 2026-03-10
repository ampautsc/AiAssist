"""
Generate placeholder textures for the Landscape Torch
Creates simple colored textures for:
- Hat (dark metal/wood cap)
- Post (wooden post)
- Amber glow (glowing amber when lit)
- Off state (dark amber when off)
"""

from PIL import Image
import os

# Texture size
SIZE = 16

# Output directory
OUTPUT_DIR = r"c:\Users\ampau\source\AiAssist\AiAssist\minecraft-addons\resource-packs\monarch_garden\textures\blocks"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_texture(filename, base_color, pattern_func=None):
    """Create a simple texture with optional pattern"""
    img = Image.new('RGBA', (SIZE, SIZE), base_color)
    pixels = img.load()
    
    if pattern_func:
        for y in range(SIZE):
            for x in range(SIZE):
                pixels[x, y] = pattern_func(x, y, base_color)
    
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath)
    print(f"Created: {filepath}")

def hat_pattern(x, y, base_color):
    """Dark metal/slate hat with subtle variation"""
    r, g, b, a = base_color
    # Add some noise for texture
    variation = ((x + y) % 3) * 5
    # Darker edges
    if x == 0 or x == 15 or y == 0 or y == 15:
        return (r - 20, g - 20, b - 20, a)
    return (r + variation - 5, g + variation - 5, b + variation - 5, a)

def post_pattern(x, y, base_color):
    """Wooden post with grain"""
    r, g, b, a = base_color
    # Vertical grain lines
    if x % 4 == 0:
        return (r - 15, g - 10, b - 5, a)
    # Random variation
    variation = ((x * 7 + y * 3) % 5) * 3
    return (r + variation - 5, g + variation - 5, b + variation - 5, a)

def amber_glow_pattern(x, y, base_color):
    """Glowing amber with bright center"""
    r, g, b, a = base_color
    # Calculate distance from center
    cx, cy = SIZE // 2, SIZE // 2
    dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    max_dist = (cx ** 2 + cy ** 2) ** 0.5
    
    # Brighter in center
    brightness = int(30 * (1 - dist / max_dist))
    
    # Add flickering effect (checkerboard variation)
    flicker = ((x + y) % 2) * 10
    
    return (
        min(255, r + brightness + flicker),
        min(255, g + brightness // 2 + flicker // 2),
        min(255, b + flicker // 4),
        a
    )

def amber_off_pattern(x, y, base_color):
    """Dark amber when torch is off"""
    r, g, b, a = base_color
    # Subtle variation
    variation = ((x + y) % 3) * 3
    return (r + variation, g + variation, b + variation, a)

# Create the textures
print("Creating Landscape Torch textures...")

# Hat - dark slate/metal color
create_texture("landscape_torch_hat.png", (60, 55, 50, 255), hat_pattern)

# Post - wooden brown
create_texture("landscape_torch_post.png", (120, 85, 55, 255), post_pattern)

# Amber glow - bright amber/orange when lit
create_texture("landscape_torch_amber.png", (255, 170, 50, 255), amber_glow_pattern)

# Off state - dark amber
create_texture("landscape_torch_off.png", (80, 55, 30, 255), amber_off_pattern)

print("\nAll textures created successfully!")
print(f"Location: {OUTPUT_DIR}")
