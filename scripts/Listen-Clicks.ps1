# Click Listener - Records mouse click coordinates
# Run this, then click in Minecraft. Press Ctrl+C to stop.

param(
    [int]$Duration = 30  # seconds to listen
)

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

Write-Host "`n=== Click Listener Active ===" -ForegroundColor Cyan
Write-Host "Click in Minecraft. I'll record coordinates." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

$clicks = @()
$lastLeftState = $false
$startTime = Get-Date

try {
    while (((Get-Date) - $startTime).TotalSeconds -lt $Duration) {
        # Check left mouse button (0x01)
        $leftButtonState = [MouseListener]::GetAsyncKeyState(0x01) -band 0x8000
        
        if ($leftButtonState -and -not $lastLeftState) {
            # Button just pressed
            $point = New-Object MouseListener+POINT
            [MouseListener]::GetCursorPos([ref]$point) | Out-Null
            
            $timestamp = Get-Date -Format "HH:mm:ss"
            Write-Host "[$timestamp] Click at ($($point.X), $($point.Y))" -ForegroundColor Green
            
            $clicks += [PSCustomObject]@{
                Time = $timestamp
                X = $point.X
                Y = $point.Y
            }
        }
        
        $lastLeftState = $leftButtonState
        Start-Sleep -Milliseconds 50
    }
} catch {
    Write-Host "`nStopped by user" -ForegroundColor Yellow
}

Write-Host "`n=== Clicks Recorded ===" -ForegroundColor Cyan
if ($clicks.Count -gt 0) {
    $clicks | Format-Table -AutoSize
    
    # Save to file
    $path = "C:\Users\ampau\source\AiAssist\AiAssist\recorded_clicks.json"
    $clicks | ConvertTo-Json | Set-Content $path
    Write-Host "`nSaved to: $path" -ForegroundColor Green
} else {
    Write-Host "No clicks recorded" -ForegroundColor Yellow
}
