Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ClickDebugger {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);
    
    public struct POINT {
        public int X;
        public int Y;
    }
}
"@

# Focus Minecraft
$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1
if ($minecraft) {
    [ClickDebugger]::SetForegroundWindow($minecraft.MainWindowHandle)
    Write-Host "Focused Minecraft"
    Start-Sleep -Seconds 1
}

Write-Host "`nAttempting to click at (869, 471)"
Write-Host "Moving cursor..."

# Move cursor
[ClickDebugger]::SetCursorPos(869, 471)
Start-Sleep -Milliseconds 200

# Check where cursor actually is
$pos = New-Object ClickDebugger+POINT
[ClickDebugger]::GetCursorPos([ref]$pos)
Write-Host "Cursor is at: ($($pos.X), $($pos.Y))"

# Do the click
Write-Host "Executing mouse_event for LEFT DOWN..."
[ClickDebugger]::mouse_event(0x0002, 0, 0, 0, 0)  # LEFTDOWN
Start-Sleep -Milliseconds 100

Write-Host "Executing mouse_event for LEFT UP..."
[ClickDebugger]::mouse_event(0x0004, 0, 0, 0, 0)  # LEFTUP

Write-Host "`nClick sequence complete!"
Write-Host "If you didn't see a click happen in Minecraft, the mouse_event calls aren't working."
