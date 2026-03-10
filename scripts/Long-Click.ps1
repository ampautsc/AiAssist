Add-Type @"
using System;
using System.Runtime.InteropServices;
public class LongClick {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@

$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1
if ($minecraft) {
    # Activate window
    [LongClick]::SetForegroundWindow($minecraft.MainWindowHandle)
    Start-Sleep -Seconds 1
    
    # Move cursor
    [LongClick]::SetCursorPos(869, 471)
    Start-Sleep -Milliseconds 500
    
    Write-Host "Clicking with longer hold..."
    # Press and hold for 200ms
    [LongClick]::mouse_event(0x0002, 0, 0, 0, 0)  # DOWN
    Start-Sleep -Milliseconds 200
    [LongClick]::mouse_event(0x0004, 0, 0, 0, 0)  # UP
    
    Write-Host "Click complete"
    Start-Sleep -Seconds 3
}
