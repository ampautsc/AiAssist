# Advanced Click Listener with Screen Capture
# Records clicks and captures the screen state before each click
# This builds a navigation map of what clicks lead where

param(
    [int]$Duration = 300,  # 5 minutes default
    [string]$OutputDir = "C:\Users\ampau\source\AiAssist\AiAssist\minecraft-navigation-data"
)

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class MouseListener {
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);
    
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }
}
"@

Write-Host "`n=== Advanced Click Listener Active ===" -ForegroundColor Cyan
Write-Host "Recording clicks with screen captures" -ForegroundColor Yellow
Write-Host "Output: $OutputDir" -ForegroundColor Gray
Write-Host "Duration: $Duration seconds" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

$navigationData = @()
$clickNumber = 0
$lastLeftState = $false
$startTime = Get-Date
$lastScreenshot = $null
$isCapturing = $false

try {
    while (((Get-Date) - $startTime).TotalSeconds -lt $Duration) {
        # Check left mouse button (0x01)
        $leftButtonState = [MouseListener]::GetAsyncKeyState(0x01) -band 0x8000
        
        if ($leftButtonState -and -not $lastLeftState) {
            # Click detected!
            $clickNumber++
            $point = New-Object MouseListener+POINT
            [MouseListener]::GetCursorPos([ref]$point) | Out-Null
            
            $timestamp = Get-Date -Format "HH:mm:ss"
            Write-Host "[$timestamp] Click #$clickNumber at ($($point.X), $($point.Y))" -ForegroundColor Green
            
            # Save the last screenshot as "before click"
            $beforeImage = $null
            if ($lastScreenshot) {
                $beforeImage = Join-Path $OutputDir "click_${clickNumber}_before.png"
                $lastScreenshot.Save($beforeImage, [System.Drawing.Imaging.ImageFormat]::Png)
                Write-Host "  Saved: click_${clickNumber}_before.png" -ForegroundColor Gray
            }
            
            # Record click data
            $clickData = [PSCustomObject]@{
                ClickNumber = $clickNumber
                Time = $timestamp
                X = $point.X
                Y = $point.Y
                BeforeScreenshot = if ($beforeImage) { Split-Path $beforeImage -Leaf } else { $null }
                AfterScreenshot = "click_${clickNumber}_after.png"
            }
            
            $navigationData += $clickData
            
            # Start capturing for "after" screenshot
            $isCapturing = $true
            $captureStart = Get-Date
            
            # Wait 2 seconds after click, then save final state
            Start-Sleep -Seconds 2
            
            $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.CopyFromScreen(0, 0, 0, 0, $bitmap.Size)
            
            $afterImage = Join-Path $OutputDir "click_${clickNumber}_after.png"
            $bitmap.Save($afterImage, [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Host "  Saved: click_${clickNumber}_after.png" -ForegroundColor Gray
            
            $graphics.Dispose()
            $lastScreenshot = $bitmap
            $isCapturing = $false
            
        } elseif (-not $leftButtonState) {
            # No click - just update screenshot periodically
            if (-not $isCapturing) {
                $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
                if ($lastScreenshot) {
                    $lastScreenshot.Dispose()
                }
                $lastScreenshot = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
                $graphics = [System.Drawing.Graphics]::FromImage($lastScreenshot)
                $graphics.CopyFromScreen(0, 0, 0, 0, $lastScreenshot.Size)
                $graphics.Dispose()
            }
        }
        
        $lastLeftState = $leftButtonState
        Start-Sleep -Milliseconds 100
    }
} catch {
    Write-Host "`nStopped" -ForegroundColor Yellow
} finally {
    if ($lastScreenshot) {
        $lastScreenshot.Dispose()
    }
}

# Save navigation data
$jsonPath = Join-Path $OutputDir "navigation_data.json"
$navigationData | ConvertTo-Json | Set-Content $jsonPath

Write-Host "`n=== Recording Complete ===" -ForegroundColor Cyan
Write-Host "Clicks recorded: $clickNumber" -ForegroundColor Green
Write-Host "Data saved to: $jsonPath" -ForegroundColor Gray

if ($clickNumber -gt 0) {
    Write-Host "`nNavigation Sequence:" -ForegroundColor Yellow
    $navigationData | Format-Table -AutoSize
}
