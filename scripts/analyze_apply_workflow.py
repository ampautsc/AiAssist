import pytesseract
from PIL import Image
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

clicks = [
    (1, 395, 527, '19:21:30'),
    (2, 553, 850, '19:21:42'),
    (3, 320, 787, '19:21:47'),
    (4, 1656, 380, '19:21:55'),
    (5, 818, 635, '19:22:00'),
    (6, 1352, 109, '19:22:10'),
    (7, 915, 253, '19:22:13'),
    (8, 1239, 232, '19:22:16'),
    (9, 33, 45, '19:22:20'),
    (10, 145, 341, '19:22:22'),
    (11, 225, 901, '19:22:33'),
    (12, 1207, 831, '19:22:39')
]

print("=== Apply Packs Workflow ===\n")
for num, x, y, time in clicks:
    before_path = f'minecraft-navigation-data/click_{num}_before.png'
    try:
        before = Image.open(before_path)
        text = pytesseract.image_to_string(before).lower()
        keywords = [w for w in ['resource', 'behavior', 'add-on', 'addon', 'pack', 'active', 'available', 'play', 'edit', 'world', 'settings'] if w in text]
        print(f'Click {num} at ({x},{y}): {", ".join(keywords[:4]) if keywords else "[analyzing...]"}')
    except:
        print(f'Click {num} at ({x},{y}): [file not found]')
