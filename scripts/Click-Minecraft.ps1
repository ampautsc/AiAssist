param(
    [int]$X,
    [int]$Y
)

Add-Type -AssemblyName System.Windows.Forms

# Get Minecraft and focus it
$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1
if (-not $minecraft) {
    Write-Host "ERROR: Minecraft not running"
    exit 1
}

$hwnd = $minecraft.MainWindowHandle
[void][System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")

# Use unique type name to avoid conflicts
$timestamp = [DateTime]::Now.Ticks
$clickerName = "Clicker$timestamp"
$mouseClickName = "MouseClick$timestamp"

$code = @"
using System;
using System.Runtime.InteropServices;
public class $clickerName {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
}
"@
Add-Type -TypeDefinition $code

Invoke-Expression "[$clickerName]::SetForegroundWindow(`$hwnd)"
Start-Sleep -Seconds 2

# Move cursor
Invoke-Expression "[$clickerName]::SetCursorPos($X, $Y)"
Start-Sleep -Milliseconds 500

# Use Windows.Forms to click with StdCall
$mouseCode = @"
using System;
using System.Runtime.InteropServices;
public class $mouseClickName {
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
Add-Type -TypeDefinition $mouseCode
Invoke-Expression "[$mouseClickName]::Click()"
Write-Host "Clicked at ($X, $Y)"
