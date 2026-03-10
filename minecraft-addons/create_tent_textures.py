"""Create popup tent textures"""
from PIL import Image, ImageDraw

# Create 128x128 tent texture
img = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Main fabric color (olive green)
fabric_color = (107, 142, 35, 255)
fabric_dark = (85, 107, 47, 255)
fabric_light = (154, 205, 50, 255)

# Fill main fabric area (0-51 x 0-63)
for y in range(64):
    for x in range(52):
        if (x + y) % 4 == 0:
            img.putpixel((x, y), fabric_dark)
        elif (x + y) % 4 == 2:
            img.putpixel((x, y), fabric_light)
        else:
            img.putpixel((x, y), fabric_color)

# Door/panel area (52-83 x 0-36) - tan
door_color = (139, 90, 43, 255)
for y in range(37):
    for x in range(52, 84):
        if (x + y) % 3 == 0:
            img.putpixel((x, y), (120, 80, 40, 255))
        else:
            img.putpixel((x, y), door_color)

# Add zipper detail
zipper_color = (192, 192, 192, 255)
for y in range(2, 35):
    img.putpixel((67, y), zipper_color)
    img.putpixel((68, y), zipper_color)

# Floor area (52-91 x 64-103)
floor_color = (85, 85, 85, 255)
for y in range(64, 104):
    for x in range(52, 92):
        if (x + y) % 2 == 0:
            img.putpixel((x, y), (70, 70, 70, 255))
        else:
            img.putpixel((x, y), floor_color)

# Frame poles (0-51 x 64-65)
pole_color = (139, 69, 19, 255)
for y in range(64, 66):
    for x in range(52):
        img.putpixel((x, y), pole_color)

img.save('resource-packs/monarch_garden/textures/entity/popup_tent.png')
print('Created popup_tent.png 128x128')

# Create 16x16 item icon
icon = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
draw_icon = ImageDraw.Draw(icon)

# Simple A-frame tent silhouette
draw_icon.polygon([(8, 2), (1, 14), (15, 14)], fill=fabric_color, outline=fabric_dark)
draw_icon.rectangle([6, 8, 10, 14], fill=door_color)

icon.save('resource-packs/monarch_garden/textures/items/popup_tent.png')
print('Created popup_tent icon 16x16')
