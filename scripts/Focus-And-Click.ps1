Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WindowHelper {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

# Find Minecraft window
$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1

if ($minecraft) {
    Write-Host "Found Minecraft process: $($minecraft.Id)"
    $handle = $minecraft.MainWindowHandle
    
    # Show and bring to foreground
    [WindowHelper]::ShowWindow($handle, 9)  # SW_RESTORE
    [WindowHelper]::SetForegroundWindow($handle)
    
    Write-Host "Switched to Minecraft window"
    Start-Sleep -Seconds 1
    
    # Now click Play button
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(869, 471)
    Start-Sleep -Milliseconds 100
    
    Add-Type -MemberDefinition @"
[DllImport("user32.dll")]
public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
"@ -Namespace Win32 -Name Mouse
    
    [Win32.Mouse]::mouse_event(0x0002, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 50
    [Win32.Mouse]::mouse_event(0x0004, 0, 0, 0, 0)
    
    Write-Host "Clicked Play button at (869, 471)"
} else {
    Write-Host "Minecraft not running!"
}
