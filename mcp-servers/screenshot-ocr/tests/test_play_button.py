"""
Test script to find and verify Minecraft Play button location
Uses proper verification methodology
"""
import sys
import json
import subprocess
from pathlib import Path

def run_ocr(image_path):
    """Run OCR on image and return results"""
    result = subprocess.run(
        ['C:\\Python312\\python.exe', 
         'C:\\Users\\ampau\\source\\AiAssist\\AiAssist\\mcp-servers\\screenshot-ocr\\scripts\\ocr_engine.py',
         image_path],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)

def verify_main_menu(ocr_results):
    """Verify we're on main menu by checking for Settings button"""
    for text in ocr_results.get('texts', []):
        if 'settings' in text['text'].lower() and text['confidence'] > 80:
            return True, f"Found Settings at ({text['x']}, {text['y']})"
    return False, "Settings button not found - not on main menu"

def verify_worlds_list(ocr_results):
    """Verify we're on worlds list by checking for expected elements"""
    found_elements = []
    
    for text in ocr_results.get('texts', []):
        text_lower = text['text'].lower()
        
        # Look for "Create New" or world-related text
        if any(word in text_lower for word in ['create', 'new', 'world', 'play']):
            found_elements.append(f"{text['text']} at ({text['x']}, {text['y']})")
        
    # Also check that Settings is NOT in the same place (should be gone or moved)
    settings_in_main_position = False
    for text in ocr_results.get('texts', []):
        if 'settings' in text['text'].lower():
            if 1250 < text['x'] < 1310 and 850 < text['y'] < 900:
                settings_in_main_position = True
    
    if settings_in_main_position:
        return False, "Still on main menu - Settings button in same position"
    
    if found_elements:
        return True, f"On worlds list - found: {', '.join(found_elements)}"
    
    return False, "Cannot confirm worlds list - no expected elements found"

def test_play_button_coordinate(x, y, fixture_dir):
    """Test if clicking coordinate leads to worlds list"""
    print(f"\n=== Testing Play button at ({x}, {y}) ===")
    
    # This would be called from PowerShell to click and capture
    test_result = {
        'coordinate': {'x': x, 'y': y},
        'test_passed': False,
        'verification': {}
    }
    
    # Images would be captured by PowerShell automation
    before_image = fixture_dir / 'before_click.png'
    after_image = fixture_dir / 'after_click.png'
    
    if not before_image.exists() or not after_image.exists():
        test_result['error'] = f"Missing test images. Need: {before_image} and {after_image}"
        return test_result
    
    # Verify before state - should be main menu
    before_ocr = run_ocr(str(before_image))
    is_main, msg = verify_main_menu(before_ocr)
    test_result['verification']['before_click'] = {
        'is_main_menu': is_main,
        'message': msg
    }
    
    if not is_main:
        test_result['error'] = f"Starting state invalid: {msg}"
        return test_result
    
    # Verify after state - should be worlds list
    after_ocr = run_ocr(str(after_image))
    is_worlds, msg = verify_worlds_list(after_ocr)
    test_result['verification']['after_click'] = {
        'is_worlds_list': is_worlds,
        'message': msg,
        'found_elements': len(after_ocr.get('texts', []))
    }
    
    test_result['test_passed'] = is_main and is_worlds
    
    return test_result

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: test_play_button.py <x> <y>")
        print("Expects before_click.png and after_click.png in fixtures/")
        sys.exit(1)
    
    x = int(sys.argv[1])
    y = int(sys.argv[2])
    
    fixture_dir = Path(__file__).parent / 'fixtures'
    result = test_play_button_coordinate(x, y, fixture_dir)
    
    print(json.dumps(result, indent=2))
    
    if result['test_passed']:
        print("\n[PASS] TEST PASSED - Play button verified")
        sys.exit(0)
    else:
        print("\n[FAIL] TEST FAILED")
        sys.exit(1)
