"""
Single validated click - enforces screenshot before and after every click
"""
import subprocess
import time
from PIL import Image
import pytesseract
import sys

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def take_screenshot(filename):
    """Take screenshot of current screen"""
    ps = f"""
$mc = Get-Process | Where-Object {{$_.ProcessName -like "*Minecraft*"}} | Select-Object -First 1
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class F {{
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}}
"@
[F]::SetForegroundWindow($mc.MainWindowHandle)
Start-Sleep -Milliseconds 1000
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$bmp.Save("{filename}")
"""
    subprocess.run(['powershell', '-Command', ps], capture_output=True)
    time.sleep(1)

def validate_screen(screenshot_path):
    """Validate what screen we're on"""
    img = Image.open(screenshot_path)
    text = pytesseract.image_to_string(img).lower()
    
    screens = {
        'main_menu': any(word in text for word in ['play', 'marketplace', 'achievements']),
        'worlds_list': any(word in text for word in ['worlds', 'realms']) and 'creative' in text,
        'world_edit': 'edit world' in text or 'world name' in text or 'game mode' in text,
        'in_game': 'content log' in text or 'coordinates' in text or '[blocks]' in text,
    }
    
    detected = [name for name, found in screens.items() if found]
    return detected[0] if detected else 'unknown'

def click(x, y):
    """Execute single click - MUST use Start-Process to launch separate PowerShell"""
    ps_cmd = f'powershell -File "C:\\Users\\ampau\\source\\AiAssist\\AiAssist\\mcp-servers\\minecraft-automation\\scripts\\click_working.ps1" -X {x} -Y {y}'
    subprocess.run(['powershell', '-Command', ps_cmd])
    time.sleep(5)

def validated_click(x, y, expected_screen_before, expected_screen_after):
    """
    Execute ONE click with full validation
    """
    print(f"\n{'='*80}")
    print(f"VALIDATED CLICK AT ({x}, {y})")
    print(f"{'='*80}")
    
    # STEP 1: Screenshot BEFORE
    print("STEP 1: Taking screenshot BEFORE click...")
    take_screenshot('before_click.png')
    
    # STEP 2: Validate current screen
    print("STEP 2: Validating current screen...")
    current_screen = validate_screen('before_click.png')
    print(f"  Current screen: {current_screen}")
    print(f"  Expected: {expected_screen_before}")
    
    if current_screen != expected_screen_before:
        print(f"ERROR: Expected {expected_screen_before}, but on {current_screen}")
        return False
    
    print("✓ Screen validated")
    
    # STEP 3: Click ONCE
    print(f"STEP 3: Clicking at ({x}, {y})...")
    click(x, y)
    
    # STEP 4: Screenshot AFTER
    print("STEP 4: Taking screenshot AFTER click...")
    take_screenshot('after_click.png')
    
    # STEP 5: Validate new screen
    print("STEP 5: Validating new screen...")
    new_screen = validate_screen('after_click.png')
    print(f"  New screen: {new_screen}")
    print(f"  Expected: {expected_screen_after}")
    
    if new_screen != expected_screen_after:
        print(f"ERROR: Expected {expected_screen_after}, but on {new_screen}")
        return False
    
    print("✓ Screen transition validated")
    print(f"{'='*80}\n")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python validated_click.py <x> <y> <expected_before> <expected_after>")
        sys.exit(1)
    
    x = int(sys.argv[1])
    y = int(sys.argv[2])
    before = sys.argv[3]
    after = sys.argv[4]
    
    success = validated_click(x, y, before, after)
    sys.exit(0 if success else 1)
