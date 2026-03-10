Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ClickHelper {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
    
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    
    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);
    
    public struct POINT {
        public int X;
        public int Y;
    }
}
"@

$minecraft = Get-Process | Where-Object {$_.ProcessName -like "*Minecraft*"} | Select-Object -First 1

if (-not $minecraft) {
    Write-Host "ERROR: Minecraft not running!"
    exit 1
}

Write-Host "Step 1: Activating Minecraft window..."
$hwnd = $minecraft.MainWindowHandle
[ClickHelper]::ShowWindow($hwnd, 9)  # SW_RESTORE
[ClickHelper]::SetForegroundWindow($hwnd)
Start-Sleep -Seconds 1
Write-Host "  Window activated"

Write-Host "`nStep 2: Moving cursor to (869, 471)..."
[ClickHelper]::SetCursorPos(869, 471)
Start-Sleep -Milliseconds 300

Write-Host "`nStep 3: Verifying cursor position..."
$pos = New-Object ClickHelper+POINT
[ClickHelper]::GetCursorPos([ref]$pos)
Write-Host "  Cursor is at: ($($pos.X), $($pos.Y))"

if ($pos.X -ne 869 -or $pos.Y -ne 471) {
    Write-Host "  WARNING: Cursor not at expected position!"
}

Write-Host "`nStep 4: Taking screenshot for verification..."
Start-Sleep -Milliseconds 200
$pythonExe = "C:/Users/ampau/source/AiAssist/AiAssist/.venv/Scripts/python.exe"
& $pythonExe -c "from PIL import ImageGrab; img = ImageGrab.grab(); img.save('C:/Users/ampau/source/AiAssist/AiAssist/before_click.png'); print('  Screenshot saved')"

Write-Host "`nStep 5: Performing click..."
[ClickHelper]::mouse_event(0x0002, 0, 0, 0, 0)  # LEFT DOWN
Write-Host "  LEFT DOWN sent"
Start-Sleep -Milliseconds 100
[ClickHelper]::mouse_event(0x0004, 0, 0, 0, 0)  # LEFT UP
Write-Host "  LEFT UP sent"

Write-Host "`nStep 6: Waiting for UI response..."
Start-Sleep -Seconds 2

Write-Host "`nStep 7: Taking after screenshot..."
& $pythonExe -c "from PIL import ImageGrab; img = ImageGrab.grab(); img.save('C:/Users/ampau/source/AiAssist/AiAssist/after_click.png'); print('  Screenshot saved')"

Write-Host "`nDone! Check before_click.png and after_click.png"
