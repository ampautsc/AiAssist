from PIL import Image
import pytesseract

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

img = Image.open('screenshot.png')
data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

print("Looking for 'Activate' text...")
for i in range(len(data['text'])):
    text = data['text'][i].strip()
    if text and 'activate' in text.lower():
        x = data['left'][i]
        y = data['top'][i]
        w = data['width'][i]
        h = data['height'][i]
        center_x = x + w // 2
        center_y = y + h // 2
        print(f"Found: '{text}' at ({x}, {y}), size {w}x{h}, center: ({center_x}, {center_y})")
