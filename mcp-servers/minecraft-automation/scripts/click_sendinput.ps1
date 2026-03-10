param(
    [int]$X,
    [int]$Y
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseInput {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    
    [DllImport("user32.dll")]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
    
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public MOUSEINPUT mi;
    }
    
    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }
    
    public const uint INPUT_MOUSE = 0;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
}
"@

# Move to position
[MouseInput]::SetCursorPos($X, $Y)
Start-Sleep -Milliseconds 200

# Create input structs
$down = New-Object MouseInput+INPUT
$down.type = [MouseInput]::INPUT_MOUSE
$down.mi.dwFlags = [MouseInput]::MOUSEEVENTF_LEFTDOWN

$up = New-Object MouseInput+INPUT
$up.type = [MouseInput]::INPUT_MOUSE
$up.mi.dwFlags = [MouseInput]::MOUSEEVENTF_LEFTUP

# Send click
$result1 = [MouseInput]::SendInput(1, @($down), [System.Runtime.InteropServices.Marshal]::SizeOf($down))
Start-Sleep -Milliseconds 50
$result2 = [MouseInput]::SendInput(1, @($up), [System.Runtime.InteropServices.Marshal]::SizeOf($up))

Write-Host "Clicked at ($X, $Y) via SendInput"
