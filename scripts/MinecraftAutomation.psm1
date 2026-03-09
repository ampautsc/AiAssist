# Minecraft Automation Toolkit

## Screenshot Capture
function Capture-MinecraftWindow {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    # Get Minecraft process and window
    $process = Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue
    if (-not $process) {
        Write-Host "Minecraft not running" -ForegroundColor Red
        return $null
    }
    
    # Get window handle
    $hwnd = $process.MainWindowHandle
    
    # Define Win32 types only if not already defined
    if (-not ([System.Management.Automation.PSTypeName]'Win32Automation').Type) {
        Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class Win32Automation {
                [DllImport("user32.dll")]
                public static extern bool GetWindowRect(IntPtr hwnd, ref WinRECT rect);
                [DllImport("user32.dll")]
                public static extern bool SetForegroundWindow(IntPtr hWnd);
                [DllImport("user32.dll")]
                public static extern bool GetCursorInfo(ref CursorINFO pci);
                [DllImport("user32.dll")]
                public static extern bool DrawIconEx(IntPtr hdc, int xLeft, int yTop, 
                    IntPtr hIcon, int cxWidth, int cyHeight, uint istepIfAniCur, 
                    IntPtr hbrFlickerFreeDraw, uint diFlags);
                public const int DI_NORMAL = 0x0003;
            }
            public struct WinRECT {
                public int Left;
                public int Top;
                public int Right;
                public int Bottom;
            }
            public struct WinPOINT {
                public int X;
                public int Y;
            }
            public struct CursorINFO {
                public int cbSize;
                public int flags;
                public IntPtr hCursor;
                public WinPOINT ptScreenPos;
            }
"@
    }
    
    $rect = New-Object WinRECT
    [Win32Automation]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
    [Win32Automation]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 500
    
    $width = $rect.Right - $rect.Left
    $height = $rect.Bottom - $rect.Top
    
    # Capture screenshot
    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
    
    # Draw cursor on screenshot
    $cursorInfo = New-Object CursorINFO
    $cursorInfo.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf([Type][CursorINFO])
    if ([Win32Automation]::GetCursorInfo([ref]$cursorInfo)) {
        if ($cursorInfo.flags -eq 1) {  # CURSOR_SHOWING
            $cursorX = $cursorInfo.ptScreenPos.X - $rect.Left
            $cursorY = $cursorInfo.ptScreenPos.Y - $rect.Top
            $hdc = $graphics.GetHdc()
            [Win32Automation]::DrawIconEx($hdc, $cursorX, $cursorY, $cursorInfo.hCursor, 0, 0, 0, [IntPtr]::Zero, [Win32Automation]::DI_NORMAL) | Out-Null
            $graphics.ReleaseHdc($hdc)
        }
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $path = "$env:TEMP\minecraft_$timestamp.png"
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "Screenshot saved: $path" -ForegroundColor Green
    return $path
}

## Move cursor and verify position with screenshot
function Test-CursorPosition {
    param(
        [int]$X,
        [int]$Y,
        [string]$Description
    )
    
    Write-Host "Moving cursor to ($X, $Y) for: $Description" -ForegroundColor Cyan
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($X, $Y)
    Start-Sleep -Milliseconds 300
    
    $screenshot = Capture-MinecraftWindow
    Write-Host "Cursor positioned for: $Description" -ForegroundColor Yellow
    Write-Host "Screenshot (with cursor): $screenshot" -ForegroundColor Gray
    
    return $screenshot
}

## Click Automation
function Click-ScreenPosition {
    param(
        [int]$X,
        [int]$Y
    )
    
    # CRITICAL: All Add-Type commands MUST happen BEFORE cursor movement
    Add-Type -AssemblyName System.Windows.Forms
    
    Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Mouse {
            [DllImport("user32.dll")]
            public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
            public const int MOUSEEVENTF_LEFTDOWN = 0x02;
            public const int MOUSEEVENTF_LEFTUP = 0x04;
        }
"@
    
    # Move mouse
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($X, $Y)
    Start-Sleep -Milliseconds 100
    
    # Click
    [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 50
    [Mouse]::mouse_event([Mouse]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
    
    Write-Host "Clicked at ($X, $Y)" -ForegroundColor Green
}

## Send Keys to Window
function Send-MinecraftKeys {
    param([string]$Keys)
    
    $process = Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue
    if (-not $process) {
        Write-Host "Minecraft not running" -ForegroundColor Red
        return
    }
    
    $wshell = New-Object -ComObject wscript.shell
    $wshell.AppActivate($process.Id) | Out-Null
    Start-Sleep -Milliseconds 300
    $wshell.SendKeys($Keys)
    
    Write-Host "Sent keys: $Keys" -ForegroundColor Green
}

## Analyze Screenshot for cursor position and bright pixels
function Analyze-Screenshot {
    param(
        [string]$ImagePath,
        [int]$ExpectedCursorX,
        [int]$ExpectedCursorY,
        [int]$Tolerance = 50
    )
    
    Add-Type -AssemblyName System.Drawing
    
    $bitmap = [System.Drawing.Bitmap]::FromFile($ImagePath)
    $width = $bitmap.Width
    $height = $bitmap.Height
    
    # Find the cursor by looking for white/bright pixels in expected area
    # Cursor is typically white/light colored
    $brightPixels = @()
    
    $searchRadius = 100
    $startX = [Math]::Max(0, $ExpectedCursorX - $searchRadius)
    $endX = [Math]::Min($width - 1, $ExpectedCursorX + $searchRadius)
    $startY = [Math]::Max(0, $ExpectedCursorY - $searchRadius)
    $endY = [Math]::Min($height - 1, $ExpectedCursorY + $searchRadius)
    
    $cursorFound = $false
    $actualCursorX = 0
    $actualCursorY = 0
    
    # Look for clusters of bright white pixels (cursor is usually white)
    for ($y = $startY; $y -lt $endY; $y += 5) {
        for ($x = $startX; $x -lt $endX; $x += 5) {
            $pixel = $bitmap.GetPixel($x, $y)
            $brightness = ($pixel.R + $pixel.G + $pixel.B) / 3
            
            if ($brightness -gt 200 -and $pixel.R -gt 200 -and $pixel.G -gt 200 -and $pixel.B -gt 200) {
                $brightPixels += @{X=$x; Y=$y; Brightness=$brightness}
                
                # Check if close to expected position
                $distance = [Math]::Sqrt([Math]::Pow($x - $ExpectedCursorX, 2) + [Math]::Pow($y - $ExpectedCursorY, 2))
                if ($distance -lt $Tolerance) {
                    $cursorFound = $true
                    $actualCursorX = $x
                    $actualCursorY = $y
                    break
                }
            }
        }
        if ($cursorFound) { break }
    }
    
    $bitmap.Dispose()
    
    $result = @{
        CursorFound = $cursorFound
        ExpectedX = $ExpectedCursorX
        ExpectedY = $ExpectedCursorY
        ActualX = $actualCursorX
        ActualY = $actualCursorY
        Distance = if ($cursorFound) { [Math]::Sqrt([Math]::Pow($actualCursorX - $ExpectedCursorX, 2) + [Math]::Pow($actualCursorY - $ExpectedCursorY, 2)) } else { -1 }
        BrightPixelsFound = $brightPixels.Count
    }
    
    return $result
}

## Analyze Screenshot for Text
function Find-TextInScreenshot {
    param(
        [string]$ImagePath,
        [string]$SearchText
    )
    
    # Simple OCR using Windows.Media.Ocr
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
    [Windows.Foundation.IAsyncOperation`1,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime] | Out-Null
    
    # This is a placeholder - full OCR implementation would be complex
    # For now, return positions based on common Minecraft UI layout
    
    $results = @{
        "Play" = @{X=960; Y=400}
        "Worlds" = @{X=960; Y=450}
        "Settings" = @{X=960; Y=500}
    }
    
    if ($results.ContainsKey($SearchText)) {
        return $results[$SearchText]
    }
    
    return $null
}

Export-ModuleMember -Function Capture-MinecraftWindow, Click-ScreenPosition, Send-MinecraftKeys, Find-TextInScreenshot, Test-CursorPosition, Analyze-Screenshot
