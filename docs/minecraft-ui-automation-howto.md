# Minecraft UI Automation - How To

## Overview
Hybrid automation approach for navigating Minecraft menus using OCR + hard-coded coordinates.

## Status
✅ OCR Tool Built - Can detect some Minecraft UI text (e.g., "Settings" at 90% confidence)  
✅ Screenshot/Click Automation Working  
⚠️ Menu Navigation Needs Refinement - Coordinates may need adjustment for specific menu states  

## Tools Built

### 1. OCR Engine
**Location:** `mcp-servers\screenshot-ocr\scripts\ocr_engine.py`  
**Usage:**
```powershell
C:\Python312\python.exe .\mcp-servers\screenshot-ocr\scripts\ocr_engine.py "path\to\screenshot.png" [optional_search_text]
```
**Features:**
- Image preprocessing (contrast, sharpening, thresholding)
- Multiple detection strategies (3 different Tesseract PSM modes)
- Returns JSON with text + clickable coordinates
- 30-50% confidence threshold filtering

### 2. Quick World Loader
**Location:** `scripts\QuickLoad-MinecraftWorld.ps1`  
**Usage:**
```powershell
.\QuickLoad-MinecraftWorld.ps1
```
**Process:**
1. Activates Minecraft window
2. Takes screenshot
3. Tries OCR to find "Play" button
4. Falls back to coordinate (1280,780) if OCR fails
5. Clicks through to first world
6. Waits for debugger connection

## Coordinates (2560x1440 Resolution)

### Main Menu - TESTED
- **Settings Button:** (1277, 889) - ✅ OCR detectable at 90% confidence

### Main Menu - ESTIMATED (Need verification)
- **Play Button:** (1280, 780)
- **Achievements:** (400, 780)
- **Dressing Room:** (400, 890)

### Worlds Screen - ESTIMATED  
- **First World Entry:** (1280, 500)
- **Second World Entry:** (1280, 620)
- **Third World Entry:** (1280, 740)
- **Play on Selected World:** (1280, 1200)

## Known Limitations

### OCR Challenges
- Minecraft uses custom stylized/pixelated fonts
- Gradients and shadow effects reduce OCR accuracy
- Animated UI elements cause detection issues
- Works best on simple high-contrast text

### Coordination Challenges
- Menu layouts may vary based on game state
- Button positions can shift with different content
- Resolution scaling affects coordinates
- UWP window activation sometimes unreliable

## Recommended Workflow

### For Initial Setup (One-Time)
1. Take screenshots of each menu state manually
2. Use OCR tool to detect what text is readable
3. Manually measure coordinates for undetectable buttons
4. Document tested coordinates

### For Automation
1. Try OCR first
2. Fall back to known coordinates
3. Verify screen changed after each click (pixel comparison)
4. Re-screenshot and adjust if navigation fails

### For Repeatability
Document exact sequence:
```
Main Menu (visible: "Settings")
  → Click (1280,780) or OCR "Play"
  → Wait 1.5s
Worlds List (visible: world names)
  → Click (1280,500) for first world
  → Wait 1s
World Details (visible: world name, "Play" button)
  → Click (1280,1200) or OCR "Play"
  → Wait 5s
In-Game (visible: world loaded)
  → Debugger should connect on port 19144
```

## Verification Methods

### Screen Change Detection
```powershell
# Compare before/after screenshots
$diff = 0
for($y=0; $y -lt $height; $y+=10) {
    for($x=0; $x -lt $width; $x+=10) {
        if($before.GetPixel($x,$y).ToArgb() -ne $after.GetPixel($x,$y).ToArgb()) {
            $diff++
        }
    }
}
$pctChange = ($diff / $totalPixels) * 100
# Expect >5% for menu transitions, >10% for world loading
```

### Debugger Connection
```powershell
$connected = netstat -ano | Select-String "19144" | Select-String "ESTABLISHED"
```

### Debug Console Check
Look for:
- ✅ `[OK] monarch:butterfly spawned`  
- ❌ Texture errors
- ❌ TypeError messages
- ❌ Block resolution errors

## Next Steps for Improvement

1. **Manual Coordinate Verification**
   - Load Minecraft manually
   - Take screenshots at each menu state
   - Use image viewer to note exact button positions
   - Update coordinates in script

2. **Enhanced OCR Training**
   - Save preprocessed images to see what OCR "sees"
   - Try different Tesseract page segmentation modes
   - Consider easyocr as alternative (no external executable needed)

3. **Robust Error Handling**
   - Detect when clicks fail (no screen change)
   - Retry with alternate coordinates
   - Take diagnostic screenshots on failure

4. **State Detection**
   - Identify which menu we're on before clicking
   - Adjust strategy based on current screen
   - Handle unexpected popup dialogs

## Files Created

- `mcp-servers/screenshot-ocr/` - OCR MCP server
- `mcp-servers/screenshot-ocr/scripts/ocr_engine.py` - Python OCR engine
- `scripts/QuickLoad-MinecraftWorld.ps1` - Automation script
- `docs/minecraft-ui-automation-howto.md` - This documentation

## Success Criteria

✅ Tool can take screenshots programmatically  
✅ Tool can perform OCR and return coordinates  
✅ Tool can click screen positions  
✅ Tool can detect screen changes  
⚠️ Navigation sequence needs coordinate refinement  
⚠️ Debugger connection pending successful world load
