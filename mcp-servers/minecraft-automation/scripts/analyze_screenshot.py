"""
Enhanced screenshot analysis for Minecraft screens
"""
import sys
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if len(sys.argv) < 2:
    print("Usage: python analyze_screenshot.py <image_path>")
    sys.exit(1)

image_path = sys.argv[1]
img = Image.open(image_path)

print(f"Image analysis for: {image_path}")
print(f"Size: {img.size}")
print(f"Mode: {img.mode}")
print(f"Format: {img.format}")
print()

# Convert to RGB for consistency
if img.mode != 'RGB':
    img = img.convert('RGB')

# Try multiple OCR approaches
approaches = {
    'raw': img,
    'grayscale': img.convert('L'),
    'high_contrast': ImageEnhance.Contrast(img.convert('L')).enhance(2.5),
    'sharpened': img.filter(ImageFilter.SHARPEN),
}

keywords_to_find = ['play', 'marketplace', 'settings', 'achievements', 'store', 
                    'worlds', 'realms', 'creative', 'edit', 'world', 'resource',
                    'behavior', 'packs', 'minecraft']

best_result = None
best_score = 0

for name, processed_img in approaches.items():
    try:
        text = pytesseract.image_to_string(processed_img).lower()
        found_keywords = [k for k in keywords_to_find if k in text]
        score = len(found_keywords)
        
        print(f"=== Approach: {name} ===")
        print(f"Text length: {len(text)} chars")
        print(f"Keywords found ({score}): {found_keywords}")
        
        if score > best_score:
            best_score = score
            best_result = (name, text, found_keywords)
        
        if score > 0:
            # Show sample of text
            print(f"Sample text: {' '.join(text.split())[:200]}")
        print()
    except Exception as e:
        print(f"Error with {name}: {e}")
        print()

if best_result:
    name, text, keywords = best_result
    print(f"=== BEST RESULT: {name} with {best_score} keywords ===")
    print(f"Keywords: {keywords}")
    print(f"Full text:\n{text}")
else:
    print("No keywords found with any approach")
    print("Trying region-based analysis...")
    
    # Try analyzing specific screen regions
    width, height = img.size
    regions = {
        'center': (width//4, height//4, 3*width//4, 3*height//4),
        'bottom': (0, height*2//3, width, height),
        'top': (0, 0, width, height//3),
    }
    
    for region_name, coords in regions.items():
        region_img = img.crop(coords)
        text = pytesseract.image_to_string(region_img).lower()
        print(f"\n=== Region: {region_name} ===")
        print(f"Text: {' '.join(text.split())[:200]}")
