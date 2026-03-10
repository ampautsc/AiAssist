import sys
from PIL import Image
import pytesseract

# Set tesseract path if needed (common Windows location)
try:
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
except:
    pass

image_path = sys.argv[1]
image = Image.open(image_path)

# Run OCR
data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

# Print detected text with coordinates
for i in range(len(data['text'])):
    text = data['text'][i].strip()
    if text:  # Only print non-empty text
        x = data['left'][i]
        y = data['top'][i]
        w = data['width'][i]
        h = data['height'][i]
        conf = data['conf'][i]
        print(f"{x},{y},{w},{h},{conf},{text}")
