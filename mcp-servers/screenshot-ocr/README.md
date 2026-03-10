# Screenshot OCR MCP Server

## Purpose
Find text on screenshots and return what it says with coordinates for clicking.

## Status
✅ **WORKING** - Successfully detecting text in Minecraft UI

## Test Results
Tested on Minecraft main menu screenshot:
- Found "Settings" button at coordinates (1277, 889)
- Confidence: 87%

## Usage

### Direct Python Script
```powershell
C:\Python312\python.exe .\scripts\ocr_engine.py "C:\path\to\screenshot.png"
```

### Search for specific text
```powershell
C:\Python312\python.exe .\scripts\ocr_engine.py "C:\path\to\screenshot.png" "Play"
```

### Output Format
```json
{
  "found": 1,
  "texts": [
    {
      "text": "Settings",
      "x": 1277,
      "y": 889,
      "width": 195,
      "height": 40,
      "confidence": 87
    }
  ]
}
```

## Dependencies
- Python with pytesseract package (already installed)
- Tesseract OCR executable (will auto-detect or fallback to easyocr)
- PIL/Pillow (already installed)

## Implementation Notes
- Uses pytesseract with Tesseract executable if available
- Falls back to easyocr if Tesseract not found
- Returns center coordinates (x, y) for easy clicking
- Filters low confidence results (< 30%)

## Limitations
- Minecraft uses stylized fonts that are sometimes hard for OCR to read
- May need to hard-code common button locations as fallback
- Works best on clear, high-contrast text

## Integration with Automation
Once text location is found:
```powershell
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
[Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
[Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
```
