# Windows Cursor Positioning and DPI Scaling - Complete Technical Reference

## Executive Summary

**Critical Finding**: Windows cursor APIs (GetCursorPos, SetCursorPos, System.Windows.Forms.Cursor.Position) operate in **logical coordinates** (DPI-scaled), while screenshot APIs capture **physical pixels**. This creates a coordinate space mismatch when DPI scaling is enabled.

**Root Cause**: When Windows display scaling is set to anything other than 100%, the system creates two coordinate spaces:
- **Logical Coordinates**: What cursor APIs use (scaled by DPI %)
- **Physical Coordinates**: Actual screen pixels (what screenshots capture)

**Solution**: Convert between coordinate spaces using the DPI scaling factor.

---

## Table of Contents
1. [Understanding Windows DPI Scaling](#understanding-windows-dpi-scaling)
2. [Coordinate Space Fundamentals](#coordinate-space-fundamentals)
3. [Cursor APIs and Their Behavior](#cursor-apis-and-their-behavior)
4. [The DPI Scaling Problem](#the-dpi-scaling-problem)
5. [Coordinate Conversion Methods](#coordinate-conversion-methods)
6. [PowerShell Implementation](#powershell-implementation)
7. [Testing and Validation](#testing-and-validation)
8. [Common Pitfalls](#common-pitfalls)

---

## Understanding Windows DPI Scaling

### What is DPI Scaling?

DPI (Dots Per Inch) scaling is Windows' method of making UI elements larger on high-resolution displays. It was introduced to prevent UI from becoming microscopic on modern high-DPI displays.

### Display Scaling Percentages

Common Windows display scale settings:
- **100%**: No scaling (1:1 logical to physical)
- **125%**: 1.25x scaling
- **150%**: 1.5x scaling (common on 2560x1440 displays)
- **175%**: 1.75x scaling
- **200%**: 2x scaling (common on 4K displays)

### How Windows Implements Scaling

Windows provides different "DPI Awareness Modes" for applications:

1. **DPI Unaware**: 
   - Application renders at 96 DPI (100% scale) always
   - Windows bitmap-stretches the result (appears blurry)
   
2. **System DPI Aware**:
   - Application renders at primary display's DPI at session start
   - Becomes blurry when moved to different DPI display
   
3. **Per-Monitor DPI Aware** (v1 and v2):
   - Application can respond to DPI changes dynamically
   - Receives WM_DPICHANGED notifications
   - Can render crisply on all displays

### Example: 150% Scaling

Monitor: 2560x1440 physical pixels
Windows Scaling: 150%
Logical Resolution: 2560 / 1.5 = 1706.67 ≈ **1707 wide**
                    1440 / 1.5 = 960 ≈ **960 tall**

**Result**: Applications see a "screen" of 1707x960, but the actual monitor has 2560x1440 pixels.

---

## Coordinate Space Fundamentals

### Physical Coordinates

**Definition**: The actual pixels on the display hardware.

**Characteristics**:
- Always matches monitor's native resolution
- What screenshot APIs capture
- What the GPU renders to
- Independent of DPI scaling settings

**Example at 150% scaling**:
- Monitor native: 2560x1440
- Physical coordinate (2560, 1440) = bottom-right corner
- Physical coordinate (0, 0) = top-left corner

### Logical Coordinates

**Definition**: DPI-scaled coordinates that applications typically use.

**Characteristics**:
- What cursor APIs return and accept
- What GetSystemMetrics() returns
- What Screen.PrimaryScreen.Bounds reports
- Scaled by display scaling percentage

**Example at 150% scaling**:
- Logical resolution: 1707x960
- Logical coordinate (1707, 960) = bottom-right corner
- Logical coordinate (0, 0) = top-left corner

### The Relationship

```
Physical Coordinate = Logical Coordinate × DPI Scale Factor
Logical Coordinate = Physical Coordinate ÷ DPI Scale Factor

At 150% scaling (factor = 1.5):
Physical X = Logical X × 1.5
Physical Y = Logical Y × 1.5

Logical X = Physical X ÷ 1.5
Logical Y = Physical Y ÷ 1.5
```

---

## Cursor APIs and Their Behavior

### Windows API: GetCursorPos / SetCursorPos

**Header**: `winuser.h`  
**Library**: `User32.dll`

```c++
BOOL GetCursorPos([out] LPPOINT lpPoint);
BOOL SetCursorPos([in] int X, [in] int Y);
```

**Critical Fact**: These APIs **always use logical coordinates**.

**From Microsoft Documentation**:
> "The cursor position is always specified in screen coordinates and is not affected by the mapping mode of the window that contains the cursor."

**What "screen coordinates" means**: Logical coordinates (DPI-scaled), not physical pixels.

### .NET: System.Windows.Forms.Cursor.Position

**Namespace**: `System.Windows.Forms`  
**Type**: `System.Drawing.Point`

```csharp
Point position = Cursor.Position;
Cursor.Position = new Point(x, y);
```

**Implementation**: Internally calls Win32 GetCursorPos/SetCursorPos.

**Result**: Also uses **logical coordinates**.

### PowerShell: [System.Windows.Forms.Cursor]::Position

```powershell
Add-Type -AssemblyName System.Windows.Forms
$pos = [System.Windows.Forms.Cursor]::Position
Write-Host "X: $($pos.X), Y: $($pos.Y)"

# Move cursor
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(100, 100)
```

**Coordinate Space**: Logical coordinates (same as .NET).

---

## The DPI Scaling Problem

### Problem Statement

When you:
1. Take a screenshot at **physical resolution** (e.g., 2560x1440)
2. Use OCR to find element at position (X, Y) in screenshot
3. Try to move cursor to (X, Y) using Cursor.Position

**Result**: Cursor goes to wrong location because screenshot coordinates are physical, but Cursor.Position expects logical.

### Real Example (Our Bug)

**Environment**:
- Monitor: 2560x1440 native resolution
- Windows Scaling: 150%
- Logical Resolution: 1707x960

**Workflow**:
1. Screenshot captured via Windows+PrintScreen: **2560x1440 pixels**
2. OCR finds "Behavior Packs" button at: **(200, 1266)** in screenshot
3. PowerShell moves cursor: `Cursor.Position = (200, 1266)`
4. **Problem**: Cursor goes to wrong location

**Why it fails**:
```
Screenshot coordinate: (200, 1266) ← Physical space
Cursor.Position expects: (???, ???) ← Logical space

To convert:
Logical X = 200 ÷ 1.5 = 133
Logical Y = 1266 ÷ 1.5 = 844

Correct cursor position: (133, 844)
```

**What actually happened**:
- Set cursor to logical (200, 1266)
- At 150% scaling, this maps to physical (300, 1899)
- But physical screen only goes to (2560, 1440)
- Cursor clamped to bottom-left area of screen

---

## Coordinate Conversion Methods

### Method 1: Manual Calculation

**If you know the DPI scaling percentage**:

```powershell
# For 150% scaling (factor = 1.5)
$scaleFactor = 1.5

# Screenshot coordinate (physical)
$physicalX = 200
$physicalY = 1266

# Convert to logical
$logicalX = [Math]::Round($physicalX / $scaleFactor)
$logicalY = [Math]::Round($physicalY / $scaleFactor)

# Result: (133, 844)
```

### Method 2: Query Current DPI

**Get DPI for a specific window** (Windows 10 1607+):

```powershell
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DpiHelper {
    [DllImport("user32.dll")]
    public static extern uint GetDpiForWindow(IntPtr hwnd);
    
    [DllImport("user32.dll")]
    public static extern uint GetDpiForSystem();
}
"@

# Get DPI for a window
$hwnd = [IntPtr]::Zero  # Get actual window handle
$dpi = [DpiHelper]::GetDpiForWindow($hwnd)

# Get system DPI
$systemDpi = [DpiHelper]::GetDpiForSystem()

# Calculate scale factor
$scaleFactor = $dpi / 96.0  # 96 is baseline DPI (100%)
```

**Example Results**:
- 96 DPI → 1.0 scale factor (100%)
- 120 DPI → 1.25 scale factor (125%)
- 144 DPI → 1.5 scale factor (150%)
- 192 DPI → 2.0 scale factor (200%)

### Method 3: Compare Screen Dimensions

**Determine scale factor by comparing logical vs physical**:

```powershell
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ScreenHelper {
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
}
"@

# Get logical dimensions (DPI-scaled)
$logicalWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$logicalHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height

# Get physical dimensions
# SM_CXSCREEN = 0, SM_CYSCREEN = 1
$physicalWidth = [ScreenHelper]::GetSystemMetrics(0)
$physicalHeight = [ScreenHelper]::GetSystemMetrics(1)

# Wait, this doesn't work as expected...
# GetSystemMetrics ALSO returns logical coordinates!

# Better approach: If you have a screenshot, you know the physical size
$screenshotWidth = 2560
$screenshotHeight = 1440

# Calculate scale factor
$scaleX = $screenshotWidth / $logicalWidth
$scaleY = $screenshotHeight / $logicalHeight

Write-Host "Scale Factor X: $scaleX"  # 1.5
Write-Host "Scale Factor Y: $scaleY"  # 1.5
```

### Method 4: Use Screenshot Dimensions

**Most reliable for our use case**:

```powershell
# When you take a screenshot, you know its dimensions
$screenshotPath = "C:\path\to\screenshot.png"
Add-Type -AssemblyName System.Drawing
$screenshot = [System.Drawing.Image]::FromFile($screenshotPath)
$physicalWidth = $screenshot.Width
$physicalHeight = $screenshot.Height
$screenshot.Dispose()

# Get logical dimensions
Add-Type -AssemblyName System.Windows.Forms
$logicalWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$logicalHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height

# Calculate scale factor
$scaleFactorX = $physicalWidth / $logicalWidth
$scaleFactorY = $physicalHeight / $logicalHeight
```

---

## PowerShell Implementation

### Complete Coordinate Conversion Function

```powershell
function Convert-PhysicalToLogicalCoordinates {
    param(
        [Parameter(Mandatory=$true)]
        [int]$PhysicalX,
        
        [Parameter(Mandatory=$true)]
        [int]$PhysicalY,
        
        [Parameter(Mandatory=$true)]
        [int]$ScreenshotWidth,
        
        [Parameter(Mandatory=$true)]
        [int]$ScreenshotHeight
    )
    
    Add-Type -AssemblyName System.Windows.Forms
    
    # Get logical screen dimensions
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $logicalWidth = $screen.Bounds.Width
    $logicalHeight = $screen.Bounds.Height
    
    # Calculate DPI scale factors
    $scaleX = $ScreenshotWidth / $logicalWidth
    $scaleY = $ScreenshotHeight / $logicalHeight
    
    # Convert coordinates
    $logicalX = [Math]::Round($PhysicalX / $scaleX)
    $logicalY = [Math]::Round($PhysicalY / $scaleY)
    
    return @{
        X = $logicalX
        Y = $logicalY
        ScaleFactorX = $scaleX
        ScaleFactorY = $scaleY
    }
}

# Usage
$result = Convert-PhysicalToLogicalCoordinates `
    -PhysicalX 200 `
    -PhysicalY 1266 `
    -ScreenshotWidth 2560 `
    -ScreenshotHeight 1440

Write-Host "Physical: (200, 1266)"
Write-Host "Logical: ($($result.X), $($result.Y))"
Write-Host "Scale: $($result.ScaleFactorX)x"

# Now move cursor to correct position
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($result.X, $result.Y)
```

### Integration with Click Script

```powershell
param(
    [int]$PhysicalX,
    [int]$PhysicalY,
    [int]$ScreenshotWidth = 2560,
    [int]$ScreenshotHeight = 1440
)

# Add required assemblies
Add-Type -AssemblyName System.Windows.Forms

# Calculate logical coordinates
$logicalWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$logicalHeight = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height

$scaleX = $ScreenshotWidth / $logicalWidth
$scaleY = $ScreenshotHeight / $logicalHeight

$logicalX = [Math]::Round($PhysicalX / $scaleX)
$logicalY = [Math]::Round($PhysicalY / $scaleY)

Write-Host "Converting coordinates:"
Write-Host "  Physical: ($PhysicalX, $PhysicalY)"
Write-Host "  Logical: ($logicalX, $logicalY)"
Write-Host "  Scale: ${scaleX}x"

# Define MouseClick class (before cursor movement)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseClick {
    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
    public const uint MOUSEEVENTF_LEFTDOWN = 0x02;
    public const uint MOUSEEVENTF_LEFTUP = 0x04;
}
"@

# Move cursor to logical coordinates
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($logicalX, $logicalY)

# Wait for cursor to move
Start-Sleep -Milliseconds 500

# Execute click
[MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
[MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)

Write-Host "Click executed at logical ($logicalX, $logicalY)"
```

---

## Testing and Validation

### Test 1: Verify Your DPI Scaling

```powershell
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Get logical resolution
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$logicalWidth = $screen.Bounds.Width
$logicalHeight = $screen.Bounds.Height

Write-Host "Logical Resolution: ${logicalWidth}x${logicalHeight}"

# Take a screenshot and check its dimensions
# (Use Windows+PrintScreen, then check file properties)
# If they differ, you have DPI scaling enabled
```

### Test 2: Four Corners Test

```powershell
function Test-CursorPositioning {
    Add-Type -AssemblyName System.Windows.Forms
    
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $width = $screen.Bounds.Width
    $height = $screen.Bounds.Height
    
    $corners = @(
        @{ Name = "Top-Left"; X = 0; Y = 0 },
        @{ Name = "Top-Right"; X = $width - 1; Y = 0 },
        @{ Name = "Bottom-Left"; X = 0; Y = $height - 1 },
        @{ Name = "Bottom-Right"; X = $width - 1; Y = $height - 1 }
    )
    
    foreach ($corner in $corners) {
        Write-Host "`nMoving to $($corner.Name): ($($corner.X), $($corner.Y))"
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($corner.X, $corner.Y)
        Start-Sleep -Seconds 1
        
        $actual = [System.Windows.Forms.Cursor]::Position
        Write-Host "Actual position: ($($actual.X), $($actual.Y))"
    }
}

Test-CursorPositioning
```

### Test 3: Validate Conversion

```powershell
# Test the coordinate conversion
$physicalX = 1280  # Middle of 2560
$physicalY = 720   # Middle of 1440

$result = Convert-PhysicalToLogicalCoordinates `
    -PhysicalX $physicalX `
    -PhysicalY $physicalY `
    -ScreenshotWidth 2560 `
    -ScreenshotHeight 1440

# At 150% scaling, should convert to:
# 1280 / 1.5 = 853
# 720 / 1.5 = 480

Write-Host "Physical center: ($physicalX, $physicalY)"
Write-Host "Logical center: ($($result.X), $($result.Y))"
Write-Host "Expected: (853, 480)"
```

---

## Common Pitfalls

### Pitfall 1: Assuming GetSystemMetrics Returns Physical Pixels

❌ **Wrong**:
```powershell
[DllImport("user32.dll")]
public static extern int GetSystemMetrics(int nIndex);

$width = [Helper]::GetSystemMetrics(0)  # SM_CXSCREEN
# This returns LOGICAL width, not physical!
```

✅ **Correct**:
```powershell
# GetSystemMetrics is DPI-aware and returns logical coordinates
# To get physical pixels, use screenshot dimensions
```

### Pitfall 2: Forgetting DPI Scaling Exists

❌ **Wrong**:
```powershell
# Found button at (200, 1266) in screenshot
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(200, 1266)
# This will fail if DPI scaling is enabled!
```

✅ **Correct**:
```powershell
# Convert from screenshot (physical) to cursor (logical) coordinates first
```

### Pitfall 3: Not Handling Non-Uniform Scaling

⚠️ **Caution**:
```powershell
# In theory, X and Y could have different scale factors
# In practice, Windows always scales uniformly, but check both
$scaleX = $screenshotWidth / $logicalWidth
$scaleY = $screenshotHeight / $logicalHeight

if ([Math]::Abs($scaleX - $scaleY) > 0.01) {
    Write-Warning "Non-uniform scaling detected!"
}
```

### Pitfall 4: Rounding Errors

❌ **Wrong**:
```powershell
$logicalX = $physicalX / $scaleFactor  # Can result in 133.333...
```

✅ **Correct**:
```powershell
$logicalX = [Math]::Round($physicalX / $scaleFactor)
```

### Pitfall 5: Changing DPI Awareness Mid-Process

❌ **Dangerous**:
```powershell
# Don't try to change DPI awareness after process start
# It can cause forced reset of entire process DPI awareness
```

✅ **Safe**:
```powershell
# Accept the DPI awareness mode your process was started with
# Convert coordinates as needed
```

---

## Quick Reference

### Key Facts

1. **Cursor APIs (GetCursorPos, SetCursorPos, Cursor.Position)**: Use **logical coordinates**
2. **Screenshot pixels**: Are **physical coordinates**
3. **Conversion formula**: 
   - `Logical = Physical ÷ Scale Factor`
   - `Physical = Logical × Scale Factor`
4. **Common scale factors**:
   - 100% → 1.0
   - 125% → 1.25
   - 150% → 1.5
   - 200% → 2.0

### Problem-Solution Matrix

| Symptom | Cause | Solution |
|---------|-------|----------|
| Cursor goes to wrong location when clicking screenshot coordinates | Using physical coordinates for logical API | Convert: `Logical = Physical ÷ ScaleFactor` |
| Cursor goes to bottom-left when trying to click near bottom | Logical coordinate exceeds screen bounds | Verify conversion is correct |
| GetSystemMetrics returns unexpected values | It returns logical, not physical | Use screenshot dimensions for physical |
| Elements appear blurry | Application is DPI unaware | Not relevant for automation (but good to know) |

### Code Templates

**Get Scale Factor**:
```powershell
Add-Type -AssemblyName System.Windows.Forms
$logicalWidth = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width
$scaleFactor = $screenshotWidth / $logicalWidth
```

**Convert Coordinate**:
```powershell
$logicalX = [Math]::Round($physicalX / $scaleFactor)
$logicalY = [Math]::Round($physicalY / $scaleFactor)
```

**Move Cursor**:
```powershell
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($logicalX, $logicalY)
```

---

## References

- [Microsoft: High DPI Desktop Application Development](https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows)
- [Microsoft: GetCursorPos Function](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getcursorpos)
- [Microsoft: SetCursorPos Function](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setcursorpos)
- [Stack Overflow: Getting Mouse Position in C#](https://stackoverflow.com/questions/1316681/getting-mouse-position-in-c-sharp)

---

## Document History

- **Created**: January 19, 2026
- **Author**: Sis (AI Assistant)
- **Purpose**: Comprehensive reference for Windows cursor positioning and DPI scaling
- **Context**: Solving Minecraft automation MCP server coordinate mismatch bug

---

## Conclusion

Windows cursor positioning is straightforward **once you understand the coordinate space distinction**. The key insight is:

> **Cursor APIs use logical (DPI-scaled) coordinates, not physical pixels.**

When automating UI interactions with screenshots:
1. **Screenshot**: Physical pixels (e.g., 2560x1440)
2. **OCR/Find Element**: Physical coordinates
3. **Convert**: Physical → Logical using scale factor
4. **Move Cursor**: Use logical coordinates

This approach works regardless of DPI scaling setting and ensures cursor goes to correct location every time.
