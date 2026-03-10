Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WindowClicker {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    
    [DllImport("user32.dll")]
    public static extern bool SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    
    public const uint WM_LBUTTONDOWN = 0x0201;
    public const uint WM_LBUTTONUP = 0x0202;
    
    public static IntPtr MakeLParam(int x, int y) {
        return (IntPtr)((y << 16) | (x & 0xFFFF));
    }
}
"@

# Find Minecraft window
$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1

if ($minecraft) {
    $hwnd = $minecraft.MainWindowHandle
    Write-Host "Found Minecraft window handle: $hwnd"
    
    # Focus it
    [WindowClicker]::SetForegroundWindow($hwnd)
    Start-Sleep -Milliseconds 500
    
    # Client coordinates (869, 471)
    $x = 869
    $y = 471
    $lParam = [WindowClicker]::MakeLParam($x, $y)
    
    Write-Host "Sending WM_LBUTTONDOWN to ($x, $y)..."
    [WindowClicker]::PostMessage($hwnd, [WindowClicker]::WM_LBUTTONDOWN, [IntPtr]1, $lParam)
    
    Start-Sleep -Milliseconds 50
    
    Write-Host "Sending WM_LBUTTONUP to ($x, $y)..."
    [WindowClicker]::PostMessage($hwnd, [WindowClicker]::WM_LBUTTONUP, [IntPtr]0, $lParam)
    
    Write-Host "Click messages sent!"
} else {
    Write-Host "Minecraft not running!"
}
