# Test cursor capture with visual marker
Import-Module "$PSScriptRoot\MinecraftAutomation.psm1" -Force

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Write-Host "Moving cursor to center of screen..." -ForegroundColor Cyan
$screenCenter = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$centerX = $screenCenter.Width / 2
$centerY = $screenCenter.Height / 2
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($centerX, $centerY)
Start-Sleep -Milliseconds 300

Write-Host "Capturing screenshot..." -ForegroundColor Cyan
$screenshotPath = Capture-MinecraftWindow

if ($screenshotPath -and (Test-Path $screenshotPath)) {
    Write-Host "Screenshot saved: $screenshotPath" -ForegroundColor Green
    
    # Draw a big red circle where cursor should be to verify coordinate system
    $bitmap = [System.Drawing.Bitmap]::FromFile($screenshotPath)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Get cursor position
    $cursorPos = [System.Windows.Forms.Cursor]::Position
    
    # Get window position
    $process = Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue
    if ($process) {
        $hwnd = $process.MainWindowHandle
        
        if (-not ([System.Management.Automation.PSTypeName]'TestWin32').Type) {
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class TestWin32 {
                    [DllImport("user32.dll")]
                    public static extern bool GetWindowRect(IntPtr hwnd, ref TestRECT rect);
                }
                public struct TestRECT {
                    public int Left;
                    public int Top;
                    public int Right;
                    public int Bottom;
                }
"@
        }
        
        $rect = New-Object TestRECT
        [TestWin32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
        
        # Calculate relative position
        $relX = $cursorPos.X - $rect.Left
        $relY = $cursorPos.Y - $rect.Top
        
        Write-Host "Cursor screen pos: ($($cursorPos.X), $($cursorPos.Y))" -ForegroundColor Gray
        Write-Host "Window position: ($($rect.Left), $($rect.Top))" -ForegroundColor Gray
        Write-Host "Cursor relative pos: ($relX, $relY)" -ForegroundColor Yellow
        
        # Draw red circle at cursor position
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Red, 5)
        $graphics.DrawEllipse($pen, $relX - 20, $relY - 20, 40, 40)
        $pen.Dispose()
    }
    
    $testPath = "$env:TEMP\minecraft_test_with_marker.png"
    $bitmap.Save($testPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "`nTest image with RED CIRCLE marker saved: $testPath" -ForegroundColor Green
    Write-Host "Opening for 3 seconds..." -ForegroundColor Cyan
    
    Start-Process $testPath
    Start-Sleep -Seconds 3
    Get-Process | Where-Object { $_.MainWindowTitle -like "*minecraft_test_with_marker*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "`nIf red circle was visible at cursor position, coordinate system works." -ForegroundColor Yellow
    Write-Host "If not visible, coordinates are wrong." -ForegroundColor Yellow
} else {
    Write-Host "Screenshot capture failed" -ForegroundColor Red
}
