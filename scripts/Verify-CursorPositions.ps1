# Automated cursor position verification with image analysis
# This script verifies cursor positions WITHOUT opening image viewers

Import-Module "$PSScriptRoot\MinecraftAutomation.psm1" -Force

Write-Host "`n=== Automated Cursor Position Verification ===" -ForegroundColor Cyan
Write-Host "This will capture screenshots with cursor and analyze them programmatically" -ForegroundColor Yellow
Write-Host "No image viewers will be opened`n" -ForegroundColor Green

# Get Minecraft window dimensions
$process = Get-Process -Name "Minecraft.Windows" -ErrorAction SilentlyContinue
if (-not $process) {
    Write-Host "ERROR: Minecraft must be running" -ForegroundColor Red
    exit 1
}

# Calculate window center
$hwnd = $process.MainWindowHandle

if (-not ([System.Management.Automation.PSTypeName]'Win32Helper').Type) {
    Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32Helper {
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hwnd, ref RECT rect);
        }
        public struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }
"@
}

$rect = New-Object RECT
[Win32Helper]::GetWindowRect($hwnd, [ref]$rect) | Out-Null

$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
$centerX = $rect.Left + ($width / 2)
$centerY = $rect.Top + ($height / 2)

Write-Host "Window: $width x $height, Center: ($centerX, $centerY)" -ForegroundColor Gray

# Test positions - relative to window center
$testPositions = @(
    @{Name="Play Button"; X=[int]($centerX); Y=[int]($centerY - 50)},
    @{Name="World List Item"; X=[int]($centerX); Y=[int]($centerY - 445)},
    @{Name="Play Game Button"; X=[int]($centerX); Y=[int]($centerY + 545)}
)

$results = @()

foreach ($pos in $testPositions) {
    Write-Host "`n--- Testing: $($pos.Name) ---" -ForegroundColor Cyan
    Write-Host "Target position: ($($pos.X), $($pos.Y))" -ForegroundColor Gray
    
    # Move cursor and capture
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($pos.X, $pos.Y)
    Start-Sleep -Milliseconds 500
    
    # Capture with cursor visible
    $screenshotPath = Capture-MinecraftWindow
    
    if ($screenshotPath) {
        # Analyze the screenshot to verify cursor position
        # Convert screen coordinates to window-relative coordinates
        $windowRelativeX = $pos.X - $rect.Left
        $windowRelativeY = $pos.Y - $rect.Top
        
        $analysis = Analyze-Screenshot -ImagePath $screenshotPath -ExpectedCursorX $windowRelativeX -ExpectedCursorY $windowRelativeY -Tolerance 50
        
        $results += @{
            Name = $pos.Name
            TargetX = $pos.X
            TargetY = $pos.Y
            Screenshot = $screenshotPath
            Analysis = $analysis
        }
        
        if ($analysis.CursorFound) {
            Write-Host "Cursor FOUND at relative position ($($analysis.ActualX), $($analysis.ActualY))" -ForegroundColor Green
            Write-Host "Distance from target: $([Math]::Round($analysis.Distance, 1)) pixels" -ForegroundColor Green
        } else {
            Write-Host "Cursor NOT FOUND near expected position" -ForegroundColor Red
            Write-Host "Bright pixels detected: $($analysis.BrightPixelsFound)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Screenshot capture failed" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n`n=== VERIFICATION SUMMARY ===" -ForegroundColor Cyan
foreach ($result in $results) {
    $status = if ($result.Analysis.CursorFound) { "PASS" } else { "FAIL" }
    $color = if ($result.Analysis.CursorFound) { "Green" } else { "Red" }
    
    Write-Host "$status - $($result.Name)" -ForegroundColor $color
    Write-Host "Screenshot: $($result.Screenshot)" -ForegroundColor Gray
    if ($result.Analysis.CursorFound) {
        Write-Host "Distance from target: $([Math]::Round($result.Analysis.Distance, 1))px" -ForegroundColor Gray
    }
}

$passCount = ($results | Where-Object { $_.Analysis.CursorFound }).Count
$summaryColor = if ($passCount -eq $results.Count) { "Green" } else { "Yellow" }
Write-Host "`n$passCount / $($results.Count) positions verified successfully" -ForegroundColor $summaryColor

if ($passCount -eq $results.Count) {
    Write-Host "`nAll cursor positions verified. Ready to proceed with world loading." -ForegroundColor Green
} else {
    Write-Host "`nSome positions failed verification. Coordinates may need adjustment." -ForegroundColor Yellow
}
