"""
Create an improved monarch butterfly texture with:
- White spots in the black wing borders
- Black veins through the orange areas
"""
from PIL import Image, ImageDraw

# Create 64x32 texture (matches geometry)
width, height = 64, 32
img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Colors
ORANGE = (255, 140, 0, 255)
DARK_ORANGE = (230, 120, 0, 255)
BLACK = (20, 20, 20, 255)
WHITE = (255, 255, 255, 255)
BROWN = (101, 67, 33, 255)

# Body area (0,0 to 14,7) - brown/black body
for x in range(14):
    for y in range(7):
        img.putpixel((x, y), BROWN)

# Head area (0,8 to 8,15) - darker brown
for x in range(8):
    for y in range(8, 16):
        img.putpixel((x, y), (80, 50, 25, 255))

# Wings area (14,0 to 63,31) - this is the main wing texture
# Front wings: 14,0 size 8x6 (but UV maps to larger area)
# Back wings: similar

# Fill wing base with orange gradient
for x in range(14, 64):
    for y in range(32):
        # Distance from inner edge creates gradient
        dist_from_edge = x - 14
        if dist_from_edge < 40:
            # Orange with slight variation
            orange_val = 255 - (dist_from_edge // 3)
            img.putpixel((x, y), (255, max(100, 165 - dist_from_edge), 0, 255))

# Black border around wings (outer edges)
# Top edge
for x in range(14, 64):
    for y in range(3):
        img.putpixel((x, y), BLACK)
    for y in range(29, 32):
        img.putpixel((x, y), BLACK)

# Outer edge (right side of texture = wing tips)
for x in range(54, 64):
    for y in range(32):
        img.putpixel((x, y), BLACK)

# White spots in the black borders
white_spots = [
    # Top border spots
    (56, 1), (58, 1), (60, 1), (62, 1),
    (55, 2), (57, 2), (59, 2), (61, 2),
    # Bottom border spots  
    (56, 30), (58, 30), (60, 30), (62, 30),
    (55, 29), (57, 29), (59, 29), (61, 29),
    # Right edge spots (wing tips)
    (55, 5), (56, 8), (55, 11), (56, 14),
    (55, 17), (56, 20), (55, 23), (56, 26),
    (58, 6), (59, 10), (58, 15), (59, 19), (58, 24),
    (61, 7), (62, 12), (61, 16), (62, 21), (61, 25),
]

for (x, y) in white_spots:
    if 0 <= x < 64 and 0 <= y < 32:
        img.putpixel((x, y), WHITE)
        # Make spots slightly larger
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < 64 and 0 <= ny < 32:
                img.putpixel((nx, ny), WHITE)

# Black veins through the orange
# Main veins radiating from body
for x in range(14, 54):
    # Horizontal veins at different Y positions
    vein_ys = [4, 8, 12, 16, 20, 24, 28]
    for vy in vein_ys:
        if vy < 32:
            img.putpixel((x, vy), BLACK)

# Diagonal veins
for i in range(35):
    x = 14 + i
    if x < 54:
        # Upward veins
        y1 = 16 - (i // 3)
        y2 = 16 + (i // 3)
        if 3 <= y1 < 29:
            img.putpixel((x, y1), BLACK)
        if 3 <= y2 < 29:
            img.putpixel((x, y2), BLACK)

# Cross veins connecting the main veins
for y in range(4, 28, 4):
    for x in range(20, 50, 6):
        if 0 <= x < 64 and 0 <= y < 32:
            img.putpixel((x, y), BLACK)
            img.putpixel((x, y+1), BLACK)

# Save
output_path = r"C:\Users\ampau\source\AiAssist\AiAssist\minecraft-addons\resource-packs\monarch_garden\textures\entity\monarch_butterfly.png"
img.save(output_path)
print(f"Saved improved monarch texture to {output_path}")

# Also save a larger preview
preview = img.resize((256, 128), Image.NEAREST)
preview.save(r"C:\Users\ampau\source\AiAssist\AiAssist\minecraft-addons\monarch_texture_preview.png")
print("Saved 4x preview")
