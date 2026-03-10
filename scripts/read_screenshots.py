import pytesseract
from PIL import Image
import json
import os
import sys

# Configure tesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

data_path = r'C:\Users\ampau\source\AiAssist\AiAssist\minecraft-navigation-data'

# Read navigation data
with open(os.path.join(data_path, 'navigation_data.json'), 'r') as f:
    nav_data = json.load(f)

results = []

for click in nav_data:
    num = click['num']
    
    before_path = os.path.join(data_path, f'click_{num}_before.png')
    after_path = os.path.join(data_path, f'click_{num}_after.png')
    
    print(f"\n{'='*80}")
    print(f"CLICK {num}: ({click['x']}, {click['y']}) at {click['time']}")
    print(f"{'='*80}")
    
    if os.path.exists(before_path):
        img_before = Image.open(before_path)
        text_before = pytesseract.image_to_string(img_before)
        
        print("\nBEFORE CLICK:")
        print("-" * 40)
        # Print non-empty lines
        lines_before = [line.strip() for line in text_before.split('\n') if line.strip()]
        for line in lines_before[:20]:  # First 20 lines
            print(f"  {line}")
        
        img_before.close()
    
    if os.path.exists(after_path):
        img_after = Image.open(after_path)
        text_after = pytesseract.image_to_string(img_after)
        
        print("\nAFTER CLICK:")
        print("-" * 40)
        # Print non-empty lines
        lines_after = [line.strip() for line in text_after.split('\n') if line.strip()]
        for line in lines_after[:20]:  # First 20 lines
            print(f"  {line}")
        
        img_after.close()
        
        results.append({
            'click': num,
            'coordinates': f"({click['x']}, {click['y']})",
            'time': click['time'],
            'before_text': lines_before,
            'after_text': lines_after
        })

# Save results
output_path = os.path.join(data_path, 'ocr_analysis.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"\n\n{'='*80}")
print(f"OCR analysis saved to {output_path}")
print(f"{'='*80}")
