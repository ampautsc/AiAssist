"""
Screen validation script for Minecraft automation
Usage: python validate_screen.py <screenshot_path>
"""
import sys
from PIL import Image, ImageEnhance
import pytesseract

# Set Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if len(sys.argv) < 2:
    print("unknown")
    sys.exit(0)

screenshot_path = sys.argv[1]

try:
    img = Image.open(screenshot_path)
    
    # Try multiple OCR approaches for better detection
    # Grayscale works better for Minecraft's fonts
    grayscale = img.convert('L')
    text = pytesseract.image_to_string(grayscale).lower()
    
    # Also try with high contrast
    enhanced = ImageEnhance.Contrast(grayscale).enhance(2.0)
    text_enhanced = pytesseract.image_to_string(enhanced).lower()
    
    # Combine both results
    combined_text = text + " " + text_enhanced
    
    # Screen detection logic - ORDER MATTERS! Check more specific screens first
    # Check for behavior/resource packs screens - these show "available" and the pack type
    if ('behavior packs' in combined_text or 'behaviour packs' in combined_text) and ('available' in combined_text or 'active' in combined_text):
        print('behavior_packs')
    elif ('resource packs' in combined_text) and ('available' in combined_text or 'active' in combined_text):
        print('resource_packs')
    # Check for world_edit FIRST - look for "Edit World" title text
    # This should appear at top middle of screen
    elif 'edit world' in combined_text:
        print('world_edit')
    elif 'update world' in combined_text or ('continue' in combined_text and 'cancel' in combined_text):
        print('confirm_dialog')
    elif 'content log' in combined_text or 'coordinates' in combined_text:
        print('in_game')
    # Check worlds_list - be more specific, look for "Select World" or world grid indicators
    # Don't just match "worlds" alone as it might appear elsewhere
    elif ('select' in combined_text and 'world' in combined_text) or ('new' in combined_text and 'import' in combined_text):
        print('worlds_list')
    # Main menu - if we see "play" (the big center button), that's main menu
    # May also see "marketplace" or "settings"
    elif 'play' in combined_text or 'marketplace' in combined_text:
        print('main_menu')
    else:
        print('unknown')
    
except Exception as e:
    # Debug output to stderr
    print(f"ERROR: {e}", file=sys.stderr)
    print("unknown")
