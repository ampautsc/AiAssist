Add-Type -AssemblyName System.Windows.Forms

# Get Minecraft and focus it
$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1
if ($minecraft) {
    $hwnd = $minecraft.MainWindowHandle
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
    $code = @"
using System;
using System.Runtime.InteropServices;
public class Clicker {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
}
"@
    Add-Type -TypeDefinition $code
    
    [Clicker]::SetForegroundWindow($hwnd)
    Start-Sleep -Seconds 2
    
    # Move cursor
    [Clicker]::SetCursorPos(869, 471)
    Start-Sleep -Milliseconds 500
    
    # Use Windows.Forms to click
    Write-Host "Clicking via Windows.Forms..."
    $oldPos = [System.Windows.Forms.Cursor]::Position
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(869, 471)
    
    # Simulate physical mouse click
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseClick {
    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void mouse_event(long dwFlags, long dx, long dy, long cButtons, long dwExtraInfo);
    private const int MOUSEEVENTF_LEFTDOWN = 0x02;
    private const int MOUSEEVENTF_LEFTUP = 0x04;
    
    public static void Click() {
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
"@
    [MouseClick]::Click()
    Write-Host "Click executed"
    Start-Sleep -Seconds 4
}
