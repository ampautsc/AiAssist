"""
Test different preprocessing strategies on Minecraft screenshot
"""
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np

img_path = r"C:\Users\ampau\AppData\Local\Temp\minecraft_main_menu.png"
img = Image.open(img_path)

# Strategy 1: High contrast + threshold
img1 = img.convert('L')
enhancer = ImageEnhance.Contrast(img1)
img1 = enhancer.enhance(3.0)
img_array = np.array(img1)
img_array = ((img_array > 100) * 255).astype(np.uint8)
img1 = Image.fromarray(img_array)
img1.save(r"C:\Users\ampau\AppData\Local\Temp\minecraft_processed1.png")
print("Saved: minecraft_processed1.png (high contrast + threshold)")

# Strategy 2: Invert if dark background
img2 = img.convert('L')
img2 = ImageOps.autocontrast(img2, cutoff=2)
# Check if dark background (Minecraft usually is)
avg_brightness = np.mean(np.array(img2))
if avg_brightness < 128:
    img2 = ImageOps.invert(img2)
img2.save(r"C:\Users\ampau\AppData\Local\Temp\minecraft_processed2.png")
print("Saved: minecraft_processed2.png (auto contrast + invert)")

# Strategy 3: Sharpen + edge enhance
img3 = img.convert('L')
img3 = img3.filter(ImageFilter.SHARPEN)
img3 = img3.filter(ImageFilter.EDGE_ENHANCE_MORE)
enhancer = ImageEnhance.Contrast(img3)
img3 = enhancer.enhance(2.0)
img3.save(r"C:\Users\ampau\AppData\Local\Temp\minecraft_processed3.png")
print("Saved: minecraft_processed3.png (sharpen + edge enhance)")

# Strategy 4: Bilateral blur (preserve edges) + threshold
img4 = img.convert('L')
# Simple gaussian blur then threshold
img4 = img4.filter(ImageFilter.GaussianBlur(radius=1))
enhancer = ImageEnhance.Contrast(img4)
img4 = enhancer.enhance(2.5)
img_array = np.array(img4)
threshold = np.mean(img_array) + np.std(img_array)
img_array = ((img_array > threshold) * 255).astype(np.uint8)
img4 = Image.fromarray(img_array)
img4.save(r"C:\Users\ampau\AppData\Local\Temp\minecraft_processed4.png")
print("Saved: minecraft_processed4.png (adaptive threshold)")

print("\nNow testing OCR on each preprocessed version...")

import pytesseract

# Find Tesseract
import os
paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Tesseract-OCR\tesseract.exe",
]
for p in paths:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break

for i in range(1, 5):
    test_img = Image.open(f"C:\\Users\\ampau\\AppData\\Local\\Temp\\minecraft_processed{i}.png")
    config = r'--oem 3 --psm 11'
    text = pytesseract.image_to_string(test_img, config=config)
    words = [w.strip() for w in text.split('\n') if w.strip()]
    print(f"\nStrategy {i} found {len(words)} text items:")
    print(words[:10])  # First 10
