Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FocusAndClick {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
}
"@

$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1

if ($minecraft) {
    $hwnd = $minecraft.MainWindowHandle
    
    # Activate and bring to front
    [FocusAndClick]::ShowWindow($hwnd, 9)
    [FocusAndClick]::SetForegroundWindow($hwnd)
    
    # Wait and verify it's focused
    Start-Sleep -Seconds 2
    
    $focused = [FocusAndClick]::GetForegroundWindow()
    if ($focused -ne $hwnd) {
        # Try again
        [FocusAndClick]::SetForegroundWindow($hwnd)
        Start-Sleep -Seconds 1
    }
    
    # Move and click
    [FocusAndClick]::SetCursorPos(869, 471)
    Start-Sleep -Milliseconds 500
    
    # Click
    [FocusAndClick]::mouse_event(0x0002, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 150
    [FocusAndClick]::mouse_event(0x0004, 0, 0, 0, 0)
    
    # Stay here for a bit so Minecraft processes the click
    Start-Sleep -Seconds 3
}
