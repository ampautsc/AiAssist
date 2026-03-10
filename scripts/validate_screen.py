from PIL import Image
import pytesseract
import re

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
img = Image.open('mc_screen.png')
text = pytesseract.image_to_string(img)

play_found = bool(re.search(r'play', text, re.I))
worlds_found = bool(re.search(r'worlds', text, re.I))
settings_found = bool(re.search(r'settings', text, re.I))
edit_found = bool(re.search(r'edit', text, re.I))
marketplace_found = bool(re.search(r'marketplace', text, re.I))

print('SCREEN VALIDATION:')
print(f'Play button: {play_found}')
print(f'Worlds: {worlds_found}')
print(f'Settings: {settings_found}')
print(f'Edit: {edit_found}')
print(f'Marketplace: {marketplace_found}')

lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 2]
print('\nText lines:')
for line in lines[:20]:
    print(f'  {line}')
