# Test cursor positions on Minecraft UI

Import-Module "C:\Users\ampau\source\AiAssist\AiAssist\scripts\MinecraftAutomation.psm1" -Force

Write-Host "`n=== CURSOR POSITION TEST ===" -ForegroundColor Magenta

# Get Minecraft window dimensions
$process = Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue
if (-not $process) {
    Write-Host "Minecraft not running!" -ForegroundColor Red
    exit 1
}

if (-not ([System.Management.Automation.PSTypeName]'WinRect').Type) {
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public struct WinRect { public int Left; public int Top; public int Right; public int Bottom; }
public class WinAPI {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, ref WinRect rect);
}
"@
}

$rect = New-Object WinRect
[WinAPI]::GetWindowRect($process.MainWindowHandle, [ref]$rect) | Out-Null

$centerX = $rect.Left + (($rect.Right - $rect.Left) / 2)
$centerY = $rect.Top + (($rect.Bottom - $rect.Top) / 2)
$windowWidth = $rect.Right - $rect.Left
$windowHeight = $rect.Bottom - $rect.Top

Write-Host "Window dimensions: ${windowWidth}x${windowHeight}" -ForegroundColor Cyan
Write-Host "Center point: ($centerX, $centerY)" -ForegroundColor Cyan

# Test position 1: Center (Play button area)
Write-Host "`nTest 1: Center button area" -ForegroundColor Yellow
$playX = $centerX
$playY = $centerY - 50
$screenshot1 = Test-CursorPosition -X $playX -Y $playY -Description "Play button"
Write-Host "Saved: $screenshot1" -ForegroundColor Green

Start-Sleep -Seconds 2

# Test position 2: Upper middle (first world in list)
Write-Host "`nTest 2: World list area" -ForegroundColor Yellow
$worldX = $centerX
$worldY = $rect.Top + 250
$screenshot2 = Test-CursorPosition -X $worldX -Y $worldY -Description "First world"
Write-Host "Saved: $screenshot2" -ForegroundColor Green

Start-Sleep -Seconds 2

# Test position 3: Bottom center (Play Game button)
Write-Host "`nTest 3: Play Game button area" -ForegroundColor Yellow  
$playGameX = $centerX
$playGameY = $rect.Bottom - 150
$screenshot3 = Test-CursorPosition -X $playGameX -Y $playGameY -Description "Play Game button"
Write-Host "Saved: $screenshot3" -ForegroundColor Green

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Magenta
Write-Host "Screenshots saved (no viewers opened):" -ForegroundColor Cyan
Write-Host "  1. $screenshot1" -ForegroundColor White
Write-Host "  2. $screenshot2" -ForegroundColor White
Write-Host "  3. $screenshot3" -ForegroundColor White
Write-Host "`nReview these to verify cursor positions match targets" -ForegroundColor Yellow
